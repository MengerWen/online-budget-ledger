type ReadHandle = { getFile: () => Promise<File>; queryPermission: (options: { mode: 'read' }) => Promise<string> };
type PickerWindow = Window & { showOpenFilePicker?: (options: unknown) => Promise<ReadHandle[]> };

async function savedHandle(value?: ReadHandle): Promise<ReadHandle | undefined> {
  if (!globalThis.indexedDB) return undefined;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('dating-finance-file', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('handles');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('handles', value ? 'readwrite' : 'readonly');
      const op = value ? tx.objectStore('handles').put(value, 'feed') : tx.objectStore('handles').get('feed');
      let result: ReadHandle | undefined;
      op.onsuccess = () => { result = value || op.result as ReadHandle | undefined; };
      tx.oncomplete = () => { db.close();resolve(result); };
      tx.onerror = () => { db.close();reject(tx.error); };
    };
  });
}

export async function connectLocalFinanceFeed(): Promise<ReadHandle> {
  const picker = (window as PickerWindow).showOpenFilePicker;
  if (!picker) throw new Error('此浏览器不支持持续读取本地文件，请用 Chrome/Edge 或选择财务文件。');
  const [handle] = await picker.call(window, { multiple: false, types: [{ description: 'Dating 财务文件', accept: { 'application/json': ['.json'] } }] });
  if (!handle) throw new Error('没有选择财务文件。');
  await savedHandle(handle);
  return handle;
}

export async function restoreLocalFinanceFeed(): Promise<ReadHandle | undefined> {
  const handle = await savedHandle();
  if (!handle) return undefined;
  if (await handle.queryPermission({ mode: 'read' }) !== 'granted') throw new Error('本地文件读取权限已过期，请重新连接财务文件。');
  return handle;
}
