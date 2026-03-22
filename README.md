# Robochat — Next.js + Vercel MongoDB

Проект переделан на **Next.js** с API Route Handler и базой **Vercel MongoDB** (MongoDB Atlas).

## Что нужно для запуска

1. Создай `.env.local`:

```bash
cp .env.example .env.local
```

2. Впиши строку подключения:

- `MONGODB_URI`
- `MONGODB_DB`

3. Запуск:

```bash
npm install
npm run dev
```

или production:

```bash
npm run build
npm start
```

## Важно про Vercel

- В Vercel Project Settings → Environment Variables добавь `MONGODB_URI` и `MONGODB_DB`.
- Файловой JSON-БД больше нет: теперь хранение в MongoDB.

## Как подключить Vercel MongoDB (пошагово)

1. В Vercel открой проект → **Storage** → **Create Database** → **MongoDB** (Atlas).
2. После создания нажми **Connect Project** (если не подключено автоматически).
3. Скопируй строку подключения (`MONGODB_URI`) и имя БД (`MONGODB_DB`).
4. В Vercel: **Project Settings → Environment Variables** добавь:
   - `MONGODB_URI`
   - `MONGODB_DB` (например `robochat`)
5. Нажми **Redeploy** (или сделай новый push).

### Локально

Создай `.env.local`:

```bash
MONGODB_URI=твой_uri
MONGODB_DB=robochat
```

Потом:

```bash
npm run dev
```

## Основные возможности

- Регистрация, вход, выход, сессия через httpOnly cookie.
- Восстановление пароля.
- Личные чаты, группы, приватные группы по коду.
- Добавление контактов.
- Сообщения, реакции, закрепление, удаление.
- Изменение профиля и удаление аккаунта.
- Автообновление чата раз в 2 секунды.
