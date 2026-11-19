# Lingua language reference

Programs use `let name = value;`, `name = value;`, and `print(value);`. Statements may span lines or share a line. Semicolons are required. Values are finite numbers, double-quoted strings with JSON escapes, and `true` / `false`.

```text
let total = 0;
let number = 1;
while (number <= 5) {
  total = total + number;
  number = number + 1;
}
if (total == 15) {
  print("Sum: " + total);
} else {
  print("Try again");
}
```

Braced blocks introduce a scope. A declaration belongs to its block; assignment updates the nearest existing variable. Redeclaring a name in the same block is an error. An inner block may shadow an outer name.

Operators, from lowest to highest priority: `||`, `&&`, `== !=`, `< <= > >=`, `+ -`, `* / %`, unary `! + -`, and `**`. Powers associate right: `2 ** 3 ** 2` is 512. `-2 ** 2` is -4. Logical operators short circuit and return booleans. Conditions use truthiness: zero, empty text, and false are false. Equality compares type and value. Comparisons require numbers. Addition joins text if either operand is a string.

The interpreter has no access to network, files, browser objects, or JavaScript evaluation. Each execution has fresh variables. Execution stops after 100000 evaluation steps or 1000 output lines. Source and individual generated strings are capped at 100000 characters, and parser nesting is capped at 200. Playground imports and stored programs still use their existing 5000-character limit.

Functions use `fn name(parameter) { return value; }`. They capture the surrounding scope, accept an exact number of arguments, and support recursion up to 100 nested calls. A function without a return produces `false`. Return outside a function is an error.

```text
fn double(number) {
  return number * 2;
}
let numbers = [2, 4, 6];
print(double(numbers[1]));
```

This prints 8. Arrays use zero-based indexing. Out-of-range and non-integer indexes are errors. Array mutation and built-in collection methods are not implemented. Modules and comments are not supported yet.

Run `npm test` to check compatibility, scope, control flow, diagnostics, and execution limits.

## Modern dialect
vibe = let; lock = const; cook = func = fn; yap = say = print; yeet = return; fr = true; cap = false.
Constants reject reassignment. for name in expression { statements } iterates arrays or strings.
range(end) or range(start, end) creates up to 10,000 integers, excluding end. len reads array/text length; upper/lower transform text; abs/round handle numbers; join(array, separator) returns text.
Line comments start with //. The parser is available as Lingua.parse(source) and never executes code, enabling editor diagnostics. New dialect keywords are reserved.
