import type {TastingRecord} from './types';
import {preferenceSummary,quadrantRatings} from './tasteAnalysis';

export function PreferenceChart({records}:{records:TastingRecord[]}){
 const groups=quadrantRatings(records),count=groups.reduce((sum,g)=>sum+g.count,0);
 return <section className="preference-chart">
  <h2>味わい別のお気に入り度</h2><p className="hint">平均お気に入り度（1〜5） · 対象 {count}件</p>
  <div className="preference-scale" aria-hidden="true">{[1,2,3,4,5].map(n=><span key={n}>{n}</span>)}</div>
  {groups.map(g=><div className="preference-row" key={g.name}>
   <div className="between"><h3>{g.name}</h3><span>{g.average===null?'記録なし':`★ ${g.average.toFixed(1)}（${g.count}件）`}</span></div>
   <div className="preference-track" role="img" aria-label={`${g.name}：${g.average===null?'記録なし':`平均${g.average.toFixed(1)}、${g.count}件`}`}>
    {g.average!==null&&<div className="preference-fill" style={{width:`${(g.average-1)/4*100}%`}}/>}
   </div>
  </div>)}
  <p className="notice">{preferenceSummary(groups)}</p>
  <p className="hint">甘辛・濃淡・星がそろった飲酒記録だけを集計。同じ銘柄の記録も1回ずつ数えます。対象外：{records.length-count}件。</p>
  <p className="hint">甘辛50未満を甘口側、濃淡50未満を淡麗側に分類する集計上の区分です。50付近は中間的な味わいです。記録が少ない領域の平均は、今後大きく変わることがあります。</p>
 </section>;
}
