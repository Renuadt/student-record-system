# Vercel deployment

The Vercel deployment uses static frontend assets and a Node.js serverless API backed by Neon Postgres. It does **not** run the local C executable or persist data to the serverless function's filesystem. The localhost setup remains available through the project [README](../README.md).

## 1. Create and initialize the Neon database

1. Create a Neon project and database.
2. Copy the connection string from Neon’s **Connect** dialog. Keep it private.
3. Open the Neon SQL Editor and run [`../db/schema.sql`](../db/schema.sql) once. This creates the `students` table, validates the fields, and assigns insertion-order IDs used by the API.

The app and C backend both allow up to 100 records. The Vercel API serializes insertions and refuses records beyond that limit.

## 2. Connect the GitHub repository to Vercel

1. In Vercel, choose **Add New → Project** and import `Renuadt/student-record-system`.
2. Set the project root to the repository root. Leave the Framework Preset as **Other** unless Vercel detects Node.js automatically.
3. Add `DATABASE_URL` as an environment variable for **Preview** and **Production**. Paste the Neon connection string directly in Vercel; never put it in source control or chat.
4. Deploy. `vercel.json` runs `npm run build`, publishes `dist/`, and routes `/api/*` to the serverless function.
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
| `500 FUNCTION_INVOCATION_FAILED` | Review the Vercel function logs. Confirm the deployment includes `api/[...route].js` and the root `package.json` dependency installation completed. |
| `503` with `DATABASE_URL is not configured` | Add `DATABASE_URL` to the Vercel project’s Preview and Production environment variables, then redeploy. |
| `/api/health` returns `Database operation failed` | Run `db/schema.sql` in the Neon SQL Editor and verify the connection string belongs to the intended Neon database. |
| `npm run build` cannot find the frontend | Confirm the Vercel project root is the repository root; the build copies `frontend/` to `dist/`. |

## Access control and data

The API currently has no login or per-user authorization. Anyone who can reach the deployed URL can read, add, update and delete records. Use Vercel Deployment Protection for a restricted preview, or add application authentication and authorization before using real or sensitive student data. A private GitHub repository does not make the deployed website private.

Local records remain in `backend-c/data/students.txt`; Vercel records live in Neon. The two stores are independent and are not synchronized.
