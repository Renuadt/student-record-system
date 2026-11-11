# Student Record System

A web app for managing up to 100 student records. The frontend is plain HTML, CSS and JavaScript. The local version uses an Express server and the C program; the Vercel version uses a serverless Node.js API and Neon Postgres.

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

## Deploy to Vercel

The Vercel deployment uses serverless functions, so it does not compile or execute the C binary and does not store records on the function filesystem. It requires a Neon Postgres database for persistent records.

1. Create a Neon project and copy its connection string.
2. In the Neon SQL Editor, run [`db/schema.sql`](db/schema.sql) once to create the `students` table.
3. In Vercel, import `Renuadt/student-record-system` from GitHub. Use the repository root as the project root and the default Node.js runtime.
4. Add `DATABASE_URL` to the Vercel project environment variables for Preview and Production. Use the Neon connection string; do not commit it or share it in chat.
5. Deploy. The included [`vercel.json`](vercel.json) builds the static site into `dist/` and routes `/api/*` to a Node.js serverless function.
6. Visit `/api/health` on the deployment to verify database connectivity. It returns `{"status":"ok"}` when the table and connection are ready.

Subsequent pushes to the connected GitHub branch trigger Vercel deployments. If you add the environment variable after an initial deployment, redeploy so the function receives it.

**Security:** the app currently has no user authentication. A Vercel URL can be accessed by anyone who has it, and its API permits record changes. Use Vercel Deployment Protection or add application authentication before storing real or sensitive student data. A private GitHub repository does not make the deployed website private.

## Features

- Add, find, update and delete students
- Validate roll numbers, names and marks
- Display letter grades, sort by marks and show cohort statistics
- Save records between launches (local file for localhost; Neon Postgres for Vercel)

## Project layout

```text
frontend/       HTML, CSS and browser JavaScript
server/         Express server and npm dependencies
backend-c/      C program and persistent student data
api/            Vercel serverless API and shared route handler
db/             Neon Postgres schema
scripts/        Vercel static build script
tests/          Serverless API tests
docs/           API contract, code explanation and test cases
start-local.sh  Linux/macOS launcher
start-local.bat Windows launcher
```

See [docs/deployment.md](docs/deployment.md) for Vercel and Neon setup, [docs/api-contract.md](docs/api-contract.md) for API details, and [docs/test-cases.md](docs/test-cases.md) for test instructions.
