#!/usr/bin/env node
/**
 * Secret scanner for the repo. Exits non-zero if likely secrets are detected.
 * Usage: node scripts/secret-scan.js
 * Run in CI or as a pre-commit hook (e.g. npm run secret-scan).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "coverage", "tests", "docs"]);

const PATTERNS = [
  // Assignments that look like real secrets (long or non-placeholder values)
  /ZOHO_REFRESH_TOKEN\s*[:=]\s*["']?[a-zA-Z0-9._-]{25,}/i,
  /ZOHO_CLIENT_SECRET\s*[:=]\s*["']?[a-zA-Z0-9._-]{20,}/i,
  /refresh_token\s*[:=]\s*["']?[a-zA-Z0-9._-]{25,}/i,
  /EMAIL_PASS\s*[:=]/i,
  /API[_-]?KEY\s*[:=]\s*["']?[^"'\s]{12,}/i,
  /password\s*[:=]\s*["']?[^"'\s]{8,}/i,
  /"pass"\s*:\s*"[^"]+"/i,
  /-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----/,
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) {
      if (IGNORE_DIRS.has(ent.name)) continue;
      walk(path.join(dir, ent.name), out);
    } else if (ent.isFile()) {
      out.push(path.join(dir, ent.name));
    }
  }
  return out;
}

function isTextFile(p) {
  const ext = path.extname(p).toLowerCase();
  return [".md", ".js", ".ts", ".json", ".yml", ".yaml", ".txt", ".env", ".py", ".sh"].includes(ext);
}

const files = walk(ROOT).filter(isTextFile);
const hits = [];

for (const f of files) {
  const rel = path.relative(ROOT, f);
  let content;
  try {
    content = fs.readFileSync(f, "utf8");
  } catch {
    continue;
  }
  const lines = content.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const re of PATTERNS) {
      if (re.test(line)) {
        hits.push({ file: rel, line: i + 1, text: line.trim().slice(0, 120) });
        break;
      }
    }
  });
}

if (hits.length > 0) {
  console.error("Potential secrets detected. Refusing to proceed.");
  hits.slice(0, 50).forEach((h) => {
    console.error(`  ${h.file}:${h.line} :: ${h.text}`);
  });
  if (hits.length > 50) console.error(`  ... and ${hits.length - 50} more`);
  process.exit(2);
}

console.log("Secret scan passed: no obvious secrets found.");
