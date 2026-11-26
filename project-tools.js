export function setupProjectTools(editor) {
  const workspace = () => globalThis.ZunoWorkspace;
  const section = document.createElement('section');section.className = 'project-tools';
  const title = document.createElement('h3');title.textContent = 'Project tools';
  const help = document.createElement('p');help.textContent = 'Uses open tabs and their relative paths. Double-click a tab to rename its path.';
  const actions = document.createElement('div');actions.className = 'project-tool-actions';
  const status = document.createElement('p');status.setAttribute('role', 'status');
  const output = document.createElement('pre');output.setAttribute('aria-label', 'Project results');
  const locations = document.createElement('div');
  section.append(title, help, actions, status, output, locations);
  document.querySelector('.editor-main').append(section);
  let worker;
  let timer;
  function stop() { worker?.terminate();worker = null;clearTimeout(timer); }
  function run(action) {
    stop();
    const snapshot = workspace().list();
    const entry = snapshot.find(file => file.id === workspace().activeId)?.path;
    if (!entry) { status.textContent = 'Open a file first.';return; }
    const current = new Worker('/assets/project.worker.js', { type:'module' });worker = current;
    status.textContent = action === 'test' ? 'Running project tests…' : action === 'run' ? 'Running active file and its imports…' : 'Checking active file and its imports…';
    output.textContent = '';locations.replaceChildren();
    const finish = message => { if (worker !== current) return;stop();status.textContent = message; };
    timer = setTimeout(() => finish('Stopped after 10 seconds. Reduce the project or loop size.'), 10000);
    current.onerror = () => finish('Project worker failed. Reload the page and try again.');
    current.onmessage = ({ data }) => {
      if (worker !== current) return;
      const { result, error } = data;
      if (error) { output.textContent = error;finish('Project command failed.');return; }
      const text = result.results ? result.results.map(item => (item.passed ? 'PASS ' : 'FAIL ') + item.file + (item.error ? '\n' + item.error : '')).join('\n\n') + '\n\n' + result.passed + ' passed, ' + result.failed + ' failed' : result.output.join('\n');
      output.textContent = text.slice(0, 100000);
      finish(result.failed ? 'Some tests failed.' : 'Finished.');
      const live = workspace().list();
      if (snapshot.some(file => !live.some(current => current.id === file.id && current.version === file.version && current.path === file.path))) status.textContent += ' Source changed during this run; rerun for current results.';
      if (action === 'test') document.dispatchEvent(new CustomEvent('zuno-test-result', { detail:{ snapshot, text } }));
      for (const line of text.split('\n')) {
        const match = line.match(/^(.+\.zuno):(\d+):(\d+):/);
        if (!match) continue;
        const button = document.createElement('button');button.textContent = 'Open ' + match[1] + ':' + match[2];
        button.onclick = () => {
          const file = workspace().list().find(file => file.path === match[1]);
          if (!file) { status.textContent = 'This file is no longer open.';return; }
          workspace().activate(file.id);editor.setPosition({ lineNumber:+match[2], column:+match[3] });editor.revealLineInCenter(+match[2]);editor.focus();
        };
        locations.append(button);
      }
    };
    current.postMessage({ action, entry, files:snapshot.map(({ path, code }) => ({ path, code })) });
  }
  for (const [label, handler] of [
    ['Run project', () => run('run')],
    ['Check project', () => run('check')],
    ['Test project', () => run('test')],
    ['Stop tests', () => { stop();status.textContent = 'Stopped.'; }],
    ['Format file', () => editor.getAction('editor.action.formatDocument').run()],
    ['Rename path', () => workspace().renamePath()],
    ['Test example', () => {
      workspace().open({ name:'testing/math.zuno', projectPath:'testing/math.zuno', code:'cook double(value) {\n  yeet value * 2;\n}\n' });
      workspace().open({ name:'testing/math.test.zuno', projectPath:'testing/math.test.zuno', code:'import "./math.zuno" as math;\nassert(math.double(3) == 6, "doubles a number");\n' });
      status.textContent = 'Example opened. Press Test project.';
    }]
  ]) { const button = document.createElement('button');button.textContent = label;button.onclick = handler;actions.append(button); }
  window.addEventListener('pagehide', stop);
  globalThis.ZunoRunProject = () => run('run');
}
