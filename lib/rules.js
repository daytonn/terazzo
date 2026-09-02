// Placement rules: parsing, validation, serialization and lookup.
// Rule shape: { app: string, workspace: number|null (1-based), preset: number (1-based slot), enabled: boolean }

import {PRESET_SLOTS} from './gridspec.js';

export function normalizeAppId(id) {
    return String(id ?? '').trim().toLowerCase();
}

export function validateRule(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const app = typeof raw.app === 'string' ? raw.app.trim() : '';
    if (!app)
        return null;
    let workspace = raw.workspace;
    if (workspace === undefined || workspace === null || workspace === 0)
        workspace = null;
    else if (!Number.isInteger(workspace) || workspace < 1)
        return null;
    const preset = raw.preset;
    if (!Number.isInteger(preset) || preset < 1 || preset > PRESET_SLOTS)
        return null;
    const enabled = raw.enabled === undefined ? true : Boolean(raw.enabled);
    return {app, workspace, preset, enabled};
}

/**
 * Parse the JSON rules key.
 * @returns {{rules: Array, error: string|null}} Invalid entries are dropped; a
 *          malformed document yields an empty list plus an error message.
 */
export function parseRules(json) {
    let data;
    try {
        data = JSON.parse(json || '[]');
    } catch (e) {
        return {rules: [], error: `rules is not valid JSON: ${e.message}`};
    }
    if (!Array.isArray(data))
        return {rules: [], error: 'rules must be a JSON array'};
    const rules = [];
    let dropped = 0;
    for (const raw of data) {
        const rule = validateRule(raw);
        if (rule)
            rules.push(rule);
        else
            dropped++;
    }
    return {rules, error: dropped ? `${dropped} invalid rule(s) ignored` : null};
}

export function serializeRules(rules) {
    return JSON.stringify(rules.map(validateRule).filter(Boolean));
}

/**
 * Find the first enabled rule matching any of the candidate ids, in candidate
 * priority order. Matching is case-insensitive.
 */
export function findRule(rules, candidates) {
    for (const candidate of candidates) {
        const key = normalizeAppId(candidate);
        if (!key)
            continue;
        const hit = rules.find(r => r.enabled && normalizeAppId(r.app) === key);
        if (hit)
            return hit;
    }
    return null;
}

export function hasRuleForApp(rules, app) {
    const key = normalizeAppId(app);
    return rules.some(r => normalizeAppId(r.app) === key);
}

/** 1-based workspace in a rule to a 0-based Mutter index, or null. */
export function toWorkspaceIndex(rule) {
    return rule.workspace === null ? null : rule.workspace - 1;
}
