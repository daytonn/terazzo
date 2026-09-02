import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {buildPresetsPage, buildRulesPage, buildGeneralPage} from './prefs/pages.js';

export default class TerazzoPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window.set_default_size(720, 640);
        window.add(buildPresetsPage(settings));
        window.add(buildRulesPage(settings, window));
        window.add(buildGeneralPage(settings, window));
    }
}
