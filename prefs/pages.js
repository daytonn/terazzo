// Builders for the three preference pages. They take a Gio.Settings so they can
// be exercised outside the shell with an in-memory backend.

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GioUnix from 'gi://GioUnix';
import Gtk from 'gi://Gtk';

import {PRESET_SLOTS, tryParseGridSpec} from '../lib/gridspec.js';
import {parseRules, serializeRules} from '../lib/rules.js';
import {NAMED_LAYOUTS, detectLayouts, matchNamedLayout, parseSequence, formatSequence} from '../lib/layouts.js';
import {importFromGtile, isGtileEnabled} from '../lib/gtileImport.js';
import {ShortcutButton} from './shortcutRow.js';
import {AppChooserDialog} from './appChooser.js';
import {PresetPreview} from './presetPreview.js';

const MAX_WORKSPACES = 36;

function presetLabel(settings, slot) {
    const spec = settings.get_string(`preset-spec-${slot}`).trim();
    return `${slot}: ${spec || '(empty)'}`;
}

function specTexts(settings) {
    const texts = [];
    for (let slot = 1; slot <= PRESET_SLOTS; slot++)
        texts.push(settings.get_string(`preset-spec-${slot}`));
    return texts;
}

const LAYOUT_ITEMS = ['Single preset', ...NAMED_LAYOUTS.map(l => l.name), 'Custom sequence'];
const CUSTOM_INDEX = LAYOUT_ITEMS.length - 1;

function layoutDescription(settings, rule) {
    if (!rule.presets)
        return presetLabel(settings, rule.preset);
    const named = matchNamedLayout(rule.presets, detectLayouts(specTexts(settings)));
    const name = named ? NAMED_LAYOUTS.find(l => l.id === named).name : 'Sequence';
    return `${name} (${formatSequence(rule.presets)})`;
}

function presetModel(settings, {includeNone = false} = {}) {
    const items = includeNone ? ['None'] : [];
    for (let slot = 1; slot <= PRESET_SLOTS; slot++)
        items.push(presetLabel(settings, slot));
    return Gtk.StringList.new(items);
}

function appDisplay(appId) {
    const info = appId.endsWith('.desktop') ? GioUnix.DesktopAppInfo.new(appId) : null;
    return {
        name: info?.get_display_name() ?? appId,
        icon: info?.get_icon() ?? Gio.ThemedIcon.new('application-x-executable'),
    };
}

// ---------------------------------------------------------------- Presets

export function buildPresetsPage(settings) {
    const page = new Adw.PreferencesPage({title: 'Presets', icon_name: 'view-grid-symbolic'});
    const group = new Adw.PreferencesGroup({
        title: 'Preset slots',
        description: 'Grid specs use gTile syntax: COLSxROWS c1:r1 c2:r2, cells 1-based. Example: 3x1 2:1 2:1 is the middle third.',
    });
    page.add(group);

    for (let slot = 1; slot <= PRESET_SLOTS; slot++) {
        const key = `preset-spec-${slot}`;
        const row = new Adw.ActionRow({title: `Preset ${slot}`});
        const preview = new PresetPreview(tryParseGridSpec(settings.get_string(key)));
        row.add_prefix(preview);

        const entry = new Gtk.Entry({
            text: settings.get_string(key),
            width_chars: 14,
            valign: Gtk.Align.CENTER,
            placeholder_text: '3x1 1:1 1:1',
        });
        entry.connect('changed', () => {
            const text = entry.text;
            const spec = tryParseGridSpec(text);
            const valid = Boolean(spec) || text.trim() === '';
            if (valid)
                entry.remove_css_class('error');
            else
                entry.add_css_class('error');
            entry.tooltip_text = valid ? '' : 'Expected COLSxROWS c1:r1 c2:r2';
            if (valid && settings.get_string(key) !== text)
                settings.set_string(key, text);
        });
        settings.connect(`changed::${key}`, () => {
            const text = settings.get_string(key);
            if (entry.text !== text)
                entry.text = text;
            preview.setSpec(tryParseGridSpec(text));
        });
        row.add_suffix(entry);
        row.add_suffix(new ShortcutButton(settings, `preset-key-${slot}`));
        group.add(row);
    }
    return page;
}

// ------------------------------------------------------------------ Rules

