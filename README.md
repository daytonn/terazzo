# Terazzo

A GNOME Shell extension for people who like their windows tiled a particular
way but do not want a tiling window manager deciding for them.

- **Preset hotkeys.** Thirteen slots, each a grid spec (`3x1 2:1 2:1` is the
  middle third) with its own shortcut. Press it and the focused window snaps to
  that region of the monitor under the mouse.
- **Placement rules.** Map an application to a workspace and a preset. Every new
  window of that app is moved there automatically. Windows with no rule land in
  a fallback preset (middle third by default).
- **Sequenced layouts.** A rule can hand out presets in order instead: with
  Quarters, the first file manager window opens in the left quarter, the next
  in the second, and so on. Halves, thirds, and quarters are detected from your
  presets, or give any custom order of slots.
- **Reset layout.** One shortcut re-applies every rule to the windows that are
  open now.

Design notes live in `docs/plans/`.

The thirteen presets ship as schema defaults — halves, thirds, quarters, a
centred half, left and right two-thirds, and full screen — each bound to
<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>1</kbd> through <kbd>0</kbd>, with the last
three on the numeric keypad. A fresh install is usable immediately; edit any
preset or shortcut on the Presets page. Reset layout is unbound by default.

## Requirements

GNOME Shell 50 on Wayland or X11. `gjs`, `glib-compile-schemas`, and `make` for
development. `node` for the optional syntax check.

## Install on another machine

Build a bundle and install it. Nothing but `gnome-shell` is needed at runtime:

```sh
make pack                                          # writes dist/terazzo@daytonnolan.com.shell-extension.zip
gnome-extensions install dist/terazzo@daytonnolan.com.shell-extension.zip
```

`gnome-extensions install` compiles the settings schema for you. Log out and
back in once so the shell discovers the extension, then:

```sh
gnome-extensions enable terazzo@daytonnolan.com
gnome-extensions prefs terazzo@daytonnolan.com
```

Copying the zip to the target machine works too — `make pack` is only needed
where the repository lives.

On Arch and derivatives, `packaging/PKGBUILD` builds a system package from a
tagged release instead:

```sh
cd packaging && makepkg -si
```

## Install for development

```sh
make link     # compiles the schema and symlinks this working tree into ~/.local/share/gnome-shell/extensions
```

Log out and back in once, then enable as above. After that, settings changes
apply live, and disabling and re-enabling the extension needs no re-login.

> `gnome-extensions install --force` deletes its destination **recursively**.
> Run against a dev symlink directly, it follows the link and erases the
> working tree. `make install` and `make link` remove the symlink as a link
> first, so use those rather than calling the tool by hand.

## Development

```sh
make test     # unit tests for the pure modules (gridspec, geometry, rules, layouts) under gjs
make smoke    # builds every prefs page against an in-memory settings backend
make check    # syntax check of all modules with node
make preview  # opens the preferences window standalone (needs a display)
make pack     # build a distributable bundle in dist/
journalctl -f -o cat /usr/bin/gnome-shell   # shell-side logs, prefixed [terazzo]
```

Layout:

```
extension.js        shell entry point: keybindings and engine wiring
prefs.js            preferences entry point
lib/gridspec.js     grid spec parser (pure)
lib/geometry.js     spec + work area -> rectangle (pure)
lib/rules.js        rule parsing, lookup, serialization (pure)
lib/placer.js       the only module that moves windows
lib/presets.js      cached parsed presets from settings
lib/rulesEngine.js  window-created handling, first-frame placement, reset layout
lib/layouts.js      named layout detection and slot sequencing (pure)
prefs/pages.js      the three preference pages
prefs/shortcutRow.js  hand-built shortcut capture button
prefs/appChooser.js   searchable installed-app picker
prefs/presetPreview.js  small drawing of a grid spec, used as the visual cue
                        in the preset and rule choosers
schemas/            GSettings schema (compile with make schemas)
test/               gjs test harness and tests
packaging/PKGBUILD  Arch package built from a tagged release
```

## Rule semantics

- A rule matches by desktop file id (`firefox.desktop`). Apps without one match
  by WM_CLASS, case-insensitively.
- Workspace 0 means "stay on the current workspace".
- A sequenced rule (`presets: [6, 7, 8, 9]`) gives each new window the first
  slot in the list that holds no other window of the same app on the same
  monitor and workspace. Occupancy is judged by the sibling's centre point, so
  a slot freed by closing a window is refilled first. When every slot is taken
  the sequence wraps. Reset layout deals slots out in window creation order.
- Halves, thirds, and quarters are detected as the single-cell presets of a
  2-, 3-, or 4-column grid, ordered left to right.
- The workspace step is skipped for windows that live on every workspace, which
  is the case for windows on a secondary monitor when
  `workspaces-only-on-primary` is set.
- Windows created in the first five seconds after the extension enables are
  placed and moved to their workspace but never focused, so a login full of
  autostarted apps does not bounce you across workspaces.
- Dialogs, transient windows, fullscreen windows, and windows that cannot be
  resized are left alone.

## Provenance

This extension was written with AI assistance, so every shipped source file
carries the notice the GNOME reviewers ask for:

```js
// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.
```

The code follows the [EGO review guidelines][review] and the
[best practices reference][best-practices], but publishing on
extensions.gnome.org is an agreement to maintain the extension for other
people. Do not submit it there until you have read the code, can explain it,
and are willing to maintain it — and remove the notices by hand when you do,
since leaving them in signals to reviewers that the code was never read.

[review]: https://gjs.guide/extensions/review-guidelines/review-guidelines.html
[best-practices]: https://gjs.guide/extensions/review-guidelines/best-practices.html

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).
