// Shared helpers: DOM building, icons, dates, formatting, and the small UI
// primitives (snackbar, dialogs, menus, side panels) every screen uses.
// Plain browser JavaScript so the site runs straight from the file system.
(function () {
  'use strict';
  var App = (window.App = window.App || {});

  // ---------------------------------------------------------------- DOM ---

  // h('div.card', {onclick: fn, title: 'x'}, child, 'text', [more])
  function h(tag, attrs) {
    var parts = String(tag).split('.');
    var el = document.createElement(parts[0] || 'div');
    for (var i = 1; i < parts.length; i++) if (parts[i]) el.classList.add(parts[i]);
    var start = 2;
    if (attrs == null || typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs)) {
      start = 1;
      attrs = null;
    }
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') String(v).split(/\s+/).forEach(function (c) { if (c) el.classList.add(c); });
        else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (s) {
          if (s.indexOf('--') === 0) el.style.setProperty(s, v[s]); else el.style[s] = v[s];
        });
        else if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'dataset') Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
        else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected' || k === 'innerHTML') el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    for (var j = start; j < arguments.length; j++) append(el, arguments[j]);
    return el;
  }
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  var SVGNS = 'http://www.w3.org/2000/svg';
  // icon('star', {fill: true, size: 20})
  function icon(name, opts) {
    opts = opts || {};
    var key = opts.fill && window.ICONS[name + '-fill'] ? name + '-fill' : name;
    var d = window.ICONS[key] || window.ICONS['circle'];
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 -960 960 960');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'ic' + (opts.cls ? ' ' + opts.cls : ''));
    if (opts.size) { svg.style.width = opts.size + 'px'; svg.style.height = opts.size + 'px'; }
    if (opts.color) svg.style.fill = opts.color;
    var p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', d);
    svg.appendChild(p);
    return svg;
  }
  function habitIcon(key, opts) {
    var d = window.ICONS['habit/' + key] || window.ICONS['habit/star'];
    var svg = icon('circle', opts);
    svg.firstChild.setAttribute('d', d);
    return svg;
  }

  // Button helpers
  function btn(kind, label, onclick, opts) {
    opts = opts || {};
    return h('button.btn.btn-' + kind, {
      type: 'button', onclick: onclick, disabled: opts.disabled, title: opts.title,
      class: opts.cls, 'aria-label': opts.aria,
    }, opts.icon ? icon(opts.icon, { fill: opts.fill }) : null, label ? h('span', label) : null);
  }
  function iconBtn(name, title, onclick, opts) {
    opts = opts || {};
    return h('button.icon-btn', {
      type: 'button', title: title, 'aria-label': title, onclick: onclick,
      class: opts.cls, disabled: opts.disabled, 'aria-pressed': opts.pressed == null ? null : String(!!opts.pressed),
    }, icon(name, { fill: opts.fill, color: opts.color }));
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  // -------------------------------------------------------------- dates ---

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }

  // Same text the phone app's Dart DateTime.toIso8601String() writes for a
  // local time: 2026-10-16T14:05:09.123 (no zone suffix).
  function isoLocal(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' +
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + '.' + pad(d.getMilliseconds(), 3);
  }
  // Tolerant parser for the phone's timestamps (microseconds, optional zone).
  var ISO_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d+))?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i;
  function parseIso(s) {
    if (s instanceof Date) return s;
    if (s == null || s === '') return null;
    var m = ISO_RE.exec(String(s).trim());
    if (!m) return null;
    var y = +m[1], mo = +m[2] - 1, da = +m[3], hh = +(m[4] || 0), mi = +(m[5] || 0), ss = +(m[6] || 0);
    var ms = m[7] ? Math.floor(+('0.' + m[7]) * 1000) : 0;
    if (mo < 0 || mo > 11 || da < 1 || da > 31 || hh > 23 || mi > 59 || ss > 59) return null;
    var d;
    if (m[8]) {
      var off = 0;
      if (m[8].toUpperCase() !== 'Z') {
        var sign = m[8][0] === '-' ? -1 : 1;
        var digits = m[8].slice(1).replace(':', '');
        off = sign * (+digits.slice(0, 2) * 60 + +(digits.slice(2, 4) || 0));
      }
      d = new Date(Date.UTC(y, mo, da, hh, mi, ss, ms) - off * 60000);
    } else {
      d = new Date(y, mo, da, hh, mi, ss, ms);
    }
    return isNaN(d.getTime()) ? null : d;
  }
  function dateKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseDateKey(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
  }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes()); }
  function sameDay(a, b) { return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  // Whole calendar days from a to b (DST safe).
  function dayDiff(a, b) {
    return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
  }
  function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

  // Minimal intl.DateFormat-style formatter (English, like the phone app).
  function fmt(d, pattern) {
    if (!d) return '';
    return pattern.replace(/yyyy|y|MMMM|MMM|MM|M|dd|d|EEEE|EEE|E|HH|H|hh|h|mm|ss|a|'[^']*'/g, function (t) {
      switch (t) {
        case 'yyyy': return pad(d.getFullYear(), 4);
        case 'y': return String(d.getFullYear());
        case 'MMMM': return MONTHS[d.getMonth()];
        case 'MMM': return MONTHS[d.getMonth()].slice(0, 3);
        case 'MM': return pad(d.getMonth() + 1);
        case 'M': return String(d.getMonth() + 1);
        case 'dd': return pad(d.getDate());
        case 'd': return String(d.getDate());
        case 'EEEE': return DAYS[d.getDay()];
        case 'EEE': return DAYS[d.getDay()].slice(0, 3);
        case 'E': return DAYS[d.getDay()].slice(0, 1);
        case 'HH': return pad(d.getHours());
        case 'H': return String(d.getHours());
        case 'hh': return pad(d.getHours() % 12 || 12);
        case 'h': return String(d.getHours() % 12 || 12);
        case 'mm': return pad(d.getMinutes());
        case 'ss': return pad(d.getSeconds());
        case 'a': return d.getHours() < 12 ? 'AM' : 'PM';
        default: return t.slice(1, -1);
      }
    });
  }
  // "HH:mm" -> "h:mm AM"
  function fmtTime(hhmm) {
    var p = parseTime(hhmm);
    if (!p) return '';
    return fmt(new Date(2000, 0, 1, p[0], p[1]), 'h:mm a');
  }
  function parseTime(v) {
    if (v == null) return null;
    var parts = String(v).split(':');
    if (parts.length !== 2) return null;
    var hh = parseInt(parts[0], 10), mm = parseInt(parts[1], 10);
    if (isNaN(hh) || isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return [hh, mm];
  }

  // ---------------------------------------------------------- numbers ---
  function argbToHex(argb) {
    var n = Number(argb) >>> 0;
    return '#' + (n & 0xffffff).toString(16).padStart(6, '0').toUpperCase();
  }
  function hexToArgb(hex) {
    var s = String(hex).replace('#', '');
    if (s.length === 3) s = s.split('').map(function (c) { return c + c; }).join('');
    return (0xff000000 + parseInt(s.slice(0, 6), 16)) >>> 0;
  }
  function rgba(argbOrHex, alpha) {
    var hex = typeof argbOrHex === 'number' ? argbToHex(argbOrHex) : argbOrHex;
    var n = parseInt(hex.replace('#', ''), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }
  // Relative luminance check used to choose readable text on a colour.
  function isLight(hex) {
    var n = parseInt(hex.replace('#', ''), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
  }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  // ------------------------------------------------------------ snackbar ---
  var snackHost, snackTimer;
  function snack(message, opts) {
    opts = opts || {};
    if (!snackHost) snackHost = document.getElementById('snackbar-host');
    clear(snackHost);
    clearTimeout(snackTimer);
    var bar = h('div.snackbar' + (opts.type ? '.snack-' + opts.type : ''), { role: 'status' },
      opts.type === 'error' ? icon('error', { fill: true }) : opts.type === 'success' ? icon('check_circle', { fill: true }) : null,
      h('span.snack-text', message));
    if (opts.action) {
      bar.appendChild(h('button.snack-action', {
        type: 'button', onclick: function () { hide(); opts.action.onClick(); },
      }, opts.action.label));
    }
    bar.appendChild(h('button.snack-close', { type: 'button', 'aria-label': 'Dismiss', onclick: hide }, icon('close')));
    snackHost.appendChild(bar);
    requestAnimationFrame(function () { bar.classList.add('show'); });
    function hide() {
      clearTimeout(snackTimer);
      bar.classList.remove('show');
      setTimeout(function () { if (bar.parentNode) bar.parentNode.removeChild(bar); }, 200);
    }
    snackTimer = setTimeout(hide, opts.duration || (opts.action ? 5000 : 3000));
    return hide;
  }

  // ------------------------------------------------------------- dialogs ---
  var layerStack = [];
  function topLayer() { return layerStack[layerStack.length - 1]; }
  document.addEventListener('keydown', function (e) {
    var top = topLayer();
    if (!top) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); top.dismiss(); }
    else if (e.key === 'Tab') trapFocus(top.el, e);
  }, true);
  function focusables(root) {
    return Array.prototype.filter.call(root.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]'), function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
  }
  function trapFocus(root, e) {
    var f = focusables(root);
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!root.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  }

  // Generic layer: {className, build(close) -> content, onDismiss, dismissible}
  function openLayer(kind, opts) {
    var prevFocus = document.activeElement;
    var scrim = h('div.scrim.scrim-' + kind);
    var box = h('div.' + kind, { role: 'dialog', 'aria-modal': 'true', class: opts.cls });
    if (opts.label) box.setAttribute('aria-label', opts.label);
    scrim.appendChild(box);
    var closed = false;
    var layer = {
      el: box,
      close: function (value) {
        if (closed) return;
        closed = true;
        var i = layerStack.indexOf(layer);
        if (i >= 0) layerStack.splice(i, 1);
        scrim.classList.remove('show');
        setTimeout(function () { if (scrim.parentNode) scrim.parentNode.removeChild(scrim); }, 180);
        if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus();
        if (opts.onClose) opts.onClose(value);
      },
      dismiss: function () {
        if (opts.dismissible === false) return;
        if (opts.beforeDismiss) {
          Promise.resolve(opts.beforeDismiss()).then(function (ok) { if (ok !== false) layer.close(undefined); });
        } else layer.close(undefined);
      },
    };
    scrim.addEventListener('mousedown', function (e) { if (e.target === scrim) layer.dismiss(); });
    append(box, opts.build(layer));
    document.getElementById('layer-host').appendChild(scrim);
    layerStack.push(layer);
    requestAnimationFrame(function () {
      scrim.classList.add('show');
      var auto = box.querySelector('[autofocus]') || focusables(box)[0];
      if (auto && opts.autofocus !== false) auto.focus();
    });
    return layer;
  }

  // dialog({icon, iconColor, title, body, actions:[{label, kind, value, danger}], content})
  function dialog(opts) {
    return new Promise(function (resolve) {
      openLayer('dialog', {
        cls: opts.cls,
        label: opts.title,
        dismissible: opts.dismissible,
        onClose: function (v) { resolve(v); },
        build: function (layer) {
          var actions = (opts.actions || [{ label: 'OK', kind: 'filled', value: true }]).map(function (a) {
            return h('button.btn.btn-' + (a.kind || 'text') + (a.danger ? '.btn-danger' : ''), {
              type: 'button', autofocus: a.autofocus,
              onclick: function () {
                if (a.validate && !a.validate()) return;
                layer.close(typeof a.value === 'function' ? a.value() : a.value);
              },
            }, a.label);
          });
          return [
            opts.icon ? h('div.dialog-icon', { style: opts.iconColor ? { color: opts.iconColor } : null }, icon(opts.icon, { fill: true })) : null,
            opts.title ? h('h2.dialog-title' + (opts.icon ? '.center' : ''), opts.title) : null,
            opts.body ? h('div.dialog-body', opts.body) : null,
            opts.content ? (typeof opts.content === 'function' ? opts.content(layer) : opts.content) : null,
            h('div.dialog-actions', actions),
          ];
        },
      });
    });
  }
  function confirmDialog(title, body, okLabel, opts) {
    opts = opts || {};
    return dialog({
      icon: opts.icon, iconColor: opts.iconColor || (opts.danger ? 'var(--md-error)' : null),
      title: title, body: body,
      actions: [
        { label: opts.cancelLabel || 'Cancel', kind: 'text', value: false },
        { label: okLabel || 'OK', kind: 'filled', value: true, danger: opts.danger },
      ],
    }).then(function (v) { return v === true; });
  }

  // Side panel (desktop) that becomes a full-screen page on phones.
  function panel(opts) {
    return openLayer('panel', {
      cls: opts.cls, label: opts.label, build: opts.build, onClose: opts.onClose,
      beforeDismiss: opts.beforeDismiss, autofocus: opts.autofocus,
    });
  }

  // Pop-up menu anchored to an element. items: [{label, icon, onClick, danger, checked, disabled, divider}]
  function menu(anchor, items, opts) {
    opts = opts || {};
    var r = anchor.getBoundingClientRect();
    var layer = openLayer('menu', {
      label: opts.label || 'Menu',
      build: function (layer) {
        return items.map(function (it) {
          if (it.divider) return h('div.menu-divider');
          if (it.header) return h('div.menu-header', it.header);
          return h('button.menu-item' + (it.danger ? '.danger' : ''), {
            type: 'button', role: 'menuitem', disabled: it.disabled,
            onclick: function () { layer.close(); if (it.onClick) it.onClick(); },
          }, it.icon ? icon(it.icon, { fill: it.fill, color: it.color }) : h('span.menu-spacer'),
          h('span.menu-label', it.label, it.sub ? h('small', it.sub) : null),
          it.checked ? icon('check', { cls: 'menu-check' }) : null);
        });
      },
    });
    var box = layer.el;
    box.parentNode.classList.add('scrim-clear');
    var w = box.offsetWidth, ht = box.offsetHeight;
    var left = opts.alignLeft ? r.left : r.right - w;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    var top = r.bottom + 4;
    if (top + ht > window.innerHeight - 8) top = Math.max(8, r.top - ht - 4);
    box.style.left = left + 'px';
    box.style.top = top + 'px';
    return layer;
  }

  // ---------------------------------------------------------- clipboard ---
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    var ta = h('textarea', { style: { position: 'fixed', opacity: '0', top: '0', left: '0' } });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: filename, style: { display: 'none' } });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }
  function pickFile(accept) {
    return new Promise(function (resolve) {
      var input = h('input', { type: 'file', accept: accept, style: { display: 'none' } });
      input.addEventListener('change', function () {
        var f = input.files && input.files[0];
        input.remove();
        if (!f) return resolve(null);
        var reader = new FileReader();
        reader.onload = function () { resolve({ name: f.name, text: String(reader.result) }); };
        reader.onerror = function () { resolve({ name: f.name, error: true }); };
        reader.readAsText(f);
      });
      document.body.appendChild(input);
      input.click();
    });
  }

  // ------------------------------------------------------------ widgets ---
  function switchEl(checked, onChange, label) {
    var input = h('input', { type: 'checkbox', role: 'switch', checked: !!checked, 'aria-label': label });
    input.addEventListener('change', function () { onChange(input.checked); });
    return h('label.switch', input, h('span.switch-track', h('span.switch-thumb')));
  }
  function chip(label, selected, onClick, opts) {
    opts = opts || {};
    return h('button.chip' + (selected ? '.selected' : ''), {
      type: 'button', onclick: onClick, 'aria-pressed': String(!!selected), title: opts.title,
      style: opts.style,
    }, selected && !opts.noCheck ? icon('check', { cls: 'chip-check' }) : (opts.icon ? icon(opts.icon, { fill: opts.fill }) : null),
    h('span', label), opts.count != null ? h('span.chip-count', String(opts.count)) : null);
  }
  function segmented(options, value, onChange, opts) {
    opts = opts || {};
    return h('div.segmented', { role: 'radiogroup', 'aria-label': opts.label, class: opts.cls }, options.map(function (o) {
      var sel = o.value === value;
      return h('button.seg' + (sel ? '.selected' : ''), {
        type: 'button', role: 'radio', 'aria-checked': String(sel), title: o.title,
        onclick: function () { if (!sel) onChange(o.value); },
      }, sel && !opts.noCheck ? icon('check', { cls: 'seg-check' }) : (o.icon ? icon(o.icon) : null), o.label ? h('span', o.label) : null);
    }));
  }
  function field(label, input, opts) {
    opts = opts || {};
    return h('label.field' + (opts.cls ? '.' + opts.cls : ''), h('span.field-label', label), input,
      opts.help ? h('span.field-help', opts.help) : null, opts.error ? h('span.field-error') : null);
  }
  function emptyState(iconName, title, body, action) {
    return h('div.empty', h('div.empty-icon', icon(iconName, { fill: true })), h('h3', title), body ? h('p', body) : null, action || null);
  }

  App.views = App.views || {};
  App.h = h; App.clear = clear; App.icon = icon; App.habitIcon = habitIcon;
  App.btn = btn; App.iconBtn = iconBtn; App.debounce = debounce;
  App.date = {
    MONTHS: MONTHS, DAYS: DAYS, pad: pad, isoLocal: isoLocal, parseIso: parseIso, dateKey: dateKey,
    parseDateKey: parseDateKey, startOfDay: startOfDay, addDays: addDays, sameDay: sameDay, dayDiff: dayDiff,
    daysInMonth: daysInMonth, fmt: fmt, fmtTime: fmtTime, parseTime: parseTime,
  };
  App.color = { argbToHex: argbToHex, hexToArgb: hexToArgb, rgba: rgba, isLight: isLight };
  App.plural = plural;
  App.ui = {
    snack: snack, dialog: dialog, confirm: confirmDialog, panel: panel, menu: menu, openLayer: openLayer,
    switchEl: switchEl, chip: chip, segmented: segmented, field: field, emptyState: emptyState,
    hasOpenLayer: function () { return layerStack.length > 0; },
  };
  App.io = { copyText: copyText, download: download, pickFile: pickFile };
})();
