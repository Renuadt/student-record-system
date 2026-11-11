const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");
const frontendDirectory = path.join(projectRoot, "frontend");
const outputDirectory = path.join(process.cwd(), "dist");

fs.mkdirSync(outputDirectory, { recursive: true });
fs.cpSync(frontendDirectory, outputDirectory, { recursive: true, force: true });
console.log("Copied frontend assets to dist/");
