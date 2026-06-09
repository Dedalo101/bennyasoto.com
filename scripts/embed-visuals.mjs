#!/usr/bin/env node
/**
 * Embed scripts/visuals.source.js into index.html (removes public /assets/js/visuals.js URL).
 * Usage: node scripts/embed-visuals.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourcePath = path.join(root, 'scripts', 'visuals.source.js');
const indexPath = path.join(root, 'index.html');
const markerStart = '<!-- visuals:inline:start -->';
const markerEnd = '<!-- visuals:inline:end -->';

const visuals = fs.readFileSync(sourcePath, 'utf8');
const block = `${markerStart}\n<script>\n${visuals}\n</script>\n${markerEnd}`;

let index = fs.readFileSync(indexPath, 'utf8');
const externalTag = '<script src="assets/js/visuals.js" defer></script>';
const re = new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}|${externalTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

if (!re.test(index)) {
  console.error('embed-visuals: no visuals slot found in index.html');
  process.exit(1);
}

index = index.replace(re, block);
fs.writeFileSync(indexPath, index);
console.log(`embed-visuals: inlined ${visuals.length} bytes from scripts/visuals.source.js`);