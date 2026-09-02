// Pure geometry: a parsed grid spec plus a work area yields a frame rectangle.
// Edges are rounded independently so adjacent tiles share a boundary with no gap.

export function rectForSelection(spec, workArea) {
    const cellW = workArea.width / spec.cols;
    const cellH = workArea.height / spec.rows;
    const left = Math.round((spec.x1 - 1) * cellW);
    const right = Math.round(spec.x2 * cellW);
    const top = Math.round((spec.y1 - 1) * cellH);
    const bottom = Math.round(spec.y2 * cellH);
    return {
        x: workArea.x + left,
        y: workArea.y + top,
        width: right - left,
        height: bottom - top,
    };
}

/** True when two rectangles are within `tolerance` px on every edge. */
export function rectsClose(a, b, tolerance = 2) {
    return Math.abs(a.x - b.x) <= tolerance &&
        Math.abs(a.y - b.y) <= tolerance &&
        Math.abs(a.width - b.width) <= tolerance &&
        Math.abs(a.height - b.height) <= tolerance;
}
