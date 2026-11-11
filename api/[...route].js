const { neon } = require("@neondatabase/serverless");
const { createApiHandler } = require("../server/api-handler");

let handler;
let configuredUrl;

module.exports = async function vercelHandler(req, res) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({
      status: "error",
      message: "DATABASE_URL is not configured for this deployment"
    }));
    return;
  }

  if (!handler || configuredUrl !== databaseUrl) {
    configuredUrl = databaseUrl;
    handler = createApiHandler(neon(databaseUrl));
  }

  return handler(req, res);
};
