import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoData,validateRecord,validateSake} from './seed.ts';

test('static seed maps the original 30 products and 40 records with intact relationships',()=>{
 const data=demoData();assert.equal(data.demoMode,true);assert.equal(data.sakes.length,30);assert.equal(data.records.length,40);
 assert.equal(new Set(data.sakes.map(s=>s.id)).size,30);assert.equal(new Set(data.records.map(r=>r.id)).size,40);
 for(const r of data.records){assert.ok(data.sakes.some(s=>s.id===r.sakeId));assert.ok(Array.isArray(r.tags));assert.ok(r.dryness!==null&&r.dryness>=0&&r.dryness<=100);}
 assert.equal(data.sakes.filter(s=>s.officialDryness!==null&&s.officialRichness!==null).length,24);
 assert.ok(data.sakes.every(s=>s.officialBasis.includes('架空')));
 assert.equal(data.records[0].dryness,18);assert.equal(data.records[0].richness,76);
});
test('browser writes validate nulls, ranges, URLs and required official basis',()=>{
 const data=demoData();const record={...data.records[0],dryness:null,richness:null,rating:null};
 assert.equal(validateRecord(record).dryness,null);assert.equal(validateRecord(record).rating,null);
 assert.deepEqual(validateRecord(record).tags,record.tags);
 assert.throws(()=>validateRecord({...record,dryness:101}));assert.throws(()=>validateRecord({...record,rating:6}));
 assert.throws(()=>validateRecord({...record,date:'2026-02-30'}));assert.throws(()=>validateSake({name:''}));
 assert.throws(()=>validateSake({name:'test',sourceUrl:'javascript:alert(1)'}));
 assert.throws(()=>validateSake({name:'test',officialDryness:50,officialBasis:''}));
});
