const state = {
  mode: 'login',
  username: null,
  chats: [],
  groups: [],
  selectedChatId: null,
  selectedMessageId: null,
  me: null
};

const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.username) headers['x-user'] = state.username;
  const res = await fetch(path, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка API');
  return data;
}

function toast(msg) { alert(msg); }

function applyTheme(theme, opacity = 0.95) {
  document.body.classList.remove('theme-light', 'theme-ios26', 'theme-matrix');
  if (theme === 'light') document.body.classList.add('theme-light');
  else if (theme === 'ios26') document.body.classList.add('theme-ios26');
  else document.body.classList.add('theme-matrix');
  document.body.style.opacity = String(opacity);
}

async function refreshBootstrap() {
  const data = await api('/api/bootstrap');
  state.chats = data.chats;
  state.groups = data.groups;
  state.me = data.me;

  $('whoami').innerText = `${data.me.avatar} ${data.me.username} — ${data.me.status}`;
  $('profile-avatar').value = data.me.avatar;
  $('profile-status').value = data.me.status;
  $('theme').value = data.me.theme || 'matrix';
  $('opacity').value = data.me.opacity || 0.95;
  applyTheme(data.me.theme || 'matrix', data.me.opacity || 0.95);

  $('contact-username').setAttribute('list', 'users-datalist');
  let dl = document.getElementById('users-datalist');
  if (!dl) {
    dl = document.createElement('datalist');
    dl.id = 'users-datalist';
    document.body.appendChild(dl);
  }
  dl.innerHTML = data.publicUsers.map((u) => `<option value="${u}"></option>`).join('');

  $('changelog').innerHTML = [`<b>v${data.meta.version}</b>`, ...data.meta.changelog].join('<br/>');
  renderChats();
  renderMessages();
}

function renderChats() {
  const node = $('chat-list');
  node.innerHTML = '';
  state.chats.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'chat-item' + (state.selectedChatId === c.id ? ' selected' : '');
    div.textContent = `${c.avatar} ${c.name}`;
    div.onclick = () => {
      state.selectedChatId = c.id;
      $('chat-title').innerText = c.name;
      renderChats();
      renderMessages();
    };
    node.appendChild(div);
  });
}

function renderMessages() {
  const node = $('messages');
  node.innerHTML = '';
  const chat = state.chats.find((c) => c.id === state.selectedChatId);
  if (!chat) return;

  const pinned = chat.messages?.find((m) => m.pinned);
  if (pinned) {
    const p = document.createElement('div');
    p.className = 'msg-item';
    p.innerHTML = `<b>📌 Закреп:</b> ${pinned.text}`;
    node.appendChild(p);
  }

  (chat.messages || []).forEach((m) => {
    const div = document.createElement('div');
    div.className = 'msg-item' + (state.selectedMessageId === m.id ? ' selected' : '');
    const reacts = Object.entries(m.reactions || {}).filter(([, users]) => users.length).map(([e, users]) => `${e}:${users.length}`).join(' ');
    div.innerHTML = `<div>${state.selectedMessageId === m.id ? '☑' : '☐'} ${m.sender}: ${m.text} ${reacts}</div><div class="msg-meta">${new Date(m.ts).toLocaleTimeString('ru-RU')}</div>`;
    div.ondblclick = () => {
      state.selectedMessageId = state.selectedMessageId === m.id ? null : m.id;
      renderMessages();
    };
    node.appendChild(div);
  });
}

async function send(kind = 'text', textOverride = null) {
  if (!state.selectedChatId) return;
  const text = textOverride ?? $('msg').value.trim();
  if (!text) return;
  await api('/api/message/send', { method: 'POST', body: JSON.stringify({ chatId: state.selectedChatId, text, kind }) });
  $('msg').value = '';
  await refreshBootstrap();
}

async function initSession() {
  const sess = await api('/api/session');
  if (sess.username) {
    state.username = sess.username;
    $('auth').classList.add('hidden');
    $('app').classList.remove('hidden');
    await refreshBootstrap();
  }
}

$('tab-login').onclick = () => { state.mode = 'login'; $('auth-submit').innerText = 'Войти'; };
$('tab-register').onclick = () => { state.mode = 'register'; $('auth-submit').innerText = 'Зарегистрироваться'; };

