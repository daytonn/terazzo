// GTK4 and libadwaita have no shortcut-capture widget, so this is hand-built:
// a button showing the current accelerator that opens a capture dialog.

import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

export const ShortcutButton = GObject.registerClass(
class ShortcutButton extends Gtk.Button {
    _init(settings, key) {
        super._init({valign: Gtk.Align.CENTER, has_frame: false});
        this._settings = settings;
        this._key = key;
        this._label = new Gtk.ShortcutLabel({disabled_text: 'Disabled'});
        this.set_child(this._label);
        this._changedId = settings.connect(`changed::${key}`, () => this._refresh());
        this._refresh();
        this.connect('clicked', () => this._capture());
        this.connect('destroy', () => {
            if (this._changedId)
                this._settings.disconnect(this._changedId);
            this._changedId = 0;
        });
    }

    _refresh() {
        const [accel] = this._settings.get_strv(this._key);
        this._label.accelerator = accel ?? '';
    }

    _capture() {
        const dialog = new Adw.AlertDialog({
            heading: 'Set shortcut',
            body: 'Press a key combination. Backspace clears the shortcut, Escape cancels.',
        });
        dialog.add_response('cancel', 'Cancel');

        const controller = new Gtk.EventControllerKey({propagation_phase: Gtk.PropagationPhase.CAPTURE});
        controller.connect('key-pressed', (_ctrl, keyval, keycode, state) => {
            const mask = state & Gtk.accelerator_get_default_mod_mask();
            if (mask === 0 && keyval === Gdk.KEY_Escape) {
                dialog.close();
                return Gdk.EVENT_STOP;
            }
            if (mask === 0 && keyval === Gdk.KEY_BackSpace) {
                this._settings.set_strv(this._key, []);
                dialog.close();
                return Gdk.EVENT_STOP;
            }
            if (!Gtk.accelerator_valid(keyval, mask))
                return Gdk.EVENT_STOP; // a lone modifier or an unbindable key
            const accel = Gtk.accelerator_name_with_keycode(null, keyval, keycode, mask);
            this._settings.set_strv(this._key, [accel]);
            dialog.close();
            return Gdk.EVENT_STOP;
        });
        dialog.add_controller(controller);
        dialog.present(this.get_root());
    }
});
