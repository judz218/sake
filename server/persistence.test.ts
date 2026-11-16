import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
test('SQLite retains records across process restart and initialization',()=>{
 const directory=mkdtempSync(join(tmpdir(),'sake-persistence-'));
 const run=(code:string)=>{const result=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',code],{cwd:process.cwd(),env:{...process.env,DB_PATH:join(directory,'test.sqlite')},encoding:'utf8'});assert.equal(result.status,0,result.stderr);return result.stdout.trim();};
 try{
  run(`import {db} from './server/db.ts'; db.prepare("INSERT INTO sakes(name,createdAt,updatedAt) VALUES ('Persistence test','now','now')").run(); db.prepare("INSERT INTO records(sakeId,date,dryness,richness,rating,createdAt,updatedAt) VALUES (1,'2026-11-16',25,75,5,'now','now')").run(); db.close();`);
  assert.equal(run(`import {db} from './server/db.ts'; const record=db.prepare('SELECT * FROM records').get(); console.log(JSON.stringify([record.dryness,record.richness,record.rating,db.prepare('SELECT COUNT(*) AS n FROM sakes').get().n])); db.close();`),'[25,75,5,1]');
 }finally{rmSync(directory,{recursive:true,force:true});}
});
