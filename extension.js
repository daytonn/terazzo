// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {PRESET_SLOTS} from './lib/gridspec.js';
import {PresetStore} from './lib/presets.js';
import {RulesEngine} from './lib/rulesEngine.js';
import {placeWindow} from './lib/placer.js';
import {importFromGtile, isGtileEnabled} from './lib/gtileImport.js';

export default class TerazzoExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._presets = new PresetStore(this._settings);
        this._engine = new RulesEngine(this._settings, this._presets);
        this._engine.enable();
        this._bindKeys();
        this._maybeImportFromGtile();
    }

    disable() {
        for (const name of this._boundKeys)
            Main.wm.removeKeybinding(name);
        this._boundKeys = [];
        this._engine.disable();
        this._engine = null;
        this._presets.destroy();
        this._presets = null;
        this._settings = null;
    }

    _bindKeys() {
        this._boundKeys = [];
        const bind = (name, handler) => {
            Main.wm.addKeybinding(name, this._settings, Meta.KeyBindingFlags.NONE, Shell.ActionMode.NORMAL, handler);
            this._boundKeys.push(name);
        };
        for (let slot = 1; slot <= PRESET_SLOTS; slot++)
            bind(`preset-key-${slot}`, () => this._applyPreset(slot));
        bind('reset-layout-key', () => this._engine.resetLayout());
    }

    _applyPreset(slot) {
        const win = global.display.focus_window;
        if (!win)
            return;
        const spec = this._presets.get(slot);
        if (!spec)
            return;
        placeWindow(win, spec, global.display.get_current_monitor());
    }

    _maybeImportFromGtile() {
        if (this._settings.get_boolean('gtile-imported'))
            return;
        if (isGtileEnabled()) {
            console.log('[terazzo] gTile is still enabled; skipping preset import so hotkeys do not collide');
            return;
        }
        const result = importFromGtile(this._settings);
        if (result.found)
            console.log(`[terazzo] imported ${result.specs} preset specs and ${result.keys} keybindings from gTile`);
    }
}
