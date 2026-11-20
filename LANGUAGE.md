# Zuno language guide

## Start with an idea

Use yap to show a value. Statements end with semicolons; braces group blocks. Numbers, double-quoted text, booleans, arrays, and functions are supported.

~~~text
vibe name = "world";
yap("Hello, " + name);
~~~

## Variables and constants

vibe creates a mutable binding. lock prevents reassignment of the binding; an array held by lock can still be mutated. Nested blocks have their own scope. Names are case-sensitive.

~~~text
vibe score = 10;
score = score + 5;
lock target = 20;
yap(score >= target);
~~~

## Choose your voice

Playful and conventional keywords share one runtime. vibe = let; lock = const; cook = func = fn; yap = say = print; yeet = return; fr = true; cap = false. These words are reserved. Line comments start with //.

~~~text
lock ready = fr;
if (ready && !cap) {
  yap("Let us cook");
}
~~~

## Expressions and maths

Arithmetic: +, -, *, /, %, **. Comparison: ==, !=, <, <=, >, >=. Logic: &&, ||, !. Powers bind before unary minus; multiplication binds before addition. Logical expressions short-circuit. Division by zero and non-finite results are errors.

~~~text
yap((2 + 3) ** 2);
yap(sqrt(81));
yap(round(8.6));
yap(floor(8.6));
yap(ceil(8.1));
yap(abs(-12));
~~~

## Conditions and repetition

if/else chooses a block. while repeats while its condition is truthy. for item in values iterates an array or text. range excludes its end and supports at most 10,000 items.

~~~text
vibe total = 0;
for n in range(1, 6) {
  total = total + n;
}
if (total == 15) {
  yap("Correct");
} else {
  yap("Try again");
}
~~~

## Functions, closures, recursion

Functions capture their surrounding scope. Pass exactly the declared number of arguments. A function can return another function. A missing return produces false. Calls may also stand alone as statements.

~~~text
cook multiplier(factor) {
  cook apply(value) {
    yeet value * factor;
  }
  yeet apply;
}
lock triple = multiplier(3);
yap(triple(14));
~~~

## Arrays that do useful work

Indexing starts at zero. Out-of-bounds reads are errors. push and pop mutate arrays; sort, reverse, and slice return copies. sort accepts numeric arrays. push currently accepts primitive values and caps arrays at 10,000 items. Nested arrays and indexed assignment are supported.

~~~text
vibe scores = [82, 94, 71, 88];
push(scores, 95);
lock average = sum(scores) / len(scores);
yap("Average: " + text(round(average)));
yap("Highest: " + text(max(scores)));
yap("Sorted: " + join(sort(scores), ", "));
assert(len(scores) == 5);
~~~

## Text processing

Use trim, split, join, upper, lower, contains, replace, and slice. replace changes every literal occurrence. Text indexes refer to UTF-16 code units; for iteration follows Unicode code points. Text produced by replace and join is limited to 100,000 characters.

~~~text
lock words = split(trim("code creates possibilities"), " ");
yap("Words: " + text(len(words)));
for word in words {
  yap(upper(word));
}
~~~

## Conversions and assertions

number converts numeric text and rejects non-finite results. text converts primitive values. assert stops the program with a useful error when its condition is false.

~~~text
lock price = number("19.5");
lock quantity = 3;
lock total = price * quantity;
assert(total > 0, "Total must be positive");
yap("Total: " + text(total));
~~~

## Run outside the browser

Install project dependencies, then run node cli.js examples/scoreboard.zuno. Use node cli.js --check examples/scoreboard.zuno to parse without executing. The CLI uses the same engine as the playground.

## Your workspace

Open examples and saved files in tabs. Ctrl+Enter runs code. Ctrl+Shift+P opens commands. Resize the editor and Explorer with drag handles or keyboard-accessible sliders. Syntax markers never execute your code. Runtime errors appear after Run. Private saved files require an account; optional autosave updates existing saved records. Hosting is deferred, so cross-device access requires your own deployed server.

