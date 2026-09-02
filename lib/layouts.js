// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

// Sequenced layouts: a rule may carry an ordered list of preset slots, and each
// new window of the app takes the first slot not already occupied by a sibling.
// Pure module: no GNOME imports.

import {PRESET_SLOTS, tryParseGridSpec} from './gridspec.js';

export const NAMED_LAYOUTS = [
    {id: 'halves', name: 'Halves', cols: 2},
    {id: 'thirds', name: 'Thirds', cols: 3},
    {id: 'quarters', name: 'Quarters', cols: 4},
];

/**
 * Find the preset slots that make up each named layout, from the spec strings.
 * A layout is present when there is one single-cell, single-row slot for every
 * column of its grid. Slots are returned in left-to-right order.
 * @param {string[]} specTexts index 0 is slot 1
 * @returns {{halves: number[], thirds: number[], quarters: number[]}}
 */
export function detectLayouts(specTexts) {
    const parsed = specTexts.map((text, i) => ({slot: i + 1, spec: tryParseGridSpec(text)}));
    const result = {};
    for (const {id, cols} of NAMED_LAYOUTS) {
        const byColumn = new Map();
        for (const {slot, spec} of parsed) {
            if (!spec || spec.rows !== 1 || spec.cols !== cols || spec.x1 !== spec.x2)
                continue;
            if (!byColumn.has(spec.x1))
                byColumn.set(spec.x1, slot);
        }
        const complete = byColumn.size === cols;
        result[id] = complete ? [...byColumn.entries()].sort((a, b) => a[0] - b[0]).map(([, slot]) => slot) : [];
    }
    return result;
}

/** Name of the layout whose slots equal `sequence`, or null. */
export function matchNamedLayout(sequence, layouts) {
    for (const {id} of NAMED_LAYOUTS) {
        const slots = layouts[id];
        if (slots.length && slots.length === sequence.length && slots.every((s, i) => s === sequence[i]))
            return id;
    }
    return null;
}

/** Parse "6, 7, 8, 9" into [6,7,8,9]; null when empty or any entry is invalid. */
export function parseSequence(text) {
    const parts = String(text ?? '').split(/[,\s]+/).filter(Boolean);
    if (parts.length === 0)
        return null;
    const slots = parts.map(Number);
    if (slots.some(n => !Number.isInteger(n) || n < 1 || n > PRESET_SLOTS))
        return null;
    return slots;
}

export function formatSequence(slots) {
    return slots.join(', ');
}

function containsCenter(rect, other) {
    const cx = other.x + other.width / 2;
    const cy = other.y + other.height / 2;
    return cx >= rect.x && cx < rect.x + rect.width && cy >= rect.y && cy < rect.y + rect.height;
}

/**
 * Pick the slot for a new window.
 * @param {number[]} sequence ordered preset slots
 * @param {Map<number, object>} slotRects target rectangle per slot (slots without one are skipped)
 * @param {object[]} siblingRects frame rectangles of the app's existing windows
 * @returns {number|null} first slot whose rectangle holds no sibling's center;
 *          when every slot is taken, cycle by sibling count.
 */
export function chooseSequenceSlot(sequence, slotRects, siblingRects) {
    const usable = sequence.filter(slot => slotRects.has(slot));
    if (usable.length === 0)
        return null;
    for (const slot of usable) {
        const rect = slotRects.get(slot);
        if (!siblingRects.some(r => containsCenter(rect, r)))
            return slot;
    }
    return usable[siblingRects.length % usable.length];
}
