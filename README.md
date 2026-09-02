# Terazzo

A GNOME Shell extension for people who like their windows tiled a particular
way but do not want a tiling window manager deciding for them.

- **Preset hotkeys.** Thirteen slots, each a grid spec in gTile syntax
  (`3x1 2:1 2:1` is the middle third) with its own shortcut. Press it and the
  focused window snaps to that region of the monitor under the mouse.
- **Placement rules.** Map an application to a workspace and a preset. Every new
  window of that app is moved there automatically. Windows with no rule land in
  a fallback preset (middle third by default).
- **Reset layout.** One shortcut re-applies every rule to the windows that are
  open now.
- **gTile import.** Your existing gTile presets and shortcuts for slots 1 to 13
  are copied over once gTile is disabled.

Design notes live in `docs/plans/`.

## Requirements

GNOME Shell 50 on Wayland or X11. `gjs`, `glib-compile-schemas`, and `make` for
development. `node` for the optional syntax check.

## Install (development)

```sh
make install          # compiles the schema and symlinks the repo into ~/.local/share/gnome-shell/extensions
```

Log out and back in once so the shell discovers the new extension, then:

```sh
gnome-extensions enable terazzo@daytonnolan.com
gnome-extensions prefs terazzo@daytonnolan.com
```

After that, settings changes apply live. Disabling and re-enabling the
extension does not require a re-login.

## Switching from gTile

1. Keep gTile enabled at first. Terazzo's shortcuts are empty by default, so
   nothing collides, and you can test rules while gTile still handles hotkeys.
2. When placement behaves, disable gTile:
   `gnome-extensions disable gTile@vibou`
3. Either re-enable Terazzo or press **Import** on the General page. Your
   thirteen presets and their shortcuts are now Terazzo's.

## Development

```sh
make test     # unit tests for the pure modules (gridspec, geometry, rules) under gjs
make smoke    # builds every prefs page against an in-memory settings backend
make check    # syntax check of all modules with node
journalctl -f -o cat /usr/bin/gnome-shell   # shell-side logs, prefixed [terazzo]
```

Layout:

```
extension.js        shell entry point: keybindings, engine wiring, gTile import
prefs.js            preferences entry point
lib/gridspec.js     grid spec parser (pure)
lib/geometry.js     spec + work area -> rectangle (pure)
lib/rules.js        rule parsing, lookup, serialization (pure)
lib/placer.js       the only module that moves windows
lib/presets.js      cached parsed presets from settings
lib/rulesEngine.js  window-created handling, first-frame placement, reset layout
lib/gtileImport.js  loads gTile's schema from its own directory and copies slots 1..13
prefs/pages.js      the three preference pages
prefs/shortcutRow.js  hand-built shortcut capture button
prefs/appChooser.js   searchable installed-app picker
prefs/presetPreview.js  small drawing of a grid spec
schemas/            GSettings schema (compile with make schemas)
test/               gjs test harness and tests
```

## Rule semantics

- A rule matches by desktop file id (`firefox.desktop`). Apps without one match
  by WM_CLASS, case-insensitively.
- Workspace 0 means "stay on the current workspace".
- The workspace step is skipped for windows that live on every workspace, which
  is the case for windows on a secondary monitor when
  `workspaces-only-on-primary` is set.
- Windows created in the first five seconds after the extension enables are
  placed but never focused, so a login full of autostarted apps does not bounce
  you across workspaces.
- Dialogs, transient windows, fullscreen windows, and windows that cannot be
  resized are left alone.
