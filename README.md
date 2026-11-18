# Lingua

Lingua is our Web Programming project. It is a small programming language that runs in the browser. You can write a few lines of code, press **Run**, and see the output beside the editor.

We kept the language small so it is easy to use and explain. It understands `let` for storing a value and `print` for showing one. It also supports numbers, text in double quotes, maths, powers, and brackets. Write one statement per line and end it with a semicolon.

```text
let name = "World";
print(name);
```

This prints `World`. The playground has three examples, and the Docs page explains the syntax step by step.

## What you can do

- Run code and see a line number when there is an error.
- Save, open, update, and delete programs using MongoDB.
- Organise saved programs in folders in the Explorer.
- See when code has unsaved changes.
- Export a program as a `.lingua` file and import it later.
- Send feedback through a form. The server saves it in `data/feedback.json`.

The site has linked Playground, Docs, About, and Feedback pages. Everyone using the same server can see and edit saved programs, so it is a course demo rather than private code storage.

## Run it

Install Node.js and MongoDB. Start MongoDB, then run these commands in the project folder:

```text
npm install
npm start
```

Open `http://localhost:3000`. The app uses `mongodb://127.0.0.1:27017/lingua` by default. If your MongoDB address is different, set `MONGODB_URI` before starting the server. The code runner works without MongoDB, but saving programs needs it.

## How it works

The pages use HTML and CSS. `playground.js` reads Lingua code one line at a time and shows the result. `programs.js` handles the Explorer and sends save requests to the Express server. `files.js` handles file import and export. `server.js` stores programs in MongoDB. It also checks feedback and saves it to the local JSON file. The feedback API only returns the number of submissions, not names or email addresses.

For a quick demo, run an example, save it in a folder, edit and update it, then export and import the file. You can also submit the feedback form. Conditions, loops, and functions are not part of Lingua yet.
