const MAX_STUDENTS = 100;
const ADD_LOCK_ID = 41673021;

function getGrade(marks) {
  if (marks >= 90) return "A";
  if (marks >= 75) return "B";
  if (marks >= 60) return "C";
  if (marks >= 40) return "D";
  return "F";
}

function parseInteger(value, minimum, maximum, message) {
  const text = typeof value === "string" || typeof value === "number" ? String(value) : "";
  if (!/^\d{1,9}$/.test(text)) return { error: message };

  const number = Number(text);
  if (number < minimum || number > maximum) return { error: message };
  return { value: number };
}

function parseRoll(value) {
  return parseInteger(
    value,
    1,
    999999999,
    "Roll number must be a whole number from 1 to 999999999"
  );
}

function parseMarks(value) {
  return parseInteger(value, 0, 100, "Marks must be a whole number from 0 to 100");
}

function parseName(value) {
  if (typeof value !== "string" || value.length < 1 || value.length > 49 ||
      !/^[A-Za-z ]+$/.test(value) || !/[A-Za-z]/.test(value)) {
    return { error: "Name must be 1 to 49 characters: letters and spaces only" };
  }
  return { value };
}

function toStudent(row) {
  const marks = Number(row.marks);
  return {
    roll: Number(row.roll),
    name: row.name,
    marks,
    grade: getGrade(marks)
  };
}

function sendJson(res, status, value) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(value));
}

function parseRequestBody(body) {
  if (body === undefined || body === null || body === "") return {};
  if (typeof body === "string" || Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString());
    } catch {
      return null;
    }
  }
  return typeof body === "object" && !Array.isArray(body) ? body : null;
}

function validationError(res, message) {
  sendJson(res, 400, { status: "error", message });
}

async function addStudent(sql, res, student) {
  const roll = parseRoll(student.roll);
  if (roll.error) return validationError(res, roll.error);
  const name = parseName(student.name);
  if (name.error) return validationError(res, name.error);
  const marks = parseMarks(student.marks);
  if (marks.error) return validationError(res, marks.error);

  const [, result] = await sql.transaction((tx) => [
    tx`SELECT pg_advisory_xact_lock(${ADD_LOCK_ID})`,
    tx`WITH state AS MATERIALIZED (
         SELECT COUNT(*)::int AS count,
                EXISTS(SELECT 1 FROM students WHERE roll = ${roll.value}) AS duplicate
         FROM students
       ), inserted AS (
         INSERT INTO students (roll, name, marks)
         SELECT ${roll.value}, ${name.value}, ${marks.value}
         FROM state
         WHERE NOT state.duplicate AND state.count < ${MAX_STUDENTS}
         ON CONFLICT (roll) DO NOTHING
         RETURNING roll, name, marks
       )
       SELECT 'ok'::text AS outcome, roll, name, marks FROM inserted
       UNION ALL
       SELECT 'duplicate', NULL::integer, NULL::text, NULL::integer
       FROM state WHERE duplicate
       UNION ALL
       SELECT 'full', NULL::integer, NULL::text, NULL::integer
       FROM state WHERE NOT duplicate AND count >= ${MAX_STUDENTS}`
  ]);

  if (result.length !== 1) throw new Error("Student insert returned an unexpected result");
  if (result[0].outcome === "duplicate") return validationError(res, "Roll number already exists");
  if (result[0].outcome === "full") {
    return validationError(res, "Student list is full (maximum 100)");
  }
  if (result[0].outcome !== "ok") throw new Error("Student insert returned an unknown result");
  return sendJson(res, 200, { status: "ok", data: toStudent(result[0]) });
}