export function buildRulesPage(settings, window) {
    const page = new Adw.PreferencesPage({title: 'Rules', icon_name: 'preferences-desktop-apps-symbolic'});
    const group = new Adw.PreferencesGroup({
        title: 'Placement rules',
        description: 'New windows of these apps are moved to the workspace and tiled into the preset. Workspace 0 keeps the current one.',
    });
    page.add(group);

    const addButton = new Gtk.Button({icon_name: 'list-add-symbolic', css_classes: ['flat'], tooltip_text: 'Add a rule'});
    group.set_header_suffix(addButton);

    let rules = [];
    let lastWritten = null;
    let rows = [];

    const write = () => {
        lastWritten = serializeRules(rules);
        settings.set_string('rules', lastWritten);
        for (const {row, rule} of rows) {
            if (rule)
                row.subtitle = ruleSubtitle(settings, rule);
        }
    };

    const ruleSubtitle = (s, rule) =>
        `${rule.workspace ? `Workspace ${rule.workspace}` : 'Current workspace'} · ${layoutDescription(s, rule)}`;

    const rebuild = () => {
        for (const {row} of rows)
            group.remove(row);
        rows = [];
        if (rules.length === 0) {
            const empty = new Adw.ActionRow({title: 'No rules yet', subtitle: 'Click + to pick an application.'});
            group.add(empty);
            rows.push({row: empty, rule: null});
            return;
        }
        for (const rule of rules) {
            const row = buildRuleRow(rule);
            group.add(row);
            rows.push({row, rule});
        }
    };

    const buildRuleRow = rule => {
        const {name, icon} = appDisplay(rule.app);
        const row = new Adw.ExpanderRow({title: name, subtitle: ruleSubtitle(settings, rule)});
        row.add_prefix(new Gtk.Image({gicon: icon, pixel_size: 24}));

        const toggle = new Gtk.Switch({active: rule.enabled, valign: Gtk.Align.CENTER});
        toggle.connect('notify::active', () => {
            rule.enabled = toggle.active;
            write();
        });
        row.add_suffix(toggle);

        const idRow = new Adw.ActionRow({title: 'Application id', subtitle: rule.app, css_classes: ['property']});
        row.add_row(idRow);

        const wsRow = new Adw.SpinRow({
            title: 'Workspace',
            subtitle: '0 keeps the current workspace',
            adjustment: new Gtk.Adjustment({lower: 0, upper: MAX_WORKSPACES, step_increment: 1, value: rule.workspace ?? 0}),
        });
        wsRow.connect('notify::value', () => {
            const v = Math.round(wsRow.value);
            rule.workspace = v === 0 ? null : v;
            write();
        });
        row.add_row(wsRow);

        const layouts = detectLayouts(specTexts(settings));
        const layoutRow = new Adw.ComboRow({title: 'Layout', model: Gtk.StringList.new(LAYOUT_ITEMS)});
        const presetRow = new Adw.ComboRow({title: 'Preset', model: presetModel(settings), selected: rule.preset - 1});
        const sequenceRow = new Adw.EntryRow({title: 'Preset order', text: rule.presets ? formatSequence(rule.presets) : ''});

        const initialLayout = () => {
            if (!rule.presets)
                return 0;
            const named = matchNamedLayout(rule.presets, layouts);
            return named ? 1 + NAMED_LAYOUTS.findIndex(l => l.id === named) : CUSTOM_INDEX;
        };
        const syncLayoutRows = () => {
            const idx = layoutRow.selected;
            presetRow.visible = idx === 0;
            sequenceRow.visible = idx === CUSTOM_INDEX;
            const named = NAMED_LAYOUTS[idx - 1];
            if (named) {
                const slots = layouts[named.id];
                layoutRow.subtitle = slots.length
                    ? `Windows open in presets ${formatSequence(slots)}, left to right`
                    : `No single-cell ${named.cols}-column presets found; define them on the Presets page`;
            } else {
                layoutRow.subtitle = idx === 0 ? 'Every new window takes the same preset' : 'Comma-separated preset numbers, e.g. 6, 7, 8, 9';
            }
        };
        layoutRow.selected = initialLayout();
        syncLayoutRows();

        layoutRow.connect('notify::selected', () => {
            const idx = layoutRow.selected;
            syncLayoutRows();
            if (idx === 0) {
                delete rule.presets;
            } else if (idx === CUSTOM_INDEX) {
                const seq = parseSequence(sequenceRow.text);
                if (!seq)
                    return; // written once the entry holds a valid sequence
                rule.presets = seq;
            } else {
                const slots = layouts[NAMED_LAYOUTS[idx - 1].id];
                if (!slots.length)
                    return;
                rule.presets = slots;
                sequenceRow.text = formatSequence(slots);
            }
            if (rule.presets)
                rule.preset = rule.presets[0];
            write();
        });
        presetRow.connect('notify::selected', () => {
            rule.preset = presetRow.selected + 1;
            write();
        });
        sequenceRow.connect('changed', () => {
            const seq = parseSequence(sequenceRow.text);
            if (!seq) {
                sequenceRow.add_css_class('error');
                return;
            }
            sequenceRow.remove_css_class('error');
            if (layoutRow.selected === CUSTOM_INDEX) {
                rule.presets = seq;
                rule.preset = seq[0];
                write();
            }
        });
        row.add_row(layoutRow);
        row.add_row(presetRow);
        row.add_row(sequenceRow);

        const removeRow = new Adw.ActionRow({title: 'Remove rule'});
        const removeButton = new Gtk.Button({icon_name: 'user-trash-symbolic', css_classes: ['destructive-action', 'flat'], valign: Gtk.Align.CENTER});
        removeButton.connect('clicked', () => {
            rules = rules.filter(r => r !== rule);
            write();
            rebuild();
        });
        removeRow.add_suffix(removeButton);
        row.add_row(removeRow);
        return row;
    };

    const load = () => {
        const json = settings.get_string('rules');
        if (json === lastWritten)
            return;
        const {rules: parsed, error} = parseRules(json);
        rules = parsed;
        if (error && window)
            window.add_toast(new Adw.Toast({title: `Rules: ${error}`}));
        rebuild();
    };

    addButton.connect('clicked', () => {
        const dialog = new AppChooserDialog(rules.map(r => r.app));
        dialog.connect('app-chosen', (_d, appId) => {
            rules.push({app: appId, workspace: null, preset: settings.get_int('fallback-preset') || 1, enabled: true});
            write();
            rebuild();
        });
        dialog.present(window ?? page.get_root());
    });

    settings.connect('changed::rules', load);
    load();
    return page;
}

