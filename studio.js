import { setupTabs } from './workspace-tabs.js';
export function setupStudio(monaco, editor, source, openAssistant) {
  document.body.classList.add('studio');
  const workspace = document.querySelector('.workspace');
  const previewCard=document.createElement('section');
  previewCard.className='card app-preview-card';
  const previewHead=document.createElement('header');previewHead.className='terminal-titlebar';
  const previewTitle=document.createElement('h2');previewTitle.textContent='App preview';
  const previewButton=document.createElement('button');previewButton.id='preview-app';previewButton.textContent='Preview app';
  const previewStatus=document.createElement('span');previewStatus.setAttribute('role','status');previewStatus.textContent='Sandboxed · no network access';
  const frame=document.createElement('iframe');frame.title='Zuno app preview';frame.sandbox='allow-scripts';frame.src='/app-preview.html';
  let ready=false;let pending=null;
  frame.onload=()=>{ready=true;if(pending!==null){frame.contentWindow.postMessage({type:'zuno-preview',code:pending},'*');pending=null;}};
  previewButton.onclick=()=>{
    if(!editor.getModel())return;
    previewCard.hidden=false;const program=editor.getValue();
    if(ready)frame.contentWindow.postMessage({type:'zuno-preview',code:program},'*');else pending=program;
    document.querySelector('#run-status').textContent='App preview updated';
    previewStatus.textContent='Sandboxed · rerun to reset state';
    previewCard.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  };
  const hidePreview=document.createElement('button');hidePreview.textContent='Hide';hidePreview.onclick=()=>{previewCard.hidden=true;frame.src='/app-preview.html';ready=false;};
  previewHead.append(previewTitle,previewButton,hidePreview);previewCard.append(previewHead,previewStatus,frame);previewCard.hidden=true;
  document.querySelector('.editor-main').append(previewCard);
  document.querySelector('.editor-actions').append(previewButton);
  source.addEventListener('input',()=>{if(!previewCard.hidden)previewStatus.textContent='Source changed · press Preview app to apply';});
  document.addEventListener('zuno-workspace-empty',()=>{previewCard.hidden=true;frame.src='/app-preview.html';ready=false;});
  const sourceCard = workspace.firstElementChild;
  const terminal = workspace.lastElementChild;
  sourceCard.classList.add('source-pane');
  terminal.classList.add('output-pane');
  document.querySelector('.hero h1').innerHTML='A little language. Room for <span class="hero-accent">big ideas.</span>';
  const topbar=document.querySelector('.topbar');
  const nav=document.querySelector('.links');
  nav.querySelector('[aria-current]').textContent='Explorer';
  const projects=document.createElement('button');projects.textContent='Projects';projects.onclick=()=>{const account=document.querySelector('.account-panel');account.open=true;account.scrollIntoView({block:'nearest',behavior:'smooth'});};nav.insertBefore(projects,nav.children[1]);
  const example=document.querySelector('#example');
  const exampleDialog=document.createElement('dialog');exampleDialog.className='examples-dialog';
  const exampleTitle=document.createElement('h2');exampleTitle.textContent='Start from an example';
  const exampleList=document.createElement('div');exampleList.className='example-grid';
  for(const option of example.options){const button=document.createElement('button');button.textContent=option.textContent;button.onclick=()=>{example.value=option.value;example.dispatchEvent(new Event('change'));exampleDialog.close();};exampleList.append(button);}
  const closeExamples=document.createElement('button');closeExamples.textContent='Close';closeExamples.onclick=()=>exampleDialog.close();
  exampleDialog.append(exampleTitle,exampleList,closeExamples);document.body.append(exampleDialog);
  example.hidden=true;example.style.display='none';
  const templates=document.createElement('button');templates.textContent='Examples';templates.onclick=()=>exampleDialog.showModal();nav.insertBefore(templates,nav.children[2]);
  const cursor=document.createElement('span');cursor.id='cursor-position';cursor.textContent='Ln 1, Col 1';
  document.querySelector('#code-count').before(cursor);
  editor.onDidChangeCursorPosition(event=>cursor.textContent='Ln '+event.position.lineNumber+', Col '+event.position.column);
  const imports=document.querySelector('.programs-card');
  imports.classList.add('compact-imports');
  const copy=document.createElement('button');copy.textContent='Copy output';copy.type='button';
  copy.onclick=async()=>{try{await navigator.clipboard.writeText(document.querySelector('#output').textContent);copy.textContent='Copied';setTimeout(()=>copy.textContent='Copy output',1500);}catch{copy.textContent='Copy unavailable';}};
  terminal.querySelector('.editor-actions').append(copy);
  const tabs = document.createElement('div');
  tabs.className = 'editor-tabs';
  tabs.setAttribute('aria-label', 'Open files');
  sourceCard.prepend(tabs);
  const tabWorkspace=setupTabs(monaco,editor,source,tabs);
  globalThis.ZunoWorkspace=tabWorkspace;
  const runtimeErrors=document.createElement('div');
  terminal.append(runtimeErrors);
  new MutationObserver(()=>{
    const match=document.querySelector('#output').textContent.match(/Line (\d+), column (\d+): (.*)/);
    runtimeErrors.replaceChildren();
    if(match){const button=document.createElement('button');button.textContent='Jump to error: '+match[3];button.onclick=()=>{editor.setPosition({lineNumber:+match[1],column:+match[2]});editor.revealLineInCenter(+match[1]);editor.focus();};runtimeErrors.append(button);}
  }).observe(document.querySelector('#output'),{childList:true,subtree:true,characterData:true});
  const problems = document.createElement('div');
  problems.className = 'problems';
  terminal.prepend(problems);
  let timer;
  function diagnostics() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const model = editor.getModel();
      if(!model){problems.textContent='Open a file to get started';return;}
      let markers = [];
      try { globalThis.Zuno.parse(model.getValue()); }
      catch (error) {
        const location = error.message.match(/Line (\d+), column (\d+): (.*)/);
        if (location) markers = [{ startLineNumber: +location[1], endLineNumber: +location[1], startColumn: +location[2], endColumn: +location[2] + 1, message: location[3], severity: monaco.MarkerSeverity.Error }];
      }
      monaco.editor.setModelMarkers(model, 'zuno', markers);
      problems.replaceChildren();
      for (const marker of markers) {
        const button = document.createElement('button');
        button.textContent = `Line ${marker.startLineNumber}: ${marker.message}`;
        button.onclick = () => { editor.setPosition({ lineNumber:marker.startLineNumber,column:marker.startColumn }); editor.revealLineInCenter(marker.startLineNumber); editor.focus(); };
        problems.append(button);
      }
      if (!markers.length) problems.textContent = 'No syntax errors';
    }, 250);
  }
  editor.onDidChangeModelContent(diagnostics);
  editor.onDidChangeModel(diagnostics);
  diagnostics();
  monaco.languages.registerCompletionItemProvider('zuno', { provideCompletionItems(model, position) {
    const word = model.getWordUntilPosition(position);
    const range = { startLineNumber:position.lineNumber,endLineNumber:position.lineNumber,startColumn:word.startColumn,endColumn:word.endColumn };
    const names = new Set(['len','range','upper','lower','abs','round','join','push','pop','slice','reverse','sort','sum','min','max','split','trim','contains','replace','text','number','floor','ceil','sqrt','assert','vibe','lock','cook','yap','yeet','fr','cap','bet','nah','grind','each','and','or','not']);
    for (const match of model.getValue().matchAll(/\b(?:let|const|vibe|lock|fn|func|cook|class)\s+(\w+)|\b(?:fn|func|cook)\s+\w+\s*\(([^)]*)\)/g)) {
      if (match[1]) names.add(match[1]);
      if (match[2]) match[2].split(',').map(s=>s.trim()).filter(Boolean).forEach(n=>names.add(n));
    }
    for (const match of model.getValue().matchAll(/\b(?:fn|func|cook)\s+\w+\s*\(([^)]*)\)/g)) match[1].split(',').map(s=>s.trim()).filter(Boolean).forEach(n=>names.add(n));
    return { suggestions:[...names].map(label=>({label,insertText:label,range,kind:monaco.languages.CompletionItemKind.Variable})) };
  } });
  function separator(target, axis, min, max, initial) {
    const range = document.createElement('input');
    range.type='range'; range.min=min; range.max=max; range.value=initial;
    range.setAttribute('aria-label', axis === 'width' ? 'Explorer width' : 'Editor height');
    range.className='panel-resizer';
    function resize(value) { const next=Math.max(+min,Math.min(+max,+value)); range.value=next; target.style[axis]=next+'px'; editor.layout(); }
    range.oninput=()=>resize(range.value);
    const handle=document.createElement('div');handle.className='drag-resizer '+axis;
    handle.setAttribute('role','separator');handle.setAttribute('aria-label',axis==='width'?'Resize Explorer':'Resize editor');handle.tabIndex=0;
    handle.setAttribute('aria-orientation',axis==='width'?'vertical':'horizontal');
    handle.onkeydown=event=>{if(['ArrowLeft','ArrowDown','ArrowRight','ArrowUp'].includes(event.key)){event.preventDefault();resize(+range.value+(['ArrowRight','ArrowDown'].includes(event.key)?20:-20));}};
    handle.onpointerdown=event=>{
      handle.setPointerCapture(event.pointerId);
      const start=axis==='width'?event.clientX:event.clientY;const size=+range.value;
      handle.onpointermove=move=>resize(size+(axis==='width'?move.clientX:move.clientY)-start);
      handle.onpointerup=()=>{handle.onpointermove=null;};
      handle.onlostpointercapture=()=>{handle.onpointermove=null;};
    };
    target.append(handle);
    target.append(range);
  }
  separator(document.querySelector('.explorer-panel'),'width',180,400,240);
  separator(document.querySelector('#monaco-editor'),'height',240,800,420);
  const palette = document.createElement('dialog');
  palette.className='command-palette';
  palette.innerHTML='<label for="command-search">Commands, files and examples</label><input id="command-search" placeholder="Search…"><div class="command-results"></div><button class="close-palette">Close</button>';
  document.body.append(palette);
  const search = palette.querySelector('input');
  function commands() {
    const items = [ ['Run program',()=>document.querySelector('#run').click()],['Toggle AI assistant',()=>openAssistant()],['New file',()=>tabWorkspace.newFile()],['Close current file',()=>tabWorkspace.closeCurrent()],['Reopen closed file',()=>tabWorkspace.reopen()],['Export file',()=>document.querySelector('#export-code').click()],['Toggle minimap',()=>editor.updateOptions({minimap:{enabled:!editor.getOption(monaco.editor.EditorOption.minimap).enabled}})],['Toggle word wrap',()=>editor.updateOptions({wordWrap:editor.getOption(monaco.editor.EditorOption.wordWrap)==='off'?'on':'off'})] ];
    for (const option of document.querySelector('#example').options) items.push(['Example: '+option.textContent,()=>{ document.querySelector('#example').value=option.value; document.querySelector('#example').dispatchEvent(new Event('change')); }]);
    for (const button of document.querySelectorAll('.tree-file')) items.push(['File: '+button.textContent,()=>button.click()]);
    const list=palette.querySelector('.command-results'); list.replaceChildren();
    items.filter(([label])=>label.toLowerCase().includes(search.value.toLowerCase())).forEach(([label,action])=>{ const button=document.createElement('button'); button.textContent=label; button.onclick=()=>{palette.close();action();}; list.append(button); });
  }
  search.oninput=commands;
  search.onkeydown=e=>{ if(e.key==='Enter') palette.querySelector('.command-results button')?.click(); if(e.key==='ArrowDown') palette.querySelector('.command-results button')?.focus(); };
  palette.querySelector('.close-palette').onclick=()=>palette.close();
  const open=()=>{ commands();palette.showModal();search.focus(); };
  editor.addCommand(monaco.KeyMod.CtrlCmd|monaco.KeyMod.Shift|monaco.KeyCode.KeyP,open);
  document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.code==='KeyP'){e.preventDefault();if(!palette.open)open();}});
  const commandButton=document.createElement('button');commandButton.textContent='Commands · Ctrl+Shift+P';commandButton.onclick=open;commandButton.className='header-search';commandButton.textContent='⌕  Search commands…';commandButton.setAttribute('aria-label','Search commands');topbar.append(commandButton);
  const account=document.createElement('details');account.className='account-panel';
  account.innerHTML='<summary id="account-state">Private projects · Sign in</summary><form id="account-form"><label>Email<input name="email" type="email" required autocomplete="email"></label><label>Password<input name="password" type="password" minlength="12" maxlength="128" required autocomplete="current-password"></label><button name="action" value="login">Sign in</button><button name="action" value="register">Create account</button></form><button id="sign-out" type="button" hidden>Sign out</button><p id="account-message" role="status"></p>';
  document.querySelector('.explorer-panel').append(account);
  let loggedIn=false;
  async function accountState(){
    const response=await fetch('/api/auth/me');if(!response.ok)throw new Error('Account service unavailable');const data=await response.json();
    loggedIn=Boolean(data.user);
    account.querySelector('#account-state').textContent=data.user?.email||'Private projects · Sign in';
    account.querySelector('form').hidden=loggedIn;account.querySelector('#sign-out').hidden=!loggedIn;
    await globalThis.loadPrograms();
    tabWorkspace.setScope(data.user?.email || 'guest');
  }
  account.querySelector('form').onsubmit=async event=>{
    event.preventDefault();const form=new FormData(event.target);
    try{
      const response=await fetch('/api/auth/'+event.submitter.value,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.get('email'),password:form.get('password')})});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      event.target.reset();await accountState();account.querySelector('#account-message').textContent='Your files are private to this account.';
    }catch(error){account.querySelector('#account-message').textContent=error.message;}
  };
  account.querySelector('#sign-out').onclick=async()=>{
    clearTimeout(saveTimer);
    loggedIn=false;
    const response=await fetch('/api/auth/logout',{method:'POST'});
    if(!response.ok){account.querySelector('#account-message').textContent='Could not sign out. Please retry.';loggedIn=true;return;}
    await accountState();
  };
  accountState().catch(()=>{tabWorkspace.setScope('guest');account.querySelector('#account-message').textContent='Account service unavailable. Using your local guest workspace.';});
  const autosave=document.createElement('label');autosave.className='autosave-toggle';autosave.innerHTML='<input type="checkbox"> Autosave saved files';
  account.append(autosave);
  let saveTimer;
  editor.onDidChangeModelContent(()=>{
    clearTimeout(saveTimer);
    if(!loggedIn||!autosave.querySelector('input').checked)return;
    const id=document.querySelector('#saved-programs').value;
    if(!id)return;
    const tabId=tabWorkspace.activeId;
    const snapshot={title:document.querySelector('#program-title').value,folder:document.querySelector('#program-folder').value,code:editor.getValue()};
    saveTimer=setTimeout(async()=>{
      try{const response=await fetch('/api/programs/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot)});const data=await response.json();if(!response.ok)throw new Error(data.error);document.querySelector('#editor-state').textContent=editor.getValue()===snapshot.code?'Autosaved':'Unsaved changes';
        tabWorkspace.markSaved(tabId,data);}
      catch(error){document.querySelector('#editor-state').textContent=error.message;}
    },1200);
  });

}
