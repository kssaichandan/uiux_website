// First-run tour, same six pages as the phone app.
(function () {
  'use strict';
  var App = window.App, h = App.h, icon = App.icon;
  var PAGES = [
    { icon: 'rocket_launch', title: 'Welcome to Your Hub', text: 'One place to organize your thoughts, build better habits, and stay on top of your life. Let us show you how it works.' },
    { icon: 'note_alt', title: 'Never Lose a Great Idea', text: 'Capture thoughts instantly with rich text notes. Organize with colors and tags, and keep your favorites pinned at the top.' },
    { icon: 'checklist_rtl', title: 'Build Habits That Stick', text: 'Track daily habits with streaks and reminders. Watch your progress grow with visual weekly and monthly insights.' },
    { icon: 'calendar_month', title: 'Stay On Top of Your Schedule', text: 'See events, habits, and notes in one unified calendar. Set reminders so nothing slips through the cracks.' },
    { icon: 'calculate', title: 'Calculate On the Go', text: 'Quick calculations with history and memory functions. Switch to scientific mode when you need more power.' },
    { icon: 'hourglass_empty', title: 'See Your Life in Perspective', text: 'Track days lived and set life milestones. A gentle reminder to make each day count.' },
  ];

  function show() {
    var page = 0;
    App.ui.openLayer('dialog', {
      cls: 'onboarding', label: 'Welcome tour', dismissible: false,
      build: function (layer) {
        var body = h('div.ob-body');
        function finish() { App.store.setPref('onboarding_complete_v1', true); layer.close(); }
        function draw() {
          var p = PAGES[page], last = page === PAGES.length - 1;
          App.clear(body).append(
            h('div.ob-top', h('span.muted', (page + 1) + ' of ' + PAGES.length),
              last ? h('span') : App.btn('text', 'Skip', finish)),
            h('div.ob-art', h('div.ob-circle', icon(p.icon, { fill: true }))),
            h('h2.ob-title', p.title),
            h('p.ob-text', p.text),
            h('div.ob-dots', PAGES.map(function (_, i) {
              return h('button.ob-dot' + (i === page ? '.active' : ''), { type: 'button', 'aria-label': 'Page ' + (i + 1) + ' of ' + PAGES.length, onclick: function () { page = i; draw(); } });
            })),
            h('div.ob-actions',
              page > 0 ? App.btn('text', 'Back', function () { page--; draw(); }) : h('span'),
              App.btn('filled', last ? 'Get Started' : 'Next', function () { if (last) finish(); else { page++; draw(); } }, { cls: 'btn-lg', icon: last ? 'check' : 'chevron_right' })));
          var primary = body.querySelector('.ob-actions .btn-filled');
          if (primary) primary.focus();
        }
        body.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowRight' && page < PAGES.length - 1) { page++; draw(); }
          else if (e.key === 'ArrowLeft' && page > 0) { page--; draw(); }
        });
        draw();
        return body;
      },
    });
  }
  App.onboarding = { show: show };
})();
