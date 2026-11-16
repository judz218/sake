import {test} from 'node:test';
import assert from 'node:assert/strict';
process.env.DB_PATH=':memory:';
const {app}=await import('./app.ts');
const {db}=await import('./db.ts');
test('API: transaction, validation, CRUD and safe sample removal',async()=>{
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 const address=server.address() as {port:number};const base=`http://127.0.0.1:${address.port}/api`;
 const request=async(path:string,method='GET',body?:unknown)=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 const record={date:'2026-11-16',dryness:null,richness:null,rating:null,tags:[]};
 try{
 assert.equal((await request('/entries','POST',{sake:{name:'失敗する銘柄'},record:{...record,rating:6}})).status,400);
 assert.equal((await request('/data')).data.sakes.length,0,'invalid combined creation rolls back sake');
 const created=await request('/entries','POST',{sake:{name:'実記録'},record});assert.equal(created.status,201);
 let data=(await request('/data')).data;const id=created.data.id,sakeId=data.sakes[0].id;
 assert.equal(data.records[0].dryness,null);assert.equal(data.records[0].rating,null);
 assert.equal((await request(`/records/${id}`,'PUT',{...record,sakeId,dryness:101})).status,400);
 assert.equal((await request(`/records/${id}`,'PUT',{...record,sakeId,date:'2026-02-30'})).status,400);
 assert.equal((await request(`/records/${id}`,'PUT',{...record,sakeId,dryness:50,richness:60,rating:4})).status,200);
 assert.equal((await request(`/sakes/${sakeId}`,'PUT',{name:'実記録',officialDryness:30})).status,400);
 assert.equal((await request(`/sakes/${sakeId}`,'PUT',{name:'実記録',sourceUrl:'javascript:alert(1)'})).status,400);
 assert.equal((await request(`/sakes/${sakeId}`,'DELETE')).status,409);
 await request('/samples','POST');data=(await request('/data')).data;assert.equal(data.records.length,12);
 const sampleId=data.sakes.find((s:{sample:number})=>s.sample===1).id;
 await request('/records','POST',{...record,sakeId:sampleId});
 await request('/samples','DELETE');data=(await request('/data')).data;assert.equal(data.records.length,2);assert.equal(data.sakes.length,2,'sample sake used by real record survives');
 assert.equal(data.records.find((r:{id:number})=>r.id===id).dryness,50);
 const second=data.records.find((r:{id:number})=>r.id!==id);
 await request(`/records/${second.id}`,'DELETE');await request(`/sakes/${sampleId}`,'DELETE');
 await request(`/records/${id}`,'DELETE');assert.equal((await request(`/sakes/${sakeId}`,'DELETE')).status,200);
 assert.equal((await request(`/records/${id}`,'DELETE')).status,404);
 }finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));db.close();}
});
