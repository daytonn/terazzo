// Adds the running GNOME Shell's major version to metadata.json's
// shell-version list, so a GNOME upgrade only needs `make link` or
// `make install` rather than a hand edit. Run from the repository root.

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const PATH = 'metadata.json';

function runningMajor() {
    let out;
    try {
        [, out] = GLib.spawn_command_line_sync('gnome-shell --version');
    } catch {
        return null;
    }
    const match = new TextDecoder().decode(out).match(/GNOME Shell (\d+)/);
    return match?.[1] ?? null;
}

const major = runningMajor();
if (!major) {
    print('gnome-shell not found; leaving shell-version as is');
} else {
    const file = Gio.File.new_for_path(PATH);
    const [, bytes] = file.load_contents(null);
    const metadata = JSON.parse(new TextDecoder().decode(bytes));
    if (metadata['shell-version'].includes(major)) {
        print(`shell-version already lists ${major}`);
    } else {
        metadata['shell-version'].push(major);
        metadata['shell-version'].sort((a, b) => Number(a) - Number(b));
        const json = `${JSON.stringify(metadata, null, 2)}\n`;
        file.replace_contents(new TextEncoder().encode(json), null, false,
            Gio.FileCreateFlags.NONE, null);
        print(`Added GNOME Shell ${major} to shell-version`);
    }
}