$('auth-submit').onclick = async () => {
  try {
    const username = $('auth-username').value.trim();
    const password = $('auth-password').value.trim();
    const recoveryAnswer = $('auth-recovery').value.trim();
    if (state.mode === 'register') {
      await api('/api/register', { method: 'POST', body: JSON.stringify({ username, password, recoveryAnswer }) });
    }
    const login = await api('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    state.username = login.username;
    $('auth').classList.add('hidden');
    $('app').classList.remove('hidden');
    await refreshBootstrap();
  } catch (e) { toast(e.message); }
};

$('auth-recover').onclick = async () => {
  try {
    const username = prompt('Логин для восстановления');
    if (!username) return;
    const recoveryAnswer = prompt('Секретный ответ');
    if (recoveryAnswer === null) return;
    const newPassword = prompt('Новый пароль');
    if (!newPassword) return;
    await api('/api/recover', { method: 'POST', body: JSON.stringify({ username, recoveryAnswer, newPassword }) });
    toast('Пароль обновлён');
  } catch (e) { toast(e.message); }
};

$('send').onclick = () => send('text');
$('msg').addEventListener('keydown', (e) => { if (e.key === 'Enter') send('text'); });
$('send-photo').onclick = async () => {
  const file = prompt('Введите путь/имя фото');
  if (!file) return;
  await send('photo', file);
};
$('send-sticker').onclick = async () => {
  const st = prompt('Введите стикер (эмодзи)');
  if (!st) return;
  await send('sticker', st);
};

$('react').onclick = async () => {
  if (!state.selectedChatId || !state.selectedMessageId) return;
  const emoji = prompt('Реакция');
  if (!emoji) return;
  await api('/api/message/react', { method: 'POST', body: JSON.stringify({ chatId: state.selectedChatId, messageId: state.selectedMessageId, emoji }) });
  await refreshBootstrap();
};
$('pin').onclick = async () => {
  if (!state.selectedChatId || !state.selectedMessageId) return;
  await api('/api/message/pin', { method: 'POST', body: JSON.stringify({ chatId: state.selectedChatId, messageId: state.selectedMessageId }) });
  await refreshBootstrap();
};
$('delete').onclick = async () => {
  if (!state.selectedChatId || !state.selectedMessageId) return;
  await api('/api/message/delete', { method: 'POST', body: JSON.stringify({ chatId: state.selectedChatId, messageId: state.selectedMessageId }) });
  await refreshBootstrap();
};
$('clear-select').onclick = () => { state.selectedMessageId = null; renderMessages(); };

$('add-contact').onclick = async () => {
  try {
    await api('/api/contact', { method: 'POST', body: JSON.stringify({ username: $('contact-username').value.trim() }) });
    await refreshBootstrap();
  } catch (e) { toast(e.message); }
};

$('create-group').onclick = async () => {
  try {
    await api('/api/group/create', {
      method: 'POST',
      body: JSON.stringify({
        name: $('group-name').value.trim(),
        avatar: $('group-avatar').value.trim(),
        isPrivate: $('group-private').checked,
        code: $('group-code').value.trim()
      })
    });
    await refreshBootstrap();
  } catch (e) { toast(e.message); }
};

$('find-group').onclick = async () => {
  const q = $('search-group').value.trim();
  const data = await api(`/api/group/search?q=${encodeURIComponent(q)}`);
  $('group-results').innerHTML = '';
  data.groups.forEach((g) => {
    const div = document.createElement('div');
    div.className = 'group-item';
    div.innerText = `${g.avatar} ${g.name} ${g.isPrivate ? '(приватная)' : ''}`;
    div.onclick = async () => {
      let code = '';
      if (g.isPrivate) code = prompt('Введите код приватной группы') || '';
      try {
        await api('/api/group/join', { method: 'POST', body: JSON.stringify({ groupId: g.id, code }) });
        await refreshBootstrap();
      } catch (e) { toast(e.message); }
    };
    $('group-results').appendChild(div);
  });
};

$('save-profile').onclick = async () => {
  await api('/api/profile', {
    method: 'POST',
    body: JSON.stringify({
      avatar: $('profile-avatar').value,
      status: $('profile-status').value,
      theme: $('theme').value,
      opacity: Number($('opacity').value),
      customEmoji: $('custom-emoji').value.trim() || undefined
    })
  });
  $('custom-emoji').value = '';
  await refreshBootstrap();
};

$('delete-account').onclick = async () => {
  if (!confirm('Удалить аккаунт?')) return;
  await api('/api/profile', { method: 'POST', body: JSON.stringify({ deleteAccount: true }) });
  state.username = null;
  $('app').classList.add('hidden');
  $('auth').classList.remove('hidden');
};

$('logout').onclick = async () => {
  await api('/api/logout', { method: 'POST' });
  state.username = null;
  $('app').classList.add('hidden');
  $('auth').classList.remove('hidden');
};

setInterval(async () => {
  if (!state.username) return;
  try {
    const prevChat = state.selectedChatId;
    await refreshBootstrap();
    state.selectedChatId = prevChat;
    renderChats();
    renderMessages();
  } catch (_e) {}
}, 2000);

initSession();
