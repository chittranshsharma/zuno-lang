const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const exampleSelect = document.querySelector('#example');
const preview = document.querySelector('#output');
const previewTitle = document.querySelector('#morph-title');
const menu = document.querySelector('#example-branches');
let activeExample = 'hello';
let previewTokens = [];

function renderCodePreview(source, animate = true) {
  const previous = new Map();
  for (const token of previewTokens) {
    const queue = previous.get(token.text) || [];
    queue.push({ element: token.element, rect: token.element.getBoundingClientRect() });
    previous.set(token.text, queue);
  }
  const next = [];
  const fragment = document.createDocumentFragment();
  const pieces = source.match(/"(?:\\.|[^"\\])*"|\b\d+(?:\.\d+)?\b|\b\w+\b|\s+|[^\w\s]/g) || [];
  for (const text of pieces) {
    const old = previous.get(text)?.shift();
    const element = old?.element || document.createElement('span');
    for (const animation of element.getAnimations()) animation.cancel();
    element.textContent = text;
    element.className = /^\s+$/.test(text) ? 'morph-space' : /^"/.test(text) ? 'morph-string' : /^(let|fn|return|if|else|while|print|true|false)$/.test(text) ? 'morph-keyword' : /^\d/.test(text) ? 'morph-number' : '';
    fragment.append(element);
    next.push({ text, element, old: old?.rect });
  }
  preview.replaceChildren(fragment);
  if (animate && !motionPreference.matches) {
    for (const token of next) {
      if (!token.text.trim()) continue;
      const rect = token.element.getBoundingClientRect();
      const from = token.old ? { transform: `translate(${token.old.x - rect.x}px, ${token.old.y - rect.y}px)`, opacity: 1 } : { transform: 'translateY(6px)', opacity: 0 };
      token.element.animate([from, { transform: 'translate(0, 0)', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
  }
  previewTokens = next;
}

function setExample(key) {
  activeExample = key;
  const option = [...exampleSelect.options].find(item => item.value === key);
  previewTitle.textContent = option.textContent;
  for (const button of menu.querySelectorAll('[data-example]')) {
    const selected = button.dataset.example === key;
    button.setAttribute('aria-pressed', String(selected));
    button.closest('.branch-row').classList.toggle('is-selected', selected);
  }
}

const groups = [
  { title: 'Start here', keys: ['hello', 'math', 'power'] },
  { title: 'Go further', keys: ['control', 'functions'] }
];
for (const [index, group] of groups.entries()) {
  const section = document.createElement('section');
  section.className = 'branch-section';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'branch-trigger';
  trigger.textContent = group.title;
  trigger.setAttribute('aria-expanded', 'true');
  trigger.setAttribute('aria-controls', 'branch-group-' + index);
  const body = document.createElement('div');
  body.id = 'branch-group-' + index;
  body.className = 'branch-body';
  for (const key of group.keys) {
    const row = document.createElement('div');
    row.className = 'branch-row';
    row.innerHTML = '<svg viewBox="0 0 40 44" aria-hidden="true"><path class="branch-base" d="M 10 0 V 12 Q 10 22 20 22 H 34"/><path class="branch-reach" pathLength="1" d="M 10 0 V 12 Q 10 22 20 22 H 34"/></svg>';
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.example = key;
    button.textContent = [...exampleSelect.options].find(option => option.value === key).textContent;
    button.addEventListener('click', () => setExample(key));
    row.append(button);
    body.append(row);
  }
  trigger.addEventListener('click', () => {
    const open = trigger.getAttribute('aria-expanded') !== 'true';
    trigger.setAttribute('aria-expanded', String(open));
    body.hidden = !open;
  });
  section.append(trigger, body);
  menu.append(section);
}
exampleSelect.addEventListener('change', () => setExample(exampleSelect.value));
document.querySelector('#load-preview').addEventListener('click', () => {
  if (code.value.trim() && code.value !== examples[activeExample] && !confirm('Replace the editor with this example? Export or save your current code first.')) return;
  exampleSelect.value = activeExample;
  exampleSelect.dispatchEvent(new Event('change'));
  code.focus();
});
motionPreference.addEventListener('change', () => {
  for (const token of previewTokens) for (const animation of token.element.getAnimations()) animation.cancel();
});
setExample('hello');
const outputObserver = new MutationObserver(() => {
  const text = preview.textContent;
  outputObserver.disconnect();
  renderCodePreview(text);
  outputObserver.observe(preview, { childList: true, characterData: true, subtree: true });
});
renderCodePreview(preview.textContent, false);
outputObserver.observe(preview, { childList: true, characterData: true, subtree: true });
