const test = require("node:test");
const assert = require("node:assert/strict");
const { createApiHandler } = require("../api/handler");
const vercelHandler = require("../api/[...route]");

function createFakeSql(initialRecords = []) {
  const records = initialRecords.map((record, index) => ({ ...record, id: index + 1 }));
  let nextId = records.length + 1;

  async function execute(statement, values) {
    const query = statement.replace(/\s+/g, " ").trim().toUpperCase();

    if (query.startsWith("SELECT PG_ADVISORY_XACT_LOCK")) return [];
    if (query.includes("INSERT INTO STUDENTS")) {
      const [rollForCheck, roll, name, marks] = values;
      if (records.some((record) => record.roll === rollForCheck)) {
        return [{ outcome: "duplicate", roll: null, name: null, marks: null }];
      }
      if (records.length >= 100) {
        return [{ outcome: "full", roll: null, name: null, marks: null }];
      }
      const record = { roll, name, marks, id: nextId++ };
      records.push(record);
      return [{ outcome: "ok", roll, name, marks }];
    }
    if (query.startsWith("SELECT 1 FROM STUDENTS")) return [];
    if (query.includes("COUNT(*)::INT AS COUNT") && query.includes("AVERAGE")) {
      if (!records.length) return [{ count: 0, average: null, highest: null, lowest: null }];
      const sorted = [...records].sort((a, b) => b.marks - a.marks || a.id - b.id);
      const lowest = [...records].sort((a, b) => a.marks - b.marks || a.id - b.id);
      const average = records.reduce((sum, record) => sum + record.marks, 0) / records.length;
      return [{
        count: records.length,
        average: Math.round(average * 100) / 100,
        highest: { roll: sorted[0].roll, name: sorted[0].name, marks: sorted[0].marks },
        lowest: { roll: lowest[0].roll, name: lowest[0].name, marks: lowest[0].marks }
      }];
    }
    if (query.startsWith("SELECT COUNT(*)::INT AS COUNT")) return [{ count: records.length }];
    if (query.startsWith("SELECT ROLL, NAME, MARKS FROM STUDENTS ORDER BY MARKS DESC")) {
      return records.slice().sort((a, b) => b.marks - a.marks || a.id - b.id).map(project);
    }
    if (query.startsWith("SELECT ROLL, NAME, MARKS FROM STUDENTS ORDER BY ID ASC")) {
      return records.slice().sort((a, b) => a.id - b.id).map(project);
    }
    if (query.startsWith("SELECT ROLL, NAME, MARKS FROM STUDENTS WHERE ROLL")) {
      return records.filter((record) => record.roll === values[0]).map(project);
    }
    if (query.startsWith("UPDATE STUDENTS")) {
      const [name, marks, roll] = values;
      const record = records.find((item) => item.roll === roll);
      if (!record) return [];
      record.name = name;
      record.marks = marks;
      return [project(record)];
    }
    if (query.startsWith("DELETE FROM STUDENTS")) {
      const index = records.findIndex((record) => record.roll === values[0]);
      return index < 0 ? [] : [project(records.splice(index, 1)[0])];
    }
    throw new Error(`Unexpected SQL in test: ${query}`);
  }

  function project(record) {
    return { roll: record.roll, name: record.name, marks: record.marks };
  }

  const sql = (strings, ...values) => execute(strings.join(" "), values);
  sql.transaction = async (buildQueries) => {
    const queries = buildQueries((strings, ...values) => ({
      statement: strings.join(" "),
      values
    }));
    const results = [];
    for (const query of queries) results.push(await execute(query.statement, query.values));
    return results;
  };

  return sql;
}

function createResponse() {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(value) {
      this.body = JSON.parse(value);
    }
  };
}

async function call(handler, method, url, body) {
  const response = createResponse();
  await handler({ method, url, body }, response);
  return response;
}

