import {test, assertEqual, assertThrows} from './harness.js';
import {parseGridSpec, tryParseGridSpec, formatGridSpec, GridSpecError} from '../lib/gridspec.js';

test('parses a left-third spec', () => {
    assertEqual(parseGridSpec('3x1 1:1 1:1'), {cols: 3, rows: 1, x1: 1, y1: 1, x2: 1, y2: 1});
});

test('parses a multi-cell span', () => {
    assertEqual(parseGridSpec('8x1 3:1 6:1'), {cols: 8, rows: 1, x1: 3, y1: 1, x2: 6, y2: 1});
});

test('normalizes reversed corners', () => {
    assertEqual(parseGridSpec('4x2 4:2 2:1'), {cols: 4, rows: 2, x1: 2, y1: 1, x2: 4, y2: 2});
});

test('tolerates loose whitespace and uppercase X', () => {
    assertEqual(parseGridSpec('  2X1   1:1  2:1 '), {cols: 2, rows: 1, x1: 1, y1: 1, x2: 2, y2: 1});
});

test('rejects out-of-range cells', () => {
    assertThrows(() => parseGridSpec('3x1 1:1 4:1'), GridSpecError, 'column 4 in 3 cols');
    assertThrows(() => parseGridSpec('3x1 0:1 1:1'), GridSpecError, 'column 0');
    assertThrows(() => parseGridSpec('3x1 1:2 1:1'), GridSpecError, 'row 2 in 1 row');
});

test('rejects garbage', () => {
    assertThrows(() => parseGridSpec(''), GridSpecError, 'empty');
    assertThrows(() => parseGridSpec('left third'), GridSpecError, 'words');
    assertThrows(() => parseGridSpec('0x1 1:1 1:1'), GridSpecError, 'zero grid');
    assertThrows(() => parseGridSpec(null), GridSpecError, 'null');
});

test('tryParse returns null instead of throwing', () => {
    assertEqual(tryParseGridSpec('nope'), null);
    assertEqual(tryParseGridSpec('1x1 1:1 1:1'), {cols: 1, rows: 1, x1: 1, y1: 1, x2: 1, y2: 1});
});

test('format round-trips', () => {
    for (const s of ['2x1 1:1 1:1', '6x1 3:1 6:1', '1x1 1:1 1:1'])
        assertEqual(formatGridSpec(parseGridSpec(s)), s);
});

