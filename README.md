# Lingua

Lingua is our Web Programming course project. It is a small programming language with a web playground where someone can write code and see the output. We are building it step by step so we can explain every part during our end-semester viva.

## What works now

- Four linked pages: Playground, Docs, About, and Feedback.
- A beginner Docs tutorial with small steps, expected output, a syntax table, and common mistakes.
- A code box with a Run button, Ctrl + Enter shortcut, and three working examples.
- A simple JavaScript runner for `let`, `print`, numbers, strings, `+ - * / ** %`, and brackets.
- Error messages that show the line number.
- A feedback form with name, email, and message validation.
- An Express route that saves valid feedback in `data/feedback.json`.
- A feedback fetch route at `GET /api/feedback`.
- Program saving, loading, updating, and deleting through Express and MongoDB.
- A live line and character count below the editor.
- A folder explorer for saved programs. Enter a folder like `College/Maths` when saving, then click the file in the explorer to load it.
- The Explorer now sits beside the editor, with expandable folders and clickable program files.
- New file clears the editor. New folder sets a folder path; it appears after you save a program there.
- Shared code opens with a Make my copy button so a friend can prepare a separate saved version.
- Exporting, importing, and sharing code through the playground.

The language runner is intentionally small. It reads one statement per line. It does not support loops, conditions, or functions yet. Maths follows the usual order: brackets and powers, then multiplication/division/remainder, then addition/subtraction.

## How to run it

Install Node.js and MongoDB, then run these commands in the project folder:

```text
npm install
npm start
```

Open `http://localhost:3000` in a browser. Use the server URL for the feedback form, because a page opened directly from a file cannot submit to the API.

The app connects to local MongoDB at `mongodb://127.0.0.1:27017/lingua`. If your database uses another address, set the `MONGODB_URI` environment variable before starting the server. The playground runner and feedback form still work when MongoDB is unavailable, but the saved programs section will show a database error.

## How the parts work

`playground.html` holds the code box and output area. `playground.js` listens for the Run button, reads the code line by line, stores values in a JavaScript object, and shows printed results in the page.

`feedback.html` has the form. `feedback.js` checks the fields and sends JSON with `fetch`. `server.js` checks the data again and writes it to `data/feedback.json`. We validate on both sides so the page gives quick feedback and the server does not accept bad input.

`docs.html` teaches the current syntax. `about.html` explains the project to visitors. `playground.css` styles all four pages.

`programs.js` sends requests from the saved programs section and builds the folder explorer from saved folder names. A folder is stored as a simple path on each program, so there is no separate folder collection. `server.js` has four MongoDB program routes: `GET /api/programs` lists programs, `POST /api/programs` creates one, `PUT /api/programs/:id` updates one, and `DELETE /api/programs/:id` removes one. The Program model has a title, code, and folder. Mongoose also adds creation and update times.

`files.js` downloads code as a `.lingua` file, imports `.lingua` and `.txt` files under 10 KB, and makes share links for code up to 2000 characters. The code is inside the link, so anyone with the link can read it.

The example menu and Docs use the same working syntax as the playground: `let`, `print`, numbers, double-quoted text, `+ - * / ** %`, and brackets. The Power and Brackets example prints 25 and 1. Conditions, loops and functions are future ideas, not current commands.

Collaboration is simple: send a share link, let a friend edit the code, then click Make my copy and Save new. This is an independent copy, not live simultaneous editing. Saved programs are in one shared MongoDB collection for the course demo; there are no user accounts or private folders.

Feedback uses a local JSON file because that is part of the second evaluation. `POST /api/feedback` saves a form submission, and `GET /api/feedback` fetches the saved submissions. The playground does not show submitted feedback because it contains names and email addresses.

## Course roadmap

| Evaluation | Course focus | Project work |
| --- | --- | --- |
| Phase 1 | HTML and CSS | Responsive playground design. |
| Phase 2 | JavaScript, DOM, forms, local JSON | Linked pages, working interactions, validation, form submission, and JSON saving. |
| Final phase | Full-stack app and MongoDB | Express APIs for local JSON feedback and MongoDB CRUD for saved programs. |

For the final demo, run a short program, show a helpful error, submit feedback, then save, load, update, and delete a program while MongoDB is running. No external API is used because the course parameter says "if required" and Lingua does not need outside data for its core purpose.
