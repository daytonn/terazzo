// Opens the real preferences pages in a standalone window, so the widget
// factories actually run. Needs a display; the extension need not be loaded.
// Runs for a few seconds and quits: `make preview`, or SECONDS=0 to keep it open.
import Adw from 'gi://Adw?version=1';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import System from 'system';

import {buildPresetsPage, buildRulesPage, buildGeneralPage} from '../prefs/pages.js';

const here = GLib.path_get_dirname(System.programPath);
const source = Gio.SettingsSchemaSource.new_from_directory(
    GLib.build_filenamev([here, '..', 'schemas']), Gio.SettingsSchemaSource.get_default(), false);
const settings = new Gio.Settings({
    settings_schema: source.lookup('org.gnome.shell.extensions.terazzo', false),
});

// The memory backend starts empty, so seed enough rules to exercise the rule
// rows, the graphic preset chooser and a sequenced layout.
if (settings.get_string('rules') === '[]') {
    settings.set_string('rules', JSON.stringify([
        {app: 'firefox.desktop', workspace: 1, preset: 3},
        {app: 'org.gnome.Ptyxis.desktop', workspace: 1, preset: 4},
        {app: 'org.gnome.Nautilus.desktop', presets: [6, 7, 8, 9]},
        {app: 'org.gnome.TextEditor.desktop', workspace: 2, preset: 10, enabled: false},
    ]));
}

const seconds = Number(GLib.getenv('SECONDS') ?? '4');
const app = new Adw.Application({application_id: 'com.daytonnolan.TerazzoPrefsPreview'});

// Every label in a realized tree, so a run can assert what actually rendered.
function renderedLabels(widget, out = []) {
    if (widget instanceof Gtk.Label && widget.label)
        out.push(widget.label);
    for (let child = widget.get_first_child(); child; child = child.get_next_sibling())
        renderedLabels(child, out);
    return out;
}

app.connect('activate', () => {
    const window = new Adw.PreferencesWindow({application: app, default_width: 720, default_height: 640});
    const pages = {
        presets: buildPresetsPage(settings),
        rules: buildRulesPage(settings, window),
        general: buildGeneralPage(settings, window),
    };
    for (const page of Object.values(pages))
        window.add(page);
    const wanted = GLib.getenv('PAGE');
    if (wanted && pages[wanted])
        window.visible_page = pages[wanted];
    window.present();
    if (GLib.getenv('CHECK')) {
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
            print('RENDERED: ' + renderedLabels(window).join(' | '));
            return GLib.SOURCE_REMOVE;
        });
    }
    if (seconds > 0) {
        GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, seconds, () => {
            app.quit();
            return GLib.SOURCE_REMOVE;
        });
    }
});

System.exit(app.run([]));
