// Builds every prefs page against an in-memory settings backend and exercises
// the rules page without a shell. Run with: make smoke
import Adw from 'gi://Adw?version=1';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import System from 'system';

import {buildPresetsPage, buildRulesPage, buildGeneralPage} from '../prefs/pages.js';

Adw.init();

const here = GLib.path_get_dirname(System.programPath);
const schemaDir = GLib.build_filenamev([here, '..', 'schemas']);
const source = Gio.SettingsSchemaSource.new_from_directory(schemaDir, Gio.SettingsSchemaSource.get_default(), false);
const schema = source.lookup('org.gnome.shell.extensions.terazzo', false);
if (!schema)
    throw new Error('compiled schema not found; run make schemas');
const settings = new Gio.Settings({settings_schema: schema});

const window = new Adw.PreferencesWindow();
window.add(buildPresetsPage(settings));
window.add(buildRulesPage(settings, window));
window.add(buildGeneralPage(settings, window));
print('pages built');

settings.set_string('rules', JSON.stringify([
    {app: 'firefox.desktop', workspace: 1, preset: 3},
    {app: 'org.gnome.Nautilus.desktop', presets: [6, 7, 8, 9]},
    {app: 'org.gnome.Ptyxis.desktop', presets: [9, 6]},
]));
settings.set_string('rules', '{broken');
settings.set_string('preset-spec-1', 'garbage');
settings.set_string('preset-spec-1', '2x1 1:1 1:1');
settings.set_int('fallback-preset', 0);
print('settings churn survived');

print('smoke ok');
