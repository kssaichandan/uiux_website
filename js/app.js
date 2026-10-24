// App shell: navigation, routing (#/notes, #/habits/…), theme, start-up.
(function () {
  'use strict';
  var App = window.App, h = App.h, icon = App.icon;

  var ROUTES = [
    { id: 'notes', label: 'Notes', icon: 'description' },
    { id: 'habits', label: 'Habits', icon: 'check_circle' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar_month' },
    { id: 'calculator', label: 'Calculator', short: 'Calc', icon: 'calculate' },
    { id: 'life', label: 'Life', icon: 'hourglass' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  var current = null; // {id, view instance}
  var navEl = document.getElementById('nav');
  var mainEl = document.getElementById('main');

  function parseHash() {
    var parts = (location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
    var id = parts[0];
    if (!ROUTES.some(function (r) { return r.id === id; })) id = 'notes';
    return { id: id, params: parts.slice(1).map(decodeURIComponent) };
  }

  function renderNav(activeId) {
    App.clear(navEl);
    navEl.appendChild(h('div.nav-brand',
      h('img', { src: 'icons/icon-192.png', alt: '' }),
      h('div', h('b', 'Personal App'), h('small', 'Your offline hub'))));
    ROUTES.forEach(function (r, i) {
      var active = r.id === activeId;
      navEl.appendChild(h('a.nav-item' + (active ? '.active' : ''), {
        href: '#/' + r.id, 'aria-current': active ? 'page' : null, title: r.label + ' (Alt+' + (i + 1) + ')',
      }, h('span.nav-icon-wrap', icon(r.icon, { fill: active })), h('span.nav-label', window.innerWidth < 700 && r.short ? r.short : r.label), h('kbd', 'Alt ' + (i + 1))));
    });
    navEl.appendChild(h('div.nav-spacer'));
    navEl.appendChild(h('div.nav-foot', icon('lock'), h('span', 'Offline · data stays on this device')));
  }

  function route() {
    var r = parseHash();
    if (current && current.id === r.id && current.view.update) {
      current.view.update(r.params);
      return;
    }
    if (current && current.view.unmount) current.view.unmount();
    App.clear(mainEl);
    renderNav(r.id);
    var factory = App.views[r.id];
    current = { id: r.id, view: factory(mainEl, r.params) || {} };
    var label = ROUTES.find(function (x) { return x.id === r.id; }).label;
    document.title = label + ' · Personal App';
    mainEl.scrollTop = 0;
  }

  // Redraw the visible screen when data changes (also from other tabs).
  App.store.on(function (tables) {
    if (tables.indexOf('prefs') >= 0) App.theme.apply();
    if (current && current.view.onData) current.view.onData(tables);
  });
  App.emitThemeChange = function () { if (current && current.view.onData) current.view.onData(['theme']); };

  window.addEventListener('hashchange', route);
  window.addEventListener('resize', App.debounce(function () { renderNav(current ? current.id : 'notes'); }, 150));

  document.addEventListener('keydown', function (e) {
    if (App.ui.hasOpenLayer()) return;
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key >= '1' && e.key <= '6') {
      e.preventDefault();
      location.hash = '#/' + ROUTES[+e.key - 1].id;
      return;
    }
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    var typing = /INPUT|TEXTAREA|SELECT/.test(tag) || (document.activeElement && document.activeElement.isContentEditable);
    if (e.key === '/' && !typing) {
      var s = mainEl.querySelector('.search input');
      if (s) { e.preventDefault(); s.focus(); }
    }
  });

  // ------------------------------------------------------------ start ---
  App.views = App.views || {};
  App.theme.apply();
  if (!App.store.storageOk()) {
    setTimeout(function () {
      App.ui.snack('This browser is blocking local storage, so changes will be lost when you close the tab.', { type: 'error', duration: 10000 });
    }, 600);
  }
  route();
  App.notify.start();
  if (!App.store.pref('onboarding_complete_v1') && App.onboarding) App.onboarding.show();

  // Offline cache + install support need http(s); opening index.html from
  // the file system already works offline without them.
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('Offline cache not available', e); });
    });
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    App.installPrompt = e;
    if (current && current.id === 'settings' && current.view.onData) current.view.onData(['install']);
  });
})();
