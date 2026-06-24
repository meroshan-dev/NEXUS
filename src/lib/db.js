const DB_NAME = 'nexus_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'outbox';

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

export const db = {
  outbox: {
    add: async (message) => {
      const database = await openDB();
      return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.add(message);
        req.onsuccess = () => resolve(message.id);
        req.onerror = () => reject(req.error);
      });
    },
    update: async (id, updates) => {
      const database = await openDB();
      return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const record = getReq.result;
          if (record) {
            const updatedRecord = { ...record, ...updates };
            const putReq = store.put(updatedRecord);
            putReq.onsuccess = () => resolve(true);
            putReq.onerror = () => reject(putReq.error);
          } else {
            resolve(false);
          }
        };
        getReq.onerror = () => reject(getReq.error);
      });
    },
    where: (fieldName) => {
      return {
        equals: (value) => {
          return {
            toArray: async () => {
              const database = await openDB();
              return new Promise((resolve, reject) => {
                const tx = database.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                
                try {
                  const index = store.index(fieldName);
                  const req = index.getAll(value);
                  req.onsuccess = () => resolve(req.result);
                  req.onerror = () => reject(req.error);
                } catch (err) {
                  const req = store.getAll();
                  req.onsuccess = () => {
                    const results = req.result.filter(item => item[fieldName] === value);
                    resolve(results);
                  };
                  req.onerror = () => reject(req.error);
                }
              });
            }
          };
        }
      };
    },
    delete: async (id) => {
      const database = await openDB();
      return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    }
  }
};
