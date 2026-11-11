# Student Record System

A localhost web app for managing up to 100 student records. The frontend is plain HTML, CSS and JavaScript; an Express server serves it and sends API operations to the C program. Records are stored in `backend-c/data/students.txt`.

## Run locally

### Requirements

- Node.js and npm
- GCC available on `PATH`

### Start the app

- **Linux/macOS:** from the project folder, run `./start-local.sh`.
- **Windows:** double-click `start-local.bat` from the project folder.

The launcher installs the Express dependency on first use if it is missing. The server compiles `backend-c/student.c` when the executable is missing or older than the source. Keep the terminal window open and visit the URL it prints; the default is <http://127.0.0.1:3000>. Press Ctrl+C in the terminal to stop the server.

The server binds to `127.0.0.1` and is intended for local preview, not public hosting. If port 3000 is already in use, choose another port with the `PORT` environment variable before launching:

```sh
PORT=3001 ./start-local.sh
```

In Windows Command Prompt, run `set PORT=3001` before `start-local.bat`.

### Start manually

```sh
npm --prefix server install
npm --prefix server start
```

The server builds the C backend on startup when necessary. It serves the site from `frontend/` and runs the backend with `backend-c/` as its working directory.

## Features

- Add, find, update and delete students
- Validate roll numbers, names and marks
- Display letter grades, sort by marks and show cohort statistics
- Save records between launches

## Project layout

```text
frontend/       HTML, CSS and browser JavaScript
server/         Express server and npm dependencies
backend-c/      C program and persistent student data
docs/           API contract, code explanation and test cases
start-local.sh  Linux/macOS launcher
start-local.bat Windows launcher
```

See [docs/api-contract.md](docs/api-contract.md) for API details and [docs/test-cases.md](docs/test-cases.md) for backend test cases.
