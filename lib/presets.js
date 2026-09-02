// Caches parsed preset specs from settings and invalidates on change.

import {PRESET_SLOTS, tryParseGridSpec} from './gridspec.js';

export class PresetStore {
    constructor(settings) {
        this._settings = settings;
        this._cache = new Map();
        this._handlerIds = [];
        for (let slot = 1; slot <= PRESET_SLOTS; slot++) {
            const id = settings.connect(`changed::preset-spec-${slot}`, () => this._cache.delete(slot));
            this._handlerIds.push(id);
        }
    }

    /** @returns parsed spec for a 1-based slot, or null if empty or invalid. */
    get(slot) {
        if (this._cache.has(slot))
            return this._cache.get(slot);
        const text = this._settings.get_string(`preset-spec-${slot}`);
        const spec = tryParseGridSpec(text);
        if (!spec && text.trim())
            console.warn(`[terazzo] preset ${slot} has an invalid grid spec: "${text}"`);
        this._cache.set(slot, spec);
        return spec;
    }

    destroy() {
        for (const id of this._handlerIds)
            this._settings.disconnect(id);
        this._handlerIds = [];
        this._cache.clear();
        this._settings = null;
    }
}
