// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

// One-time import of gTile presets. gTile's schema is not in the default
// GSettings source, so it is loaded from the extension's own schemas directory.

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {PRESET_SLOTS, firstVariant, tryParseGridSpec} from './gridspec.js';

export const GTILE_UUID = 'gTile@vibou';
const GTILE_SCHEMA = 'org.gnome.shell.extensions.gtile';

function candidateSchemaDirs() {
    return [
        GLib.build_filenamev([GLib.get_user_data_dir(), 'gnome-shell', 'extensions', GTILE_UUID, 'schemas']),
        GLib.build_filenamev(['/usr/share/gnome-shell/extensions', GTILE_UUID, 'schemas']),
    ];
}

/** @returns {Gio.Settings|null} gTile's settings, or null when not installed. */
export function findGtileSettings() {
    for (const dir of candidateSchemaDirs()) {
        if (!GLib.file_test(GLib.build_filenamev([dir, 'gschemas.compiled']), GLib.FileTest.EXISTS))
            continue;
        try {
            const source = Gio.SettingsSchemaSource.new_from_directory(dir, Gio.SettingsSchemaSource.get_default(), false);
            const schema = source.lookup(GTILE_SCHEMA, false);
            if (schema)
                return new Gio.Settings({settings_schema: schema});
        } catch (e) {
            console.warn(`[terazzo] could not load gTile schema from ${dir}: ${e.message}`);
        }
    }
    return null;
}

export function isGtileEnabled() {
    const shell = new Gio.Settings({schema_id: 'org.gnome.shell'});
    return shell.get_strv('enabled-extensions').includes(GTILE_UUID);
}

/**
 * Copy gTile slots 1..13 (spec and keybinding) into our settings.
 * @returns {{found: boolean, specs: number, keys: number}}
 */
export function importFromGtile(settings) {
    const gtile = findGtileSettings();
    if (!gtile)
        return {found: false, specs: 0, keys: 0};

    let specs = 0;
    let keys = 0;
    for (let slot = 1; slot <= PRESET_SLOTS; slot++) {
        const spec = firstVariant(gtile.get_string(`resize${slot}`));
        if (tryParseGridSpec(spec)) {
            settings.set_string(`preset-spec-${slot}`, spec);
            specs++;
        }
        const binding = gtile.get_strv(`preset-resize-${slot}`);
        if (binding.length) {
            settings.set_strv(`preset-key-${slot}`, binding);
            keys++;
        }
    }
    settings.set_boolean('gtile-imported', true);
    return {found: true, specs, keys};
}
