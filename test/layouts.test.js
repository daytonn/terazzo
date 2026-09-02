import {test, assertEqual} from './harness.js';
import {detectLayouts, matchNamedLayout, parseSequence, formatSequence, chooseSequenceSlot} from '../lib/layouts.js';
import {validateRule, parseRules, serializeRules} from '../lib/rules.js';

// The user's imported gTile presets, slot 1 first.
const SPECS = ['2x1 1:1 1:1', '2x1 2:1 2:1', '3x1 1:1 1:1', '3x1 2:1 2:1', '3x1 3:1 3:1',
    '4x1 1:1 1:1', '4x1 2:1 2:1', '4x1 3:1 3:1', '4x1 4:1 4:1', '8x1 3:1 6:1',
    '1x1 1:1 1:1', '6x1 1:1 4:1', '6x1 3:1 6:1'];

test('detects halves, thirds and quarters from the default specs', () => {
    assertEqual(detectLayouts(SPECS), {halves: [1, 2], thirds: [3, 4, 5], quarters: [6, 7, 8, 9]});
});

test('detection orders by column regardless of slot order', () => {
    const specs = ['2x1 2:1 2:1', '2x1 1:1 1:1'];
    assertEqual(detectLayouts(specs).halves, [2, 1]);
});

test('an incomplete layout is empty', () => {
    const specs = ['3x1 1:1 1:1', '3x1 3:1 3:1', 'garbage'];
    assertEqual(detectLayouts(specs), {halves: [], thirds: [], quarters: []});
});

test('spanning cells do not count toward a layout', () => {
    const specs = ['4x1 1:1 2:1', '4x1 1:1 1:1', '4x1 2:1 2:1', '4x1 3:1 3:1', '4x1 4:1 4:1'];
    assertEqual(detectLayouts(specs).quarters, [2, 3, 4, 5]);
});

test('matchNamedLayout', () => {
    const layouts = detectLayouts(SPECS);
    assertEqual(matchNamedLayout([6, 7, 8, 9], layouts), 'quarters');
    assertEqual(matchNamedLayout([9, 8, 7, 6], layouts), null);
    assertEqual(matchNamedLayout([1, 2], layouts), 'halves');
});

test('parseSequence accepts commas and spaces', () => {
    assertEqual(parseSequence('6, 7,8 9'), [6, 7, 8, 9]);
    assertEqual(parseSequence(''), null);
    assertEqual(parseSequence('1, x'), null);
    assertEqual(parseSequence('0, 1'), null);
    assertEqual(parseSequence('14'), null);
    assertEqual(formatSequence([6, 7]), '6, 7');
});

const quarter = i => ({x: (i - 1) * 1000, y: 0, width: 1000, height: 1000});
const slotRects = new Map([[6, quarter(1)], [7, quarter(2)], [8, quarter(3)], [9, quarter(4)]]);

test('first window takes the first slot', () => {
    assertEqual(chooseSequenceSlot([6, 7, 8, 9], slotRects, []), 6);
});

test('later windows fill the next free slot', () => {
    assertEqual(chooseSequenceSlot([6, 7, 8, 9], slotRects, [quarter(1)]), 7);
    assertEqual(chooseSequenceSlot([6, 7, 8, 9], slotRects, [quarter(1), quarter(2), quarter(3)]), 9);
});

test('a vacated slot is refilled before moving on', () => {
    assertEqual(chooseSequenceSlot([6, 7, 8, 9], slotRects, [quarter(1), quarter(3)]), 7);
});

test('occupancy is judged by the sibling window centre, so oversized windows still count', () => {
    const big = {x: 100, y: 0, width: 1500, height: 1000}; // centre at 850, inside quarter 1
    assertEqual(chooseSequenceSlot([6, 7, 8, 9], slotRects, [big]), 7);
});

test('a moved-away sibling frees its slot', () => {
    const elsewhere = {x: 5000, y: 0, width: 500, height: 500};
    assertEqual(chooseSequenceSlot([6, 7, 8, 9], slotRects, [elsewhere]), 6);
});

test('when every slot is taken, cycle by sibling count', () => {
    const all = [quarter(1), quarter(2), quarter(3), quarter(4)];
    assertEqual(chooseSequenceSlot([6, 7, 8, 9], slotRects, all), 6);
    assertEqual(chooseSequenceSlot([6, 7, 8, 9], slotRects, [...all, quarter(1)]), 7);
});

test('slots without a rectangle are skipped; none usable yields null', () => {
    assertEqual(chooseSequenceSlot([13, 6], slotRects, []), 6);
    assertEqual(chooseSequenceSlot([13], slotRects, []), null);
});

test('rules accept a presets sequence and derive preset from it', () => {
    assertEqual(validateRule({app: 'org.gnome.Nautilus.desktop', presets: [6, 7, 8, 9]}),
        {app: 'org.gnome.Nautilus.desktop', workspace: null, preset: 6, enabled: true, presets: [6, 7, 8, 9]});
    assertEqual(validateRule({app: 'x', presets: []}), null);
    assertEqual(validateRule({app: 'x', presets: [1, 99]}), null);
    assertEqual(validateRule({app: 'x', preset: 2}).presets, undefined);
});

test('sequence round-trips through JSON', () => {
    const rules = [{app: 'a.desktop', workspace: 2, preset: 6, enabled: true, presets: [6, 7, 8, 9]}];
    assertEqual(parseRules(serializeRules(rules)).rules, rules);
});
