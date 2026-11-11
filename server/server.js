const express = require("express");
const { execFile, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const PROJECT_DIR = path.join(__dirname, "..");
const FRONTEND_DIR = path.join(PROJECT_DIR, "frontend");
const BACKEND_DIR = process.env.STUDENT_BACKEND_DIR
  ? path.resolve(process.env.STUDENT_BACKEND_DIR)
  : path.join(PROJECT_DIR, "backend-c");
const PORT = Number(process.env.PORT || 3000);

const SOURCE = path.join(BACKEND_DIR, "student.c");
const PROGRAM = path.join(BACKEND_DIR, process.platform === "win32" ? "student.exe" : "student");

fs.mkdirSync(path.join(BACKEND_DIR, "data"), { recursive: true });

function ensureProgramIsBuilt() {
  let shouldBuild = true;
  try {
    shouldBuild = fs.statSync(PROGRAM).mtimeMs < fs.statSync(SOURCE).mtimeMs;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  if (!shouldBuild) return;

  try {
    execFileSync("gcc", [SOURCE, "-o", PROGRAM], { cwd: BACKEND_DIR, stdio: "inherit" });
  } catch (error) {
    console.error("Could not compile the C backend. Install GCC and try again:", error.message);
    process.exit(1);
  }
}

ensureProgramIsBuilt();

app.use(express.json());
app.use(express.static(FRONTEND_DIR));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Runs: student <args...>  and sends the C program's JSON back to the browser.
// execFile takes the arguments as a list (no shell), so names with spaces are safe.
function runStudent(args, res) {
  execFile(
    PROGRAM,
    args,
    { cwd: BACKEND_DIR, timeout: 5000 },
    (error, stdout) => {
      let reply;
      try {
        reply = JSON.parse(stdout);      // the C program prints exactly one JSON line
      } catch (parseError) {
        // The program did not run or printed something unexpected.
        const reason = error ? error.message : "Unexpected output";
        return res.status(500).json({
          status: "error",
          message: "Could not run the C program (did you compile it?): " + reason,
        });
      }
      res.status(reply.status === "ok" ? 200 : 400).json(reply);   // pass the JSON through
    }
  );
}

// Turns any value into a string argument ("" if missing).
function text(value) {
  return value === undefined || value === null ? "" : String(value);
}

app.get("/api/students", (req, res) => runStudent(["list"], res));

app.get("/api/students/:roll", (req, res) => runStudent(["search", text(req.params.roll)], res));

app.post("/api/students", (req, res) => {
  const { roll, name, marks } = req.body || {};
  runStudent(["add", text(roll), text(name), text(marks)], res);
});

app.put("/api/students/:roll", (req, res) => {
  const { name, marks } = req.body || {};
  runStudent(["update", text(req.params.roll), text(name), text(marks)], res);
});

app.delete("/api/students/:roll", (req, res) => runStudent(["delete", text(req.params.roll)], res));

app.get("/api/sort", (req, res) => runStudent(["sort"], res));     // students, highest marks first
app.get("/api/stats", (req, res) => runStudent(["stats"], res));   // count, average, highest, lowest

const server = app.listen(PORT, "127.0.0.1", () => {
  console.log(`Student Record System is ready at http://127.0.0.1:${PORT}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the other server or set PORT to another port.`);
  } else {
    console.error("Could not start the local web server:", error.message);
  }
  process.exitCode = 1;
});
