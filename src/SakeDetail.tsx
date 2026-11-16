import type {Data,Sake,TastingRecord} from './types';
import {recordsForSake} from './tasteAnalysis';
export function SakeDetail({data,sake,onBack,onOpen,onEdit}:{data:Data;sake:Sake;onBack:()=>void;onOpen:(r:TastingRecord)=>void;onEdit:()=>void}){
 const records=recordsForSake(data.records,sake.id);
 return <>
  <button className="text-btn sake-back" onClick={onBack}>← 酒棚へ</button><p className="eyebrow">SAKE COLLECTION</p><h1>{sake.name}</h1>
  {(data.demoMode||sake.sample===1)&&<p className="sample-label">架空のデモデータ</p>}
  <section className="sake-profile"><div className="between"><h2>日本酒の基本情報</h2><button className="text-btn" onClick={onEdit}>編集</button></div><dl><dt>酒蔵</dt><dd>{sake.brewery||'未登録'}</dd><dt>産地</dt><dd>{sake.prefecture||'未登録'}</dd><dt>特定名称</dt><dd>{sake.designation||'未登録'}</dd><dt>その他分類</dt><dd>{sake.classifications||'未登録'}</dd></dl></section>
  <div className="between sake-record-heading"><h2>この銘柄の飲酒記録</h2><span>{records.length}件</span></div>
  {records.length?records.map(r=><button className="history-card" data-record-id={r.id} key={r.id} onClick={()=>onOpen(r)}><div className="between"><small>{r.date}</small><span className="rating">{r.rating?`★ ${r.rating}`:'未評価'}</span></div><p>甘辛 {r.dryness??'未評価'} <span> / </span> 濃淡 {r.richness??'未評価'}</p><p className="truncate">{r.memo||'メモなし'}</p></button>):<p className="empty">この銘柄の飲酒記録はありません。</p>}
 </>;
}
