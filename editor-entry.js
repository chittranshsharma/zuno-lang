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
monaco.editor.defineTheme('lingua-premium', { base:'vs',inherit:true,rules:[{token:'keyword',foreground:'80529A'},{token:'string',foreground:'437548'},{token:'number',foreground:'9A5B23'}], colors:{'editor.background':'#FAFAF7','editor.foreground':'#26251E','editorLineNumber.foreground':'#807D72','editor.lineHighlightBackground':'#EFEEE8','editorCursor.foreground':'#26251E','editor.selectionBackground':'#DDDCD5'} });
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
document.querySelector('#assistant-form').onsubmit=async e=>{
  e.preventDefault();
  const button=document.querySelector('#ask-assistant');
  const answer=document.querySelector('#assistant-answer');
  document.querySelector('#assistant-progress').textContent='Reading code · requesting explanation';
  button.disabled=true; answer.textContent='Reading your program…';
  try {
    const response=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:editor.getValue(),question:document.querySelector('#assistant-question').value}),signal:AbortSignal.timeout(35000)});
    const data=await response.json();
    answer.textContent=response.ok ? data.answer : data.error;
  } catch { answer.textContent='Could not connect. Please try again.'; }
  finally { button.disabled=false; document.querySelector('#assistant-progress').textContent='Request finished'; }
};


document.querySelectorAll('[data-question]').forEach(button => button.onclick=()=>{
  document.querySelector('#assistant-question').value=button.dataset.question;
  document.querySelector('#assistant-question').focus();
});
