import '../mobile-focus-fix.js';

const DB_NAME='odhc-v1';const DB_VER=1;
export function openDB(){
 return new Promise((res,rej)=>{
  const r=indexedDB.open(DB_NAME,DB_VER);
  r.onupgradeneeded=()=>{
    const db=r.result;
    if(!db.objectStoreNames.contains('exercises')){const s=db.createObjectStore('exercises',{keyPath:'id'}); s.createIndex('muscle','muscle');}
    if(!db.objectStoreNames.contains('workouts')){const s=db.createObjectStore('workouts',{keyPath:'id'}); s.createIndex('date','date');}
    if(!db.objectStoreNames.contains('settings'))db.createObjectStore('settings',{keyPath:'key'});
  };
  r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);
 });
}
export async function getAll(store){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(store,'readonly');const q=tx.objectStore(store).getAll();q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});}
export async function get(store,key){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(store,'readonly');const q=tx.objectStore(store).get(key);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});}
export async function put(store,val){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');const q=tx.objectStore(store).put(val);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});}
export async function del(store,key){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');const q=tx.objectStore(store).delete(key);q.onsuccess=()=>res();q.onerror=()=>rej(q.error);});}
