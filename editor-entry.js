import * as monaco from 'monaco-editor';
globalThis.MonacoEnvironment = { getWorker: () => new Worker('/assets/editor.worker.js', { type: 'module' }) };
const source = document.querySelector('#code');
monaco.languages.register({ id: 'lingua' });
monaco.languages.setMonarchTokensProvider('lingua', { tokenizer: { root: [
  [/\b(let|fn|return|if|else|while|true|false)\b/, 'keyword'],
  [/\bprint\b/, 'type'], [/"(?:\\.|[^"\\])*"/, 'string'], [/\d+(?:\.\d+)?/, 'number'], [/[a-zA-Z_]\w*/, 'identifier']
] } });
monaco.languages.setLanguageConfiguration('lingua', { brackets: [['{','}'],['[',']'],['(',')']], autoClosingPairs: [{open:'{',close:'}'},{open:'[',close:']'},{open:'(',close:')'},{open:'"',close:'"'}] });
monaco.languages.registerCompletionItemProvider('lingua', { provideCompletionItems(model, position) {
  const word = model.getWordUntilPosition(position);
  const range = { startLineNumber:position.lineNumber,endLineNumber:position.lineNumber,startColumn:word.startColumn,endColumn:word.endColumn };
  const snippets = { let:'let ${1:name} = ${2:0};', print:'print(${1:value});', fn:'fn ${1:name}(${2:argument}) {\n  return ${3:argument};\n}', if:'if (${1:condition}) {\n  $0\n}', while:'while (${1:condition}) {\n  $0\n}' };
  return { suggestions:Object.entries(snippets).map(([label,insertText]) => ({ label,insertText,range,kind:monaco.languages.CompletionItemKind.Snippet,insertTextRules:monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet })) };
} });
monaco.editor.defineTheme('lingua-premium', { base:'vs-dark',inherit:true,rules:[{token:'keyword',foreground:'C5BCF0'},{token:'string',foreground:'BDD3AC'},{token:'number',foreground:'DDBB91'}], colors:{'editor.background':'#0D0D0F','editor.foreground':'#E5E5E5','editorLineNumber.foreground':'#707075','editor.lineHighlightBackground':'#18181B','editorCursor.foreground':'#FFFFFF','editor.selectionBackground':'#FFFFFF25','editorWidget.background':'#1B1B1E','editorWidget.border':'#39393D'} });
const editor = monaco.editor.create(document.querySelector('#monaco-editor'), { value:source.value,language:'lingua',theme:'lingua-premium',automaticLayout:true,fontFamily:'JetBrains Mono, monospace',fontSize:14,lineHeight:25,minimap:{enabled:false},padding:{top:20},scrollBeyondLastLine:false,tabSize:2,ariaLabel:'Lingua code editor' });
document.querySelector('.terminal-editor').hidden = true;
document.querySelector('.terminal-editor').style.display = 'none';
let syncing = false;
editor.onDidChangeModelContent(() => { if (syncing) return; source.value=editor.getValue(); source.dispatchEvent(new Event('input')); });
source.addEventListener('input', () => { if (editor.getValue() === source.value) return; syncing=true; editor.setValue(source.value); syncing=false; });
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => document.querySelector('#run').click());
const panel = document.querySelector('#assistant-panel');
const toggle = document.querySelector('#toggle-assistant');
function show(open) { panel.hidden=!open; toggle.setAttribute('aria-expanded',String(open)); if(open) document.querySelector('#assistant-question').focus(); else editor.focus(); }
toggle.onclick=()=>show(panel.hidden);
document.querySelector('#close-assistant').onclick=()=>show(false);
document.addEventListener('keydown', e=>{ if(e.ctrlKey && e.altKey && e.code==='KeyB'){e.preventDefault();show(panel.hidden);} if(e.key==='Escape' && !panel.hidden) show(false); });
let userApiKey = '';
let activeRequest;
const keyInput = document.querySelector('#groq-key');
const keyStatus = document.querySelector('#groq-key-status');
const disconnect = document.querySelector('#disconnect-groq');
function clearKey() {
  userApiKey = '';
  keyInput.value = '';
  keyStatus.textContent = 'Not added';
  disconnect.disabled = true;
  activeRequest?.abort();
}
document.querySelector('#connect-groq').onclick = () => {
  const candidate = keyInput.value.trim();
  if (!candidate || !/^[A-Za-z0-9_-]{1,256}$/.test(candidate)) {
    keyStatus.textContent = 'Enter a valid key';
    keyInput.focus();
    return;
  }
  activeRequest?.abort();
  userApiKey = candidate;
  keyInput.value = '';
  keyStatus.textContent = 'Key added · not yet verified';
  disconnect.disabled = false;
};
disconnect.onclick = clearKey;
window.addEventListener('pagehide', clearKey);
document.querySelector('#assistant-form').onsubmit = async e => {
  e.preventDefault();
  const button = document.querySelector('#ask-assistant');
  const answer = document.querySelector('#assistant-answer');
  const progress = document.querySelector('#assistant-progress');
  if (!userApiKey) {
    answer.textContent = 'Paste your Groq key above and choose Use key first.';
    keyInput.focus();
    return;
  }
  const submittedKey = userApiKey;
  const controller = new AbortController();
  activeRequest = controller;
  const timeout = setTimeout(() => controller.abort(), 35000);
  progress.textContent = 'Requesting explanation…';
  button.disabled = true;
  answer.textContent = 'Reading your program…';
  try {
    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + submittedKey },
      body: JSON.stringify({ code: editor.getValue(), question: document.querySelector('#assistant-question').value }),
      signal: controller.signal
    });
    const data = await response.json();
    if (userApiKey !== submittedKey) return;
    answer.textContent = response.ok ? data.answer : data.error;
    progress.textContent = response.ok ? 'Explanation ready' : 'Request failed';
    if (response.ok) keyStatus.textContent = 'Connected to Groq';
    if (response.status === 401) keyStatus.textContent = 'Key rejected · replace it';
  } catch {
    answer.textContent = controller.signal.aborted ? 'Request cancelled or timed out.' : 'Could not connect. Please try again.';
    progress.textContent = 'Request stopped';
  } finally {
    clearTimeout(timeout);
    button.disabled = false;
    if (activeRequest === controller) activeRequest = undefined;
  }
};
document.querySelectorAll('[data-question]').forEach(button => button.onclick = () => {
  document.querySelector('#assistant-question').value = button.dataset.question;
  document.querySelector('#assistant-question').focus();
});
