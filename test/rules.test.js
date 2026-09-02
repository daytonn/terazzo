import {test, assertEqual} from './harness.js';
import {parseRules, serializeRules, findRule, validateRule, toWorkspaceIndex, hasRuleForApp} from '../lib/rules.js';

const RULES = [
    {app: 'firefox.desktop', workspace: 1, preset: 3, enabled: true},
    {app: 'org.gnome.Ptyxis.desktop', workspace: 1, preset: 4, enabled: true},
    {app: 'Slack', workspace: 2, preset: 11, enabled: false},
];

test('parse accepts valid rules and fills defaults', () => {
    const {rules, error} = parseRules('[{"app":"a.desktop","preset":1}]');
    assertEqual(error, null);
    assertEqual(rules, [{app: 'a.desktop', workspace: null, preset: 1, enabled: true}]);
});

test('parse drops invalid entries but keeps the rest', () => {
    const {rules, error} = parseRules('[{"app":"a.desktop","preset":1},{"preset":2},{"app":"b","preset":99}]');
    assertEqual(rules.length, 1);
    assertEqual(error, '2 invalid rule(s) ignored');
});

test('parse survives malformed JSON', () => {
    const {rules, error} = parseRules('{not json');
    assertEqual(rules, []);
    assertEqual(typeof error, 'string');
});

test('parse rejects a non-array document', () => {
    assertEqual(parseRules('{"app":"x"}').rules, []);
});

test('empty string is an empty list', () => {
    assertEqual(parseRules(''), {rules: [], error: null});
});

test('workspace 0 means "current"', () => {
    assertEqual(validateRule({app: 'x', workspace: 0, preset: 1}).workspace, null);
    assertEqual(toWorkspaceIndex({workspace: null}), null);
    assertEqual(toWorkspaceIndex({workspace: 3}), 2);
});

test('serialize round-trips', () => {
    assertEqual(parseRules(serializeRules(RULES)).rules, RULES);
});

test('findRule matches the first candidate in priority order', () => {
    assertEqual(findRule(RULES, ['org.gnome.Ptyxis.desktop', 'firefox.desktop']).preset, 4);
    assertEqual(findRule(RULES, [null, '', 'firefox.desktop']).preset, 3);
});

test('findRule is case-insensitive', () => {
    assertEqual(findRule(RULES, ['Firefox.desktop']).preset, 3);
});

test('findRule skips disabled rules', () => {
    assertEqual(findRule(RULES, ['slack']), null);
});

test('findRule returns null with no match', () => {
    assertEqual(findRule(RULES, ['window:42', 'nope']), null);
});

test('hasRuleForApp ignores enabled state', () => {
    assertEqual(hasRuleForApp(RULES, 'SLACK'), true);
    assertEqual(hasRuleForApp(RULES, 'x'), false);
});
