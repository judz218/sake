import express from 'express';
import {db,transaction} from './db.ts';
import {InputError,validate} from './validation.ts';
import {demoMode} from './config.ts';
export const app=express();app.use(express.json({limit:'100kb'}));
const all=()=>({demoMode,sakes:db.prepare('SELECT * FROM sakes ORDER BY name').all(),records:db.prepare('SELECT * FROM records ORDER BY date DESC,id DESC').all().map(r=>({...r,tags:JSON.parse(String(r.tags))}))});
function insert(table:string,values:Record<string,unknown>,sample=0){const now=new Date().toISOString();const v={...values,sample,createdAt:now,updatedAt:now};return Number(db.prepare(`INSERT INTO ${table} (${Object.keys(v).join(',')}) VALUES (${Object.keys(v).map(()=>'?').join(',')})`).run(...Object.values(v) as (string|number|null)[]).lastInsertRowid);}
app.get('/api/data',(_req,res)=>res.json(all()));
for(const table of ['sakes','records'] as const){
 app.post(`/api/${table}`,(req,res)=>{const v=validate(req.body,table);if(table==='records'&&!db.prepare('SELECT id FROM sakes WHERE id=?').get(Number(v.sakeId)))throw new InputError('銘柄が見つかりません');const id=insert(table,v);res.status(201).json({id});});
 app.put(`/api/${table}/:id`,(req,res)=>{const v=validate(req.body,table);if(table==='records'&&!db.prepare('SELECT id FROM sakes WHERE id=?').get(Number(v.sakeId)))throw new InputError('銘柄が見つかりません');v.updatedAt=new Date().toISOString();const result=db.prepare(`UPDATE ${table} SET ${Object.keys(v).map(k=>`${k}=?`).join(',')} WHERE id=?`).run(...Object.values(v),Number(req.params.id));if(!result.changes){res.status(404).json({error:'見つかりません'});return;}res.json({ok:true});});
 app.delete(`/api/${table}/:id`,(req,res)=>{const id=Number(req.params.id);if(table==='sakes'&&db.prepare('SELECT id FROM records WHERE sakeId=?').get(id)){res.status(409).json({error:'飲酒記録が残っている銘柄は削除できません。先に記録を削除してください。'});return;}const r=db.prepare(`DELETE FROM ${table} WHERE id=?`).run(id);res.status(r.changes?200:404).json(r.changes?{ok:true}:{error:'見つかりません'});});
}
app.post('/api/entries',(req,res)=>{const id=transaction(()=>{const sakeId=req.body.sakeId || insert('sakes',validate(req.body.sake,'sakes'));return insert('records',validate({...req.body.record,sakeId},'records'));});res.status(201).json({id});});
app.post('/api/samples',(_req,res)=>{transaction(()=>{if(db.prepare('SELECT id FROM sakes WHERE sample=1').get())return;for(let i=0;i<10;i++){const sakeId=insert('sakes',validate({name:`架空・${['月白','花霞','水音','稲穂','雪灯','青嵐','山影','朝露','宵月','風待'][i]}`,brewery:'架空酒造',prefecture:['新潟県','山形県','長野県'][i%3],designation:['純米酒','純米吟醸','純米大吟醸'][i%3],officialDryness:i%3===0?20+i*6:null,officialRichness:i%3===0?75-i*5:null,officialBasis:i%3===0?'UI確認用の架空情報。実在する商品の公式情報ではありません。':''},'sakes'),1);for(let j=0;j<(i===0?2:1);j++)insert('records',validate({sakeId,date:`2026-10-${String(i+10+j).padStart(2,'0')}`,dryness:10+i*9+j*7,richness:(i*31+20+j*12)%101,rating:i%5+1,aroma:i%2?'穏やか':'華やか・強い',tags:i%2?['米の旨み','まろやか']:['フルーティー','すっきり'],memo:'UI確認用の架空の飲酒記録です。',place:'自宅'},'records'),1);}});res.json({ok:true});});
app.delete('/api/samples',(_req,res)=>{transaction(()=>{db.prepare('DELETE FROM records WHERE sample=1').run();db.prepare('DELETE FROM sakes WHERE sample=1 AND id NOT IN (SELECT sakeId FROM records)').run();});res.json({ok:true});});
app.use('/api',(_req,res)=>res.status(404).json({error:'APIが見つかりません'}));
app.use(express.static('dist'));
app.use((err:Error,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{if(!(err instanceof InputError))console.error(err);res.status(err instanceof InputError||err instanceof SyntaxError?400:500).json({error:err instanceof InputError?err.message:'処理に失敗しました。入力内容を保持しています。'});});
