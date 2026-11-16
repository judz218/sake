import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {demoData} from './data/seed.ts';
import {shelfItems} from './shelfData.ts';
import {bottleDesign,Bottle} from './Bottle.tsx';
import {Shelf} from './Shelf.tsx';

test('one bottle per ID with recorded tastings; same-name products remain distinct',()=>{
 const data=demoData();assert.equal(shelfItems(data).length,30);
 const sake=data.sakes[0];data.sakes.push({...sake,id:99},{...sake,id:100});
 data.records.push({...data.records[0],id:99,sakeId:99});
 assert.equal(shelfItems(data).length,31);
 assert.equal(shelfItems(data).filter(item=>item.sake.name===sake.name).length,2);
 assert.ok(!shelfItems(data).some(item=>item.sake.id===100));
 data.records=data.records.filter(r=>r.sakeId!==99);assert.equal(shelfItems(data).length,30);
});
test('search by name/brewery with NFKC and stable recent/rating/name/count sorts',()=>{
 const data=demoData();data.sakes=data.sakes.slice(0,3);
 data.sakes[0].name='ＡＢＣ';data.sakes[1].name='あいう';data.sakes[2].name='かきく';
 const base=data.records[0];
 data.records=[{...base,id:1,sakeId:1,date:'2026-01-01',rating:5},{...base,id:2,sakeId:1,date:'2026-02-01',rating:null},{...base,id:3,sakeId:2,date:'2026-03-01',rating:4},{...base,id:4,sakeId:3,date:'2026-04-01',rating:null}];
 assert.deepEqual(shelfItems(data,'','recent').map(i=>i.sake.id),[3,2,1]);
 assert.deepEqual(shelfItems(data,'','rating').map(i=>i.sake.id),[1,2,3]);
 assert.equal(shelfItems(data,'','rating')[0].averageRating,5);
 assert.equal(shelfItems(data,'','count')[0].count,2);
 assert.equal(shelfItems(data,'abc').length,1);assert.equal(shelfItems(data,data.sakes[1].brewery).length,1);
 const names=shelfItems(data,'','name').map(i=>i.sake.name);assert.deepEqual(names,[...names].sort(new Intl.Collator('ja',{numeric:true}).compare));
 assert.equal(shelfItems(data,'存在しない').length,0);
 const snapshot=JSON.stringify(data);shelfItems(data,'','count');assert.equal(JSON.stringify(data),snapshot);
});
test('bottle decoration is deterministic, varied and supports long names without image assets',()=>{
 assert.deepEqual(bottleDesign(1),bottleDesign(1));
 assert.ok(new Set(Array.from({length:30},(_,i)=>JSON.stringify(bottleDesign(i+1)))).size>25);
 const html=renderToStaticMarkup(createElement(Bottle,{id:1,name:'非常に長い銘柄名 ABC 純米吟醸 生原酒'}));
 assert.match(html,/<svg/);assert.doesNotMatch(html,/<image|<img|http/);assert.match(html,/…/);
});
test('shelf renders 30 bottles in eight rows and distinguishes empty/search states',()=>{
 const data=demoData(),props={data,query:'',sort:'recent' as const,onQuery:()=>{},onSort:()=>{},onOpen:()=>{},onAdd:()=>{}};
 const html=renderToStaticMarkup(createElement(Shelf,props));
 assert.equal((html.match(/class="shelf-bottle"/g)??[]).length,30);assert.equal((html.match(/class="shelf-row"/g)??[]).length,8);
 assert.match(renderToStaticMarkup(createElement(Shelf,{...props,query:'存在しない'})),/該当する銘柄がありません/);
 assert.match(renderToStaticMarkup(createElement(Shelf,{...props,data:{sakes:[],records:[]}})),/まだ日本酒の記録がありません/);
});
