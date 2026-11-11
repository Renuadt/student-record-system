# Vercel deployment

The Vercel deployment uses static frontend assets and a Node.js serverless API backed by Neon Postgres. It does **not** run the local C executable or persist data to the serverless function's filesystem. The localhost setup remains available through the project [README](../README.md).

## 1. Create and initialize the Neon database

1. Create a Neon project and database.
2. Copy the connection string from Neon’s **Connect** dialog. Keep it private.
3. Open the Neon SQL Editor and run [`../db/schema.sql`](../db/schema.sql) once. This creates the `students` table, validates the fields, and assigns insertion-order IDs used by the API.

The app and C backend both allow up to 100 records. The Vercel API serializes insertions and refuses records beyond that limit.

## 2. Connect the GitHub repository to Vercel

1. In Vercel, choose **Add New → Project** and import `Renuadt/student-record-system`.
2. Set the project root to either the repository root or `server/`. The repository-root setting uses the root package and `vercel.json`; `server/` is also supported and uses its own package, API entry point and `vercel.json`. If Vercel previously installed the Express dependencies from `server/`, it was using `server/` as the root; the latest commit now provides a build script and Vercel configuration there too.
3. Add `DATABASE_URL` as an environment variable for **Preview** and **Production**. Paste the Neon connection string directly in Vercel; never put it in source control or chat.
4. Deploy. The selected root's `vercel.json` runs `npm run build`, publishes `dist/`, and routes `/api/*` to the serverless function. The build script copies `frontend/` from the repository into the selected root's `dist/`.
5. Open `https://<your-deployment>/api/health`. A response of `{"status":"ok"}` confirms the database connection and schema are ready.

If you add or change `DATABASE_URL` after deploying, redeploy so the function receives the new environment variable. Commits pushed to the connected GitHub branch trigger subsequent deployments.

## 3. Local verification

Run these commands from the repository root:

```sh
npm install
npm test
npm run build
```

The API tests use an in-memory SQL test double. They do not connect to Neon and do not modify `backend-c/data/students.txt`.

## Troubleshooting

| Symptom | Check |
|---|---|
| `500 FUNCTION_INVOCATION_FAILED` | Review the Vercel function logs. Confirm the project root is the repository root or `server/`, then redeploy the latest commit so its matching API entry point and dependency manifest are included. |
| `503` with `DATABASE_URL is not configured` | Add `DATABASE_URL` to the Vercel project’s Preview and Production environment variables, then redeploy. |
| `/api/health` returns `Database operation failed` | Run `db/schema.sql` in the Neon SQL Editor and verify the connection string belongs to the intended Neon database. |
| `npm run build` reports a missing script | Confirm Vercel's project root is the repository root or `server/` and redeploy the latest commit. Both package manifests now define the build script. |
| Static build cannot find frontend assets | Confirm Vercel's project root is the repository root or `server/`; the build script copies the root `frontend/` into that root's `dist/`. |
| npm warns about unknown `cache-dir` configuration | This warning is from the npm environment configuration and is separate from the build-script failure. The project build does not use this setting. |

## Access control and data

The API currently has no login or per-user authorization. Anyone who can reach the deployed URL can read, add, update and delete records. Use Vercel Deployment Protection for a restricted preview, or add application authentication and authorization before using real or sensitive student data. A private GitHub repository does not make the deployed website private.

Local records remain in `backend-c/data/students.txt`; Vercel records live in Neon. The two stores are independent and are not synchronized.
