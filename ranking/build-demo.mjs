// Copies the engine from rankListings.ts into demo.html as plain JavaScript, so the demo
// opens with a double-click: no server, no build tools.
// Run this after every change to rankListings.ts:   node ranking/build-demo.mjs
// (rankListings.test.ts fails if you forget.)
import { readFileSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

const here = (name) => fileURLToPath(new URL(name, import.meta.url));

export const START = "/* ENGINE START: generated from rankListings.ts by build-demo.mjs. Edit the .ts file, not this block. */";
export const END = "/* ENGINE END */";

export function engineForDemo() {
  const ts = readFileSync(here("rankListings.ts"), "utf8");
  return stripTypeScriptTypes(ts, { mode: "transform" }).replace(/^export /gm, "").trim();
}

export function engineInDemo(html) {
  const a = html.indexOf(START);
  const b = html.indexOf(END);
  if (a < 0 || b < a) throw new Error("demo.html is missing the ENGINE START / ENGINE END markers");
  return html.slice(a + START.length, b).trim();
}

export function injectEngine(html) {
  engineInDemo(html); // validates the markers
  const a = html.indexOf(START) + START.length;
  const b = html.indexOf(END);
  return html.slice(0, a) + "\n" + engineForDemo() + "\n" + html.slice(b);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = here("demo.html");
  writeFileSync(path, injectEngine(readFileSync(path, "utf8")));
  console.log("Updated ranking/demo.html with the engine from rankListings.ts");
}
