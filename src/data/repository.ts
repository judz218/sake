import type {Data,Sake,TastingRecord} from '../types';
import {demoData,validateRecord,validateSake} from './seed';

// React depends on this module only. A future cloud adapter can keep these methods.
const DB_NAME='sake-notebook-presentation';
const DB_VERSION=1;
const stores=['sakes','records','meta'];
let connection:Promise<IDBDatabase>|undefined;
const request=<T>(req:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});
function storageError(error:unknown):Error{
 if(error instanceof DOMException){
  if(error.name==='QuotaExceededError')return new Error('ブラウザの保存容量が不足しています。入力内容は保持しています。');
  return new Error('ブラウザ内の保存に失敗しました。サイトデータや保存設定を確認してください。');
 }
 return error instanceof Error?error:new Error('ブラウザ内の保存に失敗しました。');
}
async function transact<T>(db:IDBDatabase,mode:IDBTransactionMode,work:(tx:IDBTransaction)=>Promise<T>):Promise<T>{
 const tx=db.transaction(stores,mode);
 const complete=new Promise<void>((resolve,reject)=>{
  tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??new Error('保存処理が中断されました。'));
  tx.onerror=()=>{}; // Abort reports the final failure; request() reports individual failures.
 });
 try{const result=await work(tx);await complete;return result;}
 catch(e){try{tx.abort();}catch{}await complete.catch(()=>{});throw storageError(e);}
}
async function seed(db:IDBDatabase,reset=false):Promise<void>{
 const data=demoData();
 await transact(db,'readwrite',async tx=>{
  const meta=tx.objectStore('meta');
  if(!reset&&await request(meta.get('initialized')))return;
  if(reset){await request(tx.objectStore('records').clear());await request(tx.objectStore('sakes').clear());}
  for(const sake of data.sakes)await request(tx.objectStore('sakes').add(sake));
  for(const record of data.records)await request(tx.objectStore('records').add(record));
  await request(meta.put({key:'initialized',dataset:'sake_demo_40',version:1,at:new Date().toISOString()}));
 });
}
async function database():Promise<IDBDatabase>{
 if(!connection){
  connection=(async()=>{
   if(!globalThis.indexedDB)throw new Error('このブラウザではIndexedDBを利用できません。対応ブラウザで開いてください。');
   const db=await new Promise<IDBDatabase>((resolve,reject)=>{
    const open=indexedDB.open(DB_NAME,DB_VERSION);
    open.onupgradeneeded=()=>{
     const db=open.result;
     db.createObjectStore('sakes',{keyPath:'id',autoIncrement:true});
     db.createObjectStore('records',{keyPath:'id',autoIncrement:true}).createIndex('sakeId','sakeId');
     db.createObjectStore('meta',{keyPath:'key'});
    };
    open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);
    open.onblocked=()=>reject(new Error('別のタブを閉じてから再読み込みしてください。'));
   });
   db.onversionchange=()=>{db.close();connection=undefined;};
   try{await seed(db);return db;}catch(e){db.close();throw e;}
  })().catch(e=>{connection=undefined;throw storageError(e);});
 }
 return connection;
}
async function run<T>(mode:IDBTransactionMode,work:(tx:IDBTransaction)=>Promise<T>):Promise<T>{return transact(await database(),mode,work);}
async function existing<T>(tx:IDBTransaction,store:string,id:number):Promise<T>{
 if(!Number.isInteger(id)||id<1)throw new Error('IDが不正です。');
 const row=await request(tx.objectStore(store).get(id));if(!row)throw new Error('対象のデータが見つかりません。');return row;
}
function timestamps(){const now=new Date().toISOString();return {sample:0,createdAt:now,updatedAt:now};}

export const repository={
 async listData():Promise<Data>{return run('readonly',async tx=>{
  const sakes=await request(tx.objectStore('sakes').getAll()) as Sake[];
  const records=await request(tx.objectStore('records').getAll()) as TastingRecord[];
  return {sakes:sakes.sort((a,b)=>a.name.localeCompare(b.name,'ja')),records:records.sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id),demoMode:true};
 });},
 async createSake(input:unknown):Promise<{id:number}>{const values=validateSake(input);return run('readwrite',async tx=>({id:Number(await request(tx.objectStore('sakes').add({...values,...timestamps()})))}));},
 async updateSake(id:number,input:unknown):Promise<void>{const values=validateSake(input);await run('readwrite',async tx=>{
  const old=await existing<Sake>(tx,'sakes',id);await request(tx.objectStore('sakes').put({...old,...values,updatedAt:new Date().toISOString()}));
 });},
 async deleteSake(id:number):Promise<void>{await run('readwrite',async tx=>{
  await existing<Sake>(tx,'sakes',id);
  if(await request(tx.objectStore('records').index('sakeId').count(id)))throw new Error('飲酒記録が残っている銘柄は削除できません。先に記録を削除してください。');
  await request(tx.objectStore('sakes').delete(id));
 });},
 async createRecord(input:unknown):Promise<{id:number}>{const values=validateRecord(input);return run('readwrite',async tx=>{
  await existing<Sake>(tx,'sakes',values.sakeId);return {id:Number(await request(tx.objectStore('records').add({...values,...timestamps()})))};
 });},
 async updateRecord(id:number,input:unknown):Promise<void>{const values=validateRecord(input);await run('readwrite',async tx=>{
  const old=await existing<TastingRecord>(tx,'records',id);await existing<Sake>(tx,'sakes',values.sakeId);
  await request(tx.objectStore('records').put({...old,...values,updatedAt:new Date().toISOString()}));
 });},
 async deleteRecord(id:number):Promise<void>{await run('readwrite',async tx=>{
  await existing<TastingRecord>(tx,'records',id);await request(tx.objectStore('records').delete(id));
 });},
 async createEntry(input:{sakeId:number;sake:unknown;record:unknown}):Promise<{id:number}>{
  return run('readwrite',async tx=>{
   let sakeId=input.sakeId;
   if(sakeId)await existing<Sake>(tx,'sakes',sakeId);
   else sakeId=Number(await request(tx.objectStore('sakes').add({...validateSake(input.sake),...timestamps()})));
   const values=validateRecord({...input.record as object,sakeId});
   return {id:Number(await request(tx.objectStore('records').add({...values,...timestamps()})))};
  });
 },
 async resetDemo():Promise<void>{await seed(await database(),true);},
};
