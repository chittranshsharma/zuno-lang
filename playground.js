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
  counter: "import math as m;\nimport dict as d;\nmodule scoring {\n  cook double(value) { yeet value * 2; }\n}\nimport scoring as scores;\nclass Counter {\n  cook init(start) { this.count = start; }\n  cook next() {\n    this.count = this.count + 1;\n    yeet this.count;\n  }\n}\nvibe counter = Counter(4);\nvibe profile = {\"name\": \"Avi\", \"score\": scores.double(21)};\nprofile.score = profile.score + counter.next();\nyap(profile.name);\nyap(profile.score);\nyap(join(d.keys(profile), \", \"));\nyap(m.sqrt(81));\n",
  scoreboard: "vibe scores = [82, 94, 71, 88];\npush(scores, 95);\nlock average = sum(scores) / len(scores);\nyap(\"Average: \" + text(round(average)));\nyap(\"Highest: \" + text(max(scores)));\nyap(\"Sorted: \" + join(sort(scores), \", \"));\nassert(len(scores) == 5);\n",
  words: "lock words = split(trim(\"code creates possibilities\"), \" \");\nyap(\"Words: \" + text(len(words)));\nfor word in words {\n  yap(upper(word));\n}\n",
  modern: 'lock scores = range(1, 5);\ncook double(score) {\n  yeet score * 2;\n}\nfor score in scores {\n  yap(double(score));\n}',
  functions: 'fn double(number) {\n  return number * 2;\n}\nlet numbers = [2, 4, 6];\nprint(double(numbers[1]));',
  control: 'let n = 1;\nwhile (n <= 5) {\n  if (n % 2 == 0) {\n    print(n);\n  }\n  n = n + 1;\n}',
  hello: 'let name = "World";\nprint(name);',
  math: 'let a = 5;\nlet b = 3;\nprint(a + b);\nprint(a * b);',
  power: 'let answer = (2 + 3) ** 2;\nprint(answer);\nprint(10 % 3);'
};

document.querySelector('#example').addEventListener('change', event => {
  document.querySelector('#editor-filename').textContent = event.target.selectedOptions[0].textContent + '.zuno';
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
    output.textContent = Zuno.execute(code.value).join('\n') || 'Program finished with no output.';
    document.querySelector('#run-status').textContent = 'Finished in ' + (performance.now() - started).toFixed(1) + ' ms';
  } catch (error) {
    output.textContent = error.message;
    document.querySelector('#run-status').textContent = 'Check the error in Output';
  }
}
