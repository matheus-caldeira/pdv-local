import { todayStr } from './helpers.js';

const DB_NAME = 'cantina_escoteira';
const DB_VERSION = 1;
let db;

export function openDB() {
  return new Promise(function(resolve, reject) {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function(e) {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('products')) {
        d.createObjectStore('products', { keyPath: 'id' });
      }
      if (!d.objectStoreNames.contains('orders')) {
        const os = d.createObjectStore('orders', { keyPath: 'id' });
        os.createIndex('session', 'session', { unique: false });
      }
      if (!d.objectStoreNames.contains('sessions')) {
        d.createObjectStore('sessions', { keyPath: 'date' });
      }
    };
    req.onsuccess = function(e) { db = e.target.result; resolve(db); };
    req.onerror = function(e) { reject(e.target.error); };
  });
}

function dbTx(store, mode) {
  return db.transaction(store, mode).objectStore(store);
}

export function dbAll(store) {
  return new Promise(function(resolve, reject) {
    const req = dbTx(store, 'readonly').getAll();
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}

export function dbGet(store, key) {
  return new Promise(function(resolve, reject) {
    const req = dbTx(store, 'readonly').get(key);
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}

export function dbPut(store, data) {
  return new Promise(function(resolve, reject) {
    const req = dbTx(store, 'readwrite').put(data);
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}

export function dbDelete(store, key) {
  return new Promise(function(resolve, reject) {
    const req = dbTx(store, 'readwrite').delete(key);
    req.onsuccess = function() { resolve(); };
    req.onerror = function() { reject(req.error); };
  });
}

export async function ensureSession() {
  const today = todayStr();
  let session = await dbGet('sessions', today);
  if (!session) {
    session = { date: today, cashInitial: 0 };
    await dbPut('sessions', session);
  }
  return session;
}
