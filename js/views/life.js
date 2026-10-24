// Life Journey: time lived, life progress meter, expected remaining time,
// live metrics (days → seconds) and upcoming milestones.
(function () {
  'use strict';
  var App = window.App, h = App.h, icon = App.icon, S = App.store, D = App.date, ui = App.ui;

  function nf(n) { return Math.floor(n).toLocaleString('en-US'); }
  function compact(v) {
    if (v >= 1e9) { var b = v / 1e9; return b.toFixed(b >= 10 ? 0 : 1) + 'B'; }
    if (v >= 1e6) { var m = v / 1e6; return m.toFixed(m >= 10 ? 0 : 1) + 'M'; }
    if (v >= 1e5) { var k = v / 1e3; return k.toFixed(k >= 10 ? 0 : 1) + 'K'; }
    return nf(v);
  }
  function expectancy() {
    var v = parseInt(S.setting('life_expectancy'), 10);
    return v >= 1 && v <= 120 ? v : 80;
  }
  function dob() {
    var v = S.setting('dob');
    if (!v) return null;
    var d = D.parseDateKey(v) || D.parseIso(v);
    return d ? D.startOfDay(d) : null;
  }
  // Calendar difference in years / months / days (borrowing like the phone).
  function ymd(from, to) {
    var y = to.getFullYear() - from.getFullYear(), m = to.getMonth() - from.getMonth(), d = to.getDate() - from.getDate();
    if (d < 0) { m--; d += new Date(to.getFullYear(), to.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    return { y: y, m: m, d: d };
  }

  function pickDob(current) {
    var input = h('input', { type: 'date', value: current ? D.dateKey(current) : '', min: '1900-01-01', max: D.dateKey(new Date()), autofocus: true });
    var err = h('div.field-error');
    return ui.dialog({
      icon: 'cake', title: current ? 'Change date of birth' : 'Set Date of Birth',
      content: h('div.stack', ui.field('Date of birth', input), err),
      actions: [{ label: 'Cancel', value: undefined }, {
        label: 'Save', kind: 'filled',
        validate: function () {
          var d = D.parseDateKey(input.value);
          if (!d) { err.textContent = 'Pick a date'; return false; }
          if (d > new Date()) { err.textContent = 'Date of birth cannot be in the future'; return false; }
          if (d.getFullYear() < 1900) { err.textContent = 'Pick a date after 1900'; return false; }
          return true;
        },
        value: function () { return input.value; },
      }],
    }).then(function (v) {
      if (!v) return;
      S.setSetting('dob', v);
      ui.snack('Date of birth saved', { type: 'success' });
    });
  }
  function pickExpectancy() {
    var input = h('input', { type: 'number', min: '1', max: '120', value: String(expectancy()), autofocus: true });
    var range = h('input.range', { type: 'range', min: '1', max: '120', value: String(expectancy()), 'aria-label': 'Life expectancy' });
    var err = h('div.field-error');
    range.addEventListener('input', function () { input.value = range.value; });
    input.addEventListener('input', function () { range.value = input.value; });
    return ui.dialog({
      icon: 'timer', title: 'Life Expectancy',
      body: 'How many years do you expect to live? This only changes the progress meter.',
      content: h('div.stack', ui.field('Years (1–120)', input), range, err),
      actions: [{ label: 'Cancel', value: undefined }, {
        label: 'Save', kind: 'filled',
        validate: function () {
          var n = parseInt(input.value, 10);
          if (!(n >= 1 && n <= 120)) { err.textContent = 'Enter a number from 1 to 120'; return false; }
          return true;
        },
        value: function () { return parseInt(input.value, 10); },
      }],
    }).then(function (n) {
      if (!n) return;
      S.setSetting('life_expectancy', String(n));
      ui.snack('Life expectancy updated to ' + n + ' years', { type: 'success' });
    });
  }
  function confirmReset() {
    return ui.confirm('Reset Life Tracker', 'This will remove your date of birth and all life metrics. Are you sure?', 'Reset', { danger: true, icon: 'replay' }).then(function (ok) {
      if (!ok) return false;
      S.setSetting('dob', null);
      ui.snack('Date of birth reset');
      return true;
    });
  }
  App.life = { pickDob: pickDob, pickExpectancy: pickExpectancy, confirmReset: confirmReset, expectancy: expectancy, dob: dob };

  App.views.life = function (main) {
    var timer = null, live = {};
    var root = h('section.view.life-view');
    main.appendChild(root);

    function draw() {
      clearInterval(timer);
      App.clear(root);
      live = {};
      var birth = dob();
      var head = h('header.view-head', h('h1.view-title', 'Life Journey'),
        birth ? [
          App.btn('outlined', expectancy() + ' yrs', pickExpectancy, { icon: 'timer', title: 'Life expectancy' }),
          App.iconBtn('edit', 'Change date of birth', function () { pickDob(birth); }),
          App.iconBtn('replay', 'Reset date of birth', confirmReset),
        ] : null);
      root.appendChild(head);
      var body = h('div.view-body');
      root.appendChild(body);
      if (!birth) {
        body.appendChild(h('div.empty.life-empty',
          h('div.empty-icon', icon('hourglass', { fill: true })),
          h('h3', 'How many days have you been alive?'),
          h('p', 'Enter your date of birth to see your live life progress, time elapsed, and remaining years.'),
          App.btn('filled', 'Enter Date of Birth', function () { pickDob(null); }, { icon: 'cake', cls: 'btn-lg' })));
        return;
      }

      var years = expectancy();
      live.elapsed = h('div.big-ymd');
      live.elapsedText = h('p.muted.center');
      live.pct = h('span.pct-val');
      live.bar = h('span');
      live.pctText = h('p.muted');
      live.remaining = h('div.big-ymd');
      live.ticker = h('div.ticker');
      live.metrics = {};
      var metricDefs = [['days', 'Total Days', 'today'], ['weeks', 'Total Weeks', 'date_range'], ['hours', 'Total Hours', 'schedule'], ['minutes', 'Total Minutes', 'timer'], ['seconds', 'Total Seconds', 'bolt']];
      var metricsGrid = h('div.metrics', metricDefs.map(function (m) {
        live.metrics[m[0]] = h('b.metric-val');
        return h('div.metric', h('span.metric-ic', icon(m[2], { fill: true })), h('small.muted', m[1]), live.metrics[m[0]]);
      }));
      live.milestones = h('div.milestones');

      body.appendChild(h('div.life-grid',
        h('div.card.life-hero',
          h('div.life-label', h('span', 'TIME ELAPSED SINCE BIRTH'), h('span.live-badge', h('i'), 'LIVE')),
          live.elapsed,
          h('p.muted.center', 'Born on ' + D.fmt(birth, 'MMMM d, yyyy'))),
        h('div.card.life-meter',
          h('div.row', h('h2.grow', 'Life Progress Meter'), live.pct),
          h('div.progress.big', live.bar),
          h('div.legend', h('span', 'Early years'), h('span', 'Past halfway'), h('span', 'Final stretch')),
          h('button.chip.expect-chip', { type: 'button', onclick: pickExpectancy }, icon('timer'), h('span', 'Based on a life expectancy of ' + years + ' years — tap to adjust')),
          live.pctText),
        h('div.card.life-remaining',
          h('div.life-label', h('span', 'EXPECTED REMAINING TIME')),
          live.remaining, live.ticker),
        h('div.card.life-milestones', h('div.card-title', icon('flag', { fill: true }), 'Upcoming Milestones'), live.milestones),
        h('div.card.life-metrics', h('h2.section-title', 'Real-time life metrics'), metricsGrid)));

      tick(true);
      timer = setInterval(tick, 1000);
    }

    function ymdNodes(v, suffix) {
      return [h('b', String(v.y)), h('span', ' yrs '), h('b', String(v.m)), h('span', ' mos '), h('b', String(v.d)), h('span', ' days')];
    }

    var lastDay = null;
    function tick(force) {
      var birth = dob();
      if (!birth || !live.elapsed) return;
      var now = new Date(), today = D.startOfDay(now), years = expectancy();
      var dayChanged = lastDay === null || !D.sameDay(lastDay, today);
      var ms = now - birth;
      var totalDays = Math.floor(ms / 86400000);
      if (force || dayChanged) {
        lastDay = today;
        var el = ymd(birth, now);
        App.clear(live.elapsed).append.apply(live.elapsed, ymdNodes(el));
        live.elapsed.setAttribute('aria-label', el.y + ' years, ' + el.m + ' months, ' + el.d + ' days elapsed since birth');
        var pct = totalDays / (years * 365.25) * 100;
        var pctStr = pct.toFixed(2);
        live.pct.textContent = pctStr + '%';
        var col = pct < 50 ? 'var(--md-primary)' : pct < 80 ? (App.theme.dark ? '#FFD54F' : '#B26A00') : 'var(--md-secondary)';
        live.pct.style.color = col;
        live.bar.style.width = Math.min(100, pct) + '%';
        live.bar.style.background = col;
        live.pctText.textContent = 'You have lived ' + pctStr + '% of your expected life.';
        var death = new Date(birth.getFullYear() + years, birth.getMonth(), birth.getDate());
        var rem = death > now ? ymd(now, death) : { y: 0, m: 0, d: 0 };
        App.clear(live.remaining).append.apply(live.remaining, ymdNodes(rem));
        live.remaining.setAttribute('aria-label', rem.y + ' years, ' + rem.m + ' months, ' + rem.d + ' days remaining');
        drawMilestones(birth, today, totalDays);
      }
      var midnight = D.addDays(today, 1);
      var left = Math.max(0, Math.floor((midnight - now) / 1000));
      live.ticker.textContent = 'Time left today: ' + Math.floor(left / 3600) + 'h ' + Math.floor(left / 60) % 60 + 'm ' + left % 60 + 's';
      var narrow = window.innerWidth < 700;
      var secs = Math.floor(ms / 1000);
      live.metrics.days.textContent = nf(totalDays);
      live.metrics.weeks.textContent = nf(Math.round(totalDays / 7));
      live.metrics.hours.textContent = narrow ? compact(Math.floor(ms / 3600000)) : nf(ms / 3600000);
      live.metrics.minutes.textContent = narrow ? compact(Math.floor(ms / 60000)) : nf(ms / 60000);
      live.metrics.seconds.textContent = narrow ? compact(secs) : nf(secs);
    }

    function drawMilestones(birth, today, daysLived) {
      var next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
      if (next < today) next = new Date(today.getFullYear() + 1, birth.getMonth(), birth.getDate());
      var daysTo = D.dayDiff(today, next);
      var turning = next.getFullYear() - birth.getFullYear();
      var nextMilestone = (Math.floor(daysLived / 1000) + 1) * 1000;
      var toMilestone = nextMilestone - daysLived;
      var msDate = D.addDays(birth, nextMilestone);
      App.clear(live.milestones).append(
        h('div.milestone',
          h('span.ms-ic', icon('cake', { fill: true })),
          h('div.grow', h('b', daysTo === 0 ? 'Happy Birthday! 🎉' : 'Turning ' + turning), h('small.muted', daysTo === 0 ? 'You turned ' + turning + ' today' : App.plural(daysTo, 'day') + ' away (' + D.fmt(next, 'MMM d') + ')')),
          h('span.ms-count', daysTo + ' d')),
        h('div.milestone',
          h('span.ms-ic', icon('trophy', { fill: true })),
          h('div.grow', h('b', 'Day ' + nf(nextMilestone) + ' of Life'), h('small.muted', 'In ' + App.plural(toMilestone, 'day') + ' on ' + D.fmt(msDate, 'MMM d, yyyy'))),
          h('span.ms-count', toMilestone + ' d')));
    }

    draw();
    return {
      onData: function (tables) { if (tables.indexOf('settings') >= 0 || tables.indexOf('prefs') >= 0 || tables.indexOf('theme') >= 0) { lastDay = null; draw(); } },
      unmount: function () { clearInterval(timer); },
    };
  };
})();
