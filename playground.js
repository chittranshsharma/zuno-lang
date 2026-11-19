const code = document.querySelector('#code');
const output = document.querySelector('#output');
const codeCount = document.querySelector('#code-count');
function updateCount() {
  const characters = code.value.length;
  const lines = characters ? code.value.split('\n').length : 0;
  codeCount.textContent = lines + ' lines · ' + characters + ' characters';
}
code.addEventListener('input', updateCount);
updateCount();
const examples = {
  modern: 'lock scores = range(1, 5);\ncook double(score) {\n  yeet score * 2;\n}\nfor score in scores {\n  yap(double(score));\n}',
  functions: 'fn double(number) {\n  return number * 2;\n}\nlet numbers = [2, 4, 6];\nprint(double(numbers[1]));',
  control: 'let n = 1;\nwhile (n <= 5) {\n  if (n % 2 == 0) {\n    print(n);\n  }\n  n = n + 1;\n}',
  hello: 'let name = "World";\nprint(name);',
  math: 'let a = 5;\nlet b = 3;\nprint(a + b);\nprint(a * b);',
  power: 'let answer = (2 + 3) ** 2;\nprint(answer);\nprint(10 % 3);'
};

document.querySelector('#example').addEventListener('change', event => {
  document.querySelector('#editor-filename').textContent = event.target.selectedOptions[0].textContent + '.lingua';
  code.value = examples[event.target.value];
  code.dispatchEvent(new Event('input'));
  output.textContent = 'Ready to run.';
});

document.querySelector('#run').addEventListener('click', runCode);
code.addEventListener('keydown', event => {
  if (event.ctrlKey && event.key === 'Enter') runCode();
});

function runCode() {
  const started = performance.now();
  try {
    output.textContent = Lingua.execute(code.value).join('\n') || 'Program finished with no output.';
    document.querySelector('#run-status').textContent = 'Finished in ' + (performance.now() - started).toFixed(1) + ' ms';
  } catch (error) {
    output.textContent = error.message;
    document.querySelector('#run-status').textContent = 'Check the error in Output';
  }
}
