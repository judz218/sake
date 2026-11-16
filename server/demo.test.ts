import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {importDemo} from './demo.ts';
process.env.DB_PATH=':memory:';
const {db}=await import('./db.ts');
const {app}=await import('./app.ts');

test('demo mapping, idempotence, editable API and reset',async()=>{
 assert.deepEqual(importDemo(db),{imported:true,sakes:30,records:40});
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sakes WHERE officialDryness IS NOT NULL AND officialRichness IS NOT NULL').get()!.n,24);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM records WHERE dryness IS NOT NULL AND richness IS NOT NULL').get()!.n,40);
 assert.equal(db.prepare('SELECT COUNT(DISTINCT sakeId) AS n FROM records').get()!.n,30);
 assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sakes WHERE officialBasis NOT LIKE '%架空%'").get()!.n,0);
 const source=JSON.parse(readFileSync('demo/sake_demo_40.json','utf8'));
 const first=db.prepare('SELECT * FROM records WHERE id=1').get()!;
 assert.equal(first.dryness,source.tastingRecords[0].sweetDry);
 assert.equal(first.richness,source.tastingRecords[0].lightRich);
 assert.equal(first.aroma,'穏やか');
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 const port=(server.address() as {port:number}).port;
 const request=async(path:string,method='GET',body?:unknown)=>{
  const r=await fetch(`http://127.0.0.1:${port}/api${path}`,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  assert.ok(r.ok,await r.clone().text());return r.json();
 };
 try{
  const data=await request('/data');assert.equal(data.records.length,40);
  const r=data.records[0];await request(`/records/${r.id}`,'PUT',{...r,dryness:99,memo:'デモ編集'});
  assert.equal(importDemo(db).imported,false);
  assert.equal(db.prepare('SELECT memo FROM records WHERE id=?').get(r.id)!.memo,'デモ編集');
  const newRecord=await request('/entries','POST',{sake:{name:'デモで追加'},record:{date:'2026-11-16',dryness:30,richness:70,rating:5,tags:['米の旨み']}});
  assert.equal((await request('/data')).records.length,41);
  await request(`/records/${newRecord.id}`,'DELETE');
  assert.equal((await request('/data')).records.length,40);
  assert.deepEqual(importDemo(db,true),{imported:true,sakes:30,records:40});
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sakes').get()!.n,30);
 }finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));db.close();}
});

test('demo config ignores DB_PATH and uses separate database and API port',()=>{
 const result=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',"import {databasePath,apiPort,demoMode} from './server/config.ts';console.log(JSON.stringify({databasePath,apiPort,demoMode}));"],{encoding:'utf8',env:{...process.env,APP_MODE:'demo',DB_PATH:'data/sake.sqlite'}});
 assert.equal(result.status,0,result.stderr);const config=JSON.parse(result.stdout);
 assert.match(config.databasePath,/sake-demo\.sqlite$/);assert.equal(config.apiPort,3002);assert.equal(config.demoMode,true);
});
