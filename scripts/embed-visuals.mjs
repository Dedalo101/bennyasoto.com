#!/usr/bin/env node
/**
 * Inline assets/js/visuals.js into index.html (no public /assets/js/visuals.js URL).
 * Usage: node scripts/embed-visuals.mjs [--check]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourcePath = path.join(root, 'assets', 'js', 'visuals.js');
const mirrorPath = path.join(root, 'scripts', 'visuals.source.js');
const indexPath = path.join(root, 'index.html');
const markerStart = '<!-- visuals:inline:start -->';
const markerEnd = '<!-- visuals:inline:end -->';
const checkOnly = process.argv.includes('--check');

const visuals = fs.readFileSync(sourcePath, 'utf8');
const block = `${markerStart}\n<script>\n${visuals}\n</script>\n${markerEnd}`;

let index = fs.readFileSync(indexPath, 'utf8');
const externalTag = '<script src="assets/js/visuals.js" defer></script>';
const re = new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}|${externalTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

if (!re.test(index)) {
  console.error('embed-visuals: no visuals slot found in index.html');
  process.exit(1);
}

const next = index.replace(re, block);

if (checkOnly) {
  if (next === index) {
    console.log('embed-visuals: index.html is in sync with assets/js/visuals.js');
    process.exit(0);
  }
  console.error('embed-visuals: index.html is out of sync — run node scripts/embed-visuals.mjs');
  process.exit(1);
}

fs.writeFileSync(indexPath, next);
fs.writeFileSync(mirrorPath, visuals);
console.log(`embed-visuals: inlined ${visuals.length} bytes from assets/js/visuals.js`);