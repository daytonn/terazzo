import {test, assertEqual} from './harness.js';
import {parseGridSpec} from '../lib/gridspec.js';
import {rectForSelection, rectsClose} from '../lib/geometry.js';

// One 5120x1440 monitor with GNOME's top bar reserving 32 px.
const WA = {x: 0, y: 32, width: 5120, height: 1408};
// Secondary monitor to the right of the first.
const WA2 = {x: 5120, y: 32, width: 5120, height: 1408};

const rect = (s, wa = WA) => rectForSelection(parseGridSpec(s), wa);

test('full screen is the work area', () => {
    assertEqual(rect('1x1 1:1 1:1'), WA);
});

test('halves', () => {
    assertEqual(rect('2x1 1:1 1:1'), {x: 0, y: 32, width: 2560, height: 1408});
    assertEqual(rect('2x1 2:1 2:1'), {x: 2560, y: 32, width: 2560, height: 1408});
});

test('thirds tile the width exactly', () => {
    const l = rect('3x1 1:1 1:1');
    const c = rect('3x1 2:1 2:1');
    const r = rect('3x1 3:1 3:1');
    assertEqual(l.x, 0);
    assertEqual(l.x + l.width, c.x, 'left meets center');
    assertEqual(c.x + c.width, r.x, 'center meets right');
    assertEqual(r.x + r.width, 5120, 'right reaches edge');
});

test('quarters', () => {
    assertEqual(rect('4x1 3:1 3:1'), {x: 2560, y: 32, width: 1280, height: 1408});
});

test('centered half and two-thirds', () => {
    assertEqual(rect('8x1 3:1 6:1'), {x: 1280, y: 32, width: 2560, height: 1408});
    assertEqual(rect('6x1 1:1 4:1'), {x: 0, y: 32, width: 3413, height: 1408});
    assertEqual(rect('6x1 3:1 6:1'), {x: 1707, y: 32, width: 3413, height: 1408});
});

test('offsets by the monitor origin', () => {
    assertEqual(rect('3x1 2:1 2:1', WA2), {x: 5120 + 1707, y: 32, width: 1706, height: 1408});
});

test('rows split height', () => {
    assertEqual(rect('1x2 1:2 1:2'), {x: 0, y: 32 + 704, width: 5120, height: 704});
});

test('odd widths never leave a gap or overlap', () => {
    const wa = {x: 0, y: 0, width: 1001, height: 7};
    const cols = 3;
    let edge = 0;
    for (let c = 1; c <= cols; c++) {
        const r = rectForSelection({cols, rows: 1, x1: c, y1: 1, x2: c, y2: 1}, wa);
        assertEqual(r.x, edge, `column ${c} starts where the previous ended`);
        edge = r.x + r.width;
    }
    assertEqual(edge, 1001);
});

test('rectsClose tolerance', () => {
    const a = {x: 0, y: 0, width: 100, height: 100};
    assertEqual(rectsClose(a, {x: 1, y: 2, width: 99, height: 101}), true);
    assertEqual(rectsClose(a, {x: 5, y: 0, width: 100, height: 100}), false);
});
