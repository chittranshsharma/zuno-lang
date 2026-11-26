import { validateFiles, prepareEdits, assertFresh } from './project-edits';
import { validate } from './formatter';
import './project-tools.css';

export function setupProjectAssistant(monaco, editor) {
  const workspace = () => globalThis.ZunoWorkspace;
  const status = message => { document.querySelector('#assistant-progress').textContent = message; };
  const details = document.createElement('details');
  details.className = 'project-context';
  const summary = document.createElement('summary');
  summary.textContent = 'Project context';
  const description = document.createElement('p');
  description.textContent = 'Choose the open files to send to Groq. Up to 8 files, 20,000 characters total.';
  const enabledLabel = document.createElement('label');
  const enabled = document.createElement('input');
  enabled.type = 'checkbox';
  enabledLabel.append(enabled, ' Use selected files');
  const fileList = document.createElement('div');
  fileList.className = 'context-files';
  const count = document.createElement('p');
  count.setAttribute('role', 'status');
  const selected = new Set();
  const refresh = document.createElement('button');
  refresh.type = 'button';
  refresh.textContent = 'Refresh files';
  const reportLabel = document.createElement('label');
  const attachReport = document.createElement('input');
  attachReport.type = 'checkbox';
  reportLabel.append(attachReport, ' Attach last test result');
  let lastReport;
  document.addEventListener('zuno-test-result', event => { lastReport = event.detail; });
  function render() {
    fileList.replaceChildren();
    const files = workspace()?.list() || [];
    for (const id of selected) if (!files.some(file => file.id === id)) selected.delete(id);
    for (const file of files) {
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';checkbox.checked = selected.has(file.id);
      checkbox.onchange = () => { if (checkbox.checked) selected.add(file.id); else selected.delete(file.id); update(); };
      const name = document.createElement('span');name.textContent = file.path;
      label.append(checkbox, name);fileList.append(label);
    }
    update();
  }
  function update() {
    const files = (workspace()?.list() || []).filter(file => selected.has(file.id));
    count.textContent = files.length + ' files selected · ' + files.reduce((total, file) => total + file.code.length, 0) + ' characters';
  }
  refresh.onclick = render;
  details.ontoggle = () => { if (details.open) render(); };
  details.append(summary, description, enabledLabel, fileList, count, refresh, reportLabel);
  document.querySelector('#assistant-form').before(details);
  const undo = document.createElement('button');
  undo.type = 'button';undo.textContent = 'Undo project edit';undo.disabled = true;
  details.append(undo);
  let undoBatch;
  undo.onclick = () => {
    try {
      assertFresh(undoBatch.snapshot, workspace().list());
      for (const change of undoBatch.changes) replace(change.id, change.before);
      workspace().persist();undoBatch = null;undo.disabled = true;status('Project edit undone.');
    } catch (error) { status(error.message + ' Batch undo was not applied.'); }
  };
  function replace(id, text) {
    const model = workspace().list().find(file => file.id === id).model;
    model.pushStackElement();model.pushEditOperations([], [{ range:model.getFullModelRange(), text }], () => null);model.pushStackElement();
  }
  function context() {
    if (!enabled.checked) return null;
    const files = workspace().list().filter(file => selected.has(file.id));
    validateFiles(files);
    let testResult;
    if (attachReport.checked) {
      if (!lastReport) throw new Error('Run project tests before attaching a result.');
      assertFresh(lastReport.snapshot, workspace().list());
      if (lastReport.snapshot.some(file => !selected.has(file.id))) throw new Error('Select all files used in the test run before attaching its result.');
      testResult = lastReport.text.slice(0, 6000);
    }
    return { snapshot:files, files:validateFiles(files), testResult };
  }
  function review(snapshot, response) {
    const changes = prepareEdits(snapshot, response);
    assertFresh(snapshot, workspace().list());
    for (const change of changes) validate(change.after);
    const dialog = document.createElement('dialog');dialog.className = 'project-review';
    const heading = document.createElement('h2');heading.textContent = 'Review project changes';
    const hint = document.createElement('p');hint.textContent = changes.length + ' files changed. Review each file before applying.';
    const tabs = document.createElement('div');tabs.className = 'review-files';
    const container = document.createElement('div');container.className = 'review-diff';
    const message = document.createElement('p');message.setAttribute('role', 'status');
    const actions = document.createElement('div');actions.className = 'review-actions';
    const accept = document.createElement('button');accept.textContent = 'Apply reviewed changes';
    const reject = document.createElement('button');reject.textContent = 'Reject';reject.onclick = () => dialog.close();
    actions.append(reject, accept);dialog.append(heading, hint, tabs, container, message, actions);document.body.append(dialog);dialog.showModal();
    const diff = monaco.editor.createDiffEditor(container, { theme:'zuno-premium', automaticLayout:true, readOnly:true, renderSideBySide:innerWidth > 800 });
    const models = changes.map(change => ({ original:monaco.editor.createModel(change.before, 'zuno'), modified:monaco.editor.createModel(change.after, 'zuno') }));
    const seen = new Set();
    changes.forEach((change, index) => {
      const button = document.createElement('button');button.textContent = change.path;
      button.onclick = () => {
        seen.add(index);diff.setModel(models[index]);
        for (const tab of tabs.children) tab.setAttribute('aria-pressed', String(tab === button));
        accept.disabled = seen.size !== changes.length;
        message.textContent = seen.size + ' of ' + changes.length + ' files reviewed';
      };
      tabs.append(button);
    });
    accept.onclick = () => {
      try {
        assertFresh(snapshot, workspace().list());
        for (const change of changes) replace(change.id, change.after);
        workspace().persist();
        undoBatch = { changes, snapshot:workspace().list().filter(file => changes.some(change => change.id === file.id)) };
        undo.disabled = false;status('Project changes applied. Run tests to check them.');dialog.close();
      } catch (error) { message.textContent = error.message;accept.disabled = true; }
    };
    dialog.onclose = () => { diff.dispose();for (const model of models) { model.original.dispose();model.modified.dispose(); } dialog.remove(); };
    tabs.firstElementChild.click();
    return changes.length;
  }
  return { context, review, reset:() => { selected.clear();enabled.checked = false;attachReport.checked = false;render(); } };
}
