import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..", "src");
const skipDir = path.join(root, "app", "api");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full.startsWith(skipDir)) continue;
      walk(full, files);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function addImport(content) {
  if (content.includes('from "@/lib/api"')) return content;
  const importLine = 'import { apiUrl } from "@/lib/api";\n';
  const useClient = content.startsWith('"use client"') || content.startsWith("'use client'");
  if (useClient) {
    const firstNewline = content.indexOf("\n");
    return content.slice(0, firstNewline + 1) + "\n" + importLine + content.slice(firstNewline + 1);
  }
  const firstImport = content.match(/^import .+;\n/m);
  if (firstImport) {
    const idx = content.indexOf(firstImport[0]) + firstImport[0].length;
    return content.slice(0, idx) + importLine + content.slice(idx);
  }
  return importLine + content;
}

function transform(content) {
  let next = content;

  next = next.replace(
    /new URL\("(\/api\/[^"]*)", window\.location\.origin\)/g,
    'new URL(apiUrl("$1"))'
  );

  next = next.replace(/fetch\("(\/api\/[^"]*)"\)/g, 'fetch(apiUrl("$1"))');
  next = next.replace(/fetch\('(\/api\/[^']*)'\)/g, "fetch(apiUrl('$1'))");
  next = next.replace(/fetch\(`(\/api\/[^`]*?)`\)/g, "fetch(apiUrl(`$1`))");

  // Multi-line fetch(`/api/...`, { ... })
  next = next.replace(/fetch\("(\/api\/[^"]*)",/g, 'fetch(apiUrl("$1"),');
  next = next.replace(/fetch\('(\/api\/[^']*)',/g, "fetch(apiUrl('$1'),");
  next = next.replace(/fetch\(`(\/api\/[^`]*?)`,/g, "fetch(apiUrl(`$1`),");

  // Template URL variables starting with /api/
  next = next.replace(
    /= `(\/api\/[^`]+)`;/g,
    (match, p1) => (match.includes("apiUrl") ? match : `= apiUrl(\`${p1}\`);`)
  );
  next = next.replace(
    /\? "(\/api\/[^"]*)" : "(\/api\/[^"]*)"/g,
    '? apiUrl("$1") : apiUrl("$2")'
  );

  // fetch(url) where url was assigned from /api/
  next = next.replace(/await fetch\(url\)/g, "await fetch(apiUrl(url))");
  next = next.replace(/await fetch\(url,/g, "await fetch(apiUrl(url),");
  next = next.replace(/const res = await fetch\(url\)/g, "const res = await fetch(apiUrl(url))");

  if (next === content) return content;
  return addImport(next);
}

const files = walk(root);
let changed = 0;
for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  if (!content.includes("/api/")) continue;
  const updated = transform(content);
  if (updated !== content) {
    fs.writeFileSync(file, updated);
    changed++;
    console.log(path.relative(root, file));
  }
}
console.log(`Updated ${changed} files.`);
