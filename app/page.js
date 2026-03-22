'use client';

import { useEffect, useState } from 'react';

const API = {
  register: '/api/register', login: '/api/login', recover: '/api/recover',
  session: '/api/session', logout: '/api/logout', bootstrap: '/api/bootstrap',
  contact: '/api/contact', groupCreate: '/api/group/create', groupSearch: '/api/group/search', groupJoin: '/api/group/join',
  send: '/api/message/send', react: '/api/message/react', remove: '/api/message/delete', pin: '/api/message/pin', profile: '/api/profile'
};

async function api(path, opts={}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Ошибка ${res.status}`);
  return data;
}

export default function Page() {
  const [mode, setMode] = useState('login');
  const [auth, setAuth] = useState({ username: '', password: '', recovery: '' });
  const [me, setMe] = useState(null);
  const [boot, setBoot] = useState({ chats: [], groups: [], publicUsers: [], meta: { version: '3.0.0', changelog: [] } });
  const [chatId, setChatId] = useState('');
  const [msg, setMsg] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState('');

  const activeChat = boot.chats.find(c => c._id === chatId);

  const load = async () => {
    const b = await api(API.bootstrap);
    setBoot(b);
    setMe(b.me);
    if (!chatId && b.chats[0]) setChatId(b.chats[0]._id);
  };

  useEffect(() => {
    api(API.session).then(async (d) => {
      if (d.username) await load();
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!me) return;
    const t = setInterval(() => load().catch(() => {}), 2000);
    return () => clearInterval(t);
  }, [me, chatId]);

  const onSubmitAuth = async () => {
    if (mode === 'register') {
      await api(API.register, { method: 'POST', body: JSON.stringify({ username: auth.username, password: auth.password, recoveryAnswer: auth.recovery }) });
    }
    await api(API.login, { method: 'POST', body: JSON.stringify({ username: auth.username, password: auth.password }) });
    await load();
  };

  if (!me) {
    return <div className="card auth">
      <h1>🤖 Robochat (Next.js)</h1>
      <div className="row">
        <button onClick={() => setMode('login')}>Вход</button>
        <button onClick={() => setMode('register')}>Регистрация</button>
      </div>
      <input placeholder="Логин" value={auth.username} onChange={e => setAuth({ ...auth, username: e.target.value })} />
      <input placeholder="Пароль" type="password" value={auth.password} onChange={e => setAuth({ ...auth, password: e.target.value })} />
      {mode === 'register' && <input placeholder="Секретный ответ" value={auth.recovery} onChange={e => setAuth({ ...auth, recovery: e.target.value })} />}
      <div className="row">
        <button onClick={onSubmitAuth}>{mode === 'register' ? 'Создать' : 'Войти'}</button>
        <button onClick={async () => {
          const username = prompt('Логин');
          const recoveryAnswer = prompt('Секретный ответ');
          const newPassword = prompt('Новый пароль');
          await api(API.recover, { method: 'POST', body: JSON.stringify({ username, recoveryAnswer, newPassword }) });
          alert('Пароль обновлён');
        }}>Восстановить пароль</button>
      </div>
    </div>;
  }

  return <div className="wrapper">
    <aside className="card">
      <h3>Лента чатов</h3>
      <div className="list">
        {boot.chats.map(c => <div key={c._id} className={`item ${chatId===c._id?'sel':''}`} onClick={() => setChatId(c._id)}>{c.avatar} {c.name}</div>)}
      </div>
      <button onClick={async () => { await api(API.logout, { method: 'POST' }); setMe(null); }}>Выйти</button>
    </aside>

    <main className="card">
      <h3>{activeChat?.name || 'Чат'}</h3>
      <div className="list">
        {(activeChat?.messages || []).map(m => (
          <div key={m.id} className={`item ${selectedMessageId===m.id?'sel':''}`} onDoubleClick={() => setSelectedMessageId(selectedMessageId===m.id?'':m.id)}>
            {selectedMessageId===m.id ? '☑' : '☐'} {m.sender}: {m.text}
          </div>
        ))}
      </div>
      <div className="row">
        <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Сообщение" onKeyDown={async e => {
          if (e.key === 'Enter' && chatId && msg.trim()) {
            await api(API.send, { method: 'POST', body: JSON.stringify({ chatId, text: msg, kind: 'text' }) });
            setMsg('');
            await load();
          }
        }} />
        <button onClick={async () => {
          if (!chatId || !msg.trim()) return;
          await api(API.send, { method: 'POST', body: JSON.stringify({ chatId, text: msg, kind: 'text' }) });
          setMsg('');
          await load();
        }}>Отправить</button>
      </div>
      <div className="row">
        <button onClick={async () => { if (!selectedMessageId) return; const emoji = prompt('Эмодзи'); if (!emoji) return; await api(API.react, { method:'POST', body: JSON.stringify({ chatId, messageId: selectedMessageId, emoji }) }); await load(); }}>Реакция</button>
        <button onClick={async () => { if (!selectedMessageId) return; await api(API.pin, { method:'POST', body: JSON.stringify({ chatId, messageId: selectedMessageId }) }); await load(); }}>Закрепить</button>
        <button onClick={async () => { if (!selectedMessageId) return; await api(API.remove, { method:'POST', body: JSON.stringify({ chatId, messageId: selectedMessageId }) }); await load(); }}>Удалить</button>
      </div>
    </main>

    <section className="card">
      <h3>Добавления и настройки</h3>
      <button onClick={async () => {
        const username = prompt('Кого добавить в контакты?');
        if (!username) return;
        await api(API.contact, { method: 'POST', body: JSON.stringify({ username }) });
        await load();
      }}>Добавить контакт</button>

      <button onClick={async () => {
        const name = prompt('Название группы');
        if (!name) return;
        const isPrivate = confirm('Сделать приватной?');
        const code = isPrivate ? (prompt('Код группы') || '') : '';
        const avatar = prompt('Эмодзи авы', '👥') || '👥';
        await api(API.groupCreate, { method:'POST', body: JSON.stringify({ name, isPrivate, code, avatar }) });
        await load();
      }}>Создать группу</button>

      <button onClick={async () => {
        const q = prompt('Поиск группы');
        if (q === null) return;
        const r = await api(`${API.groupSearch}?q=${encodeURIComponent(q)}`);
        const names = r.groups.map(g => `${g.name}${g.isPrivate?' [private]':''}`).join('\n');
        const chosen = prompt(`Найдено:\n${names}\n\nВведи точное название для входа:`);
        if (!chosen) return;
        const group = r.groups.find(g => g.name === chosen);
        if (!group) return alert('Группа не найдена в списке');
        const code = group.isPrivate ? (prompt('Код группы') || '') : '';
        await api(API.groupJoin, { method:'POST', body: JSON.stringify({ groupId: group._id, code }) });
        await load();
      }}>Найти/вступить в группу</button>

      <button onClick={async () => {
        const avatar = prompt('Новая ава', me.avatar) || me.avatar;
        const status = prompt('Новая подпись', me.status) || me.status;
        await api(API.profile, { method:'POST', body: JSON.stringify({ avatar, status }) });
        await load();
      }}>Изменить профиль</button>

      <button onClick={async () => {
        if (!confirm('Удалить аккаунт?')) return;
        await api(API.profile, { method:'POST', body: JSON.stringify({ deleteAccount: true }) });
        setMe(null);
      }}>Удалить аккаунт</button>

      <p>Версия: {boot.meta?.version}</p>
      <small>{(boot.meta?.changelog || []).join(' • ')}</small>
    </section>
  </div>;
}
