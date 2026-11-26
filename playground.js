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
  pipeline: 'cook double(value) { yeet value * 2; }\ncook big(value) { yeet value > 5; }\ncook add(total, value) { yeet total + value; }\nvibe values = filter(map(range(1, 6), double), big);\nyap(join(values, ", "));\nyap("Total: " + text(reduce(values, add, 0)));',
  loopcontrol: 'vibe selected = [];\neach value in range(10, 0, -1) {\n  bet value % 2 == 0 { skip; }\n  bet len(selected) == 3 { dip; }\n  push(selected, value);\n}\nyap(join(selected, ", "));',
  quiz: "import ui as app;\nlock questions = [\"What does fr mean?\", \"Which keyword returns a value?\", \"Which keyword declares a constant?\"];\nlock answers = [\"true\", \"yeet\", \"lock\"];\nvibe current = 0;\nvibe score = 0;\napp.title(\"Zuno vibe check\");\napp.label(\"question\", questions[0]);\napp.input(\"answer\", \"Your answer\");\napp.label(\"progress\", \"Question 1 of 3\");\napp.label(\"feedback\", \"Type an answer and check it.\");\ncook check() {\n  bet current >= len(questions) {\n    app.set(\"feedback\", \"Quiz complete. Score: \" + text(score));\n    yeet cap;\n  }\n  lock answer = lower(trim(app.value(\"answer\")));\n  bet answer == answers[current] {\n    score = score + 1;\n    app.set(\"feedback\", \"No cap. Correct.\");\n  } nah {\n    app.set(\"feedback\", \"Answer: \" + answers[current]);\n  }\n  current = current + 1;\n  bet current < len(questions) {\n    app.set(\"question\", questions[current]);\n    app.set(\"answer\", \"\");\n    app.set(\"progress\", \"Question \" + text(current + 1) + \" of 3\");\n  } nah {\n    app.set(\"question\", \"You finished. Score: \" + text(score) + \" of 3\");\n    app.set(\"progress\", \"Done\");\n  }\n}\napp.button(\"Check answer\", check);\n",
  clicker: "import ui as app;\nvibe clicks = 0;\napp.title(\"Click check\");\napp.label(\"score\", \"Clicks: 0\");\ncook click() {\n  clicks = clicks + 1;\n  bet clicks >= 10 {\n    app.set(\"score\", \"Double digits. You cooked: \" + text(clicks));\n  } nah {\n    app.set(\"score\", \"Clicks: \" + text(clicks));\n  }\n}\ncook reset() {\n  clicks = 0;\n  app.set(\"score\", \"Clicks: 0\");\n}\napp.button(\"+1\", click);\napp.button(\"Reset\", reset);\n",
  converter: "import ui as app;\napp.title(\"Temperature check\");\napp.input(\"degrees\", \"Celsius\");\napp.label(\"result\", \"Enter a number, then convert.\");\ncook convert() {\n  lock value = number(app.value(\"degrees\"));\n  lock fahrenheit = value * 9 / 5 + 32;\n  app.set(\"result\", text(round(fahrenheit)) + \" F\");\n}\napp.button(\"Convert\", convert);\n",
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
  if(globalThis.ZunoWorkspace){
    globalThis.ZunoWorkspace.open({id:'example:'+event.target.value,name:event.target.selectedOptions[0].textContent+'.zuno',code:examples[event.target.value],savedCode:null,title:''});
    output.textContent='Ready to run.';return;
  }
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
  if (/^\s*import\s+"/m.test(code.value) && globalThis.ZunoRunProject) return globalThis.ZunoRunProject();
  if(globalThis.ZunoWorkspace && !globalThis.ZunoWorkspace.activeId){document.querySelector('#run-status').textContent='Create or open a file first.';return;}
  const started = performance.now();
  if (/\bimport\s+ui\s+as\b/.test(code.value)) {
    output.textContent = 'App running in preview. Use the controls below the workspace.';
    document.querySelector('#preview-app')?.click();
    return;
  }
  try {
    output.textContent = Zuno.execute(code.value).join('\n') || 'Program finished with no output.';
    document.querySelector('#run-status').textContent = 'Finished in ' + (performance.now() - started).toFixed(1) + ' ms';
  } catch (error) {
    output.textContent = error.message;
    document.querySelector('#run-status').textContent = 'Check the error in Output';
  }
}
