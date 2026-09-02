// Watches for new windows and places them according to rules or the fallback.

import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {findRule, parseRules, toWorkspaceIndex} from './rules.js';
import {rectForSelection} from './geometry.js';
import {chooseSequenceSlot} from './layouts.js';
import {isPlacementCandidate, isTileable, placeWindow} from './placer.js';

/** Windows created this soon after enable() are placed but never activated. */
const LOGIN_GRACE_US = 5 * GLib.USEC_PER_SEC;

const plainRect = r => ({x: r.x, y: r.y, width: r.width, height: r.height});

export class RulesEngine {
    constructor(settings, presets) {
        this._settings = settings;
        this._presets = presets;
        this._rules = [];
        this._pending = new Map();
        this._windowCreatedId = 0;
        this._rulesChangedId = 0;
        this._graceUntil = 0;
    }

    enable() {
        this._loadRules();
        this._rulesChangedId = this._settings.connect('changed::rules', () => this._loadRules());
        this._graceUntil = GLib.get_monotonic_time() + LOGIN_GRACE_US;
        this._windowCreatedId = global.display.connect_after('window-created',
            (_display, win) => this._onWindowCreated(win));
    }

    disable() {
        if (this._windowCreatedId) {
            global.display.disconnect(this._windowCreatedId);
            this._windowCreatedId = 0;
        }
        if (this._rulesChangedId) {
            this._settings.disconnect(this._rulesChangedId);
            this._rulesChangedId = 0;
        }
        for (const win of [...this._pending.keys()])
            this._release(win);
    }

    /**
     * Re-apply rules to every open window without switching workspaces.
     * Sequenced rules hand out their slots in window creation order.
     */
    resetLayout() {
        const windows = this._allWindows()
            .filter(win => isTileable(win))
            .sort((a, b) => a.get_stable_sequence() - b.get_stable_sequence());

        let placed = 0;
        const sequenced = new Map();
        for (const win of windows) {
            const rule = findRule(this._rules, this._appCandidates(win));
            if (!rule)
                continue;
            if (rule.presets) {
                if (!sequenced.has(rule))
                    sequenced.set(rule, []);
                sequenced.get(rule).push(win);
                continue;
            }
            if (this._placeExisting(win, rule, rule.preset))
                placed++;
        }
        for (const [rule, wins] of sequenced) {
            wins.forEach((win, i) => {
                if (this._placeExisting(win, rule, rule.presets[i % rule.presets.length]))
                    placed++;
            });
        }
        console.log(`[terazzo] reset layout: ${placed} window(s) placed`);
    }

    _placeExisting(win, rule, slot) {
        const spec = this._presets.get(slot);
        if (!spec)
            return false;
        this._moveToWorkspace(win, toWorkspaceIndex(rule));
        return placeWindow(win, spec, win.get_monitor());
    }

    _loadRules() {
        const {rules, error} = parseRules(this._settings.get_string('rules'));
        if (error)
            console.warn(`[terazzo] ${error}`);
        this._rules = rules;
    }

    _onWindowCreated(win) {
        if (!isPlacementCandidate(win))
            return;
        const actor = win.get_compositor_private();
        if (!actor)
            return;

        const pending = {actor, firstFrameId: 0, unmanagingId: 0, idleId: 0};
        this._pending.set(win, pending);

        pending.unmanagingId = win.connect('unmanaging', () => this._release(win));
        pending.firstFrameId = actor.connect('first-frame', () => {
            actor.disconnect(pending.firstFrameId);
            pending.firstFrameId = 0;
            pending.idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                pending.idleId = 0;
                try {
                    this._placeNew(win);
                } catch (e) {
                    console.error(`[terazzo] placement failed: ${e.message}`);
                } finally {
                    this._release(win);
                }
                return GLib.SOURCE_REMOVE;
            });
        });
    }

    _release(win) {
        const pending = this._pending.get(win);
        if (!pending)
            return;
        this._pending.delete(win);
        if (pending.firstFrameId)
            pending.actor.disconnect(pending.firstFrameId);
        if (pending.unmanagingId)
            win.disconnect(pending.unmanagingId);
        if (pending.idleId)
            GLib.Source.remove(pending.idleId);
    }

    _allWindows() {
        return global.get_window_actors()
            .map(actor => actor.meta_window)
            .filter(win => win && isPlacementCandidate(win));
    }

    /** App ids to try, most specific first. Window-backed apps have no desktop id yet. */
    _appCandidates(win) {
        const ids = [];
        const app = Shell.WindowTracker.get_default().get_window_app(win);
        if (app && !app.is_window_backed())
            ids.push(app.get_id());
        ids.push(win.get_gtk_application_id(), win.get_sandboxed_app_id(), win.get_wm_class());
        return ids.filter(Boolean);
    }

    /** Other open windows that match the same rule. */
    _siblingWindows(win, rule) {
        return this._allWindows().filter(other =>
            other !== win && findRule([rule], this._appCandidates(other)) === rule);
    }

    /** For a sequenced rule: the first slot on this monitor and workspace with no sibling in it. */
    _chooseSequenceSlot(win, rule, monitor, wsIndex) {
        const targetWs = wsIndex ?? global.workspace_manager.get_active_workspace_index();
        const siblings = this._siblingWindows(win, rule).filter(other =>
            other.get_monitor() === monitor &&
            (other.is_on_all_workspaces() || other.get_workspace()?.index() === targetWs));

        const workArea = win.get_work_area_for_monitor(monitor);
        const slotRects = new Map();
        for (const slot of rule.presets) {
            const spec = this._presets.get(slot);
            if (spec)
                slotRects.set(slot, rectForSelection(spec, workArea));
        }
        return chooseSequenceSlot(rule.presets, slotRects, siblings.map(w => plainRect(w.get_frame_rect())));
    }

    _placeNew(win) {
        const frame = win.get_frame_rect();
        if (frame.width === 0 || frame.height === 0)
            return;
        if (!isTileable(win))
            return;

        const monitor = global.display.get_current_monitor();
        const rule = findRule(this._rules, this._appCandidates(win));
        let slot;
        let wsIndex = null;
        if (rule) {
            wsIndex = toWorkspaceIndex(rule);
            slot = rule.presets ? this._chooseSequenceSlot(win, rule, monitor, wsIndex) : rule.preset;
        } else {
            slot = this._settings.get_int('fallback-preset');
            if (!slot)
                return;
        }
        const spec = slot ? this._presets.get(slot) : null;
        if (!spec) {
            console.warn(`[terazzo] preset ${slot} is empty or invalid; not placing "${win.get_title()}"`);
            return;
        }

        // During the login grace period windows still go to their workspace,
        // but focus never follows them, so autostarted apps do not bounce the view.
        const inGrace = GLib.get_monotonic_time() < this._graceUntil;
        const movedWorkspace = this._moveToWorkspace(win, wsIndex);
        placeWindow(win, spec, monitor);
        if (movedWorkspace && !inGrace)
            Main.activateWindow(win);
    }

    /** @returns {boolean} true when the window changed workspace. */
    _moveToWorkspace(win, wsIndex) {
        if (wsIndex === null || win.is_on_all_workspaces())
            return false;
        const count = global.workspace_manager.get_n_workspaces();
        if (wsIndex >= count) {
            console.warn(`[terazzo] workspace ${wsIndex + 1} does not exist (have ${count}); leaving "${win.get_title()}" where it is`);
            return false;
        }
        if (win.get_workspace()?.index() === wsIndex)
            return false;
        win.change_workspace_by_index(wsIndex, false);
        return true;
    }
}
