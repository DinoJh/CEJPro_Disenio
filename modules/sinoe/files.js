/* PDFs locales en IndexedDB; memoria de sesión si no está disponible. */
window.CejProSinoeFiles = (() => {
  const memory = new Map();
  let connection;
  function db() {
    if (connection) return connection;
    connection = new Promise((resolve) => {
      if (!window.indexedDB) {
        resolve(null);
        return;
      }
      let request;
      try {
        request = indexedDB.open(
          window.CejProWorkspaces.scopeKey("cejpro.sinoe.documents"),
          1,
        );
      } catch (_) {
        resolve(null);
        return;
      }
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("files"))
          request.result.createObjectStore("files");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
    return connection;
  }
  async function put(id, file) {
    if (!window.CejProWorkspaces.canEdit()) return false;
    memory.set(id, file);
    const database = await db();
    if (!database) return false;
    return new Promise((resolve) => {
      try {
        const tx = database.transaction("files", "readwrite");
        tx.objectStore("files").put(file, id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (_) {
        resolve(false);
      }
    });
  }
  async function get(id) {
    if (memory.has(id)) return memory.get(id);
    const database = await db();
    if (!database) return null;
    return new Promise((resolve) => {
      try {
        const req = database
          .transaction("files", "readonly")
          .objectStore("files")
          .get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (_) {
        resolve(null);
      }
    });
  }
  return { put, get };
})();
