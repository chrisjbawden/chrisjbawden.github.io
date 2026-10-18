(function () {
  'use strict';
  window.__terminalModuleLoaded = true;

  const COMMANDS = [
    'cat',
    'cd',
    'clear',
    'cp',
    'curl',
    'date',
    'dev',
    'echo',
    'exit',
    'help',
    'history',
    'ls',
    'mkdir',
    'nano',
    'nslookup',
    'ping',
    'pwd',
    'rm',
    'touch',
    'uname',
    'wget',
    'whoami',
    'write'
  ];

  const SITE_LISTINGS = {
    '/': ['blog/', 'index.html', 'javascripts/', 'media/', 'portfolio/', 'sidebar.html', 'stylesheets/'],
    blog: ['bin/', 'blog.html', 'cs50.html', 'loader.js', 'media/', 'pick/', 'posts/'],
    'blog/bin': ['adobe/', 'encode/'],
    'blog/bin/adobe': ['79693h0chh0icdaw.pdf', 'index.html', 'readerdc64_en_xa_crd_install.exe', 'template.pdf'],
    'blog/bin/encode': ['au-encode.html', 'encode.html'],
    'blog/media': ['Image 001 20 45.png', 'blog-instructions/', 'icons8-security-lock-80.png', 'infode-logo.png'],
    'blog/pick': ['css/', 'index.html', 'js/', 'particles.json'],
    'blog/pick/css': ['style.css'],
    'blog/pick/js': ['app.js', 'lib/', 'package.json', 'particles.js', 'particles.min.js'],
    'blog/pick/js/lib': ['stats.js'],
    'blog/posts': [
      '2020-12-07-Using-Github-to-host-your-portoflio.html',
      '2021-12-09-Threat-Modeling-Adobe-PDF.html',
      '2022-05-28-ServiceNow-URL-encoder.html',
      '2022-09-23-WiFi-History.html',
      '2022-10-15-ZIP-Bomb.html',
      '2022-11-02-Browser-based-hash-tool.html',
      '2025-04-27-CS50-Project.html',
      '2025-06-20-Wildcard-DNS-services.html',
      '2025-07-03-Captcha-practice.html',
      '2025-07-27-Multi-tab-loader-easier-access.html',
      '2025-07-30-DockerManager.html',
      '2025-08-10-dockerhub-counts-experiment.html',
      '2026-02-02-containrr-watchtower.html'
    ],
    portfolio: ['CV.pdf', 'badges/', 'certificates/', 'content.json', 'media/', 'portfolio.html', 'tertiary/'],
    'portfolio/badges': ['GIAC-Cert_GCSA.png', 'apisecfund.png', 'cczt.png', 'certificate-of-cloud-security-knowledge-v-5.png', 'gcsb.png', 'isccand.png', 'kf100.png', 'lfc108.png'],
    'portfolio/certificates': [' Google Cybersecurity Certificate.pdf', 'CCSK.pdf', 'CCZT.pdf', 'CISSP Security -Certificate of Achievement.pdf', 'CS50x.pdf', 'DCNP Security.pdf', 'Digital Forensics - Certificate of Achievement.pdf', 'GIAC-CSA.pdf', 'Pen Testing - Certificate of Achievement.pdf', 'SANS-SEC540.pdf', 'UBWA.pdf', 'UEWA.pdf'],
    'portfolio/media': ['UEWA_1-Color_Badge-2.png', 'badge-ubwa.png'],
    'portfolio/tertiary': ['Cert III in Web technologies.pdf', 'Diploma in Information Technology - Networking.pdf', 'Graduate Certificate in Cyber Security.pdf'],
    media: ['2024-10-31 14 48 49.png', '6C83376E-6257-4D85-9631-B2F3EF39B982.png', 'Twitter_Logo_WhiteOnBlue-310x310.png', 'WhatsApp_Logo_3-150x150.png', 'document-icon.png', 'error.mp4', 'flogo-RGB-HEX-Blk-58.png', 'hash.png', 'left-arrow-icon.png', 'mail_icon_128820.png', 'mdi-code.png', 'profile/', 'qr-code.png', 'video.mp4', 'xml.png'],
    'media/profile': ['02.png'],
    stylesheets: ['pygment_trac.css', 'styles.css'],
    javascripts: ['scale.fix.js']
  };

  const STATE = {
    buffer: '',
    codeBuffer: '',
    videoOverlay: null,
    videoTimer: null,
    user: 'user',
    host: 'browser',
    cwd: '/',
    history: [],
    nano: {
      open: false,
      path: '',
      original: '',
      dirty: false
    },
    terminal: {
      drag: null
    }
  };

  const STORAGE_KEY = 'terminal-virtual-fs-v1';

  const DOM = {};

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function isTextInput(el) {
    return Boolean(el && el.closest && el.closest("input, textarea, [contenteditable='true']"));
  }

  function normalizeLocalPath(target) {
    const trimmed = String(target || '').trim();
    if (!trimmed) return '';
    return trimmed.replace(/^\/+/, '').replace(/\/+$/, '') || '/';
  }

  function resolvePath(target, basePath = STATE.cwd) {
    const trimmed = String(target || '').trim();
    if (!trimmed) return basePath;
    if (trimmed.startsWith('/')) return normalizeLocalPath(trimmed);

    const parts = (basePath === '/' ? [] : basePath.split('/').filter(Boolean)).slice();
    for (const part of trimmed.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') {
        parts.pop();
      } else {
        parts.push(part);
      }
    }
    return parts.length ? `/${parts.join('/')}` : '/';
  }

  function loadVirtualFs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { type: 'dir', children: {} };
      return JSON.parse(raw);
    } catch (error) {
      return { type: 'dir', children: {} };
    }
  }

  const VFS = loadVirtualFs();

  function saveVirtualFs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(VFS));
    } catch (error) {
      // ignore
    }
  }

  function getVirtualNode(path) {
    if (path === '/' || path === '') return VFS;
    const parts = path.split('/').filter(Boolean);
    let node = VFS;
    for (const part of parts) {
      if (!node.children || !node.children[part]) return null;
      node = node.children[part];
    }
    return node;
  }

  function ensureVirtualDir(path) {
    const normalized = normalizeLocalPath(path);
    if (!normalized || normalized === '/') return VFS;
    const parts = normalized.split('/').filter(Boolean);
    let node = VFS;
    for (const part of parts) {
      if (!node.children[part]) {
        node.children[part] = { type: 'dir', children: {} };
      }
      node = node.children[part];
      if (node.type !== 'dir') {
        return null;
      }
    }
    return node;
  }

  function getParentInfo(path) {
    const parts = path.split('/').filter(Boolean);
    const name = parts.pop();
    const parentPath = parts.length ? `/${parts.join('/')}` : '/';
    return { parent: getVirtualNode(parentPath), name, parentPath };
  }

  function isDirNode(node) {
    return Boolean(node && node.type === 'dir');
  }

  function isFileNode(node) {
    return Boolean(node && node.type === 'file');
  }

  function readVirtualFile(path) {
    const node = getVirtualNode(normalizeLocalPath(path));
    return isFileNode(node) ? (node.content || '') : null;
  }

  function writeVirtualFile(path, content) {
    const normalized = normalizeLocalPath(path);
    if (!normalized || normalized === '/') {
      return { ok: false, error: 'write: invalid file name' };
    }
    const { parentPath, name } = getParentInfo(normalized);
    if (!ensureVirtualDir(parentPath)) {
      return { ok: false, error: `write: cannot create '${path}': No such file or directory` };
    }
    const targetParent = getVirtualNode(parentPath);
    if (!targetParent || !isDirNode(targetParent)) {
      return { ok: false, error: `write: cannot create '${path}': No such file or directory` };
    }
    targetParent.children[name] = { type: 'file', content: String(content) };
    saveVirtualFs();
    return { ok: true };
  }

  function touchVirtualFile(path) {
    const normalized = normalizeLocalPath(path);
    if (!normalized || normalized === '/') {
      return { ok: false, error: 'touch: invalid file name' };
    }
    const { parentPath, name } = getParentInfo(normalized);
    ensureVirtualDir(parentPath);
    const parent = getVirtualNode(parentPath);
    if (!isDirNode(parent)) {
      return { ok: false, error: `touch: cannot create '${path}': No such file or directory` };
    }
    if (!parent.children[name]) {
      parent.children[name] = { type: 'file', content: '' };
      saveVirtualFs();
    }
    return { ok: true };
  }

  function mkdirVirtualDir(path) {
    const normalized = normalizeLocalPath(path);
    if (!normalized || normalized === '/') {
      return { ok: false, error: 'mkdir: invalid directory name' };
    }
    const { parentPath, name } = getParentInfo(normalized);
    ensureVirtualDir(parentPath);
    const parent = getVirtualNode(parentPath);
    if (!isDirNode(parent)) {
      return { ok: false, error: `mkdir: cannot create directory '${path}': No such file or directory` };
    }
    if (!parent.children[name]) {
      parent.children[name] = { type: 'dir', children: {} };
      saveVirtualFs();
    }
    return { ok: true };
  }

  function removeVirtualNode(path) {
    const normalized = normalizeLocalPath(path);
    if (!normalized || normalized === '/') {
      return { ok: false, error: 'rm: cannot remove root' };
    }
    const { parent, name } = getParentInfo(normalized);
    if (!parent || !parent.children || !parent.children[name]) {
      return { ok: false, error: `rm: cannot remove '${path}': No such file or directory` };
    }
    delete parent.children[name];
    saveVirtualFs();
    return { ok: true };
  }

  function cloneVirtualNode(node) {
    return clone(node);
  }

  function copyVirtualNode(sourcePath, destPath) {
    const sourceNode = getVirtualNode(sourcePath);
    if (!sourceNode) {
      return { ok: false, error: `cp: cannot stat '${sourcePath}': No such file or directory` };
    }
    const normalizedDest = normalizeLocalPath(destPath);
    const { parentPath, name } = getParentInfo(normalizedDest);
    ensureVirtualDir(parentPath);
    const parent = getVirtualNode(parentPath);
    if (!isDirNode(parent)) {
      return { ok: false, error: `cp: cannot create regular file '${destPath}': No such file or directory` };
    }
    parent.children[name] = cloneVirtualNode(sourceNode);
    saveVirtualFs();
    return { ok: true };
  }

  function listVirtualEntries(path) {
    const node = getVirtualNode(normalizeLocalPath(path));
    if (!isDirNode(node)) return null;
    return Object.entries(node.children || {}).map(([name, entry]) => (entry.type === 'dir' ? `${name}/` : name));
  }

  function listEntries(path) {
    const normalized = normalizeLocalPath(path);
    const builtin = SITE_LISTINGS[normalized === '/' ? '/' : normalized] || null;
    const virtual = listVirtualEntries(normalized);
    if (builtin && virtual) return Array.from(new Set([...builtin, ...virtual]));
    return virtual || builtin;
  }

  function basenameFromUrl(url) {
    try {
      const parsed = new URL(url, window.location.href);
      const parts = parsed.pathname.split('/').filter(Boolean);
      return decodeURIComponent(parts[parts.length - 1] || 'index.html');
    } catch (error) {
      return 'download.txt';
    }
  }

  function normalizeTarget(target) {
    const trimmed = String(target || '').trim();
    if (!trimmed) return '';
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) return trimmed;
    if (trimmed.startsWith('/') || trimmed.startsWith('.')) {
      return new URL(trimmed, window.location.href).href;
    }
    return `https://${trimmed}`;
  }

  function parseCommand(rawValue) {
    const parts = rawValue.trim().match(/"[^"]*"|'[^']*'|\S+/g) || [];
    const command = (parts.shift() || '').toLowerCase();
    const args = parts.map((part) => part.replace(/^["']|["']$/g, ''));
    return { command, args };
  }

  function appendTerminalLine(text, className = 'terminal-line') {
    const line = document.createElement('div');
    line.className = className;
    line.textContent = text;
    DOM.output.appendChild(line);
    DOM.output.scrollTop = DOM.output.scrollHeight;
  }

  function renderPrompt() {
    if (DOM.prompt) {
      DOM.prompt.textContent = `${STATE.user}@${STATE.host}:${STATE.cwd}$`;
    }
  }

  function positionWindow(windowEl) {
    const rect = windowEl.getBoundingClientRect();
    const left = Math.max(12, (window.innerWidth - rect.width) / 2);
    const top = Math.max(12, (window.innerHeight - rect.height) / 2);
    windowEl.style.left = `${left}px`;
    windowEl.style.top = `${top}px`;
  }

  function clampWindow(windowEl) {
    const rect = windowEl.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width - 12;
    const maxTop = window.innerHeight - rect.height - 12;
    const currentLeft = parseFloat(windowEl.style.left || `${rect.left}`) || rect.left;
    const currentTop = parseFloat(windowEl.style.top || `${rect.top}`) || rect.top;
    windowEl.style.left = `${Math.min(Math.max(12, currentLeft), Math.max(12, maxLeft))}px`;
    windowEl.style.top = `${Math.min(Math.max(12, currentTop), Math.max(12, maxTop))}px`;
  }

  function makeDraggable(windowEl, headerEl) {
    let drag = null;

    const start = (event) => {
      if (event.target.closest('button, input, textarea, select, a')) return;
      event.preventDefault();
      const rect = windowEl.getBoundingClientRect();
      drag = { offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
      windowEl.style.transform = 'none';
      windowEl.style.left = `${rect.left}px`;
      windowEl.style.top = `${rect.top}px`;
      document.body.style.userSelect = 'none';
    };

    const move = (event) => {
      if (!drag) return;
      const rect = windowEl.getBoundingClientRect();
      const nextLeft = event.clientX - drag.offsetX;
      const nextTop = event.clientY - drag.offsetY;
      const maxLeft = window.innerWidth - rect.width - 12;
      const maxTop = window.innerHeight - rect.height - 12;
      windowEl.style.left = `${Math.min(Math.max(12, nextLeft), Math.max(12, maxLeft))}px`;
      windowEl.style.top = `${Math.min(Math.max(12, nextTop), Math.max(12, maxTop))}px`;
    };

    const stop = () => {
      if (!drag) return;
      drag = null;
      document.body.style.userSelect = '';
    };

    headerEl.addEventListener('pointerdown', start);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    window.addEventListener('resize', () => clampWindow(windowEl));
  }

  function resolveTerminalCompletionCandidates(prefix, kind) {
    if (kind === 'command') {
      return COMMANDS.filter((command) => command.startsWith(prefix));
    }

    const current = prefix || '';
    const slashIndex = current.lastIndexOf('/');
    const base = slashIndex >= 0 ? current.slice(0, slashIndex + 1) : '';
    const partial = slashIndex >= 0 ? current.slice(slashIndex + 1) : current;
    const searchDir = base ? resolvePath(base) : STATE.cwd;
    const entries = listEntries(searchDir) || [];

    return entries
      .map((entry) => {
        const isDir = entry.endsWith('/');
        const name = entry.replace(/\/$/, '');
        return `${base}${name}${isDir ? '/' : ''}`;
      })
      .filter((candidate) => candidate.startsWith(current));
  }

  function longestCommonPrefix(values) {
    if (!values.length) return '';
    let prefix = values[0];
    for (const value of values.slice(1)) {
      while (prefix && !value.startsWith(prefix)) {
        prefix = prefix.slice(0, -1);
      }
    }
    return prefix;
  }

  function handleAutocomplete() {
    const input = DOM.input;
    const value = input.value;
    const cursor = input.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    const tokenStart = before.lastIndexOf(' ') + 1;
    const token = before.slice(tokenStart);
    const isCommandToken = tokenStart === 0;
    const candidates = resolveTerminalCompletionCandidates(token, isCommandToken ? 'command' : 'path');

    if (!candidates.length) return;

    const completion = longestCommonPrefix(candidates);
    const nextToken = completion || candidates[0];
    if (nextToken === token && candidates.length > 1) {
      appendTerminalLine(candidates.join('  '), 'terminal-line terminal-system');
      return;
    }

    const nextValue = `${before.slice(0, tokenStart)}${nextToken}${after}`;
    input.value = nextValue;
    const newCursor = (before.slice(0, tokenStart) + nextToken).length;
    input.setSelectionRange(newCursor, newCursor);

    if (candidates.length > 1 && completion === token) {
      appendTerminalLine(candidates.join('  '), 'terminal-line terminal-system');
    }
  }

  async function openNano(target) {
    const resolvedPath = resolvePath(target);
    let content = readVirtualFile(resolvedPath);

    if (content === null) {
      try {
        const response = await fetch(resolvedPath, { cache: 'no-store' });
        if (response.ok) {
          content = await response.text();
        } else {
          content = '';
        }
      } catch (error) {
        content = '';
      }
    }

    STATE.nano.open = true;
    STATE.nano.path = resolvedPath;
    STATE.nano.original = content || '';
    STATE.nano.dirty = false;

    DOM.nanoPath.textContent = resolvedPath;
    DOM.nanoEditor.value = content || '';
    DOM.nanoStatus.textContent = 'Ready';
    DOM.nanoOverlay.style.display = 'flex';
    DOM.nanoOverlay.setAttribute('aria-hidden', 'false');
    positionWindow(DOM.nanoWindow);
    DOM.nanoEditor.focus();
    DOM.nanoEditor.setSelectionRange(DOM.nanoEditor.value.length, DOM.nanoEditor.value.length);
  }

  function updateNanoDirtyState() {
    if (!STATE.nano.open) return;
    const dirty = DOM.nanoEditor.value !== STATE.nano.original;
    STATE.nano.dirty = dirty;
    DOM.nanoStatus.textContent = dirty ? 'Modified' : 'Saved';
  }

  function saveNanoFile() {
    const result = writeVirtualFile(STATE.nano.path, DOM.nanoEditor.value);
    if (!result.ok) {
      DOM.nanoStatus.textContent = result.error;
      return false;
    }
    STATE.nano.original = DOM.nanoEditor.value;
    STATE.nano.dirty = false;
    DOM.nanoStatus.textContent = `Wrote ${STATE.nano.path}`;
    return true;
  }

  function closeNano(force = false) {
    if (STATE.nano.open && STATE.nano.dirty && !force) {
      const save = window.confirm('Save changes before exiting nano?');
      if (save) {
        saveNanoFile();
      }
    }

    STATE.nano.open = false;
    DOM.nanoOverlay.style.display = 'none';
    DOM.nanoOverlay.setAttribute('aria-hidden', 'true');
    DOM.terminalInput.focus();
  }

  function handleNanoKeydown(event) {
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = DOM.nanoEditor.selectionStart ?? 0;
      const end = DOM.nanoEditor.selectionEnd ?? 0;
      const value = DOM.nanoEditor.value;
      DOM.nanoEditor.value = `${value.slice(0, start)}\t${value.slice(end)}`;
      DOM.nanoEditor.setSelectionRange(start + 1, start + 1);
      updateNanoDirtyState();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveNanoFile();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') {
      event.preventDefault();
      saveNanoFile();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'x') {
      event.preventDefault();
      closeNano();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeNano();
    }
  }

  function openTerminal() {
    DOM.terminalOverlay.style.display = 'flex';
    DOM.terminalOverlay.setAttribute('aria-hidden', 'false');
    positionWindow(DOM.terminalWindow);
    DOM.terminalInput.value = '';
    renderPrompt();
    DOM.terminalInput.focus();
  }

  function closeTerminal() {
    DOM.terminalOverlay.style.display = 'none';
    DOM.terminalOverlay.setAttribute('aria-hidden', 'true');
  }

  function handlePageHotkeys(event) {
    if (isTextInput(event.target)) return;

    if (event.key.length !== 1) return;

    STATE.buffer += event.key.toLowerCase();
    STATE.codeBuffer += event.key.toLowerCase();
    if (STATE.buffer.length > 8) STATE.buffer = STATE.buffer.slice(-8);
    if (STATE.codeBuffer.length > 4) STATE.codeBuffer = STATE.codeBuffer.slice(-4);

    if (STATE.buffer.endsWith('password')) {
      STATE.buffer = '';
      STATE.codeBuffer = '';
      if (STATE.videoTimer) clearTimeout(STATE.videoTimer);
      showVideoOverlay();
    }

    if (STATE.codeBuffer.endsWith('code')) {
      STATE.codeBuffer = '';
      const terminalTrigger = document.getElementById('terminal-trigger');
      if (terminalTrigger) terminalTrigger.click();
    }
  }

  function showVideoOverlay() {
    if (STATE.videoOverlay) STATE.videoOverlay.remove();

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = '#000';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.transition = 'opacity 0.5s';

    const video = document.createElement('video');
    video.src = 'media/error.mp4';
    video.autoplay = true;
    video.muted = true;
    video.loop = false;
    video.controls = false;
    video.style.maxWidth = '100vw';
    video.style.maxHeight = '100vh';
    video.style.boxShadow = '0 0 32px #000';
    video.playsInline = true;

    overlay.appendChild(video);
    document.body.appendChild(overlay);
    video.play();

    STATE.videoOverlay = overlay;
    STATE.videoTimer = setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        STATE.videoOverlay = null;
      }, 500);
    }, 10000);
  }

  function setTerminalLinePrompt() {
    renderPrompt();
  }

  function normalizePathForListing(path) {
    const normalized = normalizeLocalPath(path);
    return normalized === '' ? '/' : normalized;
  }

  function getWorkingDirectoryListing(path) {
    const normalized = normalizePathForListing(path);
    const builtin = SITE_LISTINGS[normalized === '/' ? '/' : normalized] || null;
    const virtual = listVirtualEntries(normalized);
    if (builtin && virtual) return Array.from(new Set([...builtin, ...virtual]));
    return virtual || builtin;
  }

  function listEntriesForCompletion(path) {
    return getWorkingDirectoryListing(path) || [];
  }

  async function runCommand(rawValue) {
    const value = rawValue.trim();
    if (!value) return;

    STATE.history.push(value);
    appendTerminalLine(`> ${value}`, 'terminal-line terminal-command');

    const { command, args } = parseCommand(value);

    if (command === 'dev') {
      document.cookie = 'dev=1; path=/; max-age=28800; samesite=lax';
      appendTerminalLine('Dev cookie set for 8 hours.', 'terminal-line terminal-success');
      window.open('/preview.html', '_blank', 'noopener');
      return;
    }

    if (command === 'exit') {
      closeTerminal();
      return;
    }

    if (command === 'help') {
      appendTerminalLine('Available commands: dev, exit, clear, whoami, pwd, ls, cd <dir>, touch <file>, mkdir <dir>, rm [-r] <path>, cp <source> <destination>, cat <path>, nano <file>, write <file> <text>, wget [-O <file>] <url>, echo <text>, date, uname, ping <host>, curl <url>, nslookup <host>, history', 'terminal-line terminal-system');
      return;
    }

    if (command === 'clear') {
      DOM.output.innerHTML = '';
      return;
    }

    if (command === 'history') {
      if (!STATE.history.length) {
        appendTerminalLine('(no history yet)', 'terminal-line terminal-system');
        return;
      }
      STATE.history.forEach((entry, index) => appendTerminalLine(`${index + 1}  ${entry}`, 'terminal-line terminal-system'));
      return;
    }

    if (command === 'whoami') {
      appendTerminalLine(STATE.user, 'terminal-line terminal-system');
      return;
    }

    if (command === 'pwd') {
      appendTerminalLine(STATE.cwd, 'terminal-line terminal-system');
      return;
    }

    if (command === 'ls') {
      const target = args[0] ? resolvePath(args[0]) : STATE.cwd;
      const entries = getWorkingDirectoryListing(target);
      if (!entries) {
        appendTerminalLine(`ls: cannot access '${args[0] || target}': no listing available in browser terminal`, 'terminal-line terminal-error');
        return;
      }
      appendTerminalLine(entries.join('  '), 'terminal-line terminal-system');
      return;
    }

    if (command === 'cd') {
      const target = args[0] || '/';
      const resolved = resolvePath(target);
      const builtin = SITE_LISTINGS[resolved === '/' ? '/' : resolved] || null;
      const node = getVirtualNode(resolved);
      if (!builtin && !isDirNode(node)) {
        appendTerminalLine(`cd: ${target}: No such file or directory`, 'terminal-line terminal-error');
        return;
      }
      STATE.cwd = resolved;
      renderPrompt();
      return;
    }

    if (command === 'touch') {
      const target = args[0];
      if (!target) {
        appendTerminalLine('Usage: touch <file>', 'terminal-line terminal-error');
        return;
      }
      const result = touchVirtualFile(resolvePath(target));
      if (!result.ok) appendTerminalLine(result.error, 'terminal-line terminal-error');
      return;
    }

    if (command === 'mkdir') {
      const target = args[0];
      if (!target) {
        appendTerminalLine('Usage: mkdir <dir>', 'terminal-line terminal-error');
        return;
      }
      const result = mkdirVirtualDir(resolvePath(target));
      if (!result.ok) appendTerminalLine(result.error, 'terminal-line terminal-error');
      return;
    }

    if (command === 'rm') {
      const force = args.includes('-f');
      const recursive = args.includes('-r') || args.includes('-rf') || args.includes('-fr');
      const target = args.find((value) => !value.startsWith('-'));
      if (!target) {
        appendTerminalLine('Usage: rm [-r] [-f] <path>', 'terminal-line terminal-error');
        return;
      }
      const resolved = resolvePath(target);
      const node = getVirtualNode(resolved);
      if (!node) {
        if (!force) appendTerminalLine(`rm: cannot remove '${target}': No such file or directory`, 'terminal-line terminal-error');
        return;
      }
      if (resolved === '/') {
        appendTerminalLine('rm: refusing to remove root', 'terminal-line terminal-error');
        return;
      }
      if (isDirNode(node) && !recursive) {
        appendTerminalLine(`rm: cannot remove '${target}': Is a directory`, 'terminal-line terminal-error');
        return;
      }
      const result = removeVirtualNode(resolved);
      if (!result.ok && !force) appendTerminalLine(result.error, 'terminal-line terminal-error');
      return;
    }

    if (command === 'cp') {
      const source = args[0];
      const destination = args[1];
      if (!source || !destination) {
        appendTerminalLine('Usage: cp <source> <destination>', 'terminal-line terminal-error');
        return;
      }

      const sourcePath = resolvePath(source);
      const destinationPath = resolvePath(destination);
      const sourceNode = getVirtualNode(sourcePath);
      if (sourceNode) {
        const result = copyVirtualNode(sourcePath, destinationPath);
        if (!result.ok) appendTerminalLine(result.error, 'terminal-line terminal-error');
        return;
      }

      try {
        const response = await fetch(sourcePath, { cache: 'no-store' });
        if (!response.ok) {
          appendTerminalLine(`cp: cannot stat '${source}': ${response.status} ${response.statusText}`, 'terminal-line terminal-error');
          return;
        }
        const bodyText = await response.text();
        const result = writeVirtualFile(destinationPath, bodyText);
        if (!result.ok) appendTerminalLine(result.error, 'terminal-line terminal-error');
      } catch (error) {
        appendTerminalLine(`cp: unable to copy '${source}' in browser context`, 'terminal-line terminal-error');
      }
      return;
    }

    if (command === 'echo') {
      appendTerminalLine(args.join(' ') || '', 'terminal-line terminal-system');
      return;
    }

    if (command === 'date') {
      appendTerminalLine(new Date().toString(), 'terminal-line terminal-system');
      return;
    }

    if (command === 'uname') {
      appendTerminalLine(navigator.userAgent, 'terminal-line terminal-system');
      return;
    }

    if (command === 'cat') {
      const target = args[0];
      if (!target) {
        appendTerminalLine('Usage: cat <path>', 'terminal-line terminal-error');
        return;
      }
      const path = resolvePath(target);
      const virtualContent = readVirtualFile(path);
      if (virtualContent !== null) {
        appendTerminalLine(virtualContent || '[empty file]', 'terminal-line terminal-system');
        return;
      }
      try {
        const response = await fetch(path, { cache: 'no-store' });
        if (!response.ok) {
          appendTerminalLine(`cat: ${target}: ${response.status} ${response.statusText}`, 'terminal-line terminal-error');
          return;
        }
        const bodyText = await response.text();
        appendTerminalLine(bodyText || '[empty file]', 'terminal-line terminal-system');
      } catch (error) {
        appendTerminalLine(`cat: ${target}: unable to read in browser context`, 'terminal-line terminal-error');
      }
      return;
    }

    if (command === 'write') {
      const target = args[0];
      if (!target) {
        appendTerminalLine('Usage: write <file> <text>', 'terminal-line terminal-error');
        return;
      }
      const result = writeVirtualFile(resolvePath(target), args.slice(1).join(' '));
      if (!result.ok) appendTerminalLine(result.error, 'terminal-line terminal-error');
      return;
    }

    if (command === 'wget') {
      if (!args.length) {
        appendTerminalLine('Usage: wget [-O <file>] <url>', 'terminal-line terminal-error');
        return;
      }
      let outputPath = null;
      let urlArgIndex = 0;
      if (args[0] === '-O') {
        outputPath = args[1];
        urlArgIndex = 2;
      }
      const target = args[urlArgIndex];
      if (!target) {
        appendTerminalLine('Usage: wget [-O <file>] <url>', 'terminal-line terminal-error');
        return;
      }
      const url = normalizeTarget(target);
      const filename = outputPath ? resolvePath(outputPath) : resolvePath(basenameFromUrl(url));
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
          appendTerminalLine(`wget: ${target}: ${response.status} ${response.statusText}`, 'terminal-line terminal-error');
          return;
        }
        const bodyText = await response.text();
        const result = writeVirtualFile(filename, bodyText);
        if (!result.ok) {
          appendTerminalLine(result.error, 'terminal-line terminal-error');
          return;
        }
        appendTerminalLine(`Saved '${filename}'`, 'terminal-line terminal-success');
      } catch (error) {
        appendTerminalLine(`wget failed for ${target}. Browser CORS or network restrictions may apply.`, 'terminal-line terminal-error');
      }
      return;
    }

    if (command === 'ping') {
      const target = args[0];
      if (!target) {
        appendTerminalLine('Usage: ping <host-or-url>', 'terminal-line terminal-error');
        return;
      }
      const url = normalizeTarget(target);
      const startedAt = performance.now();
      try {
        await fetch(`${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          mode: 'no-cors'
        });
        appendTerminalLine(`Reply from ${target}: time=${Math.round(performance.now() - startedAt)}ms`, 'terminal-line terminal-success');
      } catch (error) {
        appendTerminalLine(`Ping failed for ${target}.`, 'terminal-line terminal-error');
      }
      return;
    }

    if (command === 'curl') {
      const target = args[0];
      if (!target) {
        appendTerminalLine('Usage: curl <url>', 'terminal-line terminal-error');
        return;
      }
      const url = normalizeTarget(target);
      try {
        const response = await fetch(url, { cache: 'no-store' });
        const bodyText = await response.text();
        appendTerminalLine(`HTTP ${response.status} ${response.statusText}`, 'terminal-line terminal-system');
        response.headers.forEach((value, key) => appendTerminalLine(`${key}: ${value}`, 'terminal-line terminal-system'));
        appendTerminalLine(bodyText.slice(0, 1000) || '[empty body]', 'terminal-line terminal-success');
      } catch (error) {
        appendTerminalLine(`curl failed for ${target}. Browser CORS or network restrictions may apply.`, 'terminal-line terminal-error');
      }
      return;
    }

    if (command === 'nslookup') {
      const host = args[0];
      if (!host) {
        appendTerminalLine('Usage: nslookup <host>', 'terminal-line terminal-error');
        return;
      }
      try {
        const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`, {
          headers: { Accept: 'application/dns-json' },
          cache: 'no-store'
        });
        const data = await response.json();
        const answers = Array.isArray(data.Answer) ? data.Answer : [];
        if (!answers.length) {
          appendTerminalLine(`No A records found for ${host}.`, 'terminal-line terminal-system');
          return;
        }
        appendTerminalLine(`Name: ${host}`, 'terminal-line terminal-system');
        answers.forEach((answer) => appendTerminalLine(`Address: ${answer.data}`, 'terminal-line terminal-success'));
      } catch (error) {
        appendTerminalLine(`nslookup failed for ${host}.`, 'terminal-line terminal-error');
      }
      return;
    }

    if (command === 'nano') {
      const target = args[0];
      if (!target) {
        appendTerminalLine('Usage: nano <file>', 'terminal-line terminal-error');
        return;
      }
      await openNano(target);
      return;
    }

    appendTerminalLine(`Unknown command: ${value}`, 'terminal-line terminal-error');
  }

  function handleTerminalKeydown(event) {
    if (event.key === 'Tab') {
      event.preventDefault();
      handleAutocomplete();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      runCommand(DOM.input.value);
      DOM.input.value = '';
      DOM.input.focus();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!STATE.history.length) return;
      const next = STATE.history[STATE.history.length - 1];
      DOM.input.value = next;
      DOM.input.setSelectionRange(next.length, next.length);
      return;
    }

    if (event.key === 'Escape') {
      closeTerminal();
    }
  }

  function setupPageHotkeys() {
    document.addEventListener('keydown', handlePageHotkeys);
    document.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  function setupQr() {
    DOM.qrTrigger?.addEventListener('click', () => {
      DOM.qrOverlay.style.display = 'flex';
    });

    DOM.qrClose?.addEventListener('click', () => {
      DOM.qrOverlay.style.display = 'none';
    });

    DOM.qrOverlay?.addEventListener('click', (event) => {
      if (event.target === DOM.qrOverlay) {
        DOM.qrOverlay.style.display = 'none';
      }
    });
  }

  function setupTerminal() {
    DOM.terminalTrigger?.addEventListener('click', openTerminal);
    DOM.terminalClose?.addEventListener('click', closeTerminal);
    DOM.terminalOverlay?.addEventListener('click', (event) => {
      if (event.target === DOM.terminalOverlay) closeTerminal();
    });
    DOM.terminalInput?.addEventListener('keydown', handleTerminalKeydown);
    DOM.terminalForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      runCommand(DOM.input.value);
      DOM.input.value = '';
      DOM.input.focus();
    });
    makeDraggable(DOM.terminalWindow, DOM.terminalHeader);
    renderPrompt();
  }

  function setupNano() {
    DOM.nanoClose?.addEventListener('click', () => closeNano());
    DOM.nanoOverlay?.addEventListener('click', (event) => {
      if (event.target === DOM.nanoOverlay) closeNano();
    });
    DOM.nanoEditor?.addEventListener('input', updateNanoDirtyState);
    DOM.nanoEditor?.addEventListener('keydown', handleNanoKeydown);
    makeDraggable(DOM.nanoWindow, DOM.nanoHeader);
  }

  function cacheDom() {
    DOM.qrTrigger = document.getElementById('qr-trigger');
    DOM.qrOverlay = document.getElementById('qr-overlay');
    DOM.qrClose = document.getElementById('qr-close');

    DOM.terminalTrigger = document.getElementById('terminal-trigger');
    DOM.terminalOverlay = document.getElementById('terminal-overlay');
    DOM.terminalWindow = document.getElementById('terminal-window');
    DOM.terminalHeader = document.getElementById('terminal-header');
    DOM.terminalClose = document.getElementById('terminal-close');
    DOM.terminalForm = document.getElementById('terminal-form');
    DOM.input = document.getElementById('terminal-input');
    DOM.output = document.getElementById('terminal-output');
    DOM.prompt = document.getElementById('terminal-prompt');

    DOM.nanoOverlay = document.getElementById('nano-overlay');
    DOM.nanoWindow = document.getElementById('nano-window');
    DOM.nanoHeader = document.getElementById('nano-header');
    DOM.nanoClose = document.getElementById('nano-close');
    DOM.nanoPath = document.getElementById('nano-path');
    DOM.nanoStatus = document.getElementById('nano-status');
    DOM.nanoEditor = document.getElementById('nano-editor');
  }

  function init() {
    cacheDom();
    if (!DOM.terminalOverlay || !DOM.terminalInput || !DOM.output) {
      return;
    }
    setupPageHotkeys();
    setupQr();
    setupTerminal();
    setupNano();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
