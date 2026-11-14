#!/usr/bin/env node
// Flags user-visible literal text in .tsx files (05 §6). No dependencies.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../src/', import.meta.url));
const ATTRS = ['aria-label', 'title', 'placeholder', 'alt', 'label'];
const IGNORE = '// i18n-ignore';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

// A text node is text between a closing `>` of a JSX tag and the next `<`.
const textNode = /<\/?[A-Za-z][^<>]*>([^<>{}]*[A-Za-zÀ-ÿ][^<>{}]*)</g;
const codeLike = /===|!==|&&|\|\||\?\s|=>/;
const attrLiteral = new RegExp(`\\b(${ATTRS.join('|')})=["']([^"']*[A-Za-zÀ-ÿ][^"']*)["']`, 'g');

let failures = 0;
for (const file of walk(ROOT)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.includes(IGNORE)) return;
    const code = line.replace(/\/\/.*$/, '');
    for (const m of code.matchAll(textNode)) {
      const txt = m[1].trim();
      if (!txt || /^[\s←-⇿·|:,.()\-–—]*$/.test(txt) || codeLike.test(txt)) continue;
      // allow pure symbols/numbers with units such as "6 h"
      if (/^[0-9\s←→·hmin]+$/.test(txt)) continue;
      failures++;
      console.log(`${relative(process.cwd(), file)}:${i + 1}: JSX text literal "${txt}"`);
    }
    for (const m of code.matchAll(attrLiteral)) {
      failures++;
      console.log(`${relative(process.cwd(), file)}:${i + 1}: literal ${m[1]}="${m[2]}"`);
    }
  });
}

if (failures > 0) {
  console.error(`check:i18n — ${failures} literal(s) found`);
  process.exit(1);
}
console.log('check:i18n — no user-visible literals in .tsx');
