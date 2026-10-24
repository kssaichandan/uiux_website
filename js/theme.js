// Applies the Material 3 colour scheme (from the accent colour) and the
// light / dark / system mode as CSS custom properties on <html>.
(function () {
  'use strict';
  var App = window.App;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function kebab(k) { return k.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }); }

  function isDark() {
    var mode = App.store.pref('theme_mode');
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return !!(mq && mq.matches);
  }

  function apply() {
    var dark = isDark();
    var seed = App.color.argbToHex(App.store.pref('color_seed'));
    var scheme = window.M3.buildScheme(seed, dark);
    var root = document.documentElement;
    Object.keys(scheme).forEach(function (k) { root.style.setProperty('--md-' + kebab(k), scheme[k]); });
    root.dataset.theme = dark ? 'dark' : 'light';
    root.style.colorScheme = dark ? 'dark' : 'light';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', scheme.surface);
    App.theme.scheme = scheme;
    App.theme.dark = dark;
  }

  App.theme = { apply: apply, isDark: isDark, scheme: null, dark: false };
  if (mq) {
    var onChange = function () { if (App.store.pref('theme_mode') === 'system') { apply(); App.emitThemeChange && App.emitThemeChange(); } };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }
})();
