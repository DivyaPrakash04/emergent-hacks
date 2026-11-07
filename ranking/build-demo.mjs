// Copies the engine (platform/lib/roomsure/rankListings.ts) and the app's demo rooms
// (platform/lib/roomsure/data/listings.ts) into demo.html as plain JavaScript, so the demo
// opens with a double-click (no server, no build tools) and shows the same rooms as the app.
// Run this after changing either file:   node ranking/build-demo.mjs
// (rankListings.test.ts fails if you forget.)
import { readFileSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

const here = (name) => fileURLToPath(new URL(name, import.meta.url));

export const START = "/* ENGINE START: generated from rankListings.ts by build-demo.mjs. Edit the .ts file, not this block. */";
export const END = "/* ENGINE END */";
export const DATA_START = "/* DATA START: generated from platform/lib/roomsure/data/listings.ts by build-demo.mjs. Edit the .ts file, not this block. */";
export const DATA_END = "/* DATA END */";

const toJs = (path) => stripTypeScriptTypes(readFileSync(here(path), "utf8"), { mode: "transform" }).replace(/^export /gm, "").trim();

export function engineForDemo() {
  return toJs("../platform/lib/roomsure/rankListings.ts");
}

/** The app's listings as one constant, DEMO_LISTINGS, wrapped so its helpers don't leak. */
export function dataForDemo() {
  return `const DEMO_LISTINGS = (() => {\n${toJs("../platform/lib/roomsure/data/listings.ts")}\nreturn LISTINGS;\n})();`;
}

function between(html, start, end, name) {
  const a = html.indexOf(start);
  const b = html.indexOf(end);
  if (a < 0 || b < a) throw new Error(`demo.html is missing the ${name} START / ${name} END markers`);
  return html.slice(a + start.length, b).trim();
}

function replaceBetween(html, start, end, content) {
  const a = html.indexOf(start) + start.length;
  const b = html.indexOf(end);
  return html.slice(0, a) + "\n" + content + "\n" + html.slice(b);
}

export const engineInDemo = (html) => between(html, START, END, "ENGINE");
export const dataInDemo = (html) => between(html, DATA_START, DATA_END, "DATA");

export function injectEngine(html) {
  engineInDemo(html); // validates the markers
  return replaceBetween(html, START, END, engineForDemo());
}

export function injectData(html) {
  dataInDemo(html); // validates the markers
  return replaceBetween(html, DATA_START, DATA_END, dataForDemo());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = here("demo.html");
  writeFileSync(path, injectData(injectEngine(readFileSync(path, "utf8"))));
  console.log("Updated ranking/demo.html with the engine and demo rooms from platform/lib/roomsure/");
}
