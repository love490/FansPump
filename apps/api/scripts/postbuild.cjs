const fs = require("node:fs");
const path = require("node:path");

const distIndex = path.join(__dirname, "..", "dist", "index.js");

if (!fs.existsSync(distIndex)) {
  console.error("postbuild: dist/index.js not found");
  process.exit(1);
}

const banner = `require('tsx/cjs/api').register();\nrequire('tsconfig-paths/register');\n`;
const original = fs.readFileSync(distIndex, "utf8");
fs.writeFileSync(distIndex, banner + original, "utf8");
console.log("postbuild: registered tsx loader for workspace TypeScript packages");
