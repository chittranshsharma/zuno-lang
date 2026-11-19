import { setupStudio } from './studio.js';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import * as monaco from 'monaco-editor';
globalThis.MonacoEnvironment = { getWorker: () => new Worker('/assets/editor.worker.js', { type: 'module' }) };
const source = document.querySelector('#code');
monaco.languages.register({ id: 'lingua' });
monaco.languages.setMonarchTokensProvider('lingua', { tokenizer: { root: [
  [/\b(let|const|vibe|lock|fn|func|cook|yeet|return|for|in|if|else|while|true|false|fr|cap)\b/, 'keyword'],
  [/\b(print|say|yap)\b/, 'type'], [/"(?:\\.|[^"\\])*"/, 'string'], [/\d+(?:\.\d+)?/, 'number'], [/[a-zA-Z_]\w*/, 'identifier']
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
function show(open) { panel.hidden=!open; document.body.classList.toggle('assistant-open',open); toggle.setAttribute('aria-expanded',String(open)); if(open) document.querySelector('#assistant-question').focus(); else editor.focus(); }
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

const history = [];
let selectionContext = '';
let editMode = false;
const answerArea = document.querySelector('#assistant-answer');
const aiTools = document.createElement('div');
aiTools.className = 'assistant-prompts';
for (const [label, action] of [
  ['Ask selection', () => { selectionContext = editor.getModel().getValueInRange(editor.getSelection()); show(true); document.querySelector('#assistant-progress').textContent = selectionContext ? 'Selected code attached' : 'Select some code first'; }],
  ['Suggest edit', () => { editMode = true; selectionContext = ''; show(true); document.querySelector('#assistant-question').value = 'Improve this program'; }],
  ['Stop', () => activeRequest?.abort()],
  ['New chat', () => { if (activeRequest) return; history.length=0; answerArea.replaceChildren(); selectionContext=''; editMode=false; }]
]) { const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=action;aiTools.append(button); }
document.querySelector('#assistant-form').before(aiTools);
editor.addAction({ id:'ask-selection',label:'Ask AI about selection',contextMenuGroupId:'navigation',run:()=>aiTools.firstElementChild.click() });
function renderMessage(role, text) {
  const section=document.createElement('section');section.className='chat-message';
  const label=document.createElement('strong');label.textContent=role==='user'?'You':'Assistant';
  const content=document.createElement('div');section.append(label,content);answerArea.append(section);
  content.innerHTML=DOMPurify.sanitize(marked.parse(text));
  return content;
}
function previewEdit(original, proposed, model) {
  const dialog=document.createElement('dialog');dialog.className='edit-preview';
  const heading=document.createElement('h2');heading.textContent='Review suggested changes';
  const container=document.createElement('div');container.style.height='55vh';
  const accept=document.createElement('button');accept.textContent='Accept changes';
  const reject=document.createElement('button');reject.textContent='Reject';
  const status=document.createElement('p');
  dialog.append(heading,container,status,accept,reject);document.body.append(dialog);dialog.showModal();
  const before=monaco.editor.createModel(original,'lingua');const after=monaco.editor.createModel(proposed,'lingua');
  const diff=monaco.editor.createDiffEditor(container,{theme:'lingua-premium',automaticLayout:true,readOnly:true,renderSideBySide:innerWidth>700});
  diff.setModel({original:before,modified:after});
  accept.onclick=()=>{
    if(model.isDisposed()||model.getValue()!==original){status.textContent='The file changed since this suggestion. Ask for a fresh edit.';return;}
    model.pushStackElement();model.pushEditOperations([],[{range:model.getFullModelRange(),text:proposed}],()=>null);model.pushStackElement();dialog.close();
  };
  reject.onclick=()=>dialog.close();
  dialog.onclose=()=>{diff.dispose();before.dispose();after.dispose();dialog.remove();};
}
document.querySelector('#assistant-form').onsubmit = async e => {
  e.preventDefault();
  if(activeRequest)return;
  const button=document.querySelector('#ask-assistant');
  const progress=document.querySelector('#assistant-progress');
  if(!userApiKey){progress.textContent='Add your Groq key first.';keyInput.focus();return;}
  const question=document.querySelector('#assistant-question').value;
  const model=editor.getModel();const original=model.getValue();
  const code=selectionContext||original;const editing=editMode;
  if(code.length>5000){progress.textContent='Select a smaller block or keep code under 5000 characters.';return;}
  const controller=new AbortController();activeRequest=controller;
  const timeout=setTimeout(()=>controller.abort(),65000);
  const submittedKey=userApiKey;
  renderMessage('user',question);const content=renderMessage('assistant','');
  button.disabled=true;progress.textContent='Generating…';
  let reply='';let completed=false;
  try{
    const response=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+submittedKey},body:JSON.stringify({code,question,history:history.slice(-10),stream:true,edit:editing}),signal:controller.signal});
    if(!response.ok){const data=await response.json();throw new Error(data.error);}
    const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';
    while(true){
      const {done,value}=await reader.read();if(done)break;
      buffer+=decoder.decode(value,{stream:true});
      const lines=buffer.split('\n');buffer=lines.pop();
      for(const line of lines){
        if(!line.startsWith('data:'))continue;
        const data=line.slice(5).trim();if(data==='[DONE]'){completed=true;continue;}
        if(!data)continue;
        const event=JSON.parse(data);reply+=event.choices?.[0]?.delta?.content||'';
      }
      content.innerHTML=DOMPurify.sanitize(marked.parse(reply));
    }
    if(!completed)throw new Error('The response ended early. Please retry.');
    history.push({role:'user',content:question},{role:'assistant',content:reply.slice(0,12000)});
    if(history.length>10)history.splice(0,history.length-10);
    keyStatus.textContent='Connected to Groq';progress.textContent='Reply ready';
    if(editing){
      const match=reply.match(/```(?:lingua|zuno|veya)?\s*\n([\s\S]*?)```/);
      if(match && match[1].length<=5000)previewEdit(original,match[1].trim(),model);
      else progress.textContent='No complete replacement program returned. Ask again with a specific change.';
    }
  }catch(error){progress.textContent=controller.signal.aborted?'Generation stopped':error.message;if(!reply)content.textContent=progress.textContent;}
  finally{clearTimeout(timeout);button.disabled=false;activeRequest=undefined;selectionContext='';editMode=false;}
};
document.querySelectorAll('[data-question]').forEach(button => button.onclick = () => {
  document.querySelector('#assistant-question').value = button.dataset.question;
  document.querySelector('#assistant-question').focus();
});

setupStudio(monaco, editor, source, () => show(panel.hidden));
