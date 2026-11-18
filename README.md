# Lingua

Lingua is our Web Programming course project. It is a small programming language with a web playground where someone can write code and see the output. We are building it step by step so we can explain every part during our end-semester viva.

## What works now

- Four linked pages: Playground, Docs, About, and Feedback.
- A beginner Docs tutorial with small steps, expected output, a syntax table, and common mistakes.
- A code box with a Run button, Ctrl + Enter shortcut, and two examples.
- A simple JavaScript runner for `let`, `print`, numbers, strings, and `+`, `-`, `*`, `/` expressions.
- Error messages that show the line number.
- A feedback form with name, email, and message validation.
- An Express route that saves valid feedback in `data/feedback.json`.
- A feedback fetch route at `GET /api/feedback`.
- Program saving, loading, updating, and deleting through Express and MongoDB.

The language runner is intentionally small. It reads one statement per line. It does not support loops, conditions, or functions yet. Maths is calculated from left to right, so it does not use normal operator precedence yet.

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

`programs.js` sends requests from the saved programs section. `server.js` has four MongoDB program routes: `GET /api/programs` lists programs, `POST /api/programs` creates one, `PUT /api/programs/:id` updates one, and `DELETE /api/programs/:id` removes one. The Program model has a title and code. Mongoose also adds creation and update times.

Feedback uses a local JSON file because that is part of the second evaluation. `POST /api/feedback` saves a form submission, and `GET /api/feedback` fetches the saved submissions. The playground does not show submitted feedback because it contains names and email addresses.

## Course roadmap

| Evaluation | Course focus | Project work |
| --- | --- | --- |
| Phase 1 | HTML and CSS | Responsive playground design. |
| Phase 2 | JavaScript, DOM, forms, local JSON | Linked pages, working interactions, validation, form submission, and JSON saving. |
| Final phase | Full-stack app and MongoDB | Express APIs for local JSON feedback and MongoDB CRUD for saved programs. |

For the final demo, run a short program, show a helpful error, submit feedback, then save, load, update, and delete a program while MongoDB is running. No external API is used because the course parameter says "if required" and Lingua does not need outside data for its core purpose.
