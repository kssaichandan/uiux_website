// Calendar: month / week / day / agenda views, search, category filter,
// recurring events (daily, weekly, monthly with an end date) and the editor.
(function () {
  'use strict';
  var App = window.App, h = App.h, icon = App.icon, S = App.store, D = App.date, ui = App.ui;

  var CATS = ['General', 'Work', 'Personal', 'Urgent'];
  var CAT_ICON = { General: 'event_note', Work: 'work', Personal: 'person', Urgent: 'warning' };
  var RECUR = [{ v: 'none', l: 'None' }, { v: 'daily', l: 'Daily' }, { v: 'weekly', l: 'Weekly' }, { v: 'monthly', l: 'Monthly' }];

  function catColor(cat) {
    var dark = App.theme.dark;
    if (cat === 'Work') return dark ? '#64B5F6' : '#1976D2';
    if (cat === 'Personal') return dark ? '#81C784' : '#388E3C';
    if (cat === 'Urgent') return dark ? '#E57373' : '#D32F2F';
    return 'var(--md-primary)';
  }

  // Same rule as the phone app's _occursOnDay.
  function occursOn(e, day) {
    var start = D.parseDateKey(e.date);
    if (!start) return false;
    if (D.sameDay(start, day)) return true;
    var rec = e.recurrence;
    if (rec !== 'daily' && rec !== 'weekly' && rec !== 'monthly') return false;
    var diff = D.dayDiff(start, day);
    if (diff < 0) return false;
    var end = e.recurrence_end ? D.parseDateKey(e.recurrence_end) : null;
    if (end && D.dayDiff(end, day) > 0) return false;
    if (rec === 'daily') return true;
    if (rec === 'weekly') return diff % 7 === 0;
    return day.getDate() === start.getDate();
  }
  function byTime(a, b) {
    if (!a.time && b.time) return -1;
    if (a.time && !b.time) return 1;
    if ((a.time || '') !== (b.time || '')) return (a.time || '') < (b.time || '') ? -1 : 1;
    return a.id - b.id;
  }
  App.calendarLogic = { occursOn: occursOn };

  function recurLabel(e) {
    if (!e.recurrence || e.recurrence === 'none') return '';
    var base = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }[e.recurrence] || '';
    return base + (e.recurrence_end ? ' until ' + D.fmt(D.parseDateKey(e.recurrence_end), 'MMM d, y') : '');
  }

  // ------------------------------------------------------------ editor ---
  function editor(existing, defaultDate) {
    var date = existing ? D.parseDateKey(existing.date) : (defaultDate || D.startOfDay(new Date()));
    var st = {
      title: existing ? existing.title : '', date: D.dateKey(date),
      allDay: existing ? !existing.time : true, time: existing && existing.time ? existing.time : '09:00',
      category: existing ? (existing.category || 'General') : 'General',
      recurrence: existing ? (existing.recurrence || 'none') : 'none',
      end: existing && existing.recurrence_end ? existing.recurrence_end : D.dateKey(D.addDays(date, 30)),
      notes: existing ? (existing.notes || '') : '',
    };
    var initial = JSON.stringify(st);
    var minDate = D.dateKey(new Date(new Date().getFullYear() - 5, new Date().getMonth(), new Date().getDate()));
    var maxDate = D.dateKey(new Date(new Date().getFullYear() + 10, new Date().getMonth(), new Date().getDate()));

    return new Promise(function (resolve) {
      var done = false;
      ui.openLayer('dialog', {
        cls: 'wide event-editor', label: existing ? 'Edit Event' : 'New Event',
        beforeDismiss: function () {
          if (JSON.stringify(st) === initial) return true;
          return ui.confirm('Discard changes?', 'You have unsaved edits. Are you sure you want to discard them?', 'Discard', { cancelLabel: 'Keep Editing', danger: true });
        },
        onClose: function (v) { if (!done) resolve(v); },
        build: function (layer) {
          var titleIn = h('input', { type: 'text', value: st.title, placeholder: 'Add title', maxlength: '120', autofocus: true });
          var titleErr = h('span.field-error');
          var titleCount = h('span.counter');
          var titleField = h('label.field', h('span.field-label', 'Title *'), titleIn, h('div.row', titleErr, h('span.grow'), titleCount));
          var dateIn = h('input', { type: 'date', value: st.date, min: minDate, max: maxDate });
          var timeIn = h('input', { type: 'time', value: st.time, disabled: st.allDay });
          var allDaySw = ui.switchEl(st.allDay, function (v) { st.allDay = v; timeIn.disabled = v; }, 'All day');
          var catRow = h('div.chips');
          var recRow = h('div.chips');
          var endIn = h('input', { type: 'date', value: st.end, min: st.date, max: maxDate });
          var endField = h('label.field', h('span.field-label', 'Ends on'), endIn);
          var notesIn = h('textarea', { maxlength: '300', rows: '4', placeholder: 'Add description or notes...' });
          notesIn.value = st.notes;
          var notesCount = h('span.counter');

          function validateTitle(show) {
            var t = titleIn.value.trim();
            var msg = !t ? 'Title is required' : t.length > 80 ? 'Title is too long' : '';
            titleCount.textContent = titleIn.value.length + '/80';
            titleCount.classList.toggle('warn', titleIn.value.length > 80);
            if (show || (msg === 'Title is too long')) { titleErr.textContent = msg; titleField.classList.toggle('invalid', !!msg); }
            else if (!msg) { titleErr.textContent = ''; titleField.classList.remove('invalid'); }
            return !msg;
          }
          function drawCats() {
            App.clear(catRow);
            CATS.forEach(function (c) {
              var sel = st.category === c;
              catRow.appendChild(ui.chip(c, sel, function () { st.category = c; drawCats(); }, {
                icon: CAT_ICON[c], fill: sel, noCheck: true,
                style: sel ? { background: 'color-mix(in srgb, ' + catColor(c) + ' 18%, transparent)', color: catColor(c), borderColor: catColor(c) } : null,
              }));
            });
          }
          function drawRec() {
            App.clear(recRow);
            RECUR.forEach(function (r) {
              recRow.appendChild(ui.chip(r.l, st.recurrence === r.v, function () { st.recurrence = r.v; drawRec(); }, { icon: r.v === 'none' ? null : 'repeat' }));
            });
            endField.classList.toggle('hidden', st.recurrence === 'none');
          }
          function save() {
            st.title = titleIn.value;
            if (!validateTitle(true)) { titleIn.focus(); return; }
            if (!D.parseDateKey(dateIn.value)) { ui.snack('Pick a valid date', { type: 'error' }); dateIn.focus(); return; }
            if (!st.allDay && !D.parseTime(timeIn.value)) { ui.snack('Pick a time or turn on All day', { type: 'error' }); timeIn.focus(); return; }
            if (st.recurrence !== 'none' && endIn.value && endIn.value < dateIn.value) { ui.snack('The end date must be on or after the event date', { type: 'error' }); endIn.focus(); return; }
            done = true;
            layer.close();
            resolve({
              title: titleIn.value.trim(), date: dateIn.value, time: st.allDay ? null : timeIn.value, notes: notesIn.value,
              category: st.category, recurrence: st.recurrence, recurrence_end: st.recurrence !== 'none' && endIn.value ? endIn.value : null,
            });
          }
          titleIn.addEventListener('input', function () { st.title = titleIn.value; validateTitle(false); });
          titleIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); save(); } });
          dateIn.addEventListener('change', function () { st.date = dateIn.value; endIn.min = dateIn.value; });
          timeIn.addEventListener('change', function () { st.time = timeIn.value; });
          endIn.addEventListener('change', function () { st.end = endIn.value; });
          notesIn.addEventListener('input', function () { st.notes = notesIn.value; notesCount.textContent = notesIn.value.length + '/300'; });
          notesCount.textContent = notesIn.value.length + '/300';
          validateTitle(false);
          drawCats(); drawRec();

          return [
            h('div.dialog-headrow', h('h2.dialog-title', existing ? 'Edit Event' : 'New Event'), App.iconBtn('close', 'Close', function () { layer.dismiss(); })),
            h('div.stack',
              titleField,
              h('div.grid-2',
                h('label.field', h('span.field-label', 'Date'), dateIn),
                h('div.field', h('span.field-label', 'Time'), h('div.row', timeIn, h('label.row.allday-toggle', allDaySw, h('span', 'All day'))))),
              h('div.field', h('span.field-label', 'Category'), catRow),
              h('div.field', h('span.field-label', 'Repeat'), recRow, endField),
              h('label.field', h('span.field-label', 'Notes (optional)'), notesIn, notesCount)),
            h('div.dialog-actions',
              existing ? App.btn('text', 'Delete', function () { done = true; layer.close(); resolve({ delete: true }); }, { icon: 'delete', cls: 'btn-danger' }) : null,
              h('span.grow'),
              App.btn('text', 'Cancel', function () { layer.dismiss(); }),
              App.btn('filled', existing ? 'Save' : 'Add Event', save, { icon: 'check' })),
          ];
        },
      });
    });
  }

  function confirmDelete(ev) {
    ui.confirm('Delete Event', 'Are you sure you want to delete "' + ev.title + '"?', 'Delete', { danger: true, icon: 'delete' }).then(function (ok) {
      if (!ok) return;
      S.remove('calendar_events', ev.id);
      ui.snack('Event deleted', { action: { label: 'Undo', onClick: function () { S.restore('calendar_events', ev); } } });
    });
  }
  function editEvent(ev) {
    editor(ev).then(function (r) {
      if (!r) return;
      if (r.delete) { confirmDelete(ev); return; }
      S.update('calendar_events', ev.id, r);
      ui.snack('Event updated', { type: 'success' });
    });
  }
  function newEvent(date) {
    editor(null, date).then(function (r) {
      if (!r || r.delete) return;
      S.insert('calendar_events', r);
      ui.snack('Event added', { type: 'success' });
    });
  }
  function eventMenu(ev, anchor) {
    ui.menu(anchor, [
      { header: ev.title },
      { label: 'Edit Event', icon: 'edit', onClick: function () { editEvent(ev); } },
      { label: 'Delete Event', icon: 'delete', danger: true, onClick: function () { confirmDelete(ev); } },
    ]);
  }

  // ---------------------------------------------------------------- view ---
  App.views.calendar = function (main) {
    var today = D.startOfDay(new Date());
    var selected = today, cursor = today, query = '', category = 'all';
    var mode = S.pref('calendar_view') || 'month';
    var headEl = h('header.view-head'), navEl = h('div.cal-nav'), bodyEl = h('div.view-body.cal-body');
    var searchInput;

    function filtered() {
      var q = query.toLowerCase();
      return S.all('calendar_events').filter(function (e) {
        if (category !== 'all' && (e.category || 'General') !== category) return false;
        if (q && (e.title || '').toLowerCase().indexOf(q) < 0 && (e.notes || '').toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
    }
    function eventsOn(list, day) { return list.filter(function (e) { return occursOn(e, day); }).sort(byTime); }
    function weekStartOf(d) {
      var monday = S.pref('week_starts_monday');
      var offset = monday ? (d.getDay() + 6) % 7 : d.getDay();
      return D.addDays(D.startOfDay(d), -offset);
    }
    function weekdayNames() {
      var names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return S.pref('week_starts_monday') ? names.slice(1).concat(names[0]) : names;
    }
    function select(d) { selected = D.startOfDay(d); cursor = selected; draw(); }

    function drawHead() {
      App.clear(headEl);
      if (!searchInput) {
        searchInput = h('input', { type: 'search', placeholder: 'Search events...', 'aria-label': 'Search events' });
        searchInput.addEventListener('input', App.debounce(function () { query = searchInput.value.trim(); drawNav(); drawBody(); }, 200));
        searchInput._wrap = h('label.search', icon('search'), searchInput);
      }
      var filterBtn = App.iconBtn('filter_list', 'Filter by category', function () {
        ui.menu(filterBtn, [{ label: 'All Categories', icon: 'calendar_month', checked: category === 'all', onClick: function () { category = 'all'; draw(); } }]
          .concat(CATS.map(function (c) { return { label: c, icon: CAT_ICON[c], color: catColor(c), checked: category === c, onClick: function () { category = c; draw(); } }; })));
      }, { pressed: category !== 'all' });
      headEl.append(
        h('h1.view-title', 'Calendar'),
        searchInput._wrap, filterBtn,
        ui.segmented([{ value: 'month', label: 'Month' }, { value: 'week', label: 'Week' }, { value: 'day', label: 'Day' }, { value: 'agenda', label: 'Agenda' }], mode, function (v) {
          mode = v; S.setPref('calendar_view', v);
        }, { label: 'Calendar view', noCheck: true, cls: 'cal-modes' }),
        App.btn('filled', 'New event', function () { newEvent(selected); }, { icon: 'add', cls: 'hide-phone' }));
    }

    function step(dir) {
      if (mode === 'day') select(D.addDays(selected, dir));
      else if (mode === 'week') select(D.addDays(selected, 7 * dir));
      else {
        var y = cursor.getFullYear(), m = cursor.getMonth() + dir;
        var d = Math.min(selected.getDate(), D.daysInMonth(new Date(y, m, 1).getFullYear(), new Date(y, m, 1).getMonth()));
        select(new Date(y, m, d));
      }
    }
    function drawNav() {
      App.clear(navEl);
      var title;
      if (mode === 'day') title = D.fmt(selected, 'EEEE, MMMM d, yyyy');
      else if (mode === 'week') {
        var ws = weekStartOf(selected), we = D.addDays(ws, 6);
        title = ws.getMonth() === we.getMonth() ? D.fmt(ws, 'MMM d') + ' – ' + D.fmt(we, 'd, yyyy') : D.fmt(ws, 'MMM d') + ' – ' + D.fmt(we, 'MMM d, yyyy');
      } else if (mode === 'agenda') title = 'All events';
      else title = D.fmt(cursor, 'MMMM yyyy');
      var label = mode === 'day' ? 'day' : mode === 'week' ? 'week' : 'month';
      navEl.append(
        mode !== 'agenda' ? App.iconBtn('chevron_left', 'Previous ' + label, function () { step(-1); }) : null,
        h('h2.cal-title', title),
        mode !== 'agenda' ? App.iconBtn('chevron_right', 'Next ' + label, function () { step(1); }) : null,
        h('span.grow'),
        App.btn('outlined', 'Today', function () { select(new Date()); }, { icon: 'today', disabled: D.sameDay(selected, today) && D.sameDay(cursor, today) }));
      if (query || category !== 'all') {
        var parts = [];
        if (query) parts.push('Search: "' + query + '"');
        if (category !== 'all') parts.push('Category: ' + category);
        navEl.appendChild(h('div.banner.cal-filter', icon(query ? 'search' : 'filter_list'), h('span.grow', parts.join(' · ')),
          App.btn('text', 'Clear filters', function () { query = ''; category = 'all'; searchInput.value = ''; draw(); })));
      }
    }

    function chip(ev, compact) {
      var col = catColor(ev.category || 'General');
      return h('button.ev-chip' + (compact ? '.compact' : ''), {
        type: 'button', title: (ev.time ? D.fmtTime(ev.time) + ' · ' : 'All day · ') + ev.title,
        style: { '--ec': col },
        onclick: function (e) { e.stopPropagation(); eventMenu(ev, e.currentTarget); },
      }, ev.time ? h('span.ev-time', D.fmtTime(ev.time).replace(':00', '').replace(' ', '').toLowerCase()) : null, h('span.ev-title', ev.title));
    }

    function eventCard(ev, day) {
      var col = catColor(ev.category || 'General');
      var more = App.iconBtn('more_vert', 'Event actions', function (e) { e.stopPropagation(); eventMenu(ev, more); }, { cls: 'sm' });
      return h('div.ev-card', { style: { '--ec': col }, tabindex: '0', onclick: function () { editEvent(ev); }, onkeydown: function (e) { if (e.key === 'Enter' && e.target === e.currentTarget) editEvent(ev); } },
        h('div.ev-when', ev.time ? D.fmtTime(ev.time) : 'All day'),
        h('div.grow',
          h('b', ev.title),
          h('div.ev-meta', icon(CAT_ICON[ev.category] || 'event_note', { fill: true }), h('span', ev.category || 'General'),
            recurLabel(ev) ? [h('span.sep', '·'), icon('repeat'), h('span', recurLabel(ev))] : null,
            day && !D.sameDay(D.parseDateKey(ev.date), day) ? [h('span.sep', '·'), h('span', 'Started ' + D.fmt(D.parseDateKey(ev.date), 'MMM d'))] : null),
          ev.notes ? h('p.ev-notes', ev.notes) : null),
        more);
    }

    function dayPanel(list, day) {
      var evs = eventsOn(list, day);
      return h('aside.card.day-panel',
        h('div.day-panel-head', h('div', h('small.muted', D.sameDay(day, today) ? 'Today' : D.fmt(day, 'EEEE')), h('h2', D.fmt(day, 'MMMM d'))),
          App.iconBtn('add', 'Add event on ' + D.fmt(day, 'MMM d'), function () { newEvent(day); }, { cls: 'tonal' })),
        evs.length ? h('div.ev-list', evs.map(function (ev) { return eventCard(ev, day); }))
          : h('div.empty.small-empty', h('div.empty-icon', icon('event_note', { fill: true })), h('h3', 'No events planned'),
            h('p', 'Tap below to add an event for ' + D.fmt(day, 'MMM d')), App.btn('tonal', 'Add Event', function () { newEvent(day); }, { icon: 'add' })));
    }

    function monthView(list) {
      var y = cursor.getFullYear(), m = cursor.getMonth();
      var first = new Date(y, m, 1);
      var start = weekStartOf(first);
      var grid = h('div.month-grid', { role: 'grid', 'aria-label': D.fmt(cursor, 'MMMM yyyy') });
      weekdayNames().forEach(function (n) { grid.appendChild(h('div.mg-wd', n)); });
      var weeks = Math.ceil((D.dayDiff(start, first) + D.daysInMonth(y, m)) / 7);
      for (var i = 0; i < weeks * 7; i++) {
        (function (d) {
          var evs = eventsOn(list, d);
          var outside = d.getMonth() !== m;
          var cell = h('div.mg-cell' + (outside ? '.outside' : '') + (D.sameDay(d, today) ? '.today' : '') + (D.sameDay(d, selected) ? '.selected' : ''), {
            role: 'gridcell', tabindex: D.sameDay(d, selected) ? '0' : '-1', 'aria-label': D.fmt(d, 'EEEE, MMMM d') + (evs.length ? ', ' + App.plural(evs.length, 'event') : ''),
            onclick: function () { select(d); },
            ondblclick: function () { newEvent(d); },
            onkeydown: function (e) {
              var map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
              if (map[e.key]) { e.preventDefault(); select(D.addDays(d, map[e.key])); focusSelected(); }
              else if (e.key === 'Enter') newEvent(d);
            },
          }, h('span.mg-num', String(d.getDate())));
          var maxShow = 3;
          evs.slice(0, maxShow).forEach(function (ev) { cell.appendChild(chip(ev, true)); });
          if (evs.length > maxShow) cell.appendChild(h('span.mg-more', '+' + (evs.length - maxShow) + ' more'));
          if (evs.length) cell.appendChild(h('span.mg-dots', evs.slice(0, 4).map(function (ev) { return h('i', { style: { background: catColor(ev.category) } }); })));
          grid.appendChild(cell);
        })(D.addDays(start, i));
      }
      return h('div.cal-split', h('div.card.month-card', grid, h('p.hint', 'Click a day to see its events · double-click to add one · arrow keys move')), dayPanel(list, selected));
    }
    function focusSelected() { setTimeout(function () { var c = bodyEl.querySelector('.mg-cell.selected'); if (c) c.focus(); }, 0); }

    function weekView(list) {
      var ws = weekStartOf(selected);
      var cols = h('div.week-cols');
      for (var i = 0; i < 7; i++) {
        (function (d) {
          var evs = eventsOn(list, d);
          cols.appendChild(h('div.wk-col' + (D.sameDay(d, selected) ? '.selected' : '') + (D.sameDay(d, today) ? '.today' : ''),
            h('button.wk-head', { type: 'button', onclick: function () { select(d); } }, h('small', D.fmt(d, 'EEE')), h('b', D.fmt(d, 'd'))),
            h('div.wk-events', evs.map(function (ev) { return chip(ev, false); }),
              h('button.wk-add', { type: 'button', title: 'Add event on ' + D.fmt(d, 'MMM d'), 'aria-label': 'Add event on ' + D.fmt(d, 'MMM d'), onclick: function () { newEvent(d); } }, icon('add')))));
        })(D.addDays(ws, i));
      }
      return h('div.cal-split', h('div.card.week-card', cols), dayPanel(list, selected));
    }

    function dayView(list) {
      var evs = eventsOn(list, selected);
      var allDay = evs.filter(function (e) { return !e.time; });
      var timed = evs.filter(function (e) { return e.time; });
      var nowH = new Date().getHours();
      var tl = h('div.timeline');
      for (var hr = 0; hr < 24; hr++) {
        (function (hour) {
          var inHour = timed.filter(function (e) { return D.parseTime(e.time)[0] === hour; });
          tl.appendChild(h('div.tl-row' + (D.sameDay(selected, today) && hour === nowH ? '.now' : ''), { dataset: { hour: String(hour) } },
            h('span.tl-hour', D.fmt(new Date(2000, 0, 1, hour), 'h a')),
            h('div.tl-slot', { ondblclick: function () { newEvent(selected); } }, inHour.map(function (ev) { return eventCard(ev, selected); }))));
        })(hr);
      }
      var wrap = h('div.card.day-card',
        allDay.length ? h('div.allday', h('span.tl-hour', 'All day'), h('div.ev-list', allDay.map(function (ev) { return eventCard(ev, selected); }))) : null,
        evs.length ? null : h('div.banner', icon('event_note'), h('span.grow', 'No events planned for ' + D.fmt(selected, 'MMM d')), App.btn('text', 'Add Event', function () { newEvent(selected); })),
        tl);
      setTimeout(function () {
        var target = tl.querySelector('[data-hour="' + Math.max(0, (timed.length ? D.parseTime(timed[0].time)[0] : nowH) - 1) + '"]');
        if (target) target.scrollIntoView({ block: 'start' });
        main.scrollTop = 0;
      }, 0);
      return wrap;
    }

    function agendaView(list) {
      var sorted = list.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : byTime(a, b); });
      if (!sorted.length) {
        return ui.emptyState('calendar_month', query || category !== 'all' ? 'No matching events' : 'No events yet',
          query || category !== 'all' ? 'Try a different search or clear the filters.' : 'Add your first event to see it here.',
          App.btn('filled', 'New event', function () { newEvent(selected); }, { icon: 'add' }));
      }
      var out = h('div.agenda');
      var lastDate = null;
      var upcomingMarked = false;
      sorted.forEach(function (ev) {
        if (ev.date !== lastDate) {
          lastDate = ev.date;
          var d = D.parseDateKey(ev.date);
          var isFuture = d >= today;
          var head = h('div.agenda-date' + (D.sameDay(d, today) ? '.today' : '') + (d < today ? '.past' : ''),
            h('b', D.fmt(d, 'd')), h('div', h('span', D.fmt(d, 'EEEE')), h('small', D.fmt(d, 'MMMM yyyy'))));
          if (isFuture && !upcomingMarked) { head.id = 'agenda-upcoming'; upcomingMarked = true; }
          out.appendChild(head);
        }
        out.appendChild(eventCard(ev, null));
      });
      setTimeout(function () { var u = document.getElementById('agenda-upcoming'); if (u && main.scrollTop === 0) u.scrollIntoView({ block: 'start' }); }, 0);
      return out;
    }

    function drawBody() {
      App.clear(bodyEl);
      var list = filtered();
      var v = mode === 'week' ? weekView(list) : mode === 'day' ? dayView(list) : mode === 'agenda' ? agendaView(list) : monthView(list);
      bodyEl.appendChild(v);
    }
    function draw() { drawHead(); drawNav(); drawBody(); }

    var view = h('section.view.calendar-view', headEl, h('div.cal-nav-wrap', navEl), bodyEl,
      h('button.fab.show-phone', { type: 'button', onclick: function () { newEvent(selected); }, 'aria-label': 'New event' }, icon('add'), 'New'));
    main.appendChild(view);
    draw();
    return {
      onData: function (tables) {
        if (tables.indexOf('prefs') >= 0) mode = S.pref('calendar_view') || mode;
        draw();
      },
    };
  };
})();
