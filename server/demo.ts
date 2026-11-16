import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {DatabaseSync} from 'node:sqlite';
import {validate} from './validation.ts';

interface DemoSake {
 id:string;name:string;brewery:string;prefecture:string;specialDesignation:string;otherClassifications:string[];
 officialDescription:string;officialSourceUrl:string|null;sakeMeterValue:number|null;acidity:number|null;
 officialSweetDry:number|null;officialLightRich:number|null;officialCoordinateSource:string;isDemo:boolean;
}
interface DemoRecord {
 id:string;sakeId:string;drankAt:string;sweetDry:number|null;lightRich:number|null;aroma:string;
 rating:number|null;tags:string[];memo:string;place:string;isDemo:boolean;
}
interface Dataset {metadata:{fictional:boolean;version:number;dataset:string};sakes:DemoSake[];tastingRecords:DemoRecord[]}
export const demoNotice='デモ用の架空情報。実在する日本酒の公式情報ではありません。';
const source=resolve('demo/sake_demo_40.json');

export function importDemo(db:DatabaseSync,reset=false){
 const dataset=JSON.parse(readFileSync(source,'utf8')) as Dataset;
 if(dataset.metadata.fictional!==true)throw new Error('架空データの宣言がありません');
 const aromas:Record<string,string>={none:'穏やか',light:'穏やか',strong:'華やか・強い',unknown:''};
 const sakeIds=new Set<string>(),recordIds=new Set<string>();
 // Validate the entire source before resetting anything.
 const sakes=dataset.sakes.map(s=>{
  if(!s.isDemo||sakeIds.has(s.id))throw new Error('不正または重複する銘柄ID');sakeIds.add(s.id);
  return {sourceId:s.id,values:validate({name:s.name,brewery:s.brewery,prefecture:s.prefecture,
   designation:s.specialDesignation,classifications:s.otherClassifications.join('・'),
   officialDescription:s.officialDescription,sourceUrl:s.officialSourceUrl??'',nihonshudo:s.sakeMeterValue,acidity:s.acidity,
   officialDryness:s.officialSweetDry,officialRichness:s.officialLightRich,
   officialBasis:`${demoNotice} 取得元: ${s.officialCoordinateSource||'fictional_demo'}`},'sakes')};
 });
 const records=dataset.tastingRecords.map(r=>{
  if(!r.isDemo||recordIds.has(r.id)||!sakeIds.has(r.sakeId)||!(r.aroma in aromas))throw new Error('飲酒記録のID・参照・香りを確認してください');recordIds.add(r.id);
  return {sakeSourceId:r.sakeId,values:validate({sakeId:1,date:r.drankAt,dryness:r.sweetDry,richness:r.lightRich,
   aroma:aromas[r.aroma],rating:r.rating,tags:r.tags,memo:r.memo,place:r.place},'records')};
 });
 db.exec('BEGIN IMMEDIATE');
 try{
  db.exec('CREATE TABLE IF NOT EXISTS demo_imports(dataset TEXT PRIMARY KEY,version INTEGER NOT NULL,importedAt TEXT NOT NULL)');
  if(!reset&&db.prepare('SELECT dataset FROM demo_imports WHERE dataset=?').get(dataset.metadata.dataset)){
   db.exec('COMMIT');return {imported:false,sakes:0,records:0};
  }
  if(reset)db.exec('DELETE FROM records; DELETE FROM sakes; DELETE FROM demo_imports;');
  else if(Number(db.prepare('SELECT COUNT(*) AS n FROM sakes').get()!.n)>0)throw new Error('未管理のデモDBにデータがあります。demo:resetで再生成してください');
  const now=new Date().toISOString();
  const insert=(table:string,values:Record<string,string|number|null>)=>{
   const row={...values,sample:1,createdAt:now,updatedAt:now};
   return Number(db.prepare(`INSERT INTO ${table} (${Object.keys(row).join(',')}) VALUES (${Object.keys(row).map(()=>'?').join(',')})`).run(...Object.values(row)).lastInsertRowid);
  };
  const ids=new Map(sakes.map(s=>[s.sourceId,insert('sakes',s.values)]));
  for(const r of records)insert('records',{...r.values,sakeId:ids.get(r.sakeSourceId)!});
  db.prepare('INSERT INTO demo_imports VALUES(?,?,?)').run(dataset.metadata.dataset,dataset.metadata.version,now);
  db.exec('COMMIT');return {imported:true,sakes:sakes.length,records:records.length};
 }catch(e){db.exec('ROLLBACK');throw e;}
}
