// Habit Tracker: today's checklist with progress, weekly grid, details view
// (week strip, monthly calendar, streaks), editor, reminders, reordering.
(function () {
  'use strict';
  var App = window.App, h = App.h, icon = App.icon, S = App.store, D = App.date, ui = App.ui;

  var COLORS = [0xFF1E88E5, 0xFF1565C0, 0xFF0097A7, 0xFF00897B, 0xFF43A047, 0xFF7CB342, 0xFFF9A825, 0xFFFFB300, 0xFFFF8F00, 0xFFE53935, 0xFFD81B60, 0xFF8E24AA];
  var CATEGORIES = {
    All: null,
    Health: ['fitness_center', 'directions_run', 'self_improvement', 'spa', 'pool', 'hiking', 'pets', 'restaurant', 'local_drink', 'health_and_safety', 'meditation'],
    Mind: ['book', 'school', 'psychology', 'lightbulb', 'edit_note', 'auto_stories', 'headphones', 'code'],
    'Self-Care': ['bathtub', 'water_drop', 'bed', 'weekend', 'local_florist', 'music_note', 'coffee', 'favorite', 'spa', 'nightlight'],
    Play: ['sports_esports', 'star', 'celebration', 'emoji_emotions', 'pets', 'palette', 'explore'],
    Finance: ['payments', 'shopping_cart', 'savings', 'account_balance', 'receipt_long'],
    Social: ['groups', 'celebration', 'diversity_3', 'volunteer_activism', 'emoji_emotions'],
    Home: ['cleaning_services', 'yard', 'kitchen', 'checkroom', 'build', 'eco', 'local_florist'],
    Goals: ['bolt', 'rocket_launch', 'emoji_events', 'schedule', 'wb_sunny', 'brush', 'lightbulb'],
  };
  var TYPES = [
    { value: 'yes_no', label: 'Yes / No', desc: 'Simple done/not done', icon: 'check_circle' },
    { value: 'count_target', label: 'Count + Target', desc: 'Track with a daily goal', icon: 'flag' },
    { value: 'free_count', label: 'Free Count', desc: 'Track without a target', icon: 'add_circle' },
  ];
  var SUGGESTIONS = [
    { name: 'Read', icon: 'book', color: 0xFF1E88E5 },
    { name: 'Meditate', icon: 'self_improvement', color: 0xFF7CB342 },
    { name: 'Walk', icon: 'directions_run', color: 0xFF43A047 },
    { name: 'Drink Water', icon: 'water_drop', color: 0xFF0097A7 },
  ];
  var CELEBRATED_KEY = 'personal-app.habits.celebrated';

  // ------------------------------------------------------------- logic ---
  function habits() {
    return S.all('habits').sort(function (a, b) {
      var oa = a.display_order || 0, ob = b.display_order || 0;
      if (oa !== ob) return oa - ob;
      return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
    });
  }
  function counts() {
    var m = {};
    S.all('habit_logs').forEach(function (l) { var k = l.habit_id + '|' + l.date; m[k] = (m[k] || 0) + (l.count == null ? 1 : l.count); });
    return m;
  }
  function getCount(cmap, hid, date) { return cmap[hid + '|' + (typeof date === 'string' ? date : D.dateKey(date))] || 0; }
  function isDoneCount(hb, c) {
    if (hb.habit_type === 'count_target') return c >= Math.max(1, hb.target_count || 0);
    return c > 0;
  }
  function setCount(hid, date, value) {
    var key = D.dateKey(date);
    var rows = S.all('habit_logs').filter(function (l) { return l.habit_id === hid && l.date === key; });
    S.batch(function () {
      if (value <= 0) { S.remove('habit_logs', function (l) { return l.habit_id === hid && l.date === key; }); return; }
      if (!rows.length) { S.insert('habit_logs', { habit_id: hid, date: key, count: value, created_at: D.isoLocal() }); return; }
      S.update('habit_logs', rows[0].id, { count: value });
      var extra = rows.slice(1).map(function (r) { return r.id; });
      if (extra.length) S.remove('habit_logs', function (l) { return extra.indexOf(l.id) >= 0; });
    });
  }
  function increment(hb, date) { setCount(hb.id, date, getCount(counts(), hb.id, date) + 1); }
  function decrement(hb, date) { setCount(hb.id, date, getCount(counts(), hb.id, date) - 1); }
  function toggle(hb, date) {
    if (hb.habit_type === 'yes_no') {
      var c = getCount(counts(), hb.id, date);
      setCount(hb.id, date, c > 0 ? 0 : 1);
    } else increment(hb, date);
  }
  function streaks(hb, cmap) {
    var days = [];
    Object.keys(cmap).forEach(function (k) {
      var p = k.split('|');
      if (+p[0] === hb.id && isDoneCount(hb, cmap[k])) { var d = D.parseDateKey(p[1]); if (d) days.push(d); }
    });
    if (!days.length) return { current: 0, max: 0 };
    days.sort(function (a, b) { return a - b; });
    var max = 1, tmp = 1;
    for (var i = 1; i < days.length; i++) {
      if (D.dayDiff(days[i - 1], days[i]) === 1) tmp++; else { if (tmp > max) max = tmp; tmp = 1; }
    }
    if (tmp > max) max = tmp;
    var today = D.startOfDay(new Date()), last = days[days.length - 1], current = 0;
    var gap = D.dayDiff(last, today);
    if (gap === 0 || gap === 1) {
      current = 1;
      for (var j = days.length - 2; j >= 0; j--) { if (D.dayDiff(days[j], days[j + 1]) === 1) current++; else break; }
    }
    return { current: current, max: max };
  }
  function weekStart(d) { var x = D.startOfDay(d); return D.addDays(x, -((x.getDay() + 6) % 7)); } // Monday
  function hex(hb) { return App.color.argbToHex(hb.color == null ? 4284993700 : hb.color); }
  function onColor(hb) { return App.color.isLight(hex(hb)) ? '#1b1b1b' : '#ffffff'; }
  function nextOrder() { return habits().reduce(function (m, hb) { return Math.max(m, hb.display_order || 0); }, 0) + 1; }

  function createHabit(data) {
    var hb = S.insert('habits', {
      name: data.name, icon: data.icon || 'star', color: data.color, reminder_time: data.reminder_time || null,
      created_at: D.isoLocal(), display_order: nextOrder(), habit_type: data.habit_type || 'yes_no',
      target_count: data.habit_type === 'count_target' ? data.target_count : 0,
    });
    ui.snack('Habit created', { type: 'success' });
    return hb;
  }
  function deleteHabits(list) {
    var logs = S.all('habit_logs').filter(function (l) { return list.some(function (hb) { return hb.id === l.habit_id; }); });
    var ids = list.map(function (hb) { return hb.id; });
    S.remove('habits', function (hb) { return ids.indexOf(hb.id) >= 0; });
    ui.snack(list.length === 1 ? 'Habit deleted' : list.length + ' habits deleted', {
      action: { label: 'Undo', onClick: function () { S.batch(function () { list.forEach(function (hb) { S.restore('habits', hb); }); logs.forEach(function (l) { S.restore('habit_logs', l); }); }); } },
    });
  }

  // ------------------------------------------------------------ dialogs ---
  function editorDialog(existing) {
    var st = {
      name: existing ? existing.name : '', icon: existing ? (existing.icon || 'star') : 'star',
      color: existing ? (existing.color == null ? 4284993700 : existing.color) : COLORS[0],
      type: existing ? existing.habit_type : 'yes_no', target: existing && existing.target_count > 0 ? existing.target_count : 8,
      reminder: existing ? existing.reminder_time : null, cat: 'All', touched: false,
    };
    var initial = JSON.stringify(st);
    function dirty() { var c = Object.assign({}, st, { cat: 'All', touched: false }); return JSON.stringify(c) !== initial; }
    return new Promise(function (resolve) {
      var done = false;
      var layer = ui.openLayer('dialog', {
        cls: 'wide habit-editor', label: existing ? 'Edit Habit' : 'New Habit',
        beforeDismiss: function () {
          if (!dirty()) return true;
          return ui.confirm(existing ? 'Discard edits?' : 'Discard habit?',
            existing ? 'You have unsaved changes. Are you sure you want to discard your edits?' : 'You have unsaved changes. Are you sure you want to discard this habit?',
            'Discard', { cancelLabel: 'Keep editing', danger: true });
        },
        onClose: function (v) { if (!done) resolve(v); },
        build: function (layer) {
          var nameInput = h('input', { type: 'text', maxlength: '60', value: st.name, placeholder: 'e.g. Read 10 pages', autofocus: true });
          var nameHelp = h('span.field-help', 'Give your habit a clear name');
          var nameField = h('label.field', h('span.field-label', 'Habit Name *'), nameInput, nameHelp);
          var iconGrid = h('div.icon-grid');
          var catChips = h('div.chips.cat-chips');
          var colorRow = h('div.swatches.habit-swatches');
          var typeRow = h('div.type-cards');
          var targetInput = h('input', { type: 'number', min: '1', max: '999', value: String(st.target), placeholder: 'e.g. 8' });
          var targetField = h('label.field', h('span.field-label', 'Daily Target'), targetInput);
          var reminderInput = h('input', { type: 'time', value: st.reminder || '' });
          var preview = h('div.habit-preview');
          var saveBtn = App.btn('filled', existing ? 'Save' : 'Create Habit', submit, { icon: existing ? 'check' : 'add' });

          function validate() {
            var empty = !nameInput.value.trim();
            nameField.classList.toggle('invalid', st.touched && empty);
            nameHelp.textContent = st.touched && empty ? 'Name is required' : 'Give your habit a clear name';
            nameHelp.style.color = st.touched && empty ? 'var(--md-error)' : '';
            var t = parseInt(targetInput.value, 10);
            var badTarget = st.type === 'count_target' && !(t > 0);
            targetField.classList.toggle('invalid', badTarget);
            saveBtn.disabled = empty || badTarget;
          }
          function drawPreview() {
            var fake = { color: st.color, icon: st.icon };
            App.clear(preview).append(h('span.habit-ic', { style: { background: hex(fake), color: onColor(fake) } }, App.habitIcon(st.icon, { fill: true })),
              h('div', h('b', nameInput.value.trim() || 'Your habit'), h('small.muted', TYPES.find(function (t) { return t.value === st.type; }).label + (st.type === 'count_target' ? ' · target ' + (parseInt(targetInput.value, 10) || 0) : ''))));
          }
          function drawIcons() {
            App.clear(catChips);
            Object.keys(CATEGORIES).forEach(function (c) { catChips.appendChild(ui.chip(c, st.cat === c, function () { st.cat = c; drawIcons(); }, { noCheck: true })); });
            App.clear(iconGrid);
            var keys = CATEGORIES[st.cat] || window.HABIT_ICON_KEYS;
            keys.forEach(function (k) {
              var sel = st.icon === k;
              iconGrid.appendChild(h('button.icon-choice' + (sel ? '.selected' : ''), {
                type: 'button', title: k.replace(/_/g, ' '), 'aria-label': k.replace(/_/g, ' '), 'aria-pressed': String(sel),
                style: sel ? { background: App.color.argbToHex(st.color), color: onColor({ color: st.color }) } : null,
                onclick: function () { st.icon = k; drawIcons(); drawPreview(); },
              }, App.habitIcon(k, { fill: sel })));
            });
          }
          function drawColors() {
            App.clear(colorRow);
            var isPreset = COLORS.indexOf(st.color) >= 0;
            COLORS.forEach(function (c) {
              var sel = st.color === c;
              colorRow.appendChild(h('button.swatch' + (sel ? '.selected' : ''), {
                type: 'button', 'aria-label': 'Color ' + App.color.argbToHex(c), style: { background: App.color.argbToHex(c) },
                onclick: function () { st.color = c; drawColors(); drawIcons(); drawPreview(); },
              }, sel ? icon('check', { color: onColor({ color: c }) }) : null));
            });
            var picker = h('input', { type: 'color', value: App.color.argbToHex(st.color).toLowerCase(), 'aria-label': 'Custom color' });
            picker.addEventListener('input', function () { st.color = App.color.hexToArgb(picker.value); drawIcons(); drawPreview(); customSw.style.background = picker.value; });
            picker.addEventListener('change', drawColors);
            var customSw = h('label.swatch.custom' + (!isPreset ? '.selected' : ''), { title: 'Custom color', style: !isPreset ? { background: App.color.argbToHex(st.color) } : null }, icon('palette', { color: !isPreset ? onColor({ color: st.color }) : null }), picker);
            colorRow.appendChild(customSw);
          }
          function drawTypes() {
            App.clear(typeRow);
            TYPES.forEach(function (t) {
              var sel = st.type === t.value;
              typeRow.appendChild(h('button.type-card' + (sel ? '.selected' : ''), {
                type: 'button', 'aria-pressed': String(sel), onclick: function () { st.type = t.value; drawTypes(); validate(); drawPreview(); },
              }, icon(t.icon, { fill: sel }), h('b', t.label), h('small', t.desc)));
            });
            targetField.classList.toggle('hidden', st.type !== 'count_target');
          }
          function submit() {
            st.touched = true;
            validate();
            if (saveBtn.disabled) { nameInput.focus(); return; }
            var data = {
              name: nameInput.value.trim(), icon: st.icon, color: st.color, habit_type: st.type,
              target_count: st.type === 'count_target' ? Math.min(999, parseInt(targetInput.value, 10)) : 0,
              reminder_time: reminderInput.value || null,
            };
            done = true;
            layer.close();
            resolve(data);
          }
          nameInput.addEventListener('input', function () { st.name = nameInput.value; st.touched = true; validate(); drawPreview(); });
          nameInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
          targetInput.addEventListener('input', function () { st.target = parseInt(targetInput.value, 10) || st.target; validate(); drawPreview(); });
          reminderInput.addEventListener('input', function () { st.reminder = reminderInput.value || null; });
          drawIcons(); drawColors(); drawTypes(); drawPreview(); validate();

          return [
            h('div.dialog-headrow', h('h2.dialog-title', existing ? 'Edit Habit' : 'New Habit'), App.iconBtn('close', 'Close', function () { layer.dismiss(); })),
            preview,
            h('div.stack',
              nameField,
              h('div.field', h('span.field-label', 'Icon'), catChips, iconGrid),
              h('div.field', h('span.field-label', 'Color'), colorRow),
              h('div.field', h('span.field-label', 'Tracking Type'), h('span.field-help', 'Choose how you want to track this habit'), typeRow, targetField),
              h('div.field', h('span.field-label', 'Reminder (optional)'),
                h('div.row', reminderInput, App.btn('text', 'Clear', function () { reminderInput.value = ''; st.reminder = null; }))),
              h('span.field-help', 'Reminders show while Personal App is open in a browser tab.')),
            h('div.dialog-actions',
              existing ? App.btn('text', 'Delete Habit', function () { done = true; layer.close(); resolve({ delete: true }); }, { cls: 'btn-danger', icon: 'delete' }) : null,
              h('span.grow'),
              App.btn('text', 'Cancel', function () { layer.dismiss(); }), saveBtn),
          ];
        },
      });
    });
  }

  function reminderDialog(hb) {
    var input = h('input', { type: 'time', value: hb.reminder_time || D.fmt(new Date(), 'HH:mm') });
    var acts = [{ label: 'Cancel', value: undefined }];
    if (hb.reminder_time) acts.push({ label: 'Remove', danger: true, value: { remove: true } });
    acts.push({ label: 'Save', kind: 'filled', validate: function () { return !!input.value; }, value: function () { return { time: input.value }; } });
    return ui.dialog({
      icon: 'alarm', title: 'Daily reminder', content: h('div.stack', ui.field('Remind me every day at', input),
        h('p.field-help', 'Reminders show while Personal App is open in a browser tab.')), actions: acts,
    }).then(function (r) {
      if (!r) return;
      S.update('habits', hb.id, { reminder_time: r.remove ? null : r.time });
      if (!r.remove) App.notify.requestPermission();
      ui.snack(r.remove ? 'Reminder removed' : 'Reminder updated', { type: 'success' });
    });
  }
  function confirmDelete(hb) {
    ui.confirm('Delete Habit', 'Are you sure you want to delete "' + hb.name + '" and all of its progress logs?', 'Delete', { danger: true, icon: 'delete' })
      .then(function (ok) { if (ok) deleteHabits([hb]); });
  }
  function editHabit(hb) {
    editorDialog(hb).then(function (r) {
      if (!r) return;
      if (r.delete) { confirmDelete(hb); return; }
      S.update('habits', hb.id, r);
      ui.snack('Habit updated', { type: 'success' });
    });
  }
  function newHabit() {
    editorDialog(null).then(function (r) { if (r && !r.delete) createHabit(r); });
  }

  // ---------------------------------------------------------------- view ---
  App.views.habits = function (main) {
    var mode = 'today', query = '', selectedId = null, selected = {};
    var weekOf = weekStart(new Date()), monthOf = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    var headEl = h('header.view-head'), bodyEl = h('div.view-body');
    var searchInput;

    function filtered() {
      var q = query.toLowerCase();
      return habits().filter(function (hb) { return !q || hb.name.toLowerCase().indexOf(q) >= 0; });
    }
    function selIds() { return Object.keys(selected).map(Number); }

    function drawHead() {
      App.clear(headEl);
      var ids = selIds();
      if (ids.length) {
        headEl.classList.add('selecting');
        headEl.append(App.iconBtn('close', 'Cancel', function () { selected = {}; draw(); }), h('div.view-title', ids.length + ' selected'),
          App.btn('text', 'Select all', function () { filtered().forEach(function (hb) { selected[hb.id] = true; }); draw(); }, { icon: 'select_all' }),
          App.btn('tonal', 'Delete', function () {
            var list = habits().filter(function (hb) { return selected[hb.id]; });
            var count = list.length;
            ui.confirm('Delete Habits', 'Permanently delete ' + count + ' selected habit' + (count > 1 ? 's' : '') + '? This action cannot be undone.', 'Delete', { danger: true }).then(function (ok) {
              if (!ok) return;
              selected = {};
              deleteHabits(list);
            });
          }, { icon: 'delete' }));
        return;
      }
      headEl.classList.remove('selecting');
      if (!searchInput) {
        searchInput = h('input', { type: 'search', placeholder: 'Search habits...', 'aria-label': 'Search habits' });
        searchInput.addEventListener('input', App.debounce(function () { query = searchInput.value.trim(); drawBody(); }, 150));
        searchInput._wrap = h('label.search', icon('search'), searchInput);
      }
      var all = habits();
      headEl.append(
        h('h1.view-title', 'Habit Tracker'),
        all.length ? searchInput._wrap : null,
        all.length ? ui.segmented([{ value: 'today', label: 'Today', icon: 'today' }, { value: 'details', label: 'Details', icon: 'monitoring' }], mode, function (v) { mode = v; draw(); }, { label: 'View', noCheck: true }) : null,
        all.length ? App.iconBtn('done_all', 'Mark all done', markAllDone) : null,
        App.btn('filled', 'New habit', newHabit, { icon: 'add', cls: 'hide-phone' }));
    }

    function markAllDone() {
      var cmap = counts(), today = new Date();
      var remaining = habits().filter(function (hb) { return !isDoneCount(hb, getCount(cmap, hb.id, today)); });
      if (!remaining.length) { ui.snack('All habits already completed today!'); return; }
      ui.confirm('Mark All Done', 'Mark all ' + remaining.length + ' remaining habit' + (remaining.length > 1 ? 's' : '') + ' as completed for today?', 'Mark Done').then(function (ok) {
        if (!ok) return;
        S.batch(function () {
          remaining.forEach(function (hb) {
            var c = getCount(counts(), hb.id, today);
            setCount(hb.id, today, hb.habit_type === 'count_target' ? Math.max(c, hb.target_count) : c + 1);
          });
        });
      });
    }

    function celebrateIfDone() {
      var all = habits();
      if (!all.length) return;
      var cmap = counts(), today = new Date();
      var allDone = all.every(function (hb) { return isDoneCount(hb, getCount(cmap, hb.id, today)); });
      var key = D.dateKey(today);
      var last = null;
      try { last = localStorage.getItem(CELEBRATED_KEY); } catch (e) { /* ignore */ }
      if (allDone && last !== key) {
        try { localStorage.setItem(CELEBRATED_KEY, key); } catch (e) { /* ignore */ }
        ui.snack('All habits done! Great job! 🎉', { type: 'success' });
      }
    }

    function progressCard(list, cmap) {
      var today = new Date();
      var done = list.filter(function (hb) { return isDoneCount(hb, getCount(cmap, hb.id, today)); }).length;
      var pct = list.length ? done / list.length : 0;
      var msg = done === 0 ? "Let's build momentum today!" : pct < 0.5 ? 'Off to a great start, keep going!' : pct < 1 ? 'Over halfway there! Finish strong!' : 'Flawless execution! All habits done! 🎉';
      var R = 34, C = 2 * Math.PI * R;
      var ring = '<svg viewBox="0 0 80 80" class="ring"><circle cx="40" cy="40" r="' + R + '" class="ring-bg"/><circle cx="40" cy="40" r="' + R + '" class="ring-fg" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - pct)) + '"/></svg>';
      return h('div.card.progress-card',
        h('div.ring-wrap', { innerHTML: ring }, h('span.ring-label', Math.round(pct * 100) + '%')),
        h('div.grow', h('div.muted.small', D.fmt(today, 'EEEE, MMMM d')), h('h2', done + ' of ' + list.length + ' Habits Done'), h('p.muted', msg),
          h('div.progress', h('span', { style: { width: (pct * 100) + '%' } }))));
    }

    function row(hb, cmap, i, list) {
      var today = new Date();
      var c = getCount(cmap, hb.id, today), done = isDoneCount(hb, c);
      var col = hex(hb);
      var sub;
      if (hb.habit_type === 'count_target') sub = c + ' / ' + hb.target_count + ' completed';
      else if (hb.habit_type === 'free_count') sub = c + ' today';
      else sub = done ? 'Completed today' : 'Tap to complete';
      if (hb.reminder_time) sub += ' · ⏰ ' + D.fmtTime(hb.reminder_time);
      var isSel = !!selected[hb.id];
      var selecting = selIds().length > 0;
      var control;
      if (hb.habit_type === 'yes_no') {
        control = h('button.check-btn' + (done ? '.on' : ''), {
          type: 'button', title: done ? 'Mark not done' : 'Mark done', 'aria-label': (done ? 'Mark not done: ' : 'Mark done: ') + hb.name,
          style: done ? { background: col, borderColor: col, color: onColor(hb) } : { borderColor: col },
          onclick: function (e) { e.stopPropagation(); toggle(hb, today); },
        }, icon('check'));
      } else {
        control = h('div.counter-ctl',
          App.iconBtn('remove', 'Decrease ' + hb.name + ' count', function (e) { e.stopPropagation(); decrement(hb, today); }, { cls: 'sm', disabled: c === 0 }),
          h('span.count-val' + (done ? '.on' : ''), { style: done ? { color: col } : null }, String(c)),
          App.iconBtn('add', 'Increase ' + hb.name + ' count', function (e) { e.stopPropagation(); increment(hb, today); }, { cls: 'sm tonal' }));
      }
      var moreBtn = App.iconBtn('more_vert', 'Habit actions', function (e) {
        e.stopPropagation();
        ui.menu(moreBtn, [
          { label: 'Edit', icon: 'edit', onClick: function () { editHabit(hb); } },
          { label: hb.reminder_time ? 'Reminder: ' + D.fmtTime(hb.reminder_time) : 'Set reminder', icon: 'alarm', onClick: function () { reminderDialog(hb); } },
          { label: 'View details', icon: 'monitoring', onClick: function () { selectedId = hb.id; mode = 'details'; draw(); } },
          { label: 'Move up', icon: 'keyboard_arrow_up', disabled: i === 0 || !!query, onClick: function () { move(list, i, i - 1); } },
          { label: 'Move down', icon: 'keyboard_arrow_down', disabled: i === list.length - 1 || !!query, onClick: function () { move(list, i, i + 1); } },
          { label: 'Select', icon: 'check_circle', onClick: function () { selected[hb.id] = true; draw(); } },
          { divider: true },
          { label: 'Delete', icon: 'delete', danger: true, onClick: function () { confirmDelete(hb); } },
        ]);
      }, { cls: 'sm' });
      var el = h('div.habit-row' + (done ? '.done' : '') + (isSel ? '.selected' : ''), {
        draggable: query ? null : 'true', dataset: { id: String(hb.id) }, tabindex: '0',
        style: { '--hc': col },
        onclick: function (e) {
          if (selecting || e.ctrlKey || e.metaKey) { if (selected[hb.id]) delete selected[hb.id]; else selected[hb.id] = true; draw(); return; }
          if (hb.habit_type === 'yes_no') toggle(hb, today); else increment(hb, today);
        },
        onkeydown: function (e) { if (e.target === el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(hb, today); } },
      },
      h('span.drag-handle', { title: 'Drag to reorder' }, icon('drag_indicator')),
      h('span.habit-ic', { style: { background: done ? col : App.color.rgba(col, 0.16), color: done ? onColor(hb) : col } }, App.habitIcon(hb.icon, { fill: true })),
      h('div.grow', h('b.habit-name', hb.name), h('small.muted', sub),
        hb.habit_type === 'count_target' ? h('div.progress.mini', h('span', { style: { width: Math.min(100, c / Math.max(1, hb.target_count) * 100) + '%', background: col } })) : null),
      control, moreBtn);
      // Drag & drop reordering
      el.addEventListener('dragstart', function (e) { el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(hb.id)); });
      el.addEventListener('dragend', function () { el.classList.remove('dragging'); });
      el.addEventListener('dragover', function (e) { e.preventDefault(); el.classList.add('drop-target'); });
      el.addEventListener('dragleave', function () { el.classList.remove('drop-target'); });
      el.addEventListener('drop', function (e) {
        e.preventDefault();
        el.classList.remove('drop-target');
        var from = list.findIndex(function (x) { return String(x.id) === e.dataTransfer.getData('text/plain'); });
        if (from >= 0 && from !== i) move(list, from, i);
      });
      return el;
    }
    function move(list, from, to) {
      var arr = list.slice();
      var item = arr.splice(from, 1)[0];
      arr.splice(to, 0, item);
      S.batch(function () { arr.forEach(function (hb, idx) { if (hb.display_order !== idx) S.update('habits', hb.id, { display_order: idx }); }); });
    }

    function weekGrid(list, cmap) {
      var ws = weekStart(new Date()), today = D.startOfDay(new Date());
      var days = [];
      for (var i = 0; i < 7; i++) days.push(D.addDays(ws, i));
      var table = h('div.week-grid', { style: { '--cols': 7 } },
        h('div.wg-head', h('span'), days.map(function (d) { return h('span.wg-day' + (D.sameDay(d, today) ? '.today' : ''), D.fmt(d, 'EEE'), h('small', D.fmt(d, 'd'))); })));
      list.forEach(function (hb) {
        var col = hex(hb);
        table.appendChild(h('div.wg-row', h('span.wg-name', { title: hb.name }, App.habitIcon(hb.icon, { fill: true, color: col }), h('span', hb.name)),
          days.map(function (d) {
            var c = getCount(cmap, hb.id, d), done = isDoneCount(hb, c), future = d > today;
            var label = D.fmt(d, 'EEEE MMM d') + ': ' + (hb.habit_type === 'yes_no' ? (done ? 'done' : 'not done') : 'count ' + c);
            return h('button.wg-cell' + (done ? '.on' : '') + (c && !done ? '.part' : ''), {
              type: 'button', disabled: future, title: label + (hb.habit_type !== 'yes_no' ? ' (click +1, right-click −1)' : ''), 'aria-label': hb.name + ', ' + label,
              style: done ? { background: col, color: onColor(hb) } : (c ? { borderColor: col, color: col } : null),
              onclick: function () { toggle(hb, d); },
              oncontextmenu: function (e) { if (hb.habit_type !== 'yes_no') { e.preventDefault(); decrement(hb, d); } },
            }, future ? icon('lock', { size: 14 }) : done && hb.habit_type === 'yes_no' ? icon('check', { size: 18 }) : (c ? String(c) : ''));
          })));
      });
      return h('div.card', h('div.card-title', icon('date_range'), 'This week'), table,
        h('p.muted.small.mt', 'Click a day to log it. For count habits: click adds one, right-click removes one.'));
    }

    function drawToday() {
      var all = habits(), list = filtered(), cmap = counts();
      if (!list.length) {
        bodyEl.appendChild(ui.emptyState('search_off', 'No habits match "' + query + '"', 'Try a different search term'));
        return;
      }
      var listEl = h('div.habit-list');
      list.forEach(function (hb, i) { listEl.appendChild(row(hb, cmap, i, list)); });
      bodyEl.appendChild(h('div.habits-today',
        h('div.col-main', progressCard(all, cmap), listEl, h('p.hint', 'Drag rows to reorder · Ctrl+click to select several')),
        h('div.col-side', weekGrid(list, cmap))));
    }

    function drawDetails() {
      var list = filtered(), cmap = counts();
      if (!list.length) { bodyEl.appendChild(ui.emptyState('search_off', 'No habits match "' + query + '"', 'Try a different search term')); return; }
      var hb = list.find(function (x) { return x.id === selectedId; }) || list[0];
      selectedId = hb.id;
      var col = hex(hb), today = D.startOfDay(new Date());

      var chips = h('div.chips.habit-chips', list.map(function (x) {
        var sel = x.id === hb.id;
        return h('button.chip' + (sel ? '.selected' : ''), {
          type: 'button', 'aria-pressed': String(sel), onclick: function () { selectedId = x.id; draw(); },
          style: sel ? { background: App.color.rgba(hex(x), 0.18), color: 'var(--md-on-surface)', borderColor: hex(x) } : null,
        }, App.habitIcon(x.icon, { fill: true, color: hex(x) }), h('span', x.name));
      }));

      var typeLabel = TYPES.find(function (t) { return t.value === hb.habit_type; }).label + (hb.habit_type === 'count_target' ? ' · target ' + hb.target_count + '/day' : '');
      var headerCard = h('div.card.habit-head', { style: { '--hc': col } },
        h('span.habit-ic.lg', { style: { background: col, color: onColor(hb) } }, App.habitIcon(hb.icon, { fill: true })),
        h('div.grow', h('h2', hb.name), h('small.muted', typeLabel), h('div.muted.small', hb.reminder_time ? 'Daily reminder at ' + D.fmtTime(hb.reminder_time) : 'No reminder set')),
        App.iconBtn('edit', 'Edit habit', function () { editHabit(hb); }),
        App.iconBtn('alarm', 'Set reminder', function () { reminderDialog(hb); }),
        App.iconBtn('delete', 'Delete habit', function () { confirmDelete(hb); }));

      // Week strip
      var thisWeek = weekStart(new Date());
      var weekDays = [];
      for (var i = 0; i < 7; i++) weekDays.push(D.addDays(weekOf, i));
      var weekCard = h('div.card',
        h('div.card-title.between',
          App.iconBtn('chevron_left', 'Previous week', function () { weekOf = D.addDays(weekOf, -7); draw(); }, { cls: 'sm' }),
          h('span.grow.center', 'Week of ' + D.fmt(weekOf, 'MMM d')),
          !D.sameDay(weekOf, thisWeek) ? App.btn('text', 'Today', function () { weekOf = thisWeek; draw(); }) : null,
          App.iconBtn('chevron_right', 'Next week', function () { weekOf = D.addDays(weekOf, 7); draw(); }, { cls: 'sm', disabled: weekOf >= thisWeek })),
        h('div.week-strip', weekDays.map(function (d) {
          var c = getCount(cmap, hb.id, d), done = isDoneCount(hb, c), future = d > today, isToday = D.sameDay(d, today);
          return h('div.ws-day' + (isToday ? '.today' : ''),
            h('small', D.fmt(d, 'E')), h('span.ws-num', D.fmt(d, 'd')),
            h('button.ws-dot' + (done ? '.on' : ''), {
              type: 'button', disabled: future, 'aria-label': D.fmt(d, 'EEEE MMM d') + (hb.habit_type === 'yes_no' ? (done ? ', done' : ', not done') : ', count ' + c),
              title: hb.habit_type === 'yes_no' ? 'Toggle' : 'Click +1 · right-click −1',
              style: done ? { background: col, borderColor: col, color: onColor(hb) } : isToday ? { borderColor: App.color.rgba(col, 0.5), background: App.color.rgba(col, 0.08) } : null,
              onclick: function () { toggle(hb, d); },
              oncontextmenu: function (e) { if (hb.habit_type !== 'yes_no') { e.preventDefault(); decrement(hb, d); } },
            }, future ? icon('lock', { size: 16 }) : hb.habit_type === 'yes_no' ? (done ? icon('check') : null) : h('span.ws-count', hb.habit_type === 'count_target' ? c + '/' + hb.target_count : String(c))));
        })));

      // Month calendar (Monday first, like the phone app)
      var y = monthOf.getFullYear(), m = monthOf.getMonth(), total = D.daysInMonth(y, m);
      var lead = (new Date(y, m, 1).getDay() + 6) % 7;
      var cells = [];
      ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(function (w) { cells.push(h('span.mc-wd', w)); });
      for (var b = 0; b < lead; b++) cells.push(h('span'));
      var completed = 0;
      for (var day = 1; day <= total; day++) {
        (function (date) {
          var c = getCount(cmap, hb.id, date), done = isDoneCount(hb, c), future = date > today;
          if (done) completed++;
          cells.push(h('button.mc-day' + (done ? '.on' : '') + (D.sameDay(date, today) ? '.today' : ''), {
            type: 'button', disabled: future,
            'aria-label': date.getDate() + (done ? ' logged' : ' not logged') + (hb.habit_type === 'yes_no' ? '' : ', count ' + c),
            title: hb.habit_type === 'yes_no' ? '' : 'Click +1 · right-click −1',
            style: done ? { borderColor: col, background: App.color.rgba(col, 0.2), color: col } : (c ? { borderColor: App.color.rgba(col, 0.6) } : null),
            onclick: function () { toggle(hb, date); },
            oncontextmenu: function (e) { if (hb.habit_type !== 'yes_no') { e.preventDefault(); decrement(hb, date); } },
          }, h('span', String(date.getDate())), hb.habit_type !== 'yes_no' && c > 0 ? h('b', String(c)) : null));
        })(new Date(y, m, day));
      }
      var now = new Date();
      var isCurMonth = y === now.getFullYear() && m === now.getMonth();
      var monthCard = h('div.card',
        h('div.card-title.between',
          App.iconBtn('chevron_left', 'Previous month', function () { monthOf = new Date(y, m - 1, 1); draw(); }, { cls: 'sm' }),
          h('span.grow.center', 'Monthly Overview · ' + D.fmt(monthOf, 'MMMM yyyy')),
          !isCurMonth ? App.btn('text', 'Today', function () { monthOf = new Date(now.getFullYear(), now.getMonth(), 1); draw(); }) : null,
          App.iconBtn('chevron_right', 'Next month', function () { monthOf = new Date(y, m + 1, 1); draw(); }, { cls: 'sm' })),
        h('div.month-cal', cells));

      var s = streaks(hb, cmap);
      var pct = Math.round(completed / total * 100);
      function stat(ic, title, value, sub) {
        return h('div.stat', h('span.stat-ic', { style: { color: col, background: App.color.rgba(col, 0.14) } }, icon(ic, { fill: true })),
          h('div', h('small.muted', title), h('b', value), sub ? h('small.muted', sub) : null));
      }
      var statsCard = h('div.card.stats',
        stat('task_alt', 'Completed', completed + '/' + total, pct + '% this month'),
        stat('local_fire_department', 'Current Streak', App.plural(s.current, 'day')),
        stat('trophy', 'Best Streak', App.plural(s.max, 'day')));

      bodyEl.appendChild(h('div.habits-details', chips, headerCard,
        h('div.details-grid', h('div.col-main', weekCard, monthCard), h('div.col-side', statsCard))));
    }

    function drawEmpty() {
      bodyEl.appendChild(h('div.empty',
        h('div.empty-icon', icon('checklist_rtl', { fill: true })),
        h('h3', 'No habits created yet'), h('p', 'Start building better habits today'),
        App.btn('filled', 'Create Custom Habit', newHabit, { icon: 'add', cls: 'btn-lg' }),
        h('p.muted.small.mt', 'Quick suggestions'),
        h('div.chips.center', SUGGESTIONS.map(function (sg) {
          return h('button.chip', { type: 'button', onclick: function () { createHabit({ name: sg.name, icon: sg.icon, color: sg.color, habit_type: 'yes_no' }); } },
            App.habitIcon(sg.icon, { fill: true, color: App.color.argbToHex(sg.color) }), h('span', sg.name));
        }))));
    }

    function drawBody() {
      App.clear(bodyEl);
      if (!habits().length) { drawEmpty(); return; }
      if (mode === 'today') drawToday(); else drawDetails();
    }
    function draw() {
      Object.keys(selected).forEach(function (k) { if (!S.get('habits', +k)) delete selected[k]; });
      drawHead(); drawBody();
    }

    var view = h('section.view.habits-view', headEl, bodyEl,
      h('button.fab.show-phone', { type: 'button', onclick: newHabit, 'aria-label': 'Add habit' }, icon('add'), 'New'));
    main.appendChild(view);
    draw();
    return {
      onData: function (tables) {
        draw();
        if (tables.indexOf('habit_logs') >= 0) celebrateIfDone();
      },
    };
  };

  App.habitLogic = { habits: habits, counts: counts, getCount: getCount, isDoneCount: isDoneCount, streaks: streaks };
})();
