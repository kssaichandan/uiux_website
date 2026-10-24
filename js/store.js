// Local data store. Holds the same six tables as the phone app's SQLite
// database (same column names, same value formats), so a backup file moves
// between phone and website unchanged. Everything lives in localStorage on
// this device; nothing is ever sent anywhere.
(function () {
  'use strict';
  var App = window.App;
  var DB_KEY = 'personal-app.db.v1';
  var PREFS_KEY = 'personal-app.prefs.v1';

  // Column definitions mirror lib/database.dart (schema version 4).
  // type: 'int' | 'str'; nullable columns accept null; def is the default.
  var SCHEMA = {
    notes: {
      id: { type: 'int' }, title: { type: 'str', def: '' }, content: { type: 'str', def: '' },
      pinned: { type: 'int', def: 0 }, favorite: { type: 'int', def: 0 }, color: { type: 'int', nullable: true, def: null },
      archived: { type: 'int', def: 0 }, deleted_at: { type: 'str', nullable: true, def: null },
      reminder_time: { type: 'str', nullable: true, def: null }, priority: { type: 'int', def: 0 },
      created_at: { type: 'str', now: true }, updated_at: { type: 'str', now: true },
    },
    calendar_events: {
      id: { type: 'int' }, title: { type: 'str', required: true }, date: { type: 'str', required: true },
      time: { type: 'str', nullable: true, def: null }, notes: { type: 'str', nullable: true, def: '' },
      category: { type: 'str', nullable: true, def: 'General' }, recurrence: { type: 'str', nullable: true, def: 'none' },
      recurrence_end: { type: 'str', nullable: true, def: null },
    },
    calculator_history: {
      id: { type: 'int' }, expression: { type: 'str', required: true }, result: { type: 'str', required: true },
      created_at: { type: 'str', now: true },
    },
    habits: {
      id: { type: 'int' }, name: { type: 'str', required: true }, icon: { type: 'str', nullable: true, def: 'star' },
      color: { type: 'int', nullable: true, def: 4284993700 }, reminder_time: { type: 'str', nullable: true, def: null },
      reminder_days: { type: 'str', nullable: true, def: null }, created_at: { type: 'str', now: true },
      display_order: { type: 'int', nullable: true, def: 0 }, habit_type: { type: 'str', def: 'yes_no' },
      target_count: { type: 'int', def: 0 },
    },
    habit_logs: {
      id: { type: 'int' }, habit_id: { type: 'int', required: true }, date: { type: 'str', required: true },
      count: { type: 'int', def: 1 }, created_at: { type: 'str', now: true },
    },
    settings: { key: { type: 'str', required: true }, value: { type: 'str', required: true } },
  };
  var TABLES = Object.keys(SCHEMA);

  var PREF_DEFAULTS = {
    theme_mode: 'system',
    color_seed: 0xFF2196F3,
    notifications_enabled: true,
    habit_reminders_enabled: true,
    event_reminders_enabled: true,
    calculator_scientific_mode: false,
    calculator_copy_on_tap: true,
    week_starts_monday: true,
    onboarding_complete_v1: false,
  };
  // Website-only view choices; kept out of "Reset All Settings" like the
  // phone app keeps its own view toggles.
  var UI_DEFAULTS = { notes_view: 'grid', notes_sort: 'updated', notes_show_archived: false, calendar_view: 'month' };

  var storageOk = true;
  var memory = {};
  function lsGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { storageOk = false; return memory[key] || null; }
  }
  function lsSet(key, value) {
    try { window.localStorage.setItem(key, value); return true; } catch (e) {
      memory[key] = value;
      if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
        App.ui.snack('Storage is full — export a backup and delete old data.', { type: 'error', duration: 6000 });
      } else storageOk = false;
      return false;
    }
  }
  try { var probe = '__pa_probe__'; window.localStorage.setItem(probe, '1'); window.localStorage.removeItem(probe); } catch (e) { storageOk = false; }

  function emptyDb() {
    var db = { version: 1, tables: {}, seq: {} };
    TABLES.forEach(function (t) { db.tables[t] = []; db.seq[t] = 0; });
    return db;
  }
  function loadDb() {
    var raw = lsGet(DB_KEY);
    if (!raw) return emptyDb();
    try {
      var parsed = JSON.parse(raw);
      var db = emptyDb();
      TABLES.forEach(function (t) {
        var rows = parsed.tables && Array.isArray(parsed.tables[t]) ? parsed.tables[t] : [];
        db.tables[t] = rows;
        var maxId = rows.reduce(function (m, r) { return Math.max(m, r.id || 0); }, 0);
        db.seq[t] = Math.max(maxId, (parsed.seq && parsed.seq[t]) || 0);
      });
      return db;
    } catch (e) {
      console.error('Stored data could not be read', e);
      // Keep the unreadable copy so nothing is lost silently.
      lsSet(DB_KEY + '.corrupt-' + Date.now(), raw);
      return emptyDb();
    }
  }
  function loadPrefs() {
    var p = {};
    try { p = JSON.parse(lsGet(PREFS_KEY) || '{}') || {}; } catch (e) { p = {}; }
    var out = {};
    Object.keys(PREF_DEFAULTS).forEach(function (k) { out[k] = k in p ? p[k] : PREF_DEFAULTS[k]; });
    Object.keys(UI_DEFAULTS).forEach(function (k) { out[k] = k in p ? p[k] : UI_DEFAULTS[k]; });
    if (['light', 'dark', 'system'].indexOf(out.theme_mode) < 0) out.theme_mode = 'system';
    if (typeof out.color_seed !== 'number') out.color_seed = PREF_DEFAULTS.color_seed;
    return out;
  }

  var db = loadDb();
  var prefs = loadPrefs();
  var listeners = [];
  var pending = null; // tables changed inside a batch

  function persist() { lsSet(DB_KEY, JSON.stringify(db)); }
  function emit(tables) {
    if (pending) { tables.forEach(function (t) { pending[t] = true; }); return; }
    persist();
    listeners.slice().forEach(function (fn) { try { fn(tables); } catch (e) { console.error(e); } });
  }
  function batch(fn) {
    var outer = !pending;
    if (outer) pending = {};
    try { return fn(); } finally {
      if (outer) {
        var changed = Object.keys(pending);
        pending = null;
        if (changed.length) emit(changed);
      }
    }
  }

  // Coerce a row to the table's columns. Returns null when a required
  // column is missing. Unknown columns are dropped so the phone app can
  // always insert the row back into SQLite.
  function normalize(table, row, isNew) {
    if (!row || typeof row !== 'object') return null;
    var cols = SCHEMA[table], out = {};
    for (var c in cols) {
      var spec = cols[c], v = row[c];
      if (v === undefined || (v === null && !spec.nullable && c !== 'id')) {
        if (spec.required) return null;
        if (spec.now) v = App.date.isoLocal();
        else if (c === 'id') v = undefined;
        else v = spec.def;
      }
      if (v != null) {
        if (spec.type === 'int') {
          if (typeof v === 'boolean') v = v ? 1 : 0;
          v = Math.trunc(Number(v));
          if (!isFinite(v)) { if (spec.required) return null; v = spec.nullable ? null : spec.def; }
        } else v = String(v);
      }
      if (v !== undefined) out[c] = v;
    }
    if (isNew === false && out.id == null && table !== 'settings') return null;
    return out;
  }

  function all(table) { return db.tables[table].slice(); }
  function get(table, id) {
    var rows = db.tables[table];
    for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i];
    return null;
  }
  function insert(table, row) {
    var r = normalize(table, Object.assign({}, row, { id: undefined }), true);
    if (!r) throw new Error('Invalid ' + table + ' row');
    r.id = ++db.seq[table];
    db.tables[table].push(r);
    emit([table]);
    return r;
  }
  // Re-insert a row with its old id (used by Undo).
  function restore(table, row) {
    if (get(table, row.id)) return update(table, row.id, row);
    var r = normalize(table, row, false);
    db.tables[table].push(r);
    db.seq[table] = Math.max(db.seq[table], r.id);
    emit([table]);
    return r;
  }
  function update(table, id, patch) {
    var rows = db.tables[table];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].id === id) {
        var r = normalize(table, Object.assign({}, rows[i], patch, { id: id }), false);
        if (!r) throw new Error('Invalid ' + table + ' update');
        rows[i] = r;
        emit([table]);
        return r;
      }
    }
    return null;
  }
  // remove(table, id) or remove(table, predicate)
  function remove(table, idOrFn) {
    var test = typeof idOrFn === 'function' ? idOrFn : function (r) { return r.id === idOrFn; };
    var before = db.tables[table].length;
    db.tables[table] = db.tables[table].filter(function (r) { return !test(r); });
    var removed = before - db.tables[table].length;
    var changed = [table];
    if (table === 'habits' && removed) {
      // ON DELETE CASCADE for habit_logs
      var ids = {};
      db.tables.habits.forEach(function (hb) { ids[hb.id] = true; });
      db.tables.habit_logs = db.tables.habit_logs.filter(function (l) { return ids[l.habit_id]; });
      changed.push('habit_logs');
    }
    if (removed) emit(changed);
    return removed;
  }

  function setting(key) {
    var r = db.tables.settings.find(function (s) { return s.key === key; });
    return r ? r.value : null;
  }
  function setSetting(key, value) {
    var rows = db.tables.settings;
    var r = rows.find(function (s) { return s.key === key; });
    if (value == null) { db.tables.settings = rows.filter(function (s) { return s.key !== key; }); }
    else if (r) r.value = String(value);
    else rows.push({ key: key, value: String(value) });
    emit(['settings']);
  }

  function pref(key) { return prefs[key]; }
  function setPref(key, value) {
    prefs[key] = value;
    lsSet(PREFS_KEY, JSON.stringify(prefs));
    listeners.slice().forEach(function (fn) { try { fn(['prefs']); } catch (e) { console.error(e); } });
  }
  function resetPrefs() {
    Object.keys(PREF_DEFAULTS).forEach(function (k) {
      if (k !== 'onboarding_complete_v1') prefs[k] = PREF_DEFAULTS[k];
    });
    lsSet(PREFS_KEY, JSON.stringify(prefs));
    listeners.slice().forEach(function (fn) { fn(['prefs']); });
  }

  // ------------------------------------------------------- backup file ---
  function exportJson() {
    var data = { version: 1, exportedAt: App.date.isoLocal() };
    TABLES.forEach(function (t) { data[t] = db.tables[t]; });
    // Extra key the phone app ignores: lets website→website restores keep
    // theme and calculator choices.
    var p = {};
    Object.keys(PREF_DEFAULTS).forEach(function (k) { if (k !== 'onboarding_complete_v1') p[k] = prefs[k]; });
    data.preferences = p;
    return JSON.stringify(data, null, 2);
  }
  function backupFilename() { return 'personal_app_backup_' + App.date.dateKey(new Date()) + '.json'; }

  // Same checks the phone app makes, plus per-row clean-up.
  function parseBackup(text) {
    var data;
    try { data = JSON.parse(String(text).replace(/^﻿/, '')); } catch (e) { return { error: 'This file is not valid JSON.' }; }
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.version == null) {
      return { error: 'Invalid backup format' };
    }
    for (var i = 0; i < TABLES.length; i++) {
      var v = data[TABLES[i]];
      if (v != null && !Array.isArray(v)) return { error: 'Invalid backup format' };
    }
    var tables = {}, skipped = 0;
    TABLES.forEach(function (t) {
      var seen = {}, rows = [];
      (data[t] || []).forEach(function (raw) {
        var r = normalize(t, raw, false);
        var key = t === 'settings' ? (r && r.key) : (r && r.id);
        if (!r || key == null || seen[key]) { skipped++; return; }
        seen[key] = true;
        rows.push(r);
      });
      tables[t] = rows;
    });
    // Logs whose habit is missing would be removed by the phone's cascade.
    var habitIds = {};
    tables.habits.forEach(function (hb) { habitIds[hb.id] = true; });
    var before = tables.habit_logs.length;
    tables.habit_logs = tables.habit_logs.filter(function (l) { return habitIds[l.habit_id]; });
    skipped += before - tables.habit_logs.length;
    return { tables: tables, skipped: skipped, preferences: data.preferences, exportedAt: data.exportedAt };
  }
  function applyBackup(parsed) {
    var next = emptyDb();
    TABLES.forEach(function (t) {
      next.tables[t] = parsed.tables[t];
      next.seq[t] = parsed.tables[t].reduce(function (m, r) { return Math.max(m, r.id || 0); }, 0);
    });
    db = next;
    if (parsed.preferences && typeof parsed.preferences === 'object') {
      Object.keys(PREF_DEFAULTS).forEach(function (k) {
        if (k !== 'onboarding_complete_v1' && k in parsed.preferences && typeof parsed.preferences[k] === typeof PREF_DEFAULTS[k]) {
          prefs[k] = parsed.preferences[k];
        }
      });
      lsSet(PREFS_KEY, JSON.stringify(prefs));
    }
    emit(TABLES.concat(['prefs']));
  }
  function clearAll() {
    db = emptyDb();
    emit(TABLES);
  }

  // Another tab changed the data: reload and redraw.
  window.addEventListener('storage', function (e) {
    if (e.key === DB_KEY) { db = loadDb(); listeners.slice().forEach(function (fn) { fn(TABLES); }); }
    else if (e.key === PREFS_KEY) { prefs = loadPrefs(); listeners.slice().forEach(function (fn) { fn(['prefs']); }); }
  });

  App.store = {
    TABLES: TABLES, SCHEMA: SCHEMA, PREF_DEFAULTS: PREF_DEFAULTS,
    all: all, get: get, insert: insert, update: update, remove: remove, restore: restore, batch: batch,
    setting: setting, setSetting: setSetting,
    pref: pref, setPref: setPref, resetPrefs: resetPrefs,
    exportJson: exportJson, backupFilename: backupFilename, parseBackup: parseBackup, applyBackup: applyBackup, clearAll: clearAll,
    on: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },
    storageOk: function () { return storageOk; },
  };
})();
