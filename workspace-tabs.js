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
  function activate(id) {
    const entry = entries.get(id);
    if (!entry) return;
    if (entries.has(active)) entries.get(active).view = editor.saveViewState();
    active = id;
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
  function close(id) {
    const entry = entries.get(id);
    if (!entry) return;
    if (dirty(entry) && !confirm('Close ' + entry.name + ' and discard unsaved changes? Choose Cancel to keep editing, save, or export it.')) return;
    closed.push(snapshot(entry)); if (closed.length > 10) closed.shift();
    const ids=[...entries.keys()]; const index=ids.indexOf(id);
    entries.delete(id);
    if (id === active) {
      if (entries.size) activate(ids[index+1] || ids[index-1]);
      else newFile();
    }
    entry.model.dispose(); draw(); persist();
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
