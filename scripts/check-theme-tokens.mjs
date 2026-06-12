#!/usr/bin/env node
/**
 * Scans src/ for hardcoded color values that bypass the design system.
 * Fails (exit 1) when violations are introduced outside of allowed paths.
 *
 * Allowed escape hatches:
 *  - src/components/ui/**     (shadcn primitives)
 *  - src/integrations/**      (generated SDK code)
 *  - src/styles.css           (token definitions)
 *  - src/lib/error-page.ts    (SSR fallback; inlines tokens by design)
 *  - *.gen.ts                 (generated files)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = new URL("../src/", import.meta.url).pathname;

const IGNORED = ["components/ui/", "integrations/", "styles.css", "lib/error-page.ts"];

const TAILWIND_PALETTE =
  "gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

const PATTERNS = [
  {
    name: "Hardcoded Tailwind palette color",
    re: new RegExp(
      `\\b(?:bg|text|border|ring|from|to|via|fill|stroke|decoration|outline|divide|placeholder|caret|accent|shadow)-(?:${TAILWIND_PALETTE})-\\d{2,3}(?:\\/\\d{1,3})?\\b`,
      "g",
    ),
  },
  {
    name: "Hardcoded black/white utility",
    re: /\b(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:black|white)(?:\/\d{1,3})?\b/g,
  },
  { name: "Inline hex color", re: /#[0-9a-fA-F]{3,8}\b/g },
  { name: "Inline rgb()/rgba()", re: /\brgba?\s*\(/g },
  { name: "Inline hsl()/hsla()", re: /\bhsla?\s*\(/g },
  { name: "Inline oklch() outside styles.css", re: /\boklch\s*\(/g },
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function isIgnored(relPath) {
  const p = relPath.split(sep).join("/");
  if (p.endsWith(".gen.ts") || p.endsWith(".gen.tsx")) return true;
  return IGNORED.some((i) => p === i || p.startsWith(i));
}

const violations = [];
const exts = new Set([".ts", ".tsx", ".css", ".js", ".jsx"]);

for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  if (isIgnored(rel)) continue;
  if (![...exts].some((e) => file.endsWith(e))) continue;

  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");

  for (const { name, re } of PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        violations.push({
          file: `src/${rel.split(sep).join("/")}`,
          line: i + 1,
          rule: name,
          match: m[0],
          snippet: line.trim().slice(0, 160),
        });
      }
    }
  }
}

if (violations.length === 0) {
  console.log("✓ theme-tokens: no hardcoded colors found in src/");
  process.exit(0);
}

console.error(
  `\n✗ theme-tokens: ${violations.length} hardcoded color${violations.length === 1 ? "" : "s"} found.\n` +
    `Use design tokens from src/styles.css (primary, secondary, accent, muted, foreground, background, border, ring, etc.).\n`,
);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  [${v.rule}]  ${v.match}`);
  console.error(`    ${v.snippet}`);
}
process.exit(1);
