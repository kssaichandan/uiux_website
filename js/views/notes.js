// Notes: list / grid, filters, search, sort, selection, trash, and the
// rich-text editor (bold, italic, underline, strike, lists, checklist, quote).
(function () {
  'use strict';
  var App = window.App, h = App.h, icon = App.icon, S = App.store, D = App.date, ui = App.ui;

  var NOTE_COLORS = [0xFFFFCDD2, 0xFFFFE0B2, 0xFFFFF9C4, 0xFFC8E6C9, 0xFFB2EBF2, 0xFFBBDEFB, 0xFFE1BEE7, 0xFFF8BBD0, 0xFFB2DFDB, 0xFFD7CCC8];
  var COLOR_NAMES = ['Red', 'Orange', 'Yellow', 'Green', 'Cyan', 'Blue', 'Purple', 'Pink', 'Teal', 'Brown'];
  var PRIORITIES = [
    { value: 0, label: 'No Priority', desc: 'Standard priority', icon: 'remove' },
    { value: 1, label: 'Low Priority', desc: 'Nice to have / Low urgency', icon: 'arrow_downward' },
    { value: 2, label: 'Medium Priority', desc: 'Important but not urgent', icon: 'bolt' },
    { value: 3, label: 'High Priority', desc: 'Requires immediate attention', icon: 'local_fire_department' },
  ];

  function priorityStyle(p) {
    var dark = App.theme.dark;
    if (p === 3) return { fg: dark ? '#FF8A80' : '#B71C1C', bg: dark ? '#5C1D1D' : '#FFEBEE', border: '#E53935', label: 'High', icon: 'local_fire_department' };
    if (p === 2) return { fg: dark ? '#FFB74D' : '#8F5200', bg: dark ? '#5C3A1D' : '#FFF3E0', border: '#FB8C00', label: 'Med', icon: 'bolt' };
    return { fg: dark ? '#4DD0E1' : '#006978', bg: dark ? '#1D4A5C' : '#E0F7FA', border: '#00ACC1', label: 'Low', icon: 'arrow_downward' };
  }
  function noteBg(color, editor) {
    if (color == null) return null;
    var dark = App.theme.dark;
    return App.color.rgba(color, editor ? (dark ? 0.22 : 0.35) : (dark ? 0.25 : 0.4));
  }

  function formatNoteDate(dt) {
    if (!dt) return '';
    var now = new Date(), diff = now - dt;
    var mins = Math.floor(diff / 60000), hours = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (hours < 1) return mins + 'm ago';
    if (days < 1 && now.getDate() === dt.getDate()) return 'Today ' + D.fmt(dt, 'h:mm a');
    if (days < 2 && now.getDate() - dt.getDate() === 1) return 'Yesterday';
    if (now.getFullYear() === dt.getFullYear()) return D.fmt(dt, 'MMM d');
    return D.fmt(dt, 'MMM d, y');
  }
  function plain(n) { return App.delta.plainText(n.content); }
  function time(s) { var d = D.parseIso(s); return d ? d.getTime() : 0; }

  // ------------------------------------------------------- note actions ---
  var actions = {
    togglePin: function (n) { S.update('notes', n.id, { pinned: n.pinned ? 0 : 1 }); ui.snack(n.pinned ? 'Unpinned' : 'Pinned', { type: 'success' }); },
    toggleFavorite: function (n) { S.update('notes', n.id, { favorite: n.favorite ? 0 : 1 }); },
    archive: function (n) {
      S.update('notes', n.id, { archived: n.archived ? 0 : 1 });
      ui.snack(n.archived ? 'Note unarchived' : 'Note archived', {
        action: { label: 'Undo', onClick: function () { S.update('notes', n.id, { archived: n.archived }); } },
      });
    },
    trash: function (n) {
      S.update('notes', n.id, { deleted_at: D.isoLocal() });
      ui.snack('Note moved to trash', { action: { label: 'Undo', onClick: function () { S.update('notes', n.id, { deleted_at: null }); } } });
    },
    duplicate: function (n) {
      var now = D.isoLocal();
      S.insert('notes', { title: n.title + ' (copy)', content: n.content, pinned: 0, favorite: 0, color: n.color, priority: 0, archived: 0, created_at: now, updated_at: now });
      ui.snack('Note duplicated', { type: 'success' });
    },
    share: function (title, text) {
      var full = title + '\n\n' + text;
      if (navigator.share) {
        navigator.share({ title: title || 'Note', text: full }).catch(function () { /* cancelled */ });
      } else {
        App.io.copyText(full).then(function (ok) { ui.snack(ok ? 'Note copied to clipboard' : 'Could not copy note', { type: ok ? 'success' : 'error' }); });
      }
    },
  };

  function colorDialog(current) {
    var chosen = current;
    return ui.dialog({
      title: 'Note Color',
      content: function () {
        var grid = h('div.swatches');
        function draw() {
          App.clear(grid);
          grid.appendChild(h('button.swatch.none' + (chosen == null ? '.selected' : ''), {
            type: 'button', title: 'No color', 'aria-label': 'No color', onclick: function () { chosen = null; draw(); },
          }, icon('format_clear')));
          NOTE_COLORS.forEach(function (c, i) {
            grid.appendChild(h('button.swatch' + (chosen === c ? '.selected' : ''), {
              type: 'button', title: COLOR_NAMES[i], 'aria-label': COLOR_NAMES[i], style: { background: App.color.argbToHex(c) },
              onclick: function () { chosen = c; draw(); },
            }, chosen === c ? icon('check', { color: '#1b1b1b' }) : null));
          });
        }
        draw();
        return grid;
      },
      actions: [{ label: 'Cancel', value: undefined }, { label: 'Apply', kind: 'filled', value: function () { return { color: chosen }; } }],
    });
  }

  function priorityDialog(current) {
    return ui.dialog({
      title: 'Set Priority',
      content: function (layer) {
        return h('div.option-list', PRIORITIES.map(function (p) {
          var st = p.value ? priorityStyle(p.value) : null;
          return h('button.option' + (p.value === current ? '.selected' : ''), {
            type: 'button', onclick: function () { layer.close({ priority: p.value }); },
          }, h('span.option-icon', { style: st ? { background: st.bg, color: st.fg } : null }, icon(p.icon, { fill: true })),
          h('span.option-text', h('b', p.label), h('small', p.desc)),
          p.value === current ? icon('check', { cls: 'option-check' }) : null);
        }));
      },
      actions: [{ label: 'Cancel', value: undefined }],
    });
  }

  function reminderDialog(currentIso) {
    var now = new Date();
    var initial = D.parseIso(currentIso) || new Date(now.getTime() + 3600000);
    var toLocal = function (d) { return D.dateKey(d) + 'T' + D.pad(d.getHours()) + ':' + D.pad(d.getMinutes()); };
    var input = h('input', { type: 'datetime-local', value: toLocal(initial), min: toLocal(now), max: toLocal(new Date(now.getTime() + 365 * 86400000)) });
    var err = h('div.field-error');
    var acts = [{ label: 'Cancel', value: undefined }];
    if (currentIso) acts.push({ label: 'Remove', kind: 'text', danger: true, value: { remove: true } });
    acts.push({
      label: 'Set Reminder', kind: 'filled',
      validate: function () {
        var d = D.parseIso(input.value);
        if (!d) { err.textContent = 'Pick a date and time'; return false; }
        if (d.getTime() <= Date.now()) { err.textContent = 'Pick a time in the future'; return false; }
        if (d.getTime() > Date.now() + 366 * 86400000) { err.textContent = 'Pick a date within the next year'; return false; }
        return true;
      },
      value: function () { return { at: D.isoLocal(D.parseIso(input.value)) }; },
    });
    return ui.dialog({
      icon: 'notifications_active', title: currentIso ? 'Edit reminder' : 'Set reminder',
      content: h('div.stack', ui.field('Remind me at', input), err,
        h('p.field-help', 'Reminders show while Personal App is open in a browser tab.')),
      actions: acts,
    });
  }

  // ------------------------------------------------------------ editor ---
  function openEditor(noteId, onClosed) {
    var note = noteId ? S.get('notes', noteId) : null;
    var state = {
      id: note ? note.id : null,
      favorite: note ? note.favorite : 0, color: note ? note.color : null, pinned: note ? note.pinned : 0,
      archived: note ? note.archived : 0, reminder: note ? note.reminder_time : null, priority: note ? note.priority : 0,
      created: note ? note.created_at : null,
      dirty: false, closing: false,
    };
    var titleInput, editor, counter, statusEl, wordsEl, reminderBar, favBtn, panelEl, metaRow;
    var autosave = App.debounce(function () { if (state.dirty && !state.closing) save(false); }, 1200);

    function currentContent() { return JSON.stringify(App.delta.fromEditor(editor)); }
    function hasContent() { return titleInput.value.trim() !== '' || App.delta.plainText(currentContent()) !== ''; }

    // Persist the note. Returns the saved row or null for an empty new note.
    function save(touch) {
      if (!state.id && !hasContent()) return null;
      var now = D.isoLocal();
      var row = {
        title: titleInput.value, content: currentContent(), pinned: state.pinned, favorite: state.favorite,
        color: state.color, archived: state.archived, reminder_time: state.reminder, priority: state.priority,
      };
      var saved;
      if (state.id && S.get('notes', state.id)) {
        if (touch !== false || state.dirty) row.updated_at = now;
        saved = S.update('notes', state.id, row);
      } else {
        row.created_at = state.created || now;
        row.updated_at = now;
        saved = S.insert('notes', row);
        state.id = saved.id;
        state.created = saved.created_at;
        history.replaceState(null, '', '#/notes/' + saved.id);
        drawMeta();
      }
      state.dirty = false;
      flash('Saved');
      return saved;
    }
    // Small metadata change from the editor's buttons (keeps the note).
    function setMeta(patch) {
      Object.assign(state, patch);
      if (state.id && S.get('notes', state.id)) {
        var dbPatch = {};
        if ('favorite' in patch) dbPatch.favorite = patch.favorite;
        if ('color' in patch) dbPatch.color = patch.color;
        if ('pinned' in patch) dbPatch.pinned = patch.pinned;
        if ('archived' in patch) dbPatch.archived = patch.archived;
        if ('reminder' in patch) dbPatch.reminder_time = patch.reminder;
        if ('priority' in patch) dbPatch.priority = patch.priority;
        S.update('notes', state.id, dbPatch);
      } else if (hasContent()) save(true);
      drawMeta();
    }
    var flashTimer;
    function flash(text) {
      if (!statusEl) return;
      statusEl.textContent = text;
      clearTimeout(flashTimer);
      flashTimer = setTimeout(function () { statusEl.textContent = ''; }, 2000);
    }
    function markDirty() {
      state.dirty = true;
      if (statusEl) statusEl.textContent = 'Unsaved changes';
      updateCounts();
      autosave();
    }
    function updateCounts() {
      var words = App.delta.wordCount(currentContent());
      wordsEl.textContent = App.plural(words, 'word');
      var len = titleInput.value.length;
      counter.textContent = len + '/100';
      counter.classList.toggle('warn', len > 80);
    }

    function close() {
      if (state.closing) return;
      state.closing = true;
      if (state.dirty || (!state.id && hasContent())) save(true);
      layer.close();
    }

    function drawMeta() {
      if (!panelEl) return;
      panelEl.style.background = state.color != null ? 'linear-gradient(' + noteBg(state.color, true) + ',' + noteBg(state.color, true) + '), var(--md-surface)' : '';
      App.clear(favBtn).appendChild(icon('star', { fill: !!state.favorite }));
      favBtn.setAttribute('aria-pressed', String(!!state.favorite));
      favBtn.title = state.favorite ? 'Remove from favorites' : 'Favorite';
      App.clear(reminderBar);
      if (state.reminder) {
        var d = D.parseIso(state.reminder);
        reminderBar.classList.remove('hidden');
        reminderBar.append(icon('notifications', { fill: true }), h('span.grow', 'Reminder: ' + D.fmt(d, 'MMM d, y') + ' at ' + D.fmt(d, 'h:mm a')),
          App.iconBtn('close', 'Remove reminder', function () { setMeta({ reminder: null }); }, { cls: 'sm' }));
      } else reminderBar.classList.add('hidden');
      App.clear(metaRow);
      if (state.pinned) metaRow.appendChild(h('span.badge', icon('keep', { fill: true }), 'Pinned'));
      if (state.priority > 0) {
        var st = priorityStyle(state.priority);
        metaRow.appendChild(h('span.badge', { style: { background: st.bg, color: st.fg, borderColor: st.border } }, icon(st.icon, { fill: true }), PRIORITIES[state.priority].label));
      }
      if (state.archived) metaRow.appendChild(h('span.badge', icon('archive'), 'Archived'));
      if (created) created.textContent = state.created ? 'Created: ' + D.fmt(D.parseIso(state.created), 'MMM d, y · h:mm a') : 'New note';
    }
    var created;

    function moreMenu(anchor) {
      ui.menu(anchor, [
        { label: state.pinned ? 'Unpin' : 'Pin', icon: 'keep', fill: !!state.pinned, onClick: function () { setMeta({ pinned: state.pinned ? 0 : 1 }); } },
        { label: 'Priority: ' + PRIORITIES[state.priority].label, icon: 'flag', onClick: function () {
          priorityDialog(state.priority).then(function (r) { if (r) setMeta({ priority: r.priority }); });
        } },
        { label: 'Duplicate', icon: 'content_copy', onClick: function () {
          var saved = save(true);
          var now = D.isoLocal();
          S.insert('notes', {
            title: titleInput.value + ' (Copy)', content: currentContent(), pinned: state.pinned, favorite: state.favorite,
            color: state.color, archived: state.archived, reminder_time: state.reminder, priority: state.priority, created_at: now, updated_at: now,
          });
          ui.snack('Note duplicated', { type: 'success' });
          if (saved || state.id) close(); else { state.closing = true; layer.close(); }
        } },
        { label: navigator.share ? 'Share' : 'Copy as text', icon: 'share', onClick: function () { actions.share(titleInput.value, App.delta.plainText(currentContent())); } },
        { label: state.archived ? 'Unarchive' : 'Archive', icon: state.archived ? 'unarchive' : 'archive', onClick: function () {
          state.archived = state.archived ? 0 : 1;
          var saved = save(true);
          if (saved) ui.snack(state.archived ? 'Note archived' : 'Note unarchived');
          close();
        } },
        state.id ? { divider: true } : null,
        state.id ? { label: 'Delete Note', icon: 'delete', danger: true, onClick: function () {
          var t = titleInput.value.trim() || 'Untitled Note';
          ui.confirm('Move to Trash', 'Move "' + t + '" to trash?', 'Delete', { icon: 'delete', danger: true }).then(function (ok) {
            if (!ok) return;
            save(true);
            var n = S.get('notes', state.id);
            state.closing = true;
            layer.close();
            actions.trash(n);
          });
        } } : null,
      ].filter(Boolean), { label: 'More' });
    }

    // Formatting toolbar ------------------------------------------------
    var toolButtons = {};
    function exec(cmd, arg) {
      editor.focus();
      try { document.execCommand('styleWithCSS', false, false); } catch (e) { /* older browsers */ }
      document.execCommand(cmd, false, arg);
      afterFormat();
    }
    function afterFormat() { normalizeChecklists(); markDirty(); refreshToolbar(); }
    function currentBlock() {
      var sel = window.getSelection();
      if (!sel.rangeCount) return null;
      var n = sel.getRangeAt(0).startContainer;
      while (n && n !== editor) {
        if (n.nodeType === 1 && /^(P|DIV|LI|BLOCKQUOTE|H1|H2|H3)$/.test(n.tagName)) return n;
        n = n.parentNode;
      }
      return null;
    }
    function closest(tag) {
      var sel = window.getSelection();
      if (!sel.rangeCount) return null;
      var n = sel.getRangeAt(0).startContainer;
      while (n && n !== editor) { if (n.nodeType === 1 && n.tagName === tag) return n; n = n.parentNode; }
      return null;
    }
    function listType() {
      var li = closest('LI');
      if (!li || !li.parentElement) return null;
      if (li.parentElement.classList.contains('checklist')) return 'check';
      return li.parentElement.tagName === 'OL' ? 'ordered' : 'bullet';
    }
    function setList(kind) {
      var cur = listType();
      editor.focus();
      if (kind === 'check') {
        if (cur === 'check') { exec('insertUnorderedList'); return; }
        if (cur !== 'bullet') { try { document.execCommand('insertUnorderedList'); } catch (e) { /* noop */ } }
        var li = closest('LI');
        if (li && li.parentElement) {
          li.parentElement.classList.add('checklist');
          Array.prototype.forEach.call(li.parentElement.children, function (x) { if (!x.hasAttribute('data-checked')) x.setAttribute('data-checked', 'false'); });
        }
        afterFormat();
        return;
      }
      if (kind === 'bullet' && cur === 'check') {
        var l2 = closest('LI');
        l2.parentElement.classList.remove('checklist');
        Array.prototype.forEach.call(l2.parentElement.children, function (x) { x.removeAttribute('data-checked'); });
        afterFormat();
        return;
      }
      exec(kind === 'ordered' ? 'insertOrderedList' : 'insertUnorderedList');
    }
    function toggleQuote() {
      if (closest('BLOCKQUOTE')) exec('formatBlock', 'P');
      else exec('formatBlock', 'BLOCKQUOTE');
    }
    function clearFormat() {
      exec('removeFormat');
      if (closest('BLOCKQUOTE')) exec('formatBlock', 'P');
      var lt = listType();
      if (lt === 'ordered') exec('insertOrderedList');
      else if (lt) exec('insertUnorderedList');
    }
    function normalizeChecklists() {
      editor.querySelectorAll('ul.checklist > li:not([data-checked])').forEach(function (li) { li.setAttribute('data-checked', 'false'); });
      editor.querySelectorAll('ul:not(.checklist) > li[data-checked], ol > li[data-checked]').forEach(function (li) { li.removeAttribute('data-checked'); });
      // Browsers sometimes leave a list directly inside a <p>; unwrap it.
      editor.querySelectorAll('p > ul, p > ol').forEach(function (list) {
        var p = list.parentNode;
        p.parentNode.insertBefore(list, p);
        if (!p.textContent.trim() && !p.querySelector('img')) p.remove();
      });
    }
    function refreshToolbar() {
      var states = {};
      try {
        states.bold = document.queryCommandState('bold');
        states.italic = document.queryCommandState('italic');
        states.underline = document.queryCommandState('underline');
        states.strike = document.queryCommandState('strikeThrough');
      } catch (e) { /* ignore */ }
      var lt = listType();
      states.ordered = lt === 'ordered'; states.bullet = lt === 'bullet'; states.check = lt === 'check';
      states.quote = !!closest('BLOCKQUOTE');
      Object.keys(toolButtons).forEach(function (k) {
        if (k in states) toolButtons[k].setAttribute('aria-pressed', String(!!states[k]));
      });
    }
    function tool(key, name, title, fn) {
      var b = h('button.icon-btn.sm.tool', { type: 'button', title: title, 'aria-label': title, 'aria-pressed': 'false' }, icon(name));
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
      b.addEventListener('click', function () { fn(); });
      toolButtons[key] = b;
      return b;
    }

    var cleanup = [];
    var layer = ui.panel({
      label: 'Note editor',
      autofocus: false,
      beforeDismiss: function () { close(); return false; },
      onClose: function () {
        cleanup.forEach(function (fn) { fn(); });
        if (onClosed) onClosed();
      },
      build: function () {
        titleInput = h('input.note-title-input', { type: 'text', maxlength: '100', placeholder: 'Enter note title', 'aria-label': 'Title', value: note ? note.title : '' });
        counter = h('span.counter.title-counter');
        editor = h('div.note-editor', { contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Note text', 'data-placeholder': 'Start writing…', spellcheck: 'true' });
        editor.innerHTML = App.delta.toHtml(note ? note.content : '');
        favBtn = App.iconBtn('star', 'Favorite', function () { setMeta({ favorite: state.favorite ? 0 : 1 }); });
        reminderBar = h('div.reminder-bar.hidden');
        metaRow = h('div.note-meta-row');
        statusEl = h('span.save-status');
        wordsEl = h('span');
        created = h('span');
        panelEl = null;

        titleInput.addEventListener('input', markDirty);
        titleInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || (e.key === 'ArrowDown' && titleInput.selectionStart === titleInput.value.length)) { e.preventDefault(); editor.focus(); }
        });
        editor.addEventListener('input', function (e) {
          if (e.inputType === 'insertParagraph') {
            var li = closest('LI');
            if (li && li.parentElement.classList.contains('checklist')) li.setAttribute('data-checked', 'false');
          }
          normalizeChecklists();
          markDirty();
        });
        editor.addEventListener('paste', function (e) {
          var text = (e.clipboardData || window.clipboardData).getData('text/plain');
          e.preventDefault();
          document.execCommand('insertText', false, text);
        });
        editor.addEventListener('drop', function (e) {
          var text = e.dataTransfer && e.dataTransfer.getData('text/plain');
          e.preventDefault();
          if (text) document.execCommand('insertText', false, text);
        });
        editor.addEventListener('click', function (e) {
          var li = e.target.closest && e.target.closest('ul.checklist > li');
          if (!li) return;
          var r = li.getBoundingClientRect();
          if (e.clientX - r.left < 30) {
            li.setAttribute('data-checked', li.getAttribute('data-checked') === 'true' ? 'false' : 'true');
            markDirty();
          }
        });
        editor.addEventListener('keydown', function (e) {
          var mod = e.ctrlKey || e.metaKey;
          if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); close(); }
          else if (mod && e.shiftKey && e.key.toLowerCase() === 'x') { e.preventDefault(); exec('strikeThrough'); }
          else if (mod && e.shiftKey && e.key === '7') { e.preventDefault(); setList('ordered'); }
          else if (mod && e.shiftKey && e.key === '8') { e.preventDefault(); setList('bullet'); }
          else if (mod && e.shiftKey && e.key === '9') { e.preventDefault(); setList('check'); }
          else if (mod && /^[biu]$/i.test(e.key)) { setTimeout(function () { markDirty(); refreshToolbar(); }, 0); }
        });
        var onSel = function () { if (editor.contains(document.activeElement) || document.activeElement === editor) refreshToolbar(); };
        document.addEventListener('selectionchange', onSel);
        var onHide = function () { if (!state.closing && state.dirty) save(true); };
        window.addEventListener('pagehide', onHide);
        cleanup.push(function () { window.removeEventListener('pagehide', onHide); });

        var toolbar = h('div.note-toolbar', { role: 'toolbar', 'aria-label': 'Formatting' },
          tool('undo', 'undo', 'Undo (Ctrl+Z)', function () { exec('undo'); }),
          tool('redo', 'redo', 'Redo (Ctrl+Y)', function () { exec('redo'); }),
          h('span.tool-sep'),
          tool('bold', 'format_bold', 'Bold (Ctrl+B)', function () { exec('bold'); }),
          tool('italic', 'format_italic', 'Italic (Ctrl+I)', function () { exec('italic'); }),
          tool('underline', 'format_underlined', 'Underline (Ctrl+U)', function () { exec('underline'); }),
          tool('strike', 'format_strikethrough', 'Strikethrough (Ctrl+Shift+X)', function () { exec('strikeThrough'); }),
          h('span.tool-sep'),
          tool('ordered', 'format_list_numbered', 'Numbered list (Ctrl+Shift+7)', function () { setList('ordered'); }),
          tool('bullet', 'format_list_bulleted', 'Bullet list (Ctrl+Shift+8)', function () { setList('bullet'); }),
          tool('check', 'checklist', 'Checklist (Ctrl+Shift+9)', function () { setList('check'); }),
          tool('quote', 'format_quote', 'Quote', toggleQuote),
          h('span.tool-sep'),
          tool('clear', 'format_clear', 'Clear format', clearFormat));

        var reminderBtn = App.iconBtn('notifications', 'Set reminder', function () {
          reminderDialog(state.reminder).then(function (r) {
            if (!r) return;
            if (r.remove) { setMeta({ reminder: null }); ui.snack('Reminder removed'); return; }
            setMeta({ reminder: r.at });
            App.notify.requestPermission();
            var d = D.parseIso(r.at);
            ui.snack('Reminder set for ' + D.fmt(d, 'MMM d') + ' at ' + D.fmt(d, 'h:mm a'), { type: 'success' });
          });
        });
        var colorBtn = App.iconBtn('palette', 'Change color', function () {
          colorDialog(state.color).then(function (r) { if (r) setMeta({ color: r.color }); });
        });
        var moreBtn = App.iconBtn('more_vert', 'More', function () { moreMenu(moreBtn); });

        var content = [
          h('div.panel-head',
            App.iconBtn('arrow_back', 'Save and close (Esc)', close),
            h('h2', note ? 'Edit Note' : 'New Note'),
            favBtn, colorBtn, reminderBtn, moreBtn,
            App.btn('filled', 'Save', close, { icon: 'check', cls: 'save-btn' })),
          h('div.panel-body.note-body',
            metaRow,
            h('div.title-wrap', titleInput, counter),
            toolbar,
            editor),
          reminderBar,
          h('div.note-foot', wordsEl, statusEl, h('span.grow'), created),
        ];
        setTimeout(function () {
          panelEl = layer.el;
          panelEl.classList.add('note-panel');
          drawMeta();
          updateCounts();
          (note ? editor : titleInput).focus();
          if (note) {
            // Caret at the end of the text.
            var r = document.createRange();
            r.selectNodeContents(editor);
            r.collapse(false);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(r);
          }
        }, 0);
        cleanup.push(function () { document.removeEventListener('selectionchange', onSel); });
        return content;
      },
    });
    return { close: close, id: function () { return state.id; } };
  }

  // ----------------------------------------------------------- list view ---
  App.views.notes = function (main, params) {
    var query = '', filter = 'all', selected = {}, editor = null;
    var searchInput, bodyEl, chipsEl, headEl;

    function allNotes() { return S.all('notes'); }
    function counts() {
      var c = { all: 0, favorite: 0, reminder: 0, priority: 0, archived: 0, trash: 0 };
      allNotes().forEach(function (n) {
        if (n.deleted_at) { c.trash++; return; }
        if (n.archived) { c.archived++; return; }
        c.all++;
        if (n.favorite) c.favorite++;
        if (n.reminder_time) c.reminder++;
        if (n.priority >= 2) c.priority++;
      });
      return c;
    }
    function visible() {
      var q = query.toLowerCase();
      var showArchived = S.pref('notes_show_archived');
      var list = allNotes().filter(function (n) {
        if (n.deleted_at) return false;
        if (q && n.title.toLowerCase().indexOf(q) < 0 && plain(n).toLowerCase().indexOf(q) < 0) return false;
        switch (filter) {
          case 'favorite': return n.favorite && !n.archived;
          case 'reminder': return n.reminder_time && !n.archived;
          case 'priority': return n.priority >= 2 && !n.archived;
          case 'archived': return !!n.archived;
          default: return showArchived || !n.archived;
        }
      });
      var sort = S.pref('notes_sort');
      if (sort === 'created') list.sort(function (a, b) { return time(b.created_at) - time(a.created_at); });
      else if (sort === 'title') list.sort(function (a, b) { return a.title < b.title ? -1 : a.title > b.title ? 1 : 0; });
      else list.sort(function (a, b) { if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1; return time(b.updated_at) - time(a.updated_at); });
      return list;
    }
    function selectedIds() { return Object.keys(selected).filter(function (k) { return selected[k]; }).map(Number); }

    function openNote(id) { location.hash = '#/notes/' + (id || 'new'); }

    function drawHead() {
      App.clear(headEl);
      var ids = selectedIds();
      if (ids.length) {
        headEl.classList.add('selecting');
        headEl.append(
          App.iconBtn('close', 'Cancel', function () { selected = {}; draw(); }),
          h('div.view-title', ids.length + ' selected'),
          App.btn('text', 'Select all', function () { visible().forEach(function (n) { selected[n.id] = true; }); draw(); }, { icon: 'select_all' }),
          App.btn('tonal', 'Move to trash', function () {
            var count = ids.length;
            ui.confirm('Move to Trash', 'Move ' + count + ' selected note' + (count > 1 ? 's' : '') + ' to trash?', 'Delete', { danger: true }).then(function (ok) {
              if (!ok) return;
              var now = D.isoLocal();
              S.batch(function () { ids.forEach(function (id) { S.update('notes', id, { deleted_at: now }); }); });
              selected = {};
              ui.snack('Moved ' + count + ' note' + (count > 1 ? 's' : '') + ' to trash', {
                action: { label: 'Undo', onClick: function () { S.batch(function () { ids.forEach(function (id) { S.update('notes', id, { deleted_at: null }); }); }); } },
              });
            });
          }, { icon: 'delete' }));
        return;
      }
      headEl.classList.remove('selecting');
      var c = counts();
      var grid = S.pref('notes_view') === 'grid';
      var moreBtn = App.iconBtn('more_vert', 'More options', function () {
        var sort = S.pref('notes_sort');
        ui.menu(moreBtn, [
          { header: 'Sort' },
          { label: 'Sort by Updated', icon: 'history', checked: sort === 'updated', onClick: function () { S.setPref('notes_sort', 'updated'); } },
          { label: 'Sort by Created', icon: 'today', checked: sort === 'created', onClick: function () { S.setPref('notes_sort', 'created'); } },
          { label: 'Sort by Title', icon: 'sort', checked: sort === 'title', onClick: function () { S.setPref('notes_sort', 'title'); } },
          { divider: true },
          { label: 'Show Archived', icon: 'archive', checked: !!S.pref('notes_show_archived'), onClick: function () { S.setPref('notes_show_archived', !S.pref('notes_show_archived')); } },
        ]);
      });
      headEl.append(
        h('h1.view-title', 'Notes', c.all ? h('small', String(c.all)) : null),
        searchBox(),
        App.iconBtn(grid ? 'view_list' : 'grid_view', grid ? 'List view' : 'Grid view', function () { S.setPref('notes_view', grid ? 'list' : 'grid'); }),
        h('span.badge-wrap', App.iconBtn('delete', 'Trash (' + c.trash + ')', openTrash), c.trash ? h('span.dot-badge', String(c.trash)) : null),
        moreBtn,
        App.btn('filled', 'New note', function () { openNote(null); }, { icon: 'add', cls: 'hide-phone' }));
    }
    function searchBox() {
      if (!searchInput) {
        searchInput = h('input', { type: 'search', placeholder: 'Search notes by title or content...', 'aria-label': 'Search notes' });
        var deb = App.debounce(function () { query = searchInput.value.trim(); drawBody(); }, 250);
        searchInput.addEventListener('input', function () { clearBtn.classList.toggle('hidden', !searchInput.value); deb(); });
        searchInput.addEventListener('keydown', function (e) { if (e.key === 'Escape' && searchInput.value) { e.stopPropagation(); searchInput.value = ''; query = ''; clearBtn.classList.add('hidden'); drawBody(); } });
        var clearBtn = App.iconBtn('close', 'Clear search', function () { searchInput.value = ''; query = ''; clearBtn.classList.add('hidden'); drawBody(); searchInput.focus(); }, { cls: 'hidden' });
        searchInput._wrap = h('label.search', icon('search'), searchInput, clearBtn);
      }
      return searchInput._wrap;
    }
    function drawChips() {
      App.clear(chipsEl);
      var c = counts();
      var defs = [['all', 'All', c.all, 'description']];
      if (c.favorite) defs.push(['favorite', 'Favorites', c.favorite, 'star']);
      if (c.reminder) defs.push(['reminder', 'Reminders', c.reminder, 'notifications_active']);
      if (c.priority) defs.push(['priority', 'Priority', c.priority, 'local_fire_department']);
      if (c.archived) defs.push(['archived', 'Archived', c.archived, 'archive']);
      if (!defs.some(function (d) { return d[0] === filter; })) filter = 'all';
      defs.forEach(function (d) {
        var sel = filter === d[0];
        chipsEl.appendChild(ui.chip(d[1], sel, function () { filter = sel && d[0] !== 'all' ? 'all' : d[0]; draw(); }, { icon: d[3], fill: sel, noCheck: true, count: d[2] }));
      });
    }

    function card(n, grid) {
      var bg = noteBg(n.color, false);
      var text = plain(n);
      var isSel = !!selected[n.id];
      var selecting = selectedIds().length > 0;
      var updated = D.parseIso(n.updated_at);
      var words = App.delta.wordCount(n.content);
      var badges = [];
      if (n.pinned) badges.push(h('span.badge', icon('keep', { fill: true }), 'Pinned'));
      if (n.priority > 0) {
        var st = priorityStyle(n.priority);
        badges.push(h('span.badge', { style: { background: st.bg, color: st.fg, borderColor: st.border }, title: PRIORITIES[n.priority].label }, icon(st.icon, { fill: true }), st.label));
      }
      if (n.archived) badges.push(h('span.badge', icon('archive'), 'Archived'));
      var moreBtn = App.iconBtn('more_vert', 'Note actions', function (e) { e.stopPropagation(); cardMenu(n, moreBtn); }, { cls: 'sm card-more' });
      var el = h('article.note-card' + (grid ? '.grid' : '.list') + (isSel ? '.selected' : ''), {
        tabindex: '0', role: 'button', 'aria-label': (n.title || 'Untitled Note'),
        style: bg ? { background: 'linear-gradient(' + bg + ',' + bg + '), var(--md-surface-container-lowest)', borderColor: App.color.rgba(n.color, 0.9) } : null,
        onclick: function (e) {
          if (selecting || e.ctrlKey || e.metaKey) { toggleSel(n.id); return; }
          openNote(n.id);
        },
        onkeydown: function (e) {
          if (e.target !== el) return;
          if (e.key === 'Enter') openNote(n.id);
          else if (e.key === ' ') { e.preventDefault(); toggleSel(n.id); }
          else if (e.key === 'Delete') actions.trash(n);
        },
      },
      h('button.select-box' + (isSel ? '.on' : ''), {
        type: 'button', title: isSel ? 'Deselect' : 'Select', 'aria-label': isSel ? 'Deselect note' : 'Select note',
        onclick: function (e) { e.stopPropagation(); toggleSel(n.id); },
      }, icon(isSel ? 'check_circle' : 'radio_button_unchecked', { fill: isSel })),
      h('div.card-top', badges, h('span.grow'),
        n.reminder_time ? h('span.card-ic', { title: 'Reminder: ' + D.fmt(D.parseIso(n.reminder_time), 'MMM d, h:mm a') }, icon('notifications_active', { fill: true })) : null,
        h('button.card-star' + (n.favorite ? '.on' : ''), {
          type: 'button', title: n.favorite ? 'Remove from favorites' : 'Add to favorites', 'aria-label': n.favorite ? 'Remove from favorites' : 'Add to favorites',
          onclick: function (e) { e.stopPropagation(); actions.toggleFavorite(n); },
        }, icon('star', { fill: !!n.favorite })),
        moreBtn),
      h('h3.note-card-title', n.title || 'Untitled Note'),
      h('p.card-preview' + (text ? '' : '.empty-text'), text || 'No additional text'),
      h('div.card-foot', n.color != null ? h('span.color-dot', { style: { background: App.color.argbToHex(n.color) } }) : null,
        h('span', formatNoteDate(updated)), h('span.sep', '·'), h('span', App.plural(words, 'word'))));
      return el;
    }
    function toggleSel(id) { selected[id] = !selected[id]; if (!selected[id]) delete selected[id]; draw(); }
    function cardMenu(n, anchor) {
      ui.menu(anchor, [
        { label: 'Open', icon: 'edit', onClick: function () { openNote(n.id); } },
        { label: n.pinned ? 'Unpin' : 'Pin', icon: 'keep', fill: !!n.pinned, onClick: function () { actions.togglePin(n); } },
        { label: n.favorite ? 'Remove from favorites' : 'Add to favorites', icon: 'star', fill: !!n.favorite, onClick: function () { actions.toggleFavorite(n); } },
        { label: 'Change color', icon: 'palette', onClick: function () { colorDialog(n.color).then(function (r) { if (r) S.update('notes', n.id, { color: r.color }); }); } },
        { label: 'Priority: ' + PRIORITIES[n.priority].label, icon: 'flag', onClick: function () { priorityDialog(n.priority).then(function (r) { if (r) S.update('notes', n.id, { priority: r.priority }); }); } },
        { label: n.reminder_time ? 'Edit reminder' : 'Set reminder', icon: 'notifications', onClick: function () {
          reminderDialog(n.reminder_time).then(function (r) {
            if (!r) return;
            S.update('notes', n.id, { reminder_time: r.remove ? null : r.at });
            if (!r.remove) App.notify.requestPermission();
            ui.snack(r.remove ? 'Reminder removed' : 'Reminder set', { type: 'success' });
          });
        } },
        { label: 'Duplicate', icon: 'content_copy', onClick: function () { actions.duplicate(n); } },
        { label: navigator.share ? 'Share' : 'Copy as text', icon: 'share', onClick: function () { actions.share(n.title, plain(n)); } },
        { label: n.archived ? 'Unarchive' : 'Archive', icon: n.archived ? 'unarchive' : 'archive', onClick: function () { actions.archive(n); } },
        { label: 'Select', icon: 'check_circle', onClick: function () { toggleSel(n.id); } },
        { divider: true },
        { label: 'Move to trash', icon: 'delete', danger: true, onClick: function () { actions.trash(n); } },
      ]);
    }

    function drawBody() {
      App.clear(bodyEl);
      bodyEl.classList.toggle('selecting-mode', selectedIds().length > 0);
      var list = visible();
      var c = counts();
      if (!list.length) {
        if (query) {
          bodyEl.appendChild(ui.emptyState('search_off', 'No matching notes found', 'Try a different search term or clear the search',
            App.btn('tonal', 'Clear search', function () { searchInput.value = ''; query = ''; searchInput._wrap.querySelector('.icon-btn').classList.add('hidden'); drawBody(); }, { icon: 'close' })));
        } else if (filter !== 'all') {
          bodyEl.appendChild(ui.emptyState('filter_list', 'Nothing here', 'No notes match this filter.', App.btn('tonal', 'Show all notes', function () { filter = 'all'; draw(); })));
        } else if (c.all === 0 && (!S.pref('notes_show_archived') || c.archived === 0)) {
          bodyEl.appendChild(ui.emptyState('description', 'No notes yet', 'Capture your thoughts, ideas, checklists, and memories all in one place.',
            App.btn('filled', 'Create First Note', function () { openNote(null); }, { icon: 'add', cls: 'btn-lg' })));
        } else {
          bodyEl.appendChild(ui.emptyState('description', 'No notes to show', 'Archived notes are hidden. Turn on "Show Archived" in the menu to see them.'));
        }
        return;
      }
      var grid = S.pref('notes_view') === 'grid';
      var wrap = h('div.notes-' + (grid ? 'grid' : 'list'));
      list.forEach(function (n) { wrap.appendChild(card(n, grid)); });
      bodyEl.appendChild(wrap);
      if (!selectedIds().length && list.length > 1) bodyEl.appendChild(h('p.hint', 'Tip: Ctrl+click or use the circle to select several notes. Press / to search.'));
    }
    function draw() {
      // Drop selections of notes that no longer exist or are hidden.
      var vis = {};
      visible().forEach(function (n) { vis[n.id] = true; });
      Object.keys(selected).forEach(function (k) { if (!vis[k]) delete selected[k]; });
      drawHead(); drawChips(); drawBody();
    }

    function openTrash() {
      ui.panel({
        cls: 'narrow', label: 'Trash',
        build: function (layer) {
          var body = h('div.panel-body');
          var head = h('div.panel-head');
          function render() {
            var trashed = allNotes().filter(function (n) { return n.deleted_at; }).sort(function (a, b) { return time(b.deleted_at) - time(a.deleted_at); });
            App.clear(head).append(App.iconBtn('close', 'Close', function () { layer.close(); }), h('h2', 'Trash'),
              trashed.length ? App.btn('text', 'Empty Trash', function () {
                var k = trashed.length;
                ui.confirm('Empty Trash', 'Permanently delete all ' + k + ' trashed note' + (k !== 1 ? 's' : '') + '? This action cannot be undone.', 'Delete', { danger: true }).then(function (ok) {
                  if (ok) { S.remove('notes', function (n) { return !!n.deleted_at; }); ui.snack('Trash emptied'); render(); }
                });
              }, { cls: 'btn-danger' }) : null);
            App.clear(body);
            if (!trashed.length) { body.appendChild(ui.emptyState('delete', 'Trash is empty', 'Deleted notes will appear here')); return; }
            trashed.forEach(function (n) {
              var d = D.parseIso(n.deleted_at);
              body.appendChild(h('div.trash-row',
                h('div.grow', h('b', n.title || 'Untitled Note'), h('small.muted', 'Deleted ' + formatNoteDate(d)), h('p.muted.trash-preview', plain(n) || 'No additional text')),
                App.iconBtn('restore_from_trash', 'Restore', function () { S.update('notes', n.id, { deleted_at: null }); ui.snack('Note restored', { type: 'success' }); render(); }),
                App.iconBtn('delete_forever', 'Delete permanently', function () {
                  ui.confirm('Delete Permanently', 'Permanently delete "' + (n.title || 'Untitled') + '"? This action cannot be undone.', 'Delete', { danger: true }).then(function (ok) {
                    if (ok) { S.remove('notes', n.id); render(); }
                  });
                }, { color: 'var(--md-error)' })));
            });
          }
          render();
          return [head, body];
        },
      });
    }

    function syncEditor(p) {
      var target = p && p[0];
      if (!target) {
        if (editor) { var e = editor; editor = null; e.close(); }
        return;
      }
      var id = target === 'new' ? null : parseInt(target, 10);
      if (editor && (editor.id() === id || (target === 'new' && editor.id() == null))) return;
      if (editor) { var old = editor; editor = null; old.close(); }
      if (id && !S.get('notes', id)) { ui.snack('That note no longer exists', { type: 'error' }); history.replaceState(null, '', '#/notes'); return; }
      var mine = openEditor(id, function () {
        if (editor === mine) editor = null;
        if (/^#\/notes\/./.test(location.hash)) location.hash = '#/notes';
      });
      editor = mine;
    }

    var view = h('section.view.notes-view');
    headEl = h('header.view-head');
    chipsEl = h('div.chips.notes-chips');
    bodyEl = h('div.view-body');
    view.append(headEl, h('div.chips-bar', chipsEl), bodyEl, h('button.fab.show-phone', { type: 'button', onclick: function () { openNote(null); }, 'aria-label': 'Create note' }, icon('add'), 'New'));
    main.appendChild(view);
    draw();
    syncEditor(params);

    return {
      update: function (p) { syncEditor(p); },
      onData: function () { draw(); },
      unmount: function () { if (editor) { var e = editor; editor = null; e.close(); } },
    };
  };
})();
