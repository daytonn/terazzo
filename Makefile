UUID := terazzo@daytonnolan.com
SCHEMA := schemas/org.gnome.shell.extensions.terazzo.gschema.xml
EXT_DIR := $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
BUNDLE := dist/$(UUID).shell-extension.zip

.PHONY: schemas test smoke check pack link install uninstall

schemas:
	glib-compile-schemas schemas/

test: schemas
	gjs -m test/run.js

smoke: schemas
	GSETTINGS_BACKEND=memory gjs -m test/prefs-smoke.js

check:
	@for f in extension.js prefs.js lib/*.js prefs/*.js; do cp $$f /tmp/terazzo-check.mjs && node --check /tmp/terazzo-check.mjs || { echo "syntax error in $$f"; exit 1; }; done
	@rm -f /tmp/terazzo-check.mjs
	@echo "syntax ok"

# Distributable bundle for `gnome-extensions install`.
pack: schemas
	@mkdir -p dist
	gnome-extensions pack . \
	  --extra-source=lib --extra-source=prefs --extra-source=LICENSE \
	  --schema=$(SCHEMA) \
	  --force --out-dir=dist
	@echo "Bundle: $(BUNDLE)"

# Remove whatever is at EXT_DIR, treating a symlink as a link (never follow it).
# `gnome-extensions install --force` deletes its destination recursively, which
# would erase this working tree through a dev symlink.
define unlink_ext
	@if [ -L "$(EXT_DIR)" ]; then rm -f "$(EXT_DIR)"; \
	elif [ -d "$(EXT_DIR)" ]; then rm -rf "$(EXT_DIR)"; fi
endef

# Development: point the extensions directory at this working tree.
link: schemas
	@mkdir -p $(dir $(EXT_DIR))
	$(call unlink_ext)
	ln -s $(CURDIR) $(EXT_DIR)
	@echo "Linked $(EXT_DIR)."
	@echo "Log out and back in once, then: gnome-extensions enable $(UUID)"

# Real install from a bundle. Unlinks a dev symlink first so the tree survives.
install: pack
	$(call unlink_ext)
	gnome-extensions install $(BUNDLE) --force
	@echo "Installed. Log out and back in once, then: gnome-extensions enable $(UUID)"

uninstall:
	$(call unlink_ext)
	@echo "Removed $(EXT_DIR)"
