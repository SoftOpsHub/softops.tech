// Pre-deploy checks for the static site. No dependencies: `node scripts/check.mjs`.
//  1. Every local href/src/url() points at a file that exists.
//  2. Every in-page #anchor has a matching id.
//  3. No third-party requests (links out are fine; loading from elsewhere is not).
//  4. The page stays inside its weight budget.
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = ["index.html", "404.html"];
const BUDGET_KB = 200; // HTML + CSS + JS + fonts + icons for the home page
const errors = [];

const localPath = (ref) => join(root, ref.split(/[?#]/)[0].replace(/^\//, ""));

for (const page of pages) {
  const html = readFileSync(join(root, page), "utf8");
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

  for (const [, attr, ref] of html.matchAll(/\s(href|src)="([^"]+)"/g)) {
    if (/^(mailto:|tel:)/.test(ref)) continue;
    if (ref.startsWith("#")) {
      if (ref.length > 1 && !ids.has(ref.slice(1))) errors.push(`${page}: #${ref.slice(1)} has no matching id`);
      continue;
    }
    if (/^https?:\/\//.test(ref)) {
      // Only <a href> may point off-site; anything the browser would fetch must be local.
      const link = html.match(new RegExp(`<link[^>]*href="${ref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`));
      const isLoad = attr === "src" || (link && !/rel="canonical"/.test(link[0]));
      if (isLoad) errors.push(`${page}: third-party resource ${ref}`);
      continue;
    }
    if (!existsSync(localPath(ref))) errors.push(`${page}: missing file for ${ref}`);
  }
}

const css = readFileSync(join(root, "assets/css/site.css"), "utf8");
for (const [, ref] of css.matchAll(/url\("?([^")]+)"?\)/g)) {
  if (!existsSync(localPath(ref))) errors.push(`site.css: missing file for ${ref}`);
}

const weighed = ["index.html", "assets/css/site.css", "assets/js/site.js",
  "assets/fonts/geist-latin.woff2", "assets/fonts/geist-mono-latin.woff2", "assets/img/favicon.svg"];
const kb = weighed.reduce((n, f) => n + statSync(join(root, f)).size, 0) / 1024;
if (kb > BUDGET_KB) errors.push(`page weight ${kb.toFixed(1)} KB exceeds budget of ${BUDGET_KB} KB`);

if (errors.length) {
  console.error(errors.map((e) => "✗ " + e).join("\n"));
  process.exit(1);
}
console.log(`✓ links, anchors and assets resolve · ✓ no third-party requests · ✓ ${kb.toFixed(1)} KB (budget ${BUDGET_KB} KB)`);
