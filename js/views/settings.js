// Settings: appearance, notifications, backup import / export (same file as
// the phone app), clear data, life tracker, calculator, offline & install, about.
(function () {
  'use strict';
  var App = window.App, h = App.h, icon = App.icon, S = App.store, D = App.date, ui = App.ui;
  var VERSION = '1.5.4';
  var SOURCE_URL = 'https://github.com/kssaichandan/PERSONAL-APP';
  var ACCENTS = [
    ['Blue', 0xFF2196F3], ['Indigo', 0xFF3F51B5], ['Teal', 0xFF009688], ['Cyan', 0xFF00BCD4], ['Green', 0xFF4CAF50], ['Light Green', 0xFF8BC34A],
    ['Amber', 0xFFFFC107], ['Orange', 0xFFFF9800], ['Deep Orange', 0xFFFF5722], ['Red', 0xFFF44336], ['Pink', 0xFFE91E63], ['Purple', 0xFF9C27B0],
    ['Deep Purple', 0xFF673AB7], ['Brown', 0xFF795548], ['Blue Grey', 0xFF607D8B], ['Light Blue', 0xFF03A9F4],
  ];

  function tile(iconName, title, subtitle, trailing, opts) {
    opts = opts || {};
    var tag = opts.onClick ? 'button.tile' : 'div.tile';
    return h(tag + (opts.danger ? '.danger' : '') + (opts.disabled ? '.disabled' : ''), {
      type: opts.onClick ? 'button' : null, onclick: opts.onClick, disabled: opts.disabled,
    }, h('span.tile-ic', icon(iconName, { fill: opts.fill })), h('span.tile-text', h('b', title), subtitle ? h('small', subtitle) : null),
    trailing || (opts.onClick ? icon('chevron_right', { cls: 'tile-chev' }) : null));
  }
  function switchTile(iconName, title, subtitle, value, onChange, opts) {
    opts = opts || {};
    var sw = App.ui.switchEl(value, onChange, title);
    if (opts.disabled) sw.querySelector('input').disabled = true;
    var t = h('label.tile' + (opts.disabled ? '.disabled' : ''), h('span.tile-ic', icon(iconName)), h('span.tile-text', h('b', title), subtitle ? h('small', subtitle) : null), sw);
    return t;
  }
  function section(iconName, title, children, cls) {
    return h('section.card.settings-card' + (cls ? '.' + cls : ''), h('h2.settings-title', icon(iconName, { fill: true }), title), children);
  }
  function sizeOf() {
    var total = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('personal-app.') === 0) total += (k.length + (localStorage.getItem(k) || '').length) * 2;
      }
    } catch (e) { return null; }
    return total;
  }
  function fmtBytes(b) { return b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB'; }

  // ------------------------------------------------------------ actions ---
  function exportData() {
    try {
      App.io.download(S.backupFilename(), S.exportJson());
      ui.snack('Backup saved successfully', { type: 'success' });
    } catch (e) {
      console.error(e);
      ui.snack('Failed to export data', { type: 'error' });
    }
  }
  function importData() {
    ui.confirm('Import Data', 'This will replace your current data with the imported backup file. This action cannot be undone. Continue?', 'Continue', { icon: 'warning', iconColor: 'var(--md-primary)' })
      .then(function (ok) {
        if (!ok) return null;
        return App.io.pickFile('.json,application/json');
      })
      .then(function (file) {
        if (!file) return;
        if (file.error) { ui.snack('Import failed. Please try a different backup file', { type: 'error' }); return; }
        var parsed = S.parseBackup(file.text);
        if (parsed.error) { ui.snack('That file is not a valid Personal App backup', { type: 'error' }); return; }
        S.applyBackup(parsed);
        var t = parsed.tables;
        var summary = [App.plural(t.notes.length, 'note'), App.plural(t.habits.length, 'habit'), App.plural(t.calendar_events.length, 'event'), App.plural(t.calculator_history.length, 'calculation')].join(', ');
        ui.snack('Data imported successfully — ' + summary + (parsed.skipped ? ' (' + parsed.skipped + ' invalid rows skipped)' : ''), { type: 'success', duration: 6000 });
      });
  }
  function clearAllData() {
    ui.confirm('Clear All Data?', 'This will permanently delete all your notes, habits, events, calculator history, and settings. This action cannot be undone.', 'Delete All', { danger: true, icon: 'warning' })
      .then(function (ok) {
        if (!ok) return false;
        var input = h('input', { type: 'text', autocomplete: 'off', placeholder: 'DELETE', 'aria-label': 'Type DELETE', autofocus: true });
        var err = h('div.field-error');
        return ui.dialog({
          title: 'Final Confirmation',
          body: 'Type DELETE below to permanently erase all stored data:',
          content: h('div.stack', input, err),
          actions: [{ label: 'Cancel', value: false }, {
            label: 'Permanently Delete', kind: 'filled', danger: true, value: true,
            validate: function () { if (input.value === 'DELETE') return true; err.textContent = 'Must match DELETE in all caps'; return false; },
          }],
        });
      })
      .then(function (ok) {
        if (ok !== true) return;
        S.clearAll();
        ui.dialog({ icon: 'check_circle', iconColor: 'var(--md-primary)', title: 'Data Cleared', body: 'All data has been successfully cleared. The app is now reset.', actions: [{ label: 'OK', kind: 'filled', value: true }], dismissible: false });
      });
  }
  function licenses() {
    ui.dialog({
      cls: 'wide', title: 'Licenses',
      content: h('div.licenses',
        h('h3', 'Material Symbols'), h('p.muted', 'Icons by Google, used under the Apache License 2.0. https://github.com/google/material-design-icons'),
        h('h3', 'Material color utilities (algorithm)'), h('p.muted', 'The colour scheme is generated with an independent JavaScript port of the CAM16 / HCT method from Google\'s material-color-utilities (Apache License 2.0).'),
        h('h3', 'Personal App'), h('p.muted', 'Web version of Personal App. Plain HTML, CSS and JavaScript — no other libraries, no trackers, no network requests.')),
      actions: [{ label: 'Close', kind: 'filled', value: true }],
    });
  }

  App.views.settings = function (main) {
    var root = h('section.view.settings-view');
    main.appendChild(root);

    function draw() {
      var scroll = main.scrollTop;
      App.clear(root);
      root.appendChild(h('header.view-head', h('h1.view-title', 'Settings')));
      var body = h('div.view-body.settings-grid');
      root.appendChild(body);

      // Appearance -------------------------------------------------------
      var mode = S.pref('theme_mode');
      var themeCards = h('div.theme-cards', [['light', 'Light', 'light_mode'], ['dark', 'Dark', 'dark_mode'], ['system', 'System', 'brightness_auto']].map(function (m) {
        var sel = mode === m[0];
        return h('button.theme-card.' + m[0] + (sel ? '.selected' : ''), {
          type: 'button', 'aria-pressed': String(sel),
          onclick: function () { S.setPref('theme_mode', m[0]); ui.snack(m[1] + ' theme applied', { type: 'success' }); },
        }, h('span.theme-preview', h('i'), h('i'), h('i')), h('span.row', icon(m[2], { fill: sel }), m[1]), sel ? icon('check_circle', { fill: true, cls: 'theme-check' }) : null);
      }));
      var seed = S.pref('color_seed') >>> 0;
      var isPreset = ACCENTS.some(function (a) { return (a[1] >>> 0) === seed; });
      var custom = h('input', { type: 'color', value: App.color.argbToHex(seed).toLowerCase(), 'aria-label': 'Custom accent color' });
      custom.addEventListener('change', function () { S.setPref('color_seed', App.color.hexToArgb(custom.value)); ui.snack('Custom accent color applied', { type: 'success' }); });
      var swatches = h('div.swatches.accent-swatches', ACCENTS.map(function (a) {
        var sel = (a[1] >>> 0) === seed;
        return h('button.swatch' + (sel ? '.selected' : ''), {
          type: 'button', title: a[0], 'aria-label': 'Accent colour ' + a[0], style: { background: App.color.argbToHex(a[1]) },
          onclick: function () {
            S.setPref('color_seed', a[1]);
            ui.snack(a[1] === 0xFF2196F3 ? 'Reset to default accent color' : 'Custom accent color applied', { type: 'success' });
          },
        }, sel ? icon('check', { color: App.color.isLight(App.color.argbToHex(a[1])) ? '#1b1b1b' : '#fff' }) : null);
      }).concat([h('label.swatch.custom' + (!isPreset ? '.selected' : ''), { title: 'Custom color', style: !isPreset ? { background: App.color.argbToHex(seed) } : null }, icon('palette'), custom)]));
      body.appendChild(section('palette', 'Appearance', [
        h('div.field-label.pad', 'Theme'), themeCards,
        h('div.accent-head', h('div', h('b', 'Accent Color Theme'), h('small.muted', 'Universal primary app accent · ' + App.color.argbToHex(seed))),
          seed !== 0xFF2196F3 ? App.btn('text', 'Default', function () { S.setPref('color_seed', 0xFF2196F3); ui.snack('Reset to default accent color', { type: 'success' }); }) : null),
        swatches,
        switchTile('calendar_month', 'Week starts Monday', 'Calendar week starts on Monday instead of Sunday', S.pref('week_starts_monday'), function (v) {
          S.setPref('week_starts_monday', v); ui.snack(v ? 'Week starts Monday' : 'Week starts Sunday');
        }),
        tile('settings_backup_restore', 'Reset All Settings', 'Restore all settings to default values', null, {
          onClick: function () {
            ui.confirm('Reset All Settings', 'This will reset all settings to their default values. Your saved notes and data will not be affected.', 'Reset', { danger: true, icon: 'settings_backup_restore' })
              .then(function (ok) { if (ok) { S.resetPrefs(); ui.snack('Settings reset to defaults', { type: 'success' }); } });
          },
        }),
      ]));

      // Notifications -------------------------------------------------------
      var enabled = S.pref('notifications_enabled');
      var perm = App.notify.permission();
      body.appendChild(section('notifications', 'Notifications', [
        switchTile('notifications_active', 'Enable Notifications', 'Receive habit reminders and scheduled alerts', enabled, function (v) {
          S.setPref('notifications_enabled', v);
          if (v) App.notify.requestPermission().then(function () { draw(); });
          ui.snack(v ? 'Notifications enabled' : 'Notifications disabled');
        }),
        enabled && perm === 'denied' ? h('div.banner.warn', icon('warning'), h('span', 'Notifications are blocked. Enable them in your browser\'s site settings. Reminders will still show inside the page.')) : null,
        enabled && perm === 'unsupported' ? h('div.banner', icon('info'), h('span', 'This browser does not support system notifications. Reminders will show inside the page.')) : null,
        enabled && perm === 'default' ? h('div.banner', icon('info'), h('span.grow', 'Allow browser notifications to get pop-up alerts.'), App.btn('text', 'Allow', function () { App.notify.requestPermission().then(draw); })) : null,
        !enabled ? h('p.muted.small.pad', 'Turn on notifications first to configure reminders') : null,
        switchTile('check_circle', 'Habit Reminders', 'Get notified at your specified habit times', S.pref('habit_reminders_enabled'), function (v) { S.setPref('habit_reminders_enabled', v); }, { disabled: !enabled }),
        switchTile('event', 'Event Reminders', 'Get notified before calendar events', S.pref('event_reminders_enabled'), function (v) { S.setPref('event_reminders_enabled', v); }, { disabled: !enabled }),
        tile('notifications', 'Send a test notification', 'Check that reminders reach you', null, {
          disabled: !enabled,
          onClick: function () { App.notify.requestPermission().then(function () { App.notify.show('Test notification', 'Reminders are working.', '#/settings'); }); },
        }),
        h('p.muted.small.pad', 'A website can only remind you while it is open in a browser tab (it can be in the background). The phone app reminds you even when closed.'),
      ]));

      // Data management ----------------------------------------------------
      var bytes = sizeOf();
      var counts = { notes: S.all('notes').length, habits: S.all('habits').length, events: S.all('calendar_events').length, calc: S.all('calculator_history').length };
      body.appendChild(section('inventory_2', 'Data Management', [
        h('div.data-stats',
          h('span', h('b', String(counts.notes)), 'notes'), h('span', h('b', String(counts.habits)), 'habits'),
          h('span', h('b', String(counts.events)), 'events'), h('span', h('b', String(counts.calc)), 'calculations')),
        tile('download', 'Export All Data', 'Download a JSON backup of your notes & history', null, { onClick: exportData }),
        tile('upload', 'Import Data', 'Restore data from an existing backup file (works with phone backups)', null, { onClick: importData }),
        tile('delete_forever', 'Clear All Data', 'Permanently delete all app entries and history', null, { onClick: clearAllData, danger: true }),
        h('p.muted.small.pad', 'Everything is saved in this browser on this device' + (bytes != null ? ' (' + fmtBytes(bytes) + ' used)' : '') + '. Clearing your browser\'s site data deletes it, so export a backup now and then. The same backup file can be imported in the phone app.'),
        !S.storageOk() ? h('div.banner.warn', icon('warning'), h('span', 'This browser is blocking storage, so changes will be lost when the tab closes. Allow site data for this page or open it in a normal (not private) window.')) : null,
      ]));

      // Life tracker -----------------------------------------------------------
      var birth = App.life.dob();
      body.appendChild(section('hourglass', 'Life Tracker', birth ? [
        tile('cake', 'Date of Birth', D.fmt(birth, 'MMMM d, yyyy'), null, { onClick: function () { App.life.pickDob(birth); } }),
        tile('timer', 'Life Expectancy', App.life.expectancy() + ' years', null, { onClick: App.life.pickExpectancy }),
        tile('replay', 'Reset Life Tracker', 'Remove date of birth and reset metrics', null, { onClick: App.life.confirmReset, danger: true }),
      ] : [
        h('p.muted.pad', 'Set your date of birth to enable live tracking and metrics.'),
        h('div.pad', App.btn('tonal', 'Set Date of Birth', function () { App.life.pickDob(null); }, { icon: 'cake' })),
      ]));

      // Calculator --------------------------------------------------------------
      body.appendChild(section('calculate', 'Calculator', [
        switchTile('science', 'Scientific Mode', 'Show advanced functions (sin, cos, log, π, e)', S.pref('calculator_scientific_mode'), function (v) { S.setPref('calculator_scientific_mode', v); }),
        switchTile('content_copy', 'Copy Result on Tap', 'Tap result to copy to clipboard', S.pref('calculator_copy_on_tap'), function (v) { S.setPref('calculator_copy_on_tap', v); }),
        tile('delete_sweep', 'Clear Calculator History', 'Delete all calculator history entries', null, {
          onClick: function () {
            ui.confirm('Clear Calculator History', 'Delete all calculation history entries?', 'Clear', { danger: true }).then(function (ok) {
              if (ok) { S.remove('calculator_history', function () { return true; }); ui.snack('Calculator history cleared', { type: 'success' }); }
            });
          },
        }),
      ]));

      // Offline & install --------------------------------------------------------
      var proto = location.protocol;
      var standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      var offlineInfo;
      if (proto === 'file:') offlineInfo = 'Opened from a file on this device, so it already works with no internet. To install it as an app, host the folder (for example on GitHub Pages) and open it from there.';
      else if (standalone) offlineInfo = 'Installed as an app. It works offline.';
      else if (navigator.serviceWorker && navigator.serviceWorker.controller) offlineInfo = 'Saved for offline use. You can open this page without internet.';
      else offlineInfo = 'Preparing offline copy… reload once to finish.';
      body.appendChild(section('wifi_off', 'Offline & Install', [
        h('p.pad', offlineInfo),
        App.installPrompt ? h('div.pad', App.btn('filled', 'Install app', function () {
          var p = App.installPrompt;
          App.installPrompt = null;
          p.prompt();
          p.userChoice.then(function (c) { ui.snack(c.outcome === 'accepted' ? 'App installed' : 'Install cancelled'); draw(); });
        }, { icon: 'install_desktop' })) : null,
        h('p.muted.small.pad', 'Nothing is uploaded: no accounts, no servers, no tracking.'),
      ]));

      // Keyboard shortcuts --------------------------------------------------------
      body.appendChild(section('keyboard', 'Keyboard Shortcuts', h('dl.shortcuts',
        [['Alt + 1…6', 'Switch section'], ['/', 'Search in the current section'], ['Esc', 'Close a dialog or the note editor (saves)'], ['Ctrl + S', 'Save and close the note'],
          ['Ctrl + B / I / U', 'Bold / italic / underline'], ['Ctrl + Shift + 7 / 8 / 9', 'Numbered / bullet / check list'], ['Ctrl + click', 'Select several notes or habits'],
          ['Calculator', 'Type numbers and + − * / ^ ( ) %, Enter for =']].map(function (r) { return [h('dt', h('kbd', r[0])), h('dd', r[1])]; }))));

      // About -------------------------------------------------------------------
      body.appendChild(section('info', 'About App', [
        tile('label', 'Version', VERSION + ' (web)', h('span')),
        h('a.tile', { href: SOURCE_URL, target: '_blank', rel: 'noopener' }, h('span.tile-ic', icon('code')), h('span.tile-text', h('b', 'Source Code'), h('small', 'View open source code on GitHub')), icon('open_in_new', { cls: 'tile-chev' })),
        tile('gavel', 'Licenses', 'View third-party open source licenses', null, { onClick: licenses }),
        tile('replay', 'Replay Tutorial', 'Restart the onboarding walkthrough', null, {
          onClick: function () {
            ui.confirm('Replay Tutorial', 'This will restart the onboarding tutorial experience. Continue?', 'Continue').then(function (ok) {
              if (ok) { S.setPref('onboarding_complete_v1', false); App.onboarding.show(); }
            });
          },
        }),
      ]));
      main.scrollTop = scroll;
    }

    draw();
    return { onData: function () { draw(); } };
  };
})();
