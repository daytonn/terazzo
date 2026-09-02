// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

// Searchable list of installed desktop applications.
// Gtk.AppChooserWidget is deprecated since GTK 4.10, hence this replacement.

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

export function listApps() {
    return Gio.AppInfo.get_all()
        .filter(app => app.should_show())
        .sort((a, b) => a.get_display_name().localeCompare(b.get_display_name()));
}

export const AppChooserDialog = GObject.registerClass({
    Signals: {'app-chosen': {param_types: [GObject.TYPE_STRING]}},
}, class AppChooserDialog extends Adw.Dialog {
    _init(excludeIds = []) {
        super._init({title: 'Choose an application', content_width: 440, content_height: 600});
        const exclude = new Set(excludeIds.map(id => id.toLowerCase()));

        const search = new Gtk.SearchEntry({placeholder_text: 'Search applications', margin_start: 12, margin_end: 12, margin_top: 6, margin_bottom: 6});
        const list = new Gtk.ListBox({selection_mode: Gtk.SelectionMode.NONE, css_classes: ['boxed-list'], margin_start: 12, margin_end: 12, margin_bottom: 12});

        for (const app of listApps()) {
            const id = app.get_id();
            if (exclude.has(id.toLowerCase()))
                continue;
            const row = new Adw.ActionRow({title: app.get_display_name(), subtitle: id, activatable: true});
            const icon = app.get_icon();
            row.add_prefix(new Gtk.Image({gicon: icon ?? Gio.ThemedIcon.new('application-x-executable'), pixel_size: 24}));
            row._appId = id;
            row._haystack = `${app.get_display_name()} ${id}`.toLowerCase();
            list.append(row);
        }

        list.set_filter_func(row => {
            const q = search.text.trim().toLowerCase();
            return !q || row._haystack.includes(q);
        });
        search.connect('search-changed', () => list.invalidate_filter());
        list.connect('row-activated', (_list, row) => {
            this.emit('app-chosen', row._appId);
            this.close();
        });

        const scroller = new Gtk.ScrolledWindow({vexpand: true, child: list, hscrollbar_policy: Gtk.PolicyType.NEVER});
        const box = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL});
        box.append(search);
        box.append(scroller);
        const view = new Adw.ToolbarView({content: box});
        view.add_top_bar(new Adw.HeaderBar());
        this.set_child(view);
        this.set_focus(search);
    }
});
