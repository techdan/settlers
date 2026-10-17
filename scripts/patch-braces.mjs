// Temporary mitigation for GHSA-vfj7-8cjw-p6xm. Remove when upstream ships a fix.
// Keep the real package version: npm audit must continue reporting the advisory.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = path.dirname(require.resolve('braces/package.json'));
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
if (version !== '3.0.3') throw new Error(`Review braces security patch for version ${version}`);
const marker = '// settlers: bounded recursion (GHSA-vfj7-8cjw-p6xm)';
const guard = "if (depth > 64) throw new SyntaxError('Brace nesting exceeds security limit (64)');";

function patch(file, replacements) {
    const filename = path.join(root, 'lib', file);
    let source = fs.readFileSync(filename, 'utf8');
    if (source.includes(marker)) return;
    for (const [before, after, count] of replacements) {
        if (source.split(before).length - 1 !== count) {
            throw new Error(`Unexpected braces source in ${file}; review security patch`);
        }
        source = source.split(before).join(after);
    }
    fs.writeFileSync(filename, `${marker}\n${source}`);
}

// Bound parsing before its malformed-input cleanup invokes recursive stringify.
patch('parse.js', [[
    'stack.push(block);',
    "if (stack.length >= 64) throw new SyntaxError('Brace nesting exceeds security limit (64)');\n      stack.push(block);",
    2,
]]);
for (const file of ['compile.js', 'expand.js']) {
    patch(file, [
        ['const walk = (node, parent = {}) => {', `const walk = (node, parent = {}, depth = 0) => {\n    ${guard}`, 1],
        ['walk(child, node)', 'walk(child, node, depth + 1)', 1],
    ]);
}
patch('stringify.js', [
    ['const stringify = (node, parent = {}) => {', `const stringify = (node, parent = {}, depth = 0) => {\n    ${guard}`, 1],
    ['stringify(child)', 'stringify(child, {}, depth + 1)', 1],
]);
console.log('Applied braces 3.0.3 recursion-depth security mitigation.');
