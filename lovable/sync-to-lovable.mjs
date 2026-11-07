// Copies the Roomsure "brain" into a local clone of the Lovable repo.
//
//   node lovable/sync-to-lovable.mjs /path/to/lovable-repo
//
// - platform/lib/roomsure/**  ->  <repo>/src/lib/roomsure/**   (with a DO NOT EDIT header)
// - platform/lib/roomsure/mockApi.ts  ->  <repo>/src/lib/roomsure/api.ts   (the mock API)
// - lovable/AGENTS.md  ->  <repo>/AGENTS.md
// Files Lovable owns (for example src/lib/roomsure/state.ts) are never touched.
// Commit and push in the Lovable repo afterwards; Lovable picks the push up by itself.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const brain = join(repoRoot, "platform", "lib", "roomsure");
const target = process.argv[2];

if (!target || !existsSync(join(target, ".git"))) {
  console.error("Usage: node lovable/sync-to-lovable.mjs /path/to/lovable-repo  (a git clone of the Lovable project)");
  process.exit(1);
}

// Real-API files that exist only in platform/ and must not reach Lovable.
const PLATFORM_ONLY = new Set(["api.ts", "server.ts"]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const header = (rel) =>
  `// DO NOT EDIT: synced from emergent-hacks platform/lib/roomsure/${rel} by lovable/sync-to-lovable.mjs.\n` +
  `// Change it in emergent-hacks, then re-run the sync. Lovable: import from this file, never modify it.\n`;

const written = [];
for (const file of walk(brain)) {
  const rel = relative(brain, file).split("\\").join("/");
  if (!rel.endsWith(".ts") || PLATFORM_ONLY.has(rel)) continue;
  const outRel = rel === "mockApi.ts" ? "api.ts" : rel;
  const out = join(target, "src", "lib", "roomsure", outRel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, header(rel) + readFileSync(file, "utf8"));
  written.push(`src/lib/roomsure/${outRel}`);
}

cpSync(join(repoRoot, "lovable", "AGENTS.md"), join(target, "AGENTS.md"));
written.push("AGENTS.md");

console.log(`Synced ${written.length} files into ${target}:`);
for (const w of written) console.log("  " + w);
console.log("Next: cd into the Lovable repo, commit, and push to its synced branch (usually main).");
