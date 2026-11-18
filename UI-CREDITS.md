# UI references

The example navigation is a vanilla JavaScript adaptation of the branching interaction shown by [React Bits Branched Menu](https://reactbits.dev/c/micro/branched-menu), by David Haz. It uses native buttons and disclosure groups, with animated SVG branch strokes. No React dependency is required.

The animated terminal is an original implementation inspired by the publicly described token-transition behavior of [React Bits Pro Code Morph](https://pro.reactbits.dev/docs/components/code-morph). It does not contain the licensed Pro component source. Matching output tokens move to their new positions with the Web Animations API; new tokens fade in. Reduced-motion preferences disable these animations.

The branch menu selects Lingua examples. Open selected example asks before replacing existing code. Terminal animation reacts to real runtime output, including errors and clearing.
