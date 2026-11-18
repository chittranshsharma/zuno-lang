const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const highlight = document.querySelector('#code-highlight');
const terminalScreen = document.querySelector('#terminal-screen');
const terminalState = document.querySelector('#terminal-animation-status');
const caret = document.querySelector('.terminal-caret');
let outputFrame;

function highlightCode(animate = false) {
  const fragment = document.createDocumentFragment();
  const tokens = code.value.match(/"(?:\\.|[^"\\])*"|\b\d+(?:\.\d+)?\b|\b\w+\b|\s+|[^\w\s]/g) || [];
  let index = 0;
  for (const text of tokens) {
    const span = document.createElement('span');
    span.textContent = text;
    span.className = /^"/.test(text) ? 'syntax-string' : /^(let|fn|return|if|else|while|true|false)$/.test(text) ? 'syntax-keyword' : text === 'print' ? 'syntax-call' : /^\d/.test(text) ? 'syntax-number' : '';
    fragment.append(span);
    if (animate && !motionPreference.matches && text.trim() && index < 100) {
      span.classList.add('token-arrive');
      span.style.setProperty('--token-delay', Math.min(index++ * 14, 240) + 'ms');
    }
  }
  fragment.append(document.createTextNode('\n'));
  highlight.replaceChildren(fragment);
  highlight.scrollTop = code.scrollTop;
  highlight.scrollLeft = code.scrollLeft;
}
code.addEventListener('input', event => highlightCode(!event.isTrusted));
code.addEventListener('scroll', () => {
  highlight.scrollTop = code.scrollTop;
  highlight.scrollLeft = code.scrollLeft;
});

function animateOutput() {
  cancelAnimationFrame(outputFrame);
  const text = output.textContent;
  const characters = Array.from(text);
  const started = performance.now();
  const duration = Math.min(1600, Math.max(480, characters.length * 26));
  terminalState.textContent = 'Writing output…';
  caret.classList.add('is-typing');
  terminalScreen.classList.toggle('terminal-error', /^Line \d|limit|exceeds/.test(text));
  terminalScreen.textContent = '';
  const finish = () => {
    terminalScreen.textContent = text;
    terminalState.textContent = text === 'Ready to run.' ? 'Ready' : 'Output complete';
    caret.classList.remove('is-typing');
  };
  if (motionPreference.matches) { finish(); return; }
  function frame(now) {
    const progress = Math.min(1, (now - started) / duration);
    terminalScreen.textContent = characters.slice(0, Math.floor(characters.length * progress)).join('');
    if (progress < 1) outputFrame = requestAnimationFrame(frame);
    else finish();
  }
  outputFrame = requestAnimationFrame(frame);
}
new MutationObserver(animateOutput).observe(output, { childList: true, characterData: true, subtree: true });
motionPreference.addEventListener('change', () => {
  highlightCode();
  animateOutput();
});
highlightCode(true);
document.querySelector('.terminal-editor').classList.add('syntax-ready');
animateOutput();
const heroTitle = document.querySelector('.hero h1');
heroTitle.replaceChildren(...heroTitle.textContent.split(' ').flatMap((word, index) => {
  const span = document.createElement('span');
  span.className = 'premium-word';
  span.textContent = word;
  span.style.setProperty('--word-index', index);
  return [span, document.createTextNode(' ')];
}));
document.querySelectorAll('.workspace > *, .programs-card').forEach((element, index) => element.style.setProperty('--entrance-delay', 250 + index * 90 + 'ms'));
document.body.classList.add('premium-ready');
