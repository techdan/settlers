// @vitest-environment node
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const require = createRequire(import.meta.url);
const braces = require('braces');

describe('braces stack-exhaustion mitigation', () => {
    it.each(['parse', 'compile', 'expand', 'stringify'])('rejects deeply nested strings in %s', method => {
        for (const pattern of ['{'.repeat(4_000) + 'a' + '}'.repeat(4_000), '{'.repeat(4_000), '('.repeat(4_000)]) {
            expect(() => braces[method](pattern)).toThrow('Brace nesting exceeds security limit');
        }
    });

    it.each(['compile', 'expand', 'stringify'])('rejects deep pre-parsed ASTs in %s', method => {
        let ast: object = { type: 'text', value: 'a', nodes: [] };
        for (let i = 0; i < 1000; i++) ast = { type: 'root', nodes: [ast] };
        expect(() => braces[method](ast)).toThrow('Brace nesting exceeds security limit');
    });

    it('preserves normal nested globs, ranges and stringification', () => {
        expect(braces.expand('src/{app,lib/{hooks,services}}/*.{ts,tsx}')).toEqual([
            'src/app/*.ts', 'src/app/*.tsx', 'src/lib/hooks/*.ts',
            'src/lib/hooks/*.tsx', 'src/lib/services/*.ts', 'src/lib/services/*.tsx',
        ]);
        expect(braces.expand('file{1..3}.ts')).toEqual(['file1.ts', 'file2.ts', 'file3.ts']);
        expect(braces.compile('a/{b,c}/d')).toBe('a/(b|c)/d');
        expect(braces.stringify(braces.parse('a/{b,c}/d'))).toBe('a/{b,c}/d');
    });
});
