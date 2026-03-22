const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const { ensureDb, read, write } = require('./src/db');

ensureDb();

const PORT = process.env.PORT || 3000;

function hash(password) { return crypto.createHash('sha256').update(password).digest('hex'); }
function uid() { return crypto.randomUUID(); }
function getUser(username) { return read('users').users.find((u) => u.username === username); }

function send(res, code, data, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type });
  res.end(type.includes('application/json') ? JSON.stringify(data) : data);
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (_e) { resolve({}); }
    });
  });
}

function serveStatic(req, res, pathname) {
  const map = {
    '/': 'index.html',
    '/index.html': 'index.html',
    '/styles.css': 'styles.css',
    '/app.js': 'app.js'
  };
  const file = map[pathname];
  if (!file) return false;
  const p = path.join(__dirname, 'public', file);
  const type = file.endsWith('.css') ? 'text/css; charset=utf-8' : file.endsWith('.js') ? 'application/javascript; charset=utf-8' : 'text/html; charset=utf-8';
  send(res, 200, fs.readFileSync(p, 'utf8'), type);
  return true;
}

function requireAuth(req, res) {
  const username = req.headers['x-user'];
  if (!username || !getUser(username)) {
    send(res, 401, { ok: false, error: 'Не авторизован' });
    return null;
  }
  return username;
}

function normalizePath(pathname) {
  if (!pathname) return '/';
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
}

function isPath(pathname, variants) {
  return variants.includes(normalizePath(pathname));
}