## AI with review built in

Ctrl+Alt+B opens the Groq assistant. Paste your own key, then choose Use key. Ask selection attaches highlighted code. Chat streams Markdown, supports follow-ups, and can be stopped. Suggest edit opens a diff; Accept is undoable, Reject leaves the source untouched, and stale suggestions cannot overwrite newer edits. Keys and conversation history live only in page memory.

## Know the boundaries

This is an interpreted language for learning, algorithms, text processing, and small calculations. It is not yet a Python or C++ replacement. No package manager, inheritance, native compilation, networking, filesystem access from programs, or async execution. Source is capped at 100,000 characters; saved/imported programs at 5,000. Runs stop at 100,000 evaluation steps, 1,000 output lines, 200 parser nesting levels, or 100 nested function calls.

## Helper reference

Collections: len(value), range(end), range(start, end), push(array, primitive), pop(array), slice(value, start, end), reverse(array), sort(numbers), sum(numbers), min(numbers), max(numbers)

Text: upper(text), lower(text), trim(text), split(text, separator), join(array, separator), contains(text, part), replace(text, from, to)

Numbers and checks: abs(number), round(number), floor(number), ceil(number), sqrt(number), number(value), text(primitive), assert(condition, message)
## Dictionaries, classes, and modules

Dictionaries: vibe profile = {"name": "Avi", "score": 42}; profile.score = 43; yap(profile["name"]);
Keys must be text. Missing keys are errors. dict.keys, dict.values, dict.has, dict.remove operate on dictionaries.

Classes contain cook/fn/func methods. init initializes fields through this.field assignment. Instantiate by calling the class name. Methods bind their instance. No inheritance or static members.

Declare module name { declarations } then import name as alias;. A module exports every local declaration and executes once at declaration. Modules must be declared before import. Import bindings are constant.
Standard modules: math (abs, round, floor, ceil, sqrt, sum, min, max); strings (upper, lower, trim, split, join, contains, replace, text, number); arrays (len, range, push, pop, slice, reverse, sort); dict (keys, values, has, remove); testing (assert).
CLI file imports: import "./helper.zuno" as helper; on its own line. Paths are relative to the importing file and stay beneath the closest project root containing zuno.json (or the entry file directory for standalone files). Files execute once in dependency order; cycles and more than 100 files including the entry are rejected. Errors show original file positions. Browser file imports are not supported; use inline modules.

Create a project with `zuno init my-app`, enter it, and run `zuno run` or `zuno check`. The `entry` field in `zuno.json` selects the entry file; the generated project uses `src/main.zuno`. Explicit files/folders also work. Check parses the entry and all its imports without executing; unused files and static types are not checked. See [installation and projects](INSTALL.md).

~~~text
import math as m;
import dict as d;
module scoring {
  cook double(value) { yeet value * 2; }
}
import scoring as scores;
class Counter {
  cook init(start) { this.count = start; }
  cook next() {
    this.count = this.count + 1;
    yeet this.count;
  }
}
vibe counter = Counter(4);
vibe profile = {"name": "Avi", "score": scores.double(21)};
profile.score = profile.score + counter.next();
yap(profile.name);
yap(profile.score);
yap(join(d.keys(profile), ", "));
yap(m.sqrt(81));
~~~

## Readable dialect and browser apps

bet = if, nah = else, grind = while, each = for, and = &&, or = ||, not = !. Conditions may omit parentheses. Semicolons remain required on simple statements. All aliases are reserved.

The browser preview exposes import ui as app;. Methods: title(text), label(id,text), input(id,caption), value(id), set(id,text), button(caption,zeroArgumentFunction), clear(). UI text must be strings under 10,000 characters, IDs must be unique, and at most 200 top-level widgets are allowed. Callback functions retain lexical state and each event gets a fresh step budget. Rerun resets the program. Hide unloads it. Network and direct DOM access are unavailable; ui is unavailable in CLI runs. See examples/clicker-app.zuno and examples/converter-app.zuno.
