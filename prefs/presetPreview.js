// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

// Small drawing of a grid spec: the monitor outline with the selection filled.

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

export const PresetPreview = GObject.registerClass(
class PresetPreview extends Gtk.DrawingArea {
    _init(spec = null) {
        super._init({
            content_width: 56,
            content_height: 16,
            valign: Gtk.Align.CENTER,
            margin_end: 6,
        });
        this._spec = spec;
        this.set_draw_func((_area, cr, w, h) => this._draw(cr, w, h));
    }

    setSpec(spec) {
        this._spec = spec;
        this.queue_draw();
    }

    _draw(cr, w, h) {
        const fg = this.get_color();
        cr.setLineWidth(1);
        cr.rectangle(0.5, 0.5, w - 1, h - 1);
        cr.setSourceRGBA(fg.red, fg.green, fg.blue, this._spec ? 0.5 : 0.2);
        cr.stroke();
        if (!this._spec)
            return;
        const {cols, rows, x1, y1, x2, y2} = this._spec;
        const cw = (w - 2) / cols;
        const ch = (h - 2) / rows;
        cr.rectangle(1 + (x1 - 1) * cw, 1 + (y1 - 1) * ch, (x2 - x1 + 1) * cw, (y2 - y1 + 1) * ch);
        cr.setSourceRGBA(fg.red, fg.green, fg.blue, 0.75);
        cr.fill();
    }
});
