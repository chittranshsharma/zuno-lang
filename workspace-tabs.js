export function setupTabs(monaco, editor, source, container) {
  const entries = new Map();
  const closed = [];
  let active;
  let scope;
  let syncing = false;
  let saveTimer;
  let sequence = 0;
  const field = id => document.querySelector(id);
  const status = message => { field('#run-status').textContent = message; };
  const dirty = entry => entry.model.getValue() !== (entry.savedCode ?? '');
  const snapshot = entry => ({ id:entry.id, name:entry.name, code:entry.model.getValue(), savedId:entry.savedId, savedCode:entry.savedCode, title:entry.title, folder:entry.folder });
  function persist() {
    clearTimeout(saveTimer);
    if (!scope) return;
    try {
      const data = JSON.stringify({ version:1, active, files:[...entries.values()].map(snapshot) });
      if (data.length > 2000000) throw new Error('Workspace too large');
      localStorage.setItem('zuno.tabs.' + scope, data);
    } catch { status('Local recovery unavailable. Save or export your work.'); }
  }
  function syncFields(entry) {
    field('#editor-filename').textContent = entry.name;
    const list = field('#saved-programs');
    if (entry.savedId && ![...list.options].some(option=>option.value===entry.savedId)) list.add(new Option(entry.title,entry.savedId));
    list.value = entry.savedId || '';
    field('#program-title').value = entry.title || '';
    field('#program-folder').value = entry.folder || 'General';
    field('#update-program').disabled = !entry.savedId;
    field('#delete-program').disabled = !entry.savedId;
    document.dispatchEvent(new CustomEvent('studio-file-selected',{detail:{savedCode:entry.savedCode ?? null}}));
  }
  const empty=document.createElement('div');empty.className='workspace-empty-state';
  const create=document.createElement('button');create.textContent='+ New file';create.onclick=()=>newFile();empty.append(create);container.after(empty);
  function showEmpty(){
    active=undefined;syncing=true;editor.setModel(null);source.value='';source.dispatchEvent(new Event('input'));syncing=false;
    field('#saved-programs').value='';field('#program-title').value='';
    field('#update-program').disabled=true;field('#delete-program').disabled=true;
    document.body.classList.add('workspace-empty');document.dispatchEvent(new Event('zuno-workspace-empty'));draw();persist();
  }
  function activate(id) {
    const entry = entries.get(id);
    if (!entry) return;
    if (entries.has(active)) entries.get(active).view = editor.saveViewState();
    active = id;
    document.body.classList.remove('workspace-empty');
    syncing = true;
    editor.setModel(entry.model);
    syncFields(entry);
    source.value = entry.model.getValue(); source.dispatchEvent(new Event('input'));
    if (entry.view) editor.restoreViewState(entry.view);
    syncing = false;
    draw(); persist(); editor.focus();
  }
  function open(file) {
    const existing = [...entries.values()].find(entry=>file.savedId ? entry.savedId===file.savedId : file.id && entry.id===file.id);
    if (existing) { activate(existing.id); return; }
    if (entries.size >= 40) { status('Close a tab before opening more than 40 files.'); return; }
    const id = file.id || crypto.randomUUID();
    const entry = { ...file, id, model:monaco.editor.createModel(file.code || '', 'zuno'), savedId:file.savedId || '', folder:file.folder || 'General' };
    entries.set(id,entry); activate(id);
  }
  function newFile() {
    let name;
    do { name = 'untitled-' + (++sequence) + '.zuno'; } while ([...entries.values()].some(entry=>entry.name===name));
    open({ name, code:'', savedCode:null, title:'' });
  }
  async function saveBeforeClose(entry){
    return new Promise(resolve=>{
      const dialog=document.createElement('dialog');dialog.className='close-file-dialog';
      const heading=document.createElement('h2');heading.textContent='Save changes to '+entry.name+'?';
      const description=document.createElement('p');description.textContent='Save your work before closing this file.';
      const nameLabel=document.createElement('label');nameLabel.textContent='File name';
      const name=document.createElement('input');name.value=entry.title||entry.name.replace(/\.zuno$/i,'');name.maxLength=80;nameLabel.append(name);
      const destination=document.createElement('select');destination.setAttribute('aria-label','Save destination');
      if(scope && scope!=='guest')destination.add(new Option('Save to my account','cloud'));
      destination.add(new Option('Download .zuno file','download'));
      const error=document.createElement('p');error.setAttribute('role','status');
      const actions=document.createElement('div');actions.className='close-file-actions';
      const save=document.createElement('button');save.textContent='Save';
      const discard=document.createElement('button');discard.textContent="Don’t save";
      const cancel=document.createElement('button');cancel.textContent='Cancel';
      let settled=false;
      const finish=value=>{if(settled)return;settled=true;dialog.close();dialog.remove();resolve(value);};
      discard.onclick=()=>finish(true);cancel.onclick=()=>finish(false);
      dialog.oncancel=event=>{event.preventDefault();finish(false);};
      save.onclick=async()=>{
        const title=name.value.trim();if(!title){error.textContent='Enter a file name.';return;}
        const content=entry.model.getValue();
        save.disabled=true;discard.disabled=true;
        try{
          if(destination.value==='cloud'){
            const response=await fetch('/api/programs'+(entry.savedId?'/'+entry.savedId:''),{method:entry.savedId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,code:content,folder:entry.folder||'General'})});
            const record=await response.json();if(!response.ok)throw new Error(record.error||'Could not save.');
            if(entries.get(entry.id)!==entry||entry.model.isDisposed())return finish(false);
            markSaved(entry.id,record);globalThis.loadPrograms?.();
          }else{
            if(window.showSaveFilePicker){
              const handle=await window.showSaveFilePicker({suggestedName:title+'.zuno',types:[{description:'Zuno source',accept:{'text/plain':['.zuno']}}]});
              const writable=await handle.createWritable();await writable.write(content);await writable.close();
            }else{
              const url=URL.createObjectURL(new Blob([content],{type:'text/plain'}));const link=document.createElement('a');link.href=url;link.download=title.replace(/[^a-zA-Z0-9_. -]/g,'_')+'.zuno';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
            }
          }
          if(entries.get(entry.id)!==entry||entry.model.isDisposed())return finish(false);
          if(entry.model.getValue()!==content)throw new Error('File changed while saving. Review the new changes before closing.');
          finish(true);
        }catch(reason){error.textContent=reason.name==='AbortError'?'Save cancelled. Your file is still open.':reason.message;}
        finally{save.disabled=false;discard.disabled=false;}
      };
      actions.append(save,discard,cancel);dialog.append(heading,description,nameLabel,destination,error,actions);document.body.append(dialog);dialog.showModal();cancel.focus();
    });
  }
  let closePending=false;
  async function close(id) {
    const entry=entries.get(id);if(!entry||closePending)return;
    closePending=true;
    try{
      if(dirty(entry)&&!await saveBeforeClose(entry))return;
      if(entries.get(id)!==entry)return;
      closed.push(snapshot(entry));if(closed.length>10)closed.shift();
      const ids=[...entries.keys()];const index=ids.indexOf(id);entries.delete(id);
      if(id===active){if(entries.size)activate(ids[index+1]||ids[index-1]);else showEmpty();}
      entry.model.dispose();draw();persist();
    }finally{closePending=false;}
  }
  function reopen() { const entry=closed.pop(); if (entry) open(entry); }
  function draw() {
    container.replaceChildren();
    for (const entry of entries.values()) {
      const tab=document.createElement('div'); tab.className='file-tab'; tab.dataset.active=String(entry.id===active);
      const select=document.createElement('button');select.className='file-tab-select';select.textContent=entry.name;
      select.setAttribute('aria-pressed',String(entry.id===active));select.title=entry.name+(dirty(entry)?' · Unsaved changes':'');
      select.onclick=()=>activate(entry.id);
      const dot=document.createElement('span');dot.className='file-tab-dirty';dot.textContent=dirty(entry)?'●':'';dot.setAttribute('aria-label',dirty(entry)?'Unsaved changes':'Saved');
      const remove=document.createElement('button');remove.className='file-tab-close';remove.textContent='×';remove.setAttribute('aria-label','Close '+entry.name);remove.onclick=()=>close(entry.id);
      tab.onauxclick=event=>{if(event.button===1){event.preventDefault();close(entry.id);}};
      tab.append(select,dot,remove);container.append(tab);
    }
    const add=document.createElement('button');add.className='new-file-tab';add.textContent='+';add.title='New file · Ctrl+Alt+N';add.setAttribute('aria-label','New file tab');add.onclick=newFile;container.append(add);
  }
  function changed() {
    if (syncing || !entries.has(active)) return;
    const entry=entries.get(active);
    entry.title=field('#program-title').value;
    entry.folder=field('#program-folder').value;
    draw(); clearTimeout(saveTimer); saveTimer=setTimeout(persist,250);
  }
  editor.onDidChangeModelContent(changed);
  field('#program-title').addEventListener('input',changed);
  field('#program-folder').addEventListener('input',changed);
  function markSaved(id, record) {
    const entry=entries.get(id);if(!entry)return;
    entry.savedId=record._id;entry.savedCode=record.code;entry.title=record.title;entry.name=record.title+'.zuno';entry.folder=record.folder;
    if(id===active)syncFields(entry);
    draw();persist();
  }
  function detachSaved(savedId) {
    for(const entry of entries.values())if(entry.savedId===savedId){entry.savedId='';entry.savedCode=null;}
    if(entries.has(active))syncFields(entries.get(active));
    draw();persist();
  }
  function setScope(next) {
    if (next===scope)return;
    persist();syncing=true;
    editor.setModel(null);for(const entry of entries.values())entry.model.dispose();entries.clear();closed.length=0;active=undefined;
    scope=next;
    let data;
    try { data=JSON.parse(localStorage.getItem('zuno.tabs.'+scope)); } catch {}
    if(data?.version===1 && Array.isArray(data.files)) {
      for(const file of data.files.slice(0,40)) {
        if(typeof file.id!=='string'||typeof file.name!=='string'||typeof file.code!=='string'||file.code.length>100000)continue;
        entries.set(file.id,{id:file.id,name:file.name,model:monaco.editor.createModel(file.code,'zuno'),savedId:typeof file.savedId==='string'?file.savedId:'',savedCode:typeof file.savedCode==='string'?file.savedCode:null,title:typeof file.title==='string'?file.title:'',folder:typeof file.folder==='string'?file.folder:'General'});
      }
    }
    syncing=false;
    if(entries.size)activate(entries.has(data.active)?data.active:entries.keys().next().value);
    else if(data?.version===1 && Array.isArray(data.files))showEmpty();
    else {
      let draft='yap("Ready to cook");';
      if(scope==='guest'){try{const legacy=localStorage.getItem('zuno.workspace.draft');if(legacy!==null&&legacy.length<=100000)draft=legacy;}catch{}}
      open({name:'untitled.zuno',code:draft,savedCode:null,title:''});
    }
  }
  window.addEventListener('pagehide',persist);
  const shortcut=event=>{
    if(event.ctrlKey&&event.altKey&&event.code==='KeyN'){event.preventDefault();newFile();}
    if(event.ctrlKey&&event.shiftKey&&event.code==='KeyT'){event.preventDefault();reopen();}
  };
  document.addEventListener('keydown',shortcut);
  editor.addCommand(monaco.KeyMod.CtrlCmd|monaco.KeyMod.Alt|monaco.KeyCode.KeyN,newFile);
  editor.addCommand(monaco.KeyMod.CtrlCmd|monaco.KeyMod.Shift|monaco.KeyCode.KeyT,reopen);
  const initial=editor.getModel();
  open({name:field('#editor-filename').textContent,code:source.value,title:'',savedCode:null});
  initial.dispose();
  return {open,newFile,detachSaved,closeCurrent:()=>close(active),reopen,setScope,markSaved,persist,get activeId(){return active;}};
}
