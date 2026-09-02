UUID := terazzo@daytonnolan.com
EXT_DIR := $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

.PHONY: schemas test smoke install uninstall check

schemas:
	glib-compile-schemas schemas/

test: schemas
	gjs -m test/run.js

check:
	@for f in extension.js prefs.js lib/*.js prefs/*.js; do cp $$f /tmp/terazzo-check.mjs && node --check /tmp/terazzo-check.mjs || { echo "syntax error in $$f"; exit 1; }; done
	@rm -f /tmp/terazzo-check.mjs
	@echo "syntax ok"

smoke: schemas
	GSETTINGS_BACKEND=memory gjs -m test/prefs-smoke.js

install: schemas
	mkdir -p $(dir $(EXT_DIR))
	ln -sfn $(CURDIR) $(EXT_DIR)
	@echo "Linked $(EXT_DIR). Log out and back in once, then: gnome-extensions enable $(UUID)"

uninstall:
	rm -f $(EXT_DIR)