// ---------------------------------------------------------------- General

export function buildGeneralPage(settings, window) {
    const page = new Adw.PreferencesPage({title: 'General', icon_name: 'preferences-system-symbolic'});

    const behaviour = new Adw.PreferencesGroup({title: 'Behaviour'});
    page.add(behaviour);

    const fallback = new Adw.ComboRow({
        title: 'Fallback preset',
        subtitle: 'Applied to new windows that have no rule',
        model: presetModel(settings, {includeNone: true}),
        selected: settings.get_int('fallback-preset'),
    });
    fallback.connect('notify::selected', () => settings.set_int('fallback-preset', fallback.selected));
    settings.connect('changed::fallback-preset', () => {
        fallback.selected = settings.get_int('fallback-preset');
    });
    behaviour.add(fallback);

    const reset = new Adw.ActionRow({title: 'Reset layout', subtitle: 'Re-apply every rule to the windows that are open now'});
    reset.add_suffix(new ShortcutButton(settings, 'reset-layout-key'));
    behaviour.add(reset);

    const gtile = new Adw.PreferencesGroup({title: 'gTile'});
    page.add(gtile);
    const importRow = new Adw.ActionRow({
        title: 'Import presets from gTile',
        subtitle: 'Copies grid specs and shortcuts for slots 1 to 13',
    });
    const importButton = new Gtk.Button({label: 'Import', valign: Gtk.Align.CENTER});
    importRow.add_suffix(importButton);
    gtile.add(importRow);

    const toast = title => window?.add_toast(new Adw.Toast({title}));
    const runImport = () => {
        const r = importFromGtile(settings);
        toast(r.found ? `Imported ${r.specs} presets and ${r.keys} shortcuts` : 'gTile is not installed');
    };
    importButton.connect('clicked', () => {
        if (!isGtileEnabled()) {
            runImport();
            return;
        }
        const dialog = new Adw.AlertDialog({
            heading: 'gTile is still enabled',
            body: 'Importing now binds the same shortcuts in both extensions. Disable gTile first, or continue anyway.',
        });
        dialog.add_response('cancel', 'Cancel');
        dialog.add_response('import', 'Import anyway');
        dialog.set_response_appearance('import', Adw.ResponseAppearance.DESTRUCTIVE);
        dialog.connect('response', (_d, id) => {
            if (id === 'import')
                runImport();
        });
        dialog.present(window ?? page.get_root());
    });

    return page;
}
