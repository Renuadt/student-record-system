# Student Record Management System: API Contract

The C program exposes a command-line JSON interface. The localhost Express server maps browser requests to that interface. Vercel uses a separate serverless Node.js API backed by Neon Postgres; both HTTP implementations preserve the response shapes described here.

For local setup and launch instructions, see [the project README](../README.md).

## 1. How to call the program

Run the compiled program with arguments. It prints **exactly one line of JSON** and exits.
Nothing else is ever printed in this mode.

```
student <command> [arguments...]
```

Rules that always hold:

- **Run it from `backend-c/`**, which contains the `data` folder. The program reads and writes `data/students.txt` relative to its working directory. The Node server sets this working directory for each command.
- **Use `execFile` (or any call that takes an argument list), never a shell string.** Then a name like `Ravi Kumar` can be sent as ONE argument with a space inside it. No quoting tricks and no shell injection.
- **The exit code is always 0**, even for errors. Read the `"status"` field instead.
- Every response is one line ending in `\n`.
- `list` returns students in the order they were added. `sort` returns them by marks.

## 2. Response shapes

Success:

```json
{"status":"ok","data": ... }
```

`data` is a **student object**, an **array of student objects** (`list`, `sort`), or a **stats object** (`stats`).

A student object always has four fields:

```json
{"roll":101,"name":"Ravi Kumar","marks":85,"grade":"B"}
```

Failure:

```json
{"status":"error","message":"..."}
```

## 3. Field rules

| Field | Type | Rule |
|---|---|---|
| `roll` | integer | Whole number from 1 to 999999999. Must be unique. Only digits are accepted (no `+`, `-`, spaces, decimals). |
| `name` | string | 1 to 49 characters. Only letters A-Z, a-z and spaces. Must contain at least one letter. No digits, quotes or symbols (no underscore either). |
| `marks` | integer | Whole number from 0 to 100. |
| `grade` | string | **Output only** (you never send it). One letter, worked out from `marks` every time (not stored in the file). See the table below. |

Grade bands:

| Marks | Grade |
|---|---|
| 90 to 100 | `"A"` |
| 75 to 89 | `"B"` |
| 60 to 74 | `"C"` |
| 40 to 59 | `"D"` |
| 0 to 39 | `"F"` |

Capacity: at most **100** students.

## 4. Commands

### 4.1 add

`student add <roll> <name> <marks>`

Example: `student add 101 "Ravi Kumar" 85` (the name is one argument; with `execFile` no quotes are needed)

Success:

```json
{"status":"ok","data":{"roll":101,"name":"Ravi Kumar","marks":85,"grade":"B"}}
```

### 4.2 search

`student search <roll>`

Example: `student search 101`

Success:

```json
{"status":"ok","data":{"roll":101,"name":"Ravi Kumar","marks":85,"grade":"B"}}
```

### 4.3 update

`student update <roll> <name> <marks>`

Both name and marks are required (send the old value again to keep it).

Example: `student update 101 Ravi 90`

Success (returns the record after the change; the grade is recalculated):

```json
{"status":"ok","data":{"roll":101,"name":"Ravi","marks":90,"grade":"A"}}
```

### 4.4 delete

`student delete <roll>`

Example: `student delete 101`

Success (returns the record that was removed):

```json
{"status":"ok","data":{"roll":101,"name":"Ravi","marks":90,"grade":"A"}}
```

### 4.5 list

`student list`

Students in the order they were added.

Example with two students:

```json
{"status":"ok","data":[{"roll":101,"name":"Ravi","marks":90,"grade":"A"},{"roll":102,"name":"Anita","marks":92,"grade":"A"}]}
```

Example with no students:

```json
{"status":"ok","data":[]}
```

### 4.6 sort (new)

`student sort`

All students, **highest marks first**. Students with equal marks stay in the order they were added. Sorting never changes the saved file or the order returned by `list`.

Example (students added as Esha 39, Asha 90, Bala 75, Farah 75):

```json
{"status":"ok","data":[{"roll":202,"name":"Asha","marks":90,"grade":"A"},{"roll":204,"name":"Bala","marks":75,"grade":"B"},{"roll":206,"name":"Farah","marks":75,"grade":"B"},{"roll":201,"name":"Esha","marks":39,"grade":"F"}]}
```

With no students: `{"status":"ok","data":[]}` (same as `list`).

### 4.7 stats (new)

`student stats`

Success:

```json
{"status":"ok","data":{"count":6,"average":63.17,"highest":{"roll":202,"name":"Asha","marks":90,"grade":"A"},"lowest":{"roll":201,"name":"Esha","marks":39,"grade":"F"}}}
```

| Field | Type | Meaning |
|---|---|---|
| `count` | integer | Number of students stored. |
| `average` | number | Average marks, rounded to 2 decimals by the program (it prints `63.17`, `88.50`). Parse it as a number. A JSON library may show `88.50` as `88.5`; both are the same number. |
| `highest` | student object | The student with the highest marks. If several share the top marks, the one added first. |
| `lowest` | student object | The student with the lowest marks. If several share the lowest marks, the one added first. |

