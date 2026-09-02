// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

// Grid spec parsing. A spec reads "COLSxROWS c1:r1 c2:r2",
// where the two cells are opposite corners of the selection, 1-based inclusive.
// No GNOME imports here so this module runs under plain `gjs -m` for tests.

export class GridSpecError extends Error {
    constructor(message, text) {
        super(message);
        this.name = 'GridSpecError';
        this.text = text;
    }
}

const SPEC_RE = /^\s*(\d+)\s*x\s*(\d+)\s+(\d+)\s*:\s*(\d+)\s+(\d+)\s*:\s*(\d+)\s*$/i;

export const PRESET_SLOTS = 13;

/**
 * Parse a grid spec string.
 * @returns {{cols:number, rows:number, x1:number, y1:number, x2:number, y2:number}}
 *          with x1<=x2 and y1<=y2, all 1-based.
 * @throws {GridSpecError}
 */
export function parseGridSpec(text) {
    if (typeof text !== 'string')
        throw new GridSpecError('spec must be a string', text);
    const m = SPEC_RE.exec(text);
    if (!m)
        throw new GridSpecError('expected "COLSxROWS c1:r1 c2:r2"', text);
    const [cols, rows, ax, ay, bx, by] = m.slice(1).map(Number);
    if (cols < 1 || rows < 1)
        throw new GridSpecError('grid must be at least 1x1', text);
    for (const [v, max, label] of [[ax, cols, 'column'], [bx, cols, 'column'], [ay, rows, 'row'], [by, rows, 'row']]) {
        if (v < 1 || v > max)
            throw new GridSpecError(`${label} ${v} is outside 1..${max}`, text);
    }
    return {
        cols, rows,
        x1: Math.min(ax, bx), y1: Math.min(ay, by),
        x2: Math.max(ax, bx), y2: Math.max(ay, by),
    };
}

/** Non-throwing variant: returns null on error. */
export function tryParseGridSpec(text) {
    try {
        return parseGridSpec(text);
    } catch (e) {
        if (e instanceof GridSpecError)
            return null;
        throw e;
    }
}

export function formatGridSpec(spec) {
    return `${spec.cols}x${spec.rows} ${spec.x1}:${spec.y1} ${spec.x2}:${spec.y2}`;
}

