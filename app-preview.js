const app = document.querySelector('#app');
const errorBox = document.querySelector('#error');
const fields = new Map();
let generation = 0;
function string(value) {
  if (typeof value !== 'string' || value.length > 10000) throw new Error('UI values must be text under 10000 characters');
  return value;
}
function append(element) {
  if (app.childElementCount >= 200) throw new Error('App widget limit reached');
  app.append(element);
  return element;
}
function unique(id) {
  string(id);
  if (fields.has(id)) throw new Error('Duplicate widget ID: ' + id);
}
function report(error) {
  errorBox.textContent = error.message;
}
window.addEventListener('message', event => {
  if (event.source !== parent || event.data?.type !== 'zuno-preview' || typeof event.data.code !== 'string') return;
  generation++;
  const current = generation;
  app.replaceChildren(); fields.clear(); errorBox.textContent = '';
  const ui = {
    title(text) { const element = document.createElement('h1'); element.textContent = string(text); append(element); return true; },
    label(id, text) { unique(id); const element = document.createElement('p'); element.textContent = string(text); fields.set(id, append(element)); return true; },
    input(id, caption) {
      unique(id); const label = document.createElement('label'); label.textContent = string(caption);
      const input = document.createElement('input'); input.maxLength = 10000; label.append(input); append(label); fields.set(id, input); return true;
    },
    value(id) { const element = fields.get(string(id)); if (!element || element.tagName !== 'INPUT') throw new Error('Unknown input: ' + id); return element.value; },
    set(id, text) { const element = fields.get(string(id)); if (!element) throw new Error('Unknown widget: ' + id); if (element.tagName === 'INPUT') element.value = string(text); else element.textContent = string(text); return true; },
    button(caption, callback) { const button = document.createElement('button'); button.textContent = string(caption); button.onclick = () => { if (current === generation) { errorBox.textContent = ''; callback(); } }; append(button); return true; },
    clear() { app.replaceChildren(); fields.clear(); return true; }
  };
  try { Zuno.execute(event.data.code, 100000, false, { ui, onError: report }); }
  catch (error) { report(error); }
});
