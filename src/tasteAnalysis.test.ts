import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {comparisonMessage,comparisonSakes,comparisonSummary,officialProvenance,preferenceSummary,quadrantRatings,recordsForSake} from './tasteAnalysis.ts';
import {OfficialComparisonChart} from './OfficialComparisonChart.tsx';
import {PreferenceChart} from './PreferenceChart.tsx';
import type {Sake,TastingRecord} from './types.ts';

const record=(patch:Partial<TastingRecord>={}):TastingRecord=>({id:1,sakeId:1,date:'2026-11-16',dryness:20,richness:80,aroma:'',rating:5,tags:[],memo:'',place:'',sample:0,createdAt:'',updatedAt:'',...patch});
const sake=(patch:Partial<Sake>={}):Sake=>({id:1,name:'テスト銘柄',brewery:'テスト酒蔵',prefecture:'',designation:'',classifications:'',officialDescription:'',sourceUrl:'',nihonshudo:null,acidity:null,officialDryness:20,officialRichness:80,officialBasis:'公式サイトで公表',sample:0,createdAt:'',updatedAt:'',...patch});

test('quadrants: 50 boundary, null exclusion and independent repeated tastings',()=>{
 const groups=quadrantRatings([
  record({dryness:49,richness:50,rating:5}),record({dryness:49,richness:50,rating:2}),
  record({dryness:50,richness:50,rating:3}),record({dryness:49,richness:49,rating:4}),
  record({dryness:50,richness:49,rating:1}),record({rating:null}),record({dryness:null}),record({richness:null}),
 ]);
 assert.deepEqual(groups,[{name:'濃醇甘口',count:2,average:3.5},{name:'濃醇辛口',count:1,average:3},{name:'淡麗甘口',count:1,average:4},{name:'淡麗辛口',count:1,average:1}]);
 assert.ok(quadrantRatings([]).every(g=>g.count===0&&g.average===null));
});

test('summary avoids claims on sparse, biased or similar groups',()=>{
 const groups=quadrantRatings([]);
 assert.match(preferenceSummary(groups),/記録が増える/);
 assert.match(preferenceSummary(groups.map(g=>({...g,count:1,average:5}))),/十分ではありません/);
 assert.match(preferenceSummary(groups.map((g,i)=>({...g,count:i===0?20:3,average:5-i}))),/偏り/);
 assert.match(preferenceSummary(groups.map((g,i)=>({...g,count:5,average:4-i*0.1}))),/近く/);
 assert.match(preferenceSummary(groups.map((g,i)=>({...g,count:5,average:5-i}))),/濃醇甘口.*比較的高く/);
});

test('difference threshold, missing axes, provenance and latest-first record selection',()=>{
 assert.match(comparisonMessage(40,50,'dryness'),/近い/);
 assert.match(comparisonMessage(39,50,'dryness'),/甘口/);
 assert.match(comparisonMessage(61,50,'dryness'),/辛口/);
 assert.match(comparisonMessage(39,50,'richness'),/淡麗/);
 assert.match(comparisonMessage(61,50,'richness'),/濃醇/);
 assert.match(comparisonMessage(null,50,'dryness'),/未評価/);
 assert.match(comparisonMessage(50,null,'richness'),/未登録/);
 assert.deepEqual(comparisonSakes([sake(),sake({id:2,officialRichness:null}),sake({id:3,officialDryness:null,officialRichness:null})]).map(s=>s.id),[1,2]);
 const records=[record({id:1,date:'2026-01-01'}),record({id:2,date:'2026-02-01'}),record({id:3,date:'2026-02-01'}),record({id:4,sakeId:2})];
 assert.deepEqual(recordsForSake(records,1).map(r=>r.id),[3,2,1]);assert.equal(records[0].id,1);
 assert.match(officialProvenance(sake(),true),/架空/);
 assert.match(officialProvenance(sake({officialBasis:'日本酒度から推定'})),/推定値/);
 assert.match(officialProvenance(sake()),/公表値/);
 assert.match(officialProvenance(sake({officialBasis:''})),/未確認/);
});

test('detail comparison: square scatter, missing axes and no inferred coordinates',()=>{
 const missing=renderToStaticMarkup(createElement(OfficialComparisonChart,{sake:sake({officialDryness:null,officialRichness:null}),record:record()}));
 assert.match(missing,/比較用の公式情報が登録されていません/);assert.doesNotMatch(missing,/<svg/);
 const partial=renderToStaticMarkup(createElement(OfficialComparisonChart,{demoMode:true,sake:sake({officialRichness:null}),record:record({dryness:35})}));
 assert.doesNotMatch(partial,/<svg/);assert.match(partial,/<td>35<\/td>/);assert.match(partial,/すべて架空/);
 assert.equal((partial.match(/scope="row"/g)??[]).length,1);
 const unknown=renderToStaticMarkup(createElement(OfficialComparisonChart,{sake:sake(),record:record({dryness:null})}));
 assert.doesNotMatch(unknown,/<svg/);assert.match(unknown,/未評価/);
 const full=renderToStaticMarkup(createElement(OfficialComparisonChart,{sake:sake({officialDryness:100,officialRichness:100}),record:record({dryness:0,richness:0})}));
 assert.equal((full.match(/<svg /g)??[]).length,1);assert.match(full,/viewBox="0 0 360 360"/);
 assert.match(full,/cx="34" cy="326"/);assert.match(full,/class="official-marker" x="316" y="24"/);
 assert.equal((full.match(/class="personal-marker"/g)??[]).length,1);
 assert.match(comparisonSummary(record(),sake()),/甘辛・濃淡ともに.*近い/);
});

test('preference render: no-data quadrants, decimal precision, rated sample counts',()=>{
 const empty=renderToStaticMarkup(createElement(PreferenceChart,{records:[]}));
 assert.equal((empty.match(/<span>記録なし<\/span>/g)??[]).length,4);
 const html=renderToStaticMarkup(createElement(PreferenceChart,{records:[record({rating:4}),record({rating:3}),record({rating:null})]}));
 assert.match(html,/3\.5（2件）/);assert.match(html,/対象外：1件/);
});