function createApiHandler(sql) {
  return async function handleRequest(req, res) {
    let segments;
    try {
      segments = new URL(req.url, "http://localhost").pathname
        .split("/")
        .filter(Boolean)
        .map(decodeURIComponent);
    } catch {
      return validationError(res, "Invalid request path");
    }

    if (segments.shift() !== "api") {
      return sendJson(res, 404, { status: "error", message: "Not found" });
    }

    const [resource, identifier, extra] = segments;
    const method = req.method || "GET";

    try {
      if (resource === "health" && segments.length === 1) {
        if (method !== "GET") return methodNotAllowed(res, ["GET"]);
        await sql`SELECT 1 FROM students LIMIT 0`;
        return sendJson(res, 200, { status: "ok" });
      }

      if (resource === "students" && segments.length === 1) {
        if (method === "GET") {
          const rows = await sql`SELECT roll, name, marks FROM students ORDER BY id ASC`;
          return sendJson(res, 200, { status: "ok", data: rows.map(toStudent) });
        }
        if (method === "POST") {
          const body = parseRequestBody(req.body);
          if (!body) return validationError(res, "Request body must be valid JSON");
          return await addStudent(sql, res, body);
        }
        return methodNotAllowed(res, ["GET", "POST"]);
      }

      if (resource === "students" && identifier !== undefined && extra === undefined &&
          segments.length === 2) {
        const roll = parseRoll(identifier);
        if (roll.error) return validationError(res, roll.error);

        if (method === "GET") {
          const rows = await sql`SELECT roll, name, marks FROM students WHERE roll = ${roll.value}`;
          if (!rows.length) return validationError(res, "Student not found");
          return sendJson(res, 200, { status: "ok", data: toStudent(rows[0]) });
        }

        if (method === "PUT") {
          const body = parseRequestBody(req.body);
          if (!body) return validationError(res, "Request body must be valid JSON");
          const name = parseName(body.name);
          if (name.error) return validationError(res, name.error);
          const marks = parseMarks(body.marks);
          if (marks.error) return validationError(res, marks.error);

          const rows = await sql`UPDATE students SET name = ${name.value}, marks = ${marks.value}
                                WHERE roll = ${roll.value}
                                RETURNING roll, name, marks`;
          if (!rows.length) return validationError(res, "Student not found");
          return sendJson(res, 200, { status: "ok", data: toStudent(rows[0]) });
        }

        if (method === "DELETE") {
          const rows = await sql`DELETE FROM students WHERE roll = ${roll.value}
                                RETURNING roll, name, marks`;
          if (!rows.length) return validationError(res, "Student not found");
          return sendJson(res, 200, { status: "ok", data: toStudent(rows[0]) });
        }

        return methodNotAllowed(res, ["GET", "PUT", "DELETE"]);
      }

      if (resource === "sort" && segments.length === 1) {
        if (method !== "GET") return methodNotAllowed(res, ["GET"]);
        const rows = await sql`SELECT roll, name, marks FROM students ORDER BY marks DESC, id ASC`;
        return sendJson(res, 200, { status: "ok", data: rows.map(toStudent) });
      }

      if (resource === "stats" && segments.length === 1) {
        if (method !== "GET") return methodNotAllowed(res, ["GET"]);
        const rows = await sql`
          SELECT COUNT(*)::int AS count,
                 ROUND(AVG(marks)::numeric, 2) AS average,
                 (SELECT row_to_json(highest)
                    FROM (SELECT roll, name, marks FROM students
                          ORDER BY marks DESC, id ASC LIMIT 1) AS highest) AS highest,
                 (SELECT row_to_json(lowest)
                    FROM (SELECT roll, name, marks FROM students
                          ORDER BY marks ASC, id ASC LIMIT 1) AS lowest) AS lowest
          FROM students`;
        const stats = rows[0];
        if (Number(stats.count) === 0) return validationError(res, "No students stored yet");
        return sendJson(res, 200, {
          status: "ok",
          data: {
            count: Number(stats.count),
            average: Number(stats.average),
            highest: toStudent(stats.highest),
            lowest: toStudent(stats.lowest)
          }
        });
      }

      return sendJson(res, 404, { status: "error", message: "Not found" });
    } catch (error) {
      if (error.code === "23505") {
        return validationError(res, "Roll number already exists");
      }
      console.error("Vercel API request failed:", error.message);
      return sendJson(res, 500, { status: "error", message: "Database operation failed" });
    }
  };
}

function methodNotAllowed(res, methods) {
  res.setHeader("Allow", methods.join(", "));
  return sendJson(res, 405, { status: "error", message: "Method not allowed" });
}

module.exports = {
  createApiHandler,
  getGrade,
  parseMarks,
  parseName,
  parseRoll
};