test("supports student CRUD, grades, stable sorting, and statistics", async () => {
  const handler = createApiHandler(createFakeSql());

  const health = await call(handler, "GET", "/api/health");
  assert.equal(health.statusCode, 200);
  assert.deepEqual(health.body, { status: "ok" });

  const emptyList = await call(handler, "GET", "/api/students");
  assert.deepEqual(emptyList.body, { status: "ok", data: [] });

  const first = await call(handler, "POST", "/api/students", {
    roll: "101", name: "Ravi Kumar", marks: "75"
  });
  assert.equal(first.statusCode, 200);
  assert.deepEqual(first.body.data, { roll: 101, name: "Ravi Kumar", marks: 75, grade: "B" });

  const second = await call(handler, "POST", "/api/students", {
    roll: 102, name: "Anita", marks: 75
  });
  assert.equal(second.statusCode, 200);

  const duplicate = await call(handler, "POST", "/api/students", {
    roll: 101, name: "Duplicate", marks: 50
  });
  assert.equal(duplicate.statusCode, 400);
  assert.equal(duplicate.body.message, "Roll number already exists");

  const found = await call(handler, "GET", "/api/students/101");
  assert.equal(found.body.data.name, "Ravi Kumar");

  const updated = await call(handler, "PUT", "/api/students/101", {
    name: "Ravi", marks: 95
  });
  assert.deepEqual(updated.body.data, { roll: 101, name: "Ravi", marks: 95, grade: "A" });

  const sorted = await call(handler, "GET", "/api/sort");
  assert.deepEqual(sorted.body.data.map((student) => student.roll), [101, 102]);

  const stats = await call(handler, "GET", "/api/stats");
  assert.deepEqual(stats.body.data, {
    count: 2,
    average: 85,
    highest: { roll: 101, name: "Ravi", marks: 95, grade: "A" },
    lowest: { roll: 102, name: "Anita", marks: 75, grade: "B" }
  });

  const deleted = await call(handler, "DELETE", "/api/students/101");
  assert.equal(deleted.body.data.roll, 101);
  const remaining = await call(handler, "GET", "/api/students");
  assert.deepEqual(remaining.body.data.map((student) => student.roll), [102]);
});

test("preserves validation errors and stable ties", async () => {
  const handler = createApiHandler(createFakeSql([
    { roll: 1, name: "Asha", marks: 75 },
    { roll: 2, name: "Bala", marks: 75 }
  ]));

  const invalid = await call(handler, "POST", "/api/students", {
    roll: 0, name: "Name", marks: 90
  });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.body.message, "Roll number must be a whole number from 1 to 999999999");

  const sorted = await call(handler, "GET", "/api/sort");
  assert.deepEqual(sorted.body.data.map((student) => student.roll), [1, 2]);

  const wrongMethod = await call(handler, "PATCH", "/api/students");
  assert.equal(wrongMethod.statusCode, 405);
  assert.equal(wrongMethod.headers.allow, "GET, POST");
});

test("returns the documented empty statistics error", async () => {
  const handler = createApiHandler(createFakeSql());
  const stats = await call(handler, "GET", "/api/stats");
  assert.equal(stats.statusCode, 400);
  assert.deepEqual(stats.body, { status: "error", message: "No students stored yet" });
});

test("enforces the 100-record capacity and prioritizes duplicate rolls", async () => {
  const records = Array.from({ length: 100 }, (_, index) => ({
    roll: index + 1,
    name: `Student ${String.fromCharCode(65 + (index % 26))}`,
    marks: index % 101
  }));
  const handler = createApiHandler(createFakeSql(records));

  const duplicate = await call(handler, "POST", "/api/students", {
    roll: 1, name: "Another", marks: 80
  });
  assert.equal(duplicate.body.message, "Roll number already exists");

  const full = await call(handler, "POST", "/api/students", {
    roll: 101, name: "Another", marks: 80
  });
  assert.equal(full.body.message, "Student list is full (maximum 100)");
});

test("reports missing Vercel database configuration without throwing", async () => {
  const originalUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const response = createResponse();
  try {
    await vercelHandler({ method: "GET", url: "/api/health" }, response);
  } finally {
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
  }
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.message, "DATABASE_URL is not configured for this deployment");
});
