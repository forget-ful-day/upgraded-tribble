import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'robochat';

if (!uri) {
  throw new Error('MONGODB_URI is not set');
}

let client;
let clientPromise;

if (global._mongoClientPromise) {
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
  global._mongoClientPromise = clientPromise;
}

export async function getDb() {
  const c = await clientPromise;
  const db = c.db(dbName);

  await Promise.all([
    db.collection('users').createIndex({ username: 1 }, { unique: true }),
    db.collection('sessions').createIndex({ token: 1 }, { unique: true }),
    db.collection('groups').createIndex({ name: 1 }),
    db.collection('messages').createIndex({ chatId: 1, createdAt: 1 })
  ]);

  return db;
}
