// Calculator: same expression engine as the phone app (recursive-descent
// parser, same rounding and error messages), basic + scientific keypads,
// memory keys, history and full keyboard support.
(function () {
  'use strict';
  var App = window.App, h = App.h, icon = App.icon, S = App.store, D = App.date, ui = App.ui;
  var ERRORS = ['Error', 'Incomplete expression', 'Cannot divide by zero'];

  function FormatError(msg) { this.message = msg; }

  // ------------------------------------------------------------ engine ---
  function preprocess(input) {
    var s = input.replace(/ /g, '').replace(/,/g, '');
    var re = /(-?\d+\.?\d*)%/;
    while (re.test(s)) {
      s = s.replace(/(-?\d+\.?\d*)%/g, function (_, n) { return dartDoubleString(parseFloat(n) / 100); });
    }
    return s;
  }
  // Dart's double.toString(): always has a decimal point for whole values.
  function dartDoubleString(v) {
    if (Number.isInteger(v) && Math.abs(v) < 1e21) return v.toFixed(1);
    return String(v).replace('e+', 'e');
  }
  function parse(input) {
    var s = preprocess(input), pos = 0;
    function expr() {
      var r = term();
      while (pos < s.length && (s[pos] === '+' || s[pos] === '-')) {
        var op = s[pos++], right = term();
        r = op === '+' ? r + right : r - right;
      }
      return r;
    }
    function term() {
      var r = factor();
      while (pos < s.length && (s[pos] === '×' || s[pos] === '÷')) {
        var op = s[pos++], right = factor();
        if (op === '÷' && right === 0) return Infinity;
        r = op === '×' ? r * right : r / right;
      }
      return r;
    }
    function factor() {
      var r = unary();
      if (pos < s.length && s[pos] === '^') { pos++; r = Math.pow(r, factor()); }
      return r;
    }
    function unary() {
      if (pos >= s.length) throw new FormatError('Unexpected end');
      if (s[pos] === '-') { pos++; return -unary(); }
      if (s[pos] === '+') { pos++; return unary(); }
      return primary();
    }
    function starts(t) { return s.substr(pos, t.length) === t; }
    function primary() {
      if (pos >= s.length) throw new FormatError('Unexpected end');
      if (s[pos] === '(') {
        pos++;
        var r = expr();
        if (pos >= s.length || s[pos] !== ')') throw new FormatError('Missing )');
        pos++;
        return r;
      }
      if (starts('sin')) { pos += 3; return Math.sin(primary()); }
      if (starts('cos')) { pos += 3; return Math.cos(primary()); }
      if (starts('tan')) { pos += 3; return Math.tan(primary()); }
      if (starts('log')) { pos += 3; return Math.log(primary()) / Math.LN10; }
      if (starts('ln')) { pos += 2; return Math.log(primary()); }
      if (starts('sqrt')) { pos += 4; return Math.sqrt(primary()); }
      if (starts('√')) { pos += 1; return Math.sqrt(primary()); }
      if (starts('π')) { pos++; return Math.PI; }
      if (starts('e') && (pos + 1 >= s.length || !/[a-zA-Z0-9]/.test(s[pos + 1]))) { pos++; return Math.E; }
      var start = pos;
      while (pos < s.length && /[0-9.]/.test(s[pos])) pos++;
      if (pos === start) throw new FormatError('Unexpected: ' + s[pos]);
      var lit = s.slice(start, pos);
      if (!/^(\d+\.?\d*|\.\d+)$/.test(lit)) throw new FormatError('Invalid number'); // Dart double.parse rules
      return parseFloat(lit);
    }
    var result = expr();
    if (pos < s.length) throw new FormatError('Unexpected: ' + s[pos]);
    return result;
  }
  function formatResult(v) {
    if (isNaN(v) || !isFinite(v)) return 'Error';
    if (Number.isInteger(v)) {
      if (Math.abs(v) < 9.2e18) return BigInt(v).toString();
      return v.toExponential(6);
    }
    var s = v.toFixed(10).replace(/0+$/, '').replace(/\.$/, '');
    if (s === '-0') s = '0';
    return s.length > 15 ? v.toExponential(6) : s;
  }
  function evaluate(expression) {
    try {
      var v = parse(expression);
      if (v === Infinity || v === -Infinity) return { error: 'Cannot divide by zero' };
      var r = formatResult(v);
      if (r === 'Error') return { error: 'Error' };
      return { value: r };
    } catch (e) {
      return { error: e instanceof FormatError ? 'Incomplete expression' : 'Error' };
    }
  }
  function formatDisplay(input) {
    if (!input || ERRORS.indexOf(input) >= 0) return input;
    return input.replace(/(\d+)(\.\d+)?/g, function (_, i, d) {
      return i.replace(/(\d{1,3})(?=(\d{3})+(?!\d))/g, '$1,') + (d || '');
    });
  }
  function numString(v) { return Number.isInteger(v) ? String(v) : dartDoubleString(v); }
  App.calc = { parse: parse, evaluate: evaluate, formatResult: formatResult, formatDisplay: formatDisplay };

  // ---------------------------------------------------------- calculator ---
  var state = { expression: '', result: '', last: '', memory: 0 }; // memory lives for the session, like the phone

  function input(value) {
    if (value !== '=') state.last = '';
    if (ERRORS.indexOf(state.result) >= 0) { state.expression = ''; state.result = ''; }
    var e = state.expression;
    if (value === 'C' || value === 'CE') { state.expression = ''; state.result = ''; }
    else if (value === '⌫') { state.expression = e.slice(0, -1); }
    else if (value === '=') { return evaluateNow(); }
    else if (value === '±') {
      if (!e || e === '0') state.expression = '-';
      else if (e[0] === '-') state.expression = e.slice(1);
      else state.expression = '-' + e;
    } else if (value === '.') {
      var segs = e.split(/[+\-×÷^()]/);
      if (segs.length && segs[segs.length - 1].indexOf('.') >= 0) return null;
      state.expression += (!e || /[+\-×÷^()]$/.test(e)) ? '0.' : '.';
    } else {
      var ops = ['+', '-', '×', '÷', '^'];
      if (ops.indexOf(value) >= 0 && e && ops.indexOf(e[e.length - 1]) >= 0) {
        state.expression = e.slice(0, -1) + value;
        return null;
      }
      if (e.length >= 50) return 'Maximum 50 characters reached';
      state.expression += value;
    }
    return null;
  }
  function evaluateNow() {
    var r = evaluate(state.expression);
    if (r.error) { state.result = r.error; return null; }
    state.result = r.value;
    S.insert('calculator_history', { expression: state.expression, result: r.value, created_at: D.isoLocal() });
    state.last = state.expression;
    state.expression = r.value;
    return null;
  }
  function square() {
    state.last = '';
    if (ERRORS.indexOf(state.result) >= 0) { state.expression = ''; state.result = ''; return; }
    if (state.expression) state.expression = '(' + state.expression + ')^2';
  }
  function memory(op) {
    var parsed = parseFloat(String(state.result).replace(/,/g, ''));
    var valid = state.result !== '' && /^-?[\d.]+(e[+-]?\d+)?$/i.test(String(state.result).replace(/,/g, ''));
    if (op === 'MC') state.memory = 0;
    else if (op === 'M+') { if (valid) state.memory += parsed; }
    else if (op === 'M-') { if (valid) state.memory -= parsed; }
    else if (op === 'MR') {
      var m = numString(state.memory), e = state.expression;
      if (!e || e === '0' || /[+\-×÷^(\s]$/.test(e)) state.expression += state.memory < 0 ? '(' + m + ')' : m;
      else state.expression += state.memory < 0 ? '×(' + m + ')' : '×' + m;
      state.result = ''; state.last = '';
    }
  }

  var BASIC = [['C', 'CE', '⌫', '÷'], ['7', '8', '9', '×'], ['4', '5', '6', '-'], ['1', '2', '3', '+'], ['±', '0', '.', '=']];
  var SCI = [['MC', 'MR', 'M+', 'M-', '⌫'], ['sin', 'cos', 'tan', 'log', 'ln'], ['(', ')', '^', 'x²', '%'], ['C', 'CE', '√', 'π', '÷'], ['7', '8', '9', 'e', '×'], ['4', '5', '6', '±', '-'], ['1', '2', '3', '0', '+'], ['.', '=']];
  var NAMES = { '÷': 'Divide', '×': 'Multiply', '-': 'Subtract', '+': 'Add', '=': 'Equals', '⌫': 'Backspace', '.': 'Decimal point', '%': 'Percent', '^': 'Power', '√': 'Square root', 'x²': 'Square', '±': 'Plus minus', 'C': 'Clear all', 'CE': 'Clear entry', sin: 'Sine', cos: 'Cosine', tan: 'Tangent', log: 'Logarithm', ln: 'Natural logarithm', 'π': 'Pi', e: 'Euler constant', '(': 'Open parenthesis', ')': 'Close parenthesis', MC: 'Memory Clear', MR: 'Memory Recall', 'M+': 'Memory Add', 'M-': 'Memory Subtract' };
  var KEYS = { '0': '0', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '.': '.', ',': '.', '+': '+', '-': '-', '*': '×', 'x': '×', '/': '÷', '^': '^', '(': '(', ')': ')', '%': '%', 'Enter': '=', '=': '=', 'Backspace': '⌫', 'Escape': 'C', 'Delete': 'CE', 's': 'sin', 'c': 'cos', 't': 'tan', 'l': 'log', 'n': 'ln', 'r': '√', 'p': 'π', 'e': 'e', 'q': 'x²' };

  App.views.calculator = function (main) {
    var exprEl, resultEl, memEl, errEl, padEl, histEl, modeBtnHost;
    var errTimer;

    function press(label) {
      var msg = null;
      if (label === 'x²') square();
      else if (/^M[CR+-]$/.test(label)) memory(label);
      else msg = input(label);
      if (msg) {
        errEl.textContent = msg;
        errEl.classList.remove('hidden');
        clearTimeout(errTimer);
        errTimer = setTimeout(function () { errEl.classList.add('hidden'); }, 1000);
      }
      drawDisplay();
      flashKey(label);
    }
    function flashKey(label) {
      var b = padEl && padEl.querySelector('[data-key="' + CSS.escape(label) + '"]');
      if (!b) return;
      b.classList.add('pressed');
      setTimeout(function () { b.classList.remove('pressed'); }, 120);
    }
    function copyResult(value) {
      App.io.copyText(value).then(function (ok) { ui.snack(ok ? 'Result copied to clipboard' : 'Could not copy', { type: ok ? 'success' : 'error' }); });
    }

    function drawDisplay() {
      var isErr = ERRORS.indexOf(state.result) >= 0;
      var exprText = state.last || state.expression;
      exprEl.textContent = formatDisplay(exprText) || '';
      exprEl.classList.toggle('long', exprText.length > 18);
      exprEl.classList.toggle('xlong', exprText.length > 30);
      var shown = isErr ? state.result : (state.result ? formatDisplay(state.result) : (state.expression ? '' : '0'));
      resultEl.textContent = shown;
      resultEl.classList.toggle('error', isErr);
      resultEl.classList.toggle('long', shown.length > 12);
      resultEl.title = state.result && !isErr ? (S.pref('calculator_copy_on_tap') ? 'Click to copy' : '') : '';
      memEl.classList.toggle('hidden', state.memory === 0);
      memEl.textContent = 'M ' + formatDisplay(numString(state.memory));
      memEl.title = 'Memory: ' + formatDisplay(numString(state.memory));
      copyBtn.disabled = !state.result || isErr;
    }
    function drawPad() {
      var sci = !!S.pref('calculator_scientific_mode');
      App.clear(padEl);
      padEl.className = 'keypad' + (sci ? ' sci' : '');
      (sci ? SCI : BASIC).forEach(function (row) {
        row.forEach(function (k) {
          var cls = /^[0-9]$/.test(k) || k === '.' ? 'num' : k === '=' ? 'eq' : (k === 'C' || k === 'CE') ? 'clr' : /^M/.test(k) ? 'mem' : ['÷', '×', '-', '+'].indexOf(k) >= 0 ? 'op' : 'fn';
          var b = h('button.key.' + cls, { type: 'button', 'aria-label': NAMES[k] || k, title: NAMES[k] || k, dataset: { key: k }, onclick: function () { press(k); } },
            k === '⌫' ? icon('backspace') : k);
          if (sci && k === '=') b.classList.add('span4');
          padEl.appendChild(b);
        });
      });
      App.clear(modeBtnHost).appendChild(h('button.sci-toggle' + (sci ? '.on' : ''), {
        type: 'button', 'aria-pressed': String(sci), onclick: function () { S.setPref('calculator_scientific_mode', !sci); },
      }, icon('science', { fill: sci }), 'Scientific ' + (sci ? 'ON' : 'OFF')));
    }
    function drawHistory() {
      var rows = S.all('calculator_history').sort(function (a, b) { return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : b.id - a.id; }).slice(0, 50);
      App.clear(histEl);
      histEl.appendChild(h('div.hist-head', h('h2', 'History'), h('span.grow'),
        rows.length ? App.btn('text', 'Clear', function () {
          ui.confirm('Clear History', 'Are you sure you want to clear all calculation history? This cannot be undone.', 'Clear All', { danger: true })
            .then(function (ok) { if (ok) { S.remove('calculator_history', function () { return true; }); ui.snack('History cleared'); } });
        }, { icon: 'delete_sweep', cls: 'btn-danger' }) : null));
      if (!rows.length) {
        histEl.appendChild(h('div.empty.small-empty', h('div.empty-icon', icon('history')), h('h3', 'No calculations yet'), h('p', 'Your completed equations will appear here')));
        return;
      }
      var list = h('div.hist-list');
      rows.forEach(function (r) {
        var del = App.iconBtn('close', 'Delete history item', function (e) {
          e.stopPropagation();
          S.remove('calculator_history', r.id);
          ui.snack('Entry deleted', { action: { label: 'Undo', onClick: function () { S.restore('calculator_history', r); } } });
        }, { cls: 'sm hist-del' });
        var copy = App.iconBtn('content_copy', 'Copy result', function (e) { e.stopPropagation(); copyResult(r.result); }, { cls: 'sm hist-del' });
        list.appendChild(h('div.hist-item', {
          tabindex: '0', role: 'button', title: 'Use this calculation',
          onclick: function () { state.expression = r.expression; state.last = ''; state.result = ''; drawDisplay(); },
          onkeydown: function (e) { if (e.key === 'Enter' && e.target === e.currentTarget) { e.stopPropagation(); state.expression = r.expression; state.last = ''; state.result = ''; drawDisplay(); } },
        }, h('div.grow', h('div.hist-expr', formatDisplay(r.expression) + ' ='), h('div.hist-res', formatDisplay(r.result)),
          h('small.muted', relTime(D.parseIso(r.created_at)))), copy, del));
      });
      histEl.appendChild(list);
    }
    function relTime(d) {
      if (!d) return '';
      if (D.sameDay(d, new Date())) return 'Today ' + D.fmt(d, 'h:mm a');
      return D.fmt(d, 'MMM d, h:mm a');
    }

    var copyBtn = App.iconBtn('content_copy', 'Copy result', function () { copyResult(state.result); });
    exprEl = h('div.calc-expr', { 'aria-label': 'Expression' });
    resultEl = h('div.calc-result', {
      'aria-live': 'polite', role: 'status',
      onclick: function () {
        if (state.result && ERRORS.indexOf(state.result) < 0 && S.pref('calculator_copy_on_tap')) copyResult(state.result);
      },
    });
    memEl = h('span.mem-badge.hidden');
    errEl = h('div.calc-limit.hidden');
    padEl = h('div.keypad');
    histEl = h('aside.card.calc-history');
    modeBtnHost = h('span');

    var view = h('section.view.calc-view',
      h('header.view-head', h('h1.view-title', 'Calculator'), modeBtnHost),
      h('div.view-body', h('div.calc-layout',
        h('div.card.calc-card',
          h('div.calc-display', h('div.calc-top', memEl, h('span.grow'), copyBtn), exprEl, resultEl, errEl),
          padEl,
          h('p.hint.calc-hint', 'Keyboard: numbers, + − * / ^ ( ) %, Enter =, Backspace, Esc clears. Scientific: s c t l n r p e q')),
        histEl)));
    main.appendChild(view);
    drawPad(); drawDisplay(); drawHistory();

    function onKey(e) {
      if (ui.hasOpenLayer() || e.ctrlKey || e.metaKey || e.altKey) return;
      var t = document.activeElement;
      if (t && (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable)) return;
      // Let a focused button handle Enter / Space itself.
      if ((e.key === 'Enter' || e.key === ' ') && t && (t.tagName === 'BUTTON' || t.getAttribute('role') === 'button')) return;
      var k = KEYS[e.key];
      if (!k) return;
      e.preventDefault();
      press(k);
    }
    document.addEventListener('keydown', onKey);
    return {
      onData: function (tables) {
        if (tables.indexOf('prefs') >= 0 || tables.indexOf('theme') >= 0) { drawPad(); drawDisplay(); }
        if (tables.indexOf('calculator_history') >= 0) drawHistory();
      },
      unmount: function () { document.removeEventListener('keydown', onKey); },
    };
  };
})();