With **no students**, `stats` returns an error (so `highest` and `lowest` are always real objects on success):

```json
{"status":"error","message":"No students stored yet"}
```

## 5. Errors

Every error has the form `{"status":"error","message":"<text>"}`. The `message` text is fixed, so you can compare against it. Messages never contain quotes or special characters, so they are always safe JSON.

| Message | When it happens | Example call |
|---|---|---|
| `Roll number must be a whole number from 1 to 999999999` | Roll is missing, not digits, 0, negative, or over 9 digits | `student search abc` |
| `Name must be 1 to 49 characters: letters and spaces only` | Name is empty, too long, has digits or symbols, or is only spaces | `student add 103 R2D2 50` |
| `Marks must be a whole number from 0 to 100` | Marks is not digits, or above 100 | `student add 103 Sam 101` |
| `Roll number already exists` | `add` with a roll that is already stored | `student add 101 Sam 50` |
| `Student not found` | `search`, `update` or `delete` for a roll that is not stored | `student search 999` |
| `Student list is full (maximum 100)` | `add` when 100 students are already stored | `student add 101 Sam 50` |
| `Could not save data. Make sure the data folder exists` | The file `data/students.txt` cannot be written (folder missing) | any `add`, `update`, `delete` |
| `Unknown command` | First argument is not add, search, update, delete, list, sort or stats | `student bogus` |
| `Wrong number of arguments for this command` | Too few or too many arguments for the command | `student add 103 Sam`, `student sort now` |
| `No students stored yet` | `stats` when no students are stored | `student stats` |

Exact error lines:

```json
{"status":"error","message":"Roll number must be a whole number from 1 to 999999999"}
{"status":"error","message":"Name must be 1 to 49 characters: letters and spaces only"}
{"status":"error","message":"Marks must be a whole number from 0 to 100"}
{"status":"error","message":"Roll number already exists"}
{"status":"error","message":"Student not found"}
{"status":"error","message":"Student list is full (maximum 100)"}
{"status":"error","message":"Could not save data. Make sure the data folder exists"}
{"status":"error","message":"Unknown command"}
{"status":"error","message":"Wrong number of arguments for this command"}
{"status":"error","message":"No students stored yet"}
```

### Which error wins when several things are wrong

The program checks in this order and reports only the **first** problem:

- `add`: argument count, roll format, name, marks, duplicate roll, list full, save.
- `update`: argument count, roll format, name, marks, student exists, save.
- `search` / `delete`: argument count, roll format, student exists, (delete only) save.
- `list` / `sort`: argument count only.
- `stats`: argument count, then at least one student must exist.

### Note about a failed save

If `add`, `update` or `delete` reports `Could not save data...`, the change was **not** written to disk. Each command is a separate run of the program that reloads the file, so nothing half-done is kept between calls.

## 6. HTTP API

The local Express server serves the frontend from `frontend/`, listens on `127.0.0.1` (port 3000 by default), and invokes the C program from `backend-c/`. The Vercel deployment serves the same frontend as static assets and routes `/api/*` to a Node.js serverless function using Neon Postgres. It does not run the C executable or store deployed records on the function filesystem.

Both implementations return HTTP 200 for successful operations and HTTP 400 for application errors. The local server returns HTTP 500 if the C program cannot run. The Vercel API returns HTTP 503 when `DATABASE_URL` is missing and HTTP 500 when a database operation fails. `/api/health` checks the local server process in localhost mode; on Vercel it also queries the `students` table.

| HTTP route | Local implementation | Vercel implementation |
|---|---|---|---|
| `GET /api/health` | Returns `{"status":"ok"}` when Express is running | Returns `{"status":"ok"}` when `DATABASE_URL` and the schema are ready |
| `GET /api/students` | `student list` | Selects students in insertion order |
| `GET /api/students/:roll` | `student search <roll>` | Selects one student by roll |
| `POST /api/students` body `{"roll":101,"name":"Ravi","marks":85}` | `student add 101 Ravi 85` | Inserts a student (rolls are serialized to enforce the 100-record limit) |
| `PUT /api/students/:roll` body `{"name":"Ravi","marks":90}` | `student update 101 Ravi 90` | Updates the matching student |
| `DELETE /api/students/:roll` | `student delete 101` | Deletes and returns the matching student |
| `GET /api/sort` | `student sort` | Sorts marks descending; ties keep insertion order |
| `GET /api/stats` | `student stats` | Returns count, average, highest and lowest records |

The browser page loads its styles from `frontend/style.css` and behavior from `frontend/script.js`. API paths are relative to the same origin, so the page should be opened through the Node server or Vercel deployment rather than directly as a file. Local file records and Vercel database records are separate and are not synchronized.

On Vercel, set `DATABASE_URL` to a Neon Postgres connection string and apply [`db/schema.sql`](../db/schema.sql) before using the API. Full setup steps are in [the deployment guide](deployment.md). The API currently has no authentication; do not expose sensitive records without adding access control.
