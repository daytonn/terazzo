// The only module that moves windows. Order mirrors gTile, which is known to
// behave on GNOME 50 Wayland: unmaximize, move to monitor, move, move+resize.

import Meta from 'gi://Meta';

import {rectForSelection} from './geometry.js';

/** True for a normal, resizable, non-fullscreen top-level window. */
export function isTileable(win) {
    return win.get_window_type() === Meta.WindowType.NORMAL &&
        !win.is_fullscreen() &&
        win.allows_resize();
}

/** True for windows the rules engine should consider at all. */
export function isPlacementCandidate(win) {
    return win.get_window_type() === Meta.WindowType.NORMAL &&
        !win.get_transient_for() &&
        !win.is_skip_taskbar();
}

/**
 * Place `win` into `spec` on `monitorIdx`.
 * @returns {boolean} false when the window was skipped.
 */
export function placeWindow(win, spec, monitorIdx) {
    if (!isTileable(win))
        return false;
    const workArea = win.get_work_area_for_monitor(monitorIdx);
    if (!workArea || workArea.width === 0 || workArea.height === 0)
        return false;
    const rect = rectForSelection(spec, workArea);

    const [hasMin, minW, minH] = win.get_min_size();
    if (hasMin && (minW > rect.width || minH > rect.height)) {
        console.debug(`[terazzo] skipping "${win.get_title()}": minimum size ${minW}x${minH} exceeds ${rect.width}x${rect.height}`);
        return false;
    }

    win.set_unmaximize_flags(Meta.MaximizeFlags.BOTH);
    win.unmaximize();
    if (win.get_monitor() !== monitorIdx)
        win.move_to_monitor(monitorIdx);
    win.move_frame(true, rect.x, rect.y);
    win.move_resize_frame(true, rect.x, rect.y, rect.width, rect.height);
    return true;
}
