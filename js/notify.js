// Reminders for habits, events and notes. A website can only alert you
// while it is open in a tab (there is no background service without a
// server), so this checks every 20 seconds and shows a system notification
// when allowed, otherwise an in-page message.
(function () {
  'use strict';
  var App = window.App;
  var FIRED_KEY = 'personal-app.fired.v1';
  var GRACE_MS = 10 * 60 * 1000; // still show a reminder up to 10 min late

  function loadFired() {
    try { return JSON.parse(localStorage.getItem(FIRED_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function saveFired(f) {
    var cutoff = Date.now() - 3 * 86400000, out = {};
    Object.keys(f).forEach(function (k) { if (f[k] > cutoff) out[k] = f[k]; });
    try { localStorage.setItem(FIRED_KEY, JSON.stringify(out)); } catch (e) { /* ignore */ }
  }

  function supported() { return 'Notification' in window; }
  function permission() { return supported() ? Notification.permission : 'unsupported'; }
  function requestPermission() {
    if (!supported()) return Promise.resolve('unsupported');
    if (Notification.permission !== 'default') return Promise.resolve(Notification.permission);
    try {
      var r = Notification.requestPermission();
      return r && r.then ? r : Promise.resolve(Notification.permission);
    } catch (e) { return Promise.resolve('denied'); }
  }

  function show(title, body, route) {
    var shown = false;
    if (supported() && Notification.permission === 'granted') {
      try {
        var n = new Notification(title, { body: body, icon: 'icons/icon-192.png', tag: title + body });
        n.onclick = function () { window.focus(); if (route) location.hash = route; n.close(); };
        shown = true;
      } catch (e) { shown = false; }
    }
    // Always show it inside the page too when the tab is visible.
    if (!shown || document.visibilityState === 'visible') {
      App.ui.snack(title + (body ? ' — ' + body : ''), {
        duration: 8000,
        action: route ? { label: 'Open', onClick: function () { location.hash = route; } } : null,
      });
    }
  }

  function due(at, now) { return at <= now && now - at < GRACE_MS; }

  function check() {
    var S = App.store;
    if (!S.pref('notifications_enabled')) return;
    var now = Date.now(), today = new Date(), fired = loadFired(), changed = false, D = App.date;
    function once(key, fn) { if (!fired[key]) { fired[key] = now; changed = true; fn(); } }

    if (S.pref('habit_reminders_enabled')) {
      S.all('habits').forEach(function (hb) {
        var t = D.parseTime(hb.reminder_time);
        if (!t) return;
        var at = new Date(today.getFullYear(), today.getMonth(), today.getDate(), t[0], t[1]).getTime();
        if (due(at, now)) once('h' + hb.id + '@' + D.dateKey(today) + hb.reminder_time, function () {
          show('Time for: ' + (hb.name || 'Your habit'), 'Keep your streak going! Tap to check it off.', '#/habits');
        });
      });
    }
    if (S.pref('event_reminders_enabled') && App.calendarLogic) {
      S.all('calendar_events').forEach(function (ev) {
        if (!App.calendarLogic.occursOn(ev, today)) return;
        var t = D.parseTime(ev.time) || [9, 0];
        var at = new Date(today.getFullYear(), today.getMonth(), today.getDate(), t[0], t[1]).getTime();
        if (due(at, now)) once('e' + ev.id + '@' + D.dateKey(today) + (ev.time || ''), function () {
          show('Upcoming: ' + (ev.title || 'Upcoming event'), ev.notes ? ev.notes : 'You have an event scheduled today.', '#/calendar');
        });
      });
    }
    S.all('notes').forEach(function (n) {
      if (!n.reminder_time || n.deleted_at) return;
      var at = D.parseIso(n.reminder_time);
      if (!at) return;
      if (due(at.getTime(), now)) once('n' + n.id + '@' + n.reminder_time, function () {
        show('Reminder: ' + (n.title || 'Note reminder'), App.delta.plainText(n.content).slice(0, 140), '#/notes/' + n.id);
      });
    });
    if (changed) saveFired(fired);
  }

  var timer = null;
  function start() {
    if (timer) return;
    check();
    timer = setInterval(check, 20000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') check(); });
  }

  App.notify = { start: start, check: check, show: show, supported: supported, permission: permission, requestPermission: requestPermission };
})();