async function handleApi(req, res, pathname, query) {
  if (isPath(pathname, ['/api/register', '/register']) && req.method === 'POST') {
    const { username, password, recoveryAnswer } = await parseBody(req);
    if (!username || !password) return send(res, 400, { ok: false, error: 'Логин и пароль обязательны' });
    const usersData = read('users');
    if (usersData.users.some((u) => u.username === username)) return send(res, 400, { ok: false, error: 'Пользователь уже есть' });
    usersData.users.push({ id: uid(), username, passwordHash: hash(password), recoveryAnswer: (recoveryAnswer || '').toLowerCase().trim(), avatar: '🤖', status: 'В сети', contacts: [], customEmojis: ['🔥', '✨', '🚀'], theme: 'matrix', opacity: 0.95 });
    write('users', usersData);
    return send(res, 200, { ok: true });
  }

  if (isPath(pathname, ['/api/login', '/login']) && req.method === 'POST') {
    const { username, password } = await parseBody(req);
    const user = getUser(username);
    if (!user || user.passwordHash !== hash(password)) return send(res, 400, { ok: false, error: 'Неверный логин или пароль' });
    write('session', { username });
    return send(res, 200, { ok: true, username });
  }

  if (isPath(pathname, ['/api/recover', '/recover']) && req.method === 'POST') {
    const { username, recoveryAnswer, newPassword } = await parseBody(req);
    const usersData = read('users');
    const user = usersData.users.find((u) => u.username === username);
    if (!user) return send(res, 404, { ok: false, error: 'Пользователь не найден' });
    if (user.recoveryAnswer !== (recoveryAnswer || '').toLowerCase().trim()) return send(res, 400, { ok: false, error: 'Неверный ответ' });
    user.passwordHash = hash(newPassword);
    write('users', usersData);
    return send(res, 200, { ok: true });
  }

  if (isPath(pathname, ['/api/session', '/session']) && req.method === 'GET') {
    const session = read('session');
    const user = session.username ? getUser(session.username) : null;
    return send(res, 200, { ok: true, username: user ? user.username : null });
  }

  if (isPath(pathname, ['/api/logout', '/logout']) && req.method === 'POST') {
    write('session', { username: null });
    return send(res, 200, { ok: true });
  }

  const username = requireAuth(req, res);
  if (!username) return true;

  if (isPath(pathname, ['/api/bootstrap', '/bootstrap']) && req.method === 'GET') {
    const users = read('users').users;
    const chats = read('chats').chats;
    const groups = read('groups').groups;
    const meta = read('meta');
    const me = users.find((u) => u.username === username);
    const myChats = chats.filter((c) => c.participants.includes(username));
    const publicUsers = users.filter((u) => u.username !== username).map((u) => u.username);
    return send(res, 200, { ok: true, me, chats: myChats, groups, publicUsers, meta });
  }

  if (isPath(pathname, ['/api/contact', '/contact']) && req.method === 'POST') {
    const { username: contact } = await parseBody(req);
    const usersData = read('users');
    const me = usersData.users.find((u) => u.username === username);
    const other = usersData.users.find((u) => u.username === contact);
    if (!other) return send(res, 404, { ok: false, error: 'Пользователь не найден' });
    if (!me.contacts.includes(contact)) me.contacts.push(contact);
    write('users', usersData);

    const chatsData = read('chats');
    const pair = [username, contact].sort();
    const exists = chatsData.chats.find((c) => c.type === 'private' && [...c.participants].sort().join('|') === pair.join('|'));
    if (!exists) chatsData.chats.push({ id: uid(), name: `${pair[0]} и ${pair[1]}`, type: 'private', participants: pair, avatar: '💬', messages: [] });
    write('chats', chatsData);
    return send(res, 200, { ok: true });
  }

  if (isPath(pathname, ['/api/group/create', '/group/create']) && req.method === 'POST') {
    const { name, isPrivate, code, avatar } = await parseBody(req);
    const groupsData = read('groups');
    if (groupsData.groups.some((g) => g.name.toLowerCase() === String(name || '').toLowerCase())) return send(res, 400, { ok: false, error: 'Группа уже существует' });
    const id = uid();
    groupsData.groups.push({ id, name, owner: username, isPrivate: !!isPrivate, code: isPrivate ? (code || '') : '', members: [username], avatar: avatar || '👥' });
    write('groups', groupsData);

    const chatsData = read('chats');
    chatsData.chats.push({ id, name, type: 'group', participants: [username], avatar: avatar || '👥', messages: [] });
    write('chats', chatsData);
    return send(res, 200, { ok: true });
  }

  if (isPath(pathname, ['/api/group/join', '/group/join']) && req.method === 'POST') {
    const { groupId, code } = await parseBody(req);
    const groupsData = read('groups');
    const group = groupsData.groups.find((g) => g.id === groupId);
    if (!group) return send(res, 404, { ok: false, error: 'Группа не найдена' });
    if (group.isPrivate && group.code !== (code || '')) return send(res, 400, { ok: false, error: 'Неверный код' });
    if (!group.members.includes(username)) group.members.push(username);
    write('groups', groupsData);

    const chatsData = read('chats');
    const chat = chatsData.chats.find((c) => c.id === groupId);
    if (chat && !chat.participants.includes(username)) chat.participants.push(username);
    write('chats', chatsData);
    return send(res, 200, { ok: true });
  }

  if (isPath(pathname, ['/api/group/search', '/group/search']) && req.method === 'GET') {
    const q = String(query.q || '').toLowerCase();
    const groups = read('groups').groups.filter((g) => g.name.toLowerCase().includes(q));
    return send(res, 200, { ok: true, groups });
  }

  if (isPath(pathname, ['/api/message/send', '/message/send']) && req.method === 'POST') {
    const { chatId, text, kind } = await parseBody(req);
    const chatsData = read('chats');
    const chat = chatsData.chats.find((c) => c.id === chatId && c.participants.includes(username));
    if (!chat) return send(res, 404, { ok: false, error: 'Чат не найден' });
    chat.messages.push({ id: uid(), sender: username, text, kind: kind || 'text', ts: Date.now(), pinned: false, reactions: {} });
    write('chats', chatsData);
    return send(res, 200, { ok: true });
  }

  if (isPath(pathname, ['/api/message/react', '/message/react']) && req.method === 'POST') {
    const { chatId, messageId, emoji } = await parseBody(req);
    const chatsData = read('chats');
    const chat = chatsData.chats.find((c) => c.id === chatId);
    if (!chat) return send(res, 404, { ok: false, error: 'Чат не найден' });
    const msg = chat.messages.find((m) => m.id === messageId);
    if (!msg) return send(res, 404, { ok: false, error: 'Сообщение не найдено' });
    msg.reactions[emoji] = msg.reactions[emoji] || [];
    if (msg.reactions[emoji].includes(username)) msg.reactions[emoji] = msg.reactions[emoji].filter((u) => u !== username);
    else msg.reactions[emoji].push(username);
    write('chats', chatsData);
    return send(res, 200, { ok: true });
  }

  if (isPath(pathname, ['/api/message/delete', '/message/delete']) && req.method === 'POST') {
    const { chatId, messageId } = await parseBody(req);
    const chatsData = read('chats');
    const chat = chatsData.chats.find((c) => c.id === chatId);
    if (!chat) return send(res, 404, { ok: false, error: 'Чат не найден' });
    const msg = chat.messages.find((m) => m.id === messageId);
    if (!msg || msg.sender !== username) return send(res, 403, { ok: false, error: 'Нельзя удалить' });
    msg.text = '[Сообщение удалено]';
    write('chats', chatsData);
    return send(res, 200, { ok: true });
  }

  if (isPath(pathname, ['/api/message/pin', '/message/pin']) && req.method === 'POST') {
    const { chatId, messageId } = await parseBody(req);
    const chatsData = read('chats');
    const chat = chatsData.chats.find((c) => c.id === chatId);
    if (!chat) return send(res, 404, { ok: false, error: 'Чат не найден' });
    chat.messages.forEach((m) => { m.pinned = m.id === messageId; });
    write('chats', chatsData);
    return send(res, 200, { ok: true });
  }

  if (isPath(pathname, ['/api/profile', '/profile']) && req.method === 'POST') {
    const { avatar, status, theme, opacity, customEmoji, deleteAccount } = await parseBody(req);
    const usersData = read('users');
    const me = usersData.users.find((u) => u.username === username);
    if (deleteAccount) {
      usersData.users = usersData.users.filter((u) => u.username !== username);
      write('users', usersData);
      write('session', { username: null });
      return send(res, 200, { ok: true, deleted: true });
    }
    if (avatar !== undefined) me.avatar = avatar || '🤖';
    if (status !== undefined) me.status = status || 'В сети';
    if (theme !== undefined) me.theme = theme;
    if (opacity !== undefined) me.opacity = Math.max(0.7, Math.min(1.0, Number(opacity)));
    if (customEmoji && !me.customEmojis.includes(customEmoji)) me.customEmojis.push(customEmoji);
    write('users', usersData);
    return send(res, 200, { ok: true });
  }

  return send(res, 404, { ok: false, error: 'Не найдено' });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  if (pathname.startsWith('/api/') || ['/session', '/register', '/login', '/recover', '/logout', '/bootstrap', '/contact', '/profile'].includes(normalizePath(pathname)) || pathname.startsWith('/group/') || pathname.startsWith('/message/')) {
    return handleApi(req, res, pathname, parsed.query);
  }
  if (serveStatic(req, res, pathname)) return;
  return send(res, 200, fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8'), 'text/html; charset=utf-8');
});

server.listen(PORT, () => {
  console.log(`Robochat (Node.js) запущен: http://localhost:${PORT}`);
});
