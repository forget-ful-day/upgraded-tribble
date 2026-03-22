const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', 'db');
const FILES = {
  users: path.join(DB_DIR, 'users.json'),
  chats: path.join(DB_DIR, 'chats.json'),
  groups: path.join(DB_DIR, 'groups.json'),
  meta: path.join(DB_DIR, 'meta.json'),
  session: path.join(DB_DIR, 'session.json')
};

const defaults = {
  users: { users: [] },
  chats: { chats: [] },
  groups: { groups: [] },
  meta: {
    version: '2.0.0',
    changelog: [
      '2.0.0: Миграция Robochat на Node.js',
      '1.0.0: Базовый релиз'
    ]
  },
  session: { username: null }
};

function ensureDb() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  Object.entries(FILES).forEach(([key, file]) => {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(defaults[key], null, 2), 'utf8');
    }
  });
}

function read(key) {
  return JSON.parse(fs.readFileSync(FILES[key], 'utf8'));
}

function write(key, data) {
  fs.writeFileSync(FILES[key], JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { ensureDb, read, write };
