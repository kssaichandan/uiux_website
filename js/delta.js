// Note bodies are stored as Quill Delta JSON, exactly like the phone app's
// flutter_quill editor writes them. This file converts Delta <-> the HTML
// used by the web editor, and extracts plain text for previews and search.
(function () {
  'use strict';
  var App = window.App;
  var INLINE = ['bold', 'italic', 'underline', 'strike'];

  function parse(content) {
    if (content == null || content === '') return null;
    try {
      var d = JSON.parse(content);
      if (Array.isArray(d)) return d;
      if (d && Array.isArray(d.ops)) return d.ops;
      return null;
    } catch (e) { return null; }
  }

  // Plain text of a note body. Unlike the phone helper, an empty document
  // gives '' (the phone returns the raw JSON in that case).
  function plainText(content) {
    if (content == null || content === '') return '';
    var ops = parse(content);
    if (!ops) return String(content).trim();
    var out = '';
    ops.forEach(function (op) {
      if (!op || op.insert == null) return;
      if (typeof op.insert === 'string') out += op.insert;
      else if (typeof op.insert === 'object') out += op.insert.text || op.insert.caption || '';
    });
    return out.trim();
  }
  function wordCount(content) {
    var t = plainText(content);
    return t ? t.split(/\s+/).filter(Boolean).length : 0;
  }

  // Delta -> list of lines {segments:[{text, attrs}], block:{}}
  function toLines(ops) {
    var lines = [], cur = [];
    (ops || []).forEach(function (op) {
      if (!op || op.insert == null) return;
      var attrs = op.attributes || {};
      if (typeof op.insert !== 'string') {
        var t = op.insert.text || op.insert.caption || '';
        if (t) cur.push({ text: t, attrs: {} });
        return;
      }
      var parts = op.insert.split('\n');
      parts.forEach(function (p, i) {
        if (p) cur.push({ text: p, attrs: attrs });
        if (i < parts.length - 1) { lines.push({ segments: cur, block: attrs }); cur = []; }
      });
    });
    if (cur.length) lines.push({ segments: cur, block: {} });
    return lines;
  }

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function inlineHtml(segments) {
    if (!segments.length) return '<br>';
    return segments.map(function (s) {
      var html = esc(s.text);
      if (s.attrs.strike) html = '<s>' + html + '</s>';
      if (s.attrs.underline) html = '<u>' + html + '</u>';
      if (s.attrs.italic) html = '<em>' + html + '</em>';
      if (s.attrs.bold) html = '<strong>' + html + '</strong>';
      return html;
    }).join('');
  }

  function toHtml(content) {
    var ops = parse(content);
    if (!ops) {
      // Older or non-Delta text: show it as plain paragraphs.
      var text = content ? String(content) : '';
      return text ? text.split('\n').map(function (l) { return '<p>' + (l ? esc(l) : '<br>') + '</p>'; }).join('') : '<p><br></p>';
    }
    var lines = toLines(ops);
    var html = '', openList = null;
    function closeList() { if (openList) { html += openList === 'ol' ? '</ol>' : '</ul>'; openList = null; } }
    lines.forEach(function (line) {
      var b = line.block || {}, inner = inlineHtml(line.segments);
      var list = b.list;
      if (list === 'ordered' || list === 'bullet' || list === 'checked' || list === 'unchecked') {
        var tag = list === 'ordered' ? 'ol' : list === 'bullet' ? 'ul' : 'check';
        if (openList !== tag) {
          closeList();
          html += tag === 'ol' ? '<ol>' : tag === 'ul' ? '<ul>' : '<ul class="checklist">';
          openList = tag;
        }
        html += list === 'checked' ? '<li data-checked="true">' + inner + '</li>'
          : list === 'unchecked' ? '<li data-checked="false">' + inner + '</li>' : '<li>' + inner + '</li>';
        return;
      }
      closeList();
      if (b.blockquote) html += '<blockquote>' + inner + '</blockquote>';
      else if (b.header >= 1 && b.header <= 3) html += '<h' + b.header + '>' + inner + '</h' + b.header + '>';
      else html += '<p>' + inner + '</p>';
    });
    closeList();
    return html || '<p><br></p>';
  }

  // Editor DOM -> Delta ops
  var BLOCK_TAGS = { P: 1, DIV: 1, LI: 1, BLOCKQUOTE: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, PRE: 1, UL: 1, OL: 1, TABLE: 1, TR: 1, SECTION: 1, ARTICLE: 1 };
  function fromEditor(root) {
    var ops = [];
    function pushText(text, attrs) {
      if (!text) return;
      var clean = {};
      INLINE.forEach(function (k) { if (attrs[k]) clean[k] = true; });
      var last = ops[ops.length - 1];
      var hasAttrs = Object.keys(clean).length > 0;
      // Merge with the previous insert when the attributes match (Quill's canonical form).
      if (last && typeof last.insert === 'string' && JSON.stringify(last.attributes || {}) === JSON.stringify(clean)) {
        last.insert += text;
      } else {
        var op = { insert: text };
        if (hasAttrs) op.attributes = clean;
        ops.push(op);
      }
    }
    function pushNewline(block) {
      var op = { insert: '\n' };
      if (block && Object.keys(block).length) op.attributes = block;
      var last = ops[ops.length - 1];
      if (!op.attributes && last && !last.attributes && typeof last.insert === 'string') last.insert += '\n';
      else ops.push(op);
    }
    function blockAttrs(el) {
      var tag = el.tagName;
      if (tag === 'LI') {
        var parent = el.parentElement;
        if (parent && parent.classList.contains('checklist')) return { list: el.getAttribute('data-checked') === 'true' ? 'checked' : 'unchecked' };
        return { list: parent && parent.tagName === 'OL' ? 'ordered' : 'bullet' };
      }
      if (tag === 'BLOCKQUOTE') return { blockquote: true };
      if (tag === 'H1' || tag === 'H2' || tag === 'H3') return { header: +tag[1] };
      return {};
    }
    function inlineAttrs(el, attrs) {
      var a = Object.assign({}, attrs), tag = el.tagName, st = el.style || {};
      if (tag === 'B' || tag === 'STRONG' || st.fontWeight === 'bold' || +st.fontWeight >= 600) a.bold = true;
      if (tag === 'I' || tag === 'EM' || st.fontStyle === 'italic') a.italic = true;
      if (tag === 'U' || (st.textDecoration || '').indexOf('underline') >= 0 || (st.textDecorationLine || '').indexOf('underline') >= 0) a.underline = true;
      if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || (st.textDecoration || '').indexOf('line-through') >= 0 || (st.textDecorationLine || '').indexOf('line-through') >= 0) a.strike = true;
      return a;
    }
    // Walk one block: inline content; <br> splits it into lines that share
    // the block's attributes. A trailing <br> is only the browser's
    // placeholder and does not add a line.
    function walkBlock(el, block) {
      var lines = [[]];
      function flushLines() {
        if (lines.length > 1 && !lines[lines.length - 1].length) lines.pop();
        lines.forEach(function (segs) {
          segs.forEach(function (s) { pushText(s.text, s.attrs); });
          pushNewline(block);
        });
        lines = [[]];
      }
      function walkInline(node, attrs) {
        node.childNodes.forEach(function (c) {
          if (c.nodeType === 3) {
            var t = c.nodeValue.replace(/[\n\r]+/g, ' ').replace(/\u200B/g, '');
            if (t) lines[lines.length - 1].push({ text: t, attrs: attrs });
          } else if (c.nodeType === 1) {
            if (c.tagName === 'BR') lines.push([]);
            else if (BLOCK_TAGS[c.tagName]) {
              var hasContent = lines.some(function (l) { return l.length; });
              if (hasContent) flushLines(); else lines = [[]];
              walkContainer(c, block);
            } else walkInline(c, inlineAttrs(c, attrs));
          }
        });
      }
      walkInline(el, {});
      var any = lines.length > 1 || lines[0].length;
      if (any) flushLines();
      else if (!el.querySelector || !el.querySelector(Object.keys(BLOCK_TAGS).join(','))) pushNewline(block);
    }
    function walkContainer(el, inherited) {
      if (el.tagName === 'UL' || el.tagName === 'OL' || el.tagName === 'TABLE' || el.tagName === 'TR') {
        el.childNodes.forEach(function (c) {
          if (c.nodeType === 1) walkContainer(c, c.tagName === 'LI' ? blockAttrs(c) : inherited);
          else if (c.nodeType === 3 && c.nodeValue.trim()) { pushText(c.nodeValue.trim(), {}); pushNewline(inherited); }
        });
        return;
      }
      var own = blockAttrs(el);
      walkBlock(el, Object.keys(own).length ? own : (el.tagName === 'DIV' ? (inherited || {}) : own));
    }
    // Top level: group loose inline nodes into implicit paragraphs.
    var loose = null;
    function flushLoose() {
      if (!loose) return;
      walkBlock(loose, {});
      loose = null;
    }
    Array.prototype.slice.call(root.childNodes).forEach(function (c) {
      if (c.nodeType === 1 && BLOCK_TAGS[c.tagName]) { flushLoose(); walkContainer(c, {}); }
      else if (c.nodeType === 1 || (c.nodeType === 3 && c.nodeValue.trim())) {
        if (!loose) loose = document.createElement('p');
        loose.appendChild(c.cloneNode(true));
      }
    });
    flushLoose();
    if (!ops.length) ops.push({ insert: '\n' });
    var last = ops[ops.length - 1];
    if (typeof last.insert !== 'string' || last.insert.slice(-1) !== '\n') pushNewline({});
    return ops;
  }

  function plainToDelta(text) {
    return JSON.stringify([{ insert: (text || '').replace(/\r\n?/g, '\n').replace(/\n?$/, '\n') }]);
  }

  App.delta = { parse: parse, plainText: plainText, wordCount: wordCount, toHtml: toHtml, fromEditor: fromEditor, plainToDelta: plainToDelta };
})();
