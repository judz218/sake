import type {Data,Sake,TastingRecord} from './types';
import {OfficialComparisonChart} from './OfficialComparisonChart';

export function RecordDetail({data,sake,record,backLabel,onBack,onOpen,onEdit,onEditSake,onDelete,pending}:{
 data:Data;sake:Sake;record:TastingRecord;backLabel:string;onBack:()=>void;onOpen:(r:TastingRecord)=>void;
 onEdit:()=>void;onEditSake:()=>void;onDelete:()=>void;pending:boolean;
}){
 return <>
  <button className="text-btn detail-back" onClick={onBack}>← {backLabel}へ</button>
  <p className="eyebrow">TASTING NOTE · {record.date}</p><h1>{sake.name}</h1>
  {(data.demoMode||record.sample===1||sake.sample===1)&&<p className="sample-label">架空のデモデータ</p>}
  <p className="subtitle">{[sake.brewery,sake.prefecture,sake.designation].filter(Boolean).join(' · ')||'日本酒情報は未登録'}</p>
  <section className="tasting-detail"><div className="between"><h2>この日の味わい</h2><b className="rating">{record.rating?'★'.repeat(record.rating):'星未評価'}</b></div>
   <dl><dt>甘辛</dt><dd>{record.dryness??'未評価'}{record.dryness!==null?' / 100':''}</dd><dt>濃淡</dt><dd>{record.richness??'未評価'}{record.richness!==null?' / 100':''}</dd><dt>香り</dt><dd>{record.aroma||'未評価'}</dd><dt>場所</dt><dd>{record.place||'未登録'}</dd></dl>
   <div className="chips">{record.tags.map(t=><span key={t}>{t}</span>)}</div>
   <p className="memo tasting-memo">{record.memo||'メモはありません。'}</p>
   <OfficialComparisonChart sake={sake} record={record} demoMode={data.demoMode}/>
   <div className="record-actions"><button className="secondary" onClick={onEdit}>飲酒記録を編集</button><button className="danger" disabled={pending} onClick={onDelete}>この飲酒記録を削除</button></div>
  </section>
  <section className="sake-information"><div className="between"><h2>日本酒・公式情報</h2><button className="text-btn" onClick={onEditSake}>編集</button></div>
   <dl><dt>その他分類</dt><dd>{sake.classifications||'未登録'}</dd><dt>日本酒度</dt><dd>{sake.nihonshudo??'未登録'}</dd><dt>酸度</dt><dd>{sake.acidity??'未登録'}</dd><dt>公式甘辛</dt><dd>{sake.officialDryness??'未登録'}</dd><dt>公式濃淡</dt><dd>{sake.officialRichness??'未登録'}</dd></dl>
   {sake.officialDescription&&<p className="memo">{sake.officialDescription}</p>}
   {sake.sourceUrl&&<a href={sake.sourceUrl} target="_blank" rel="noreferrer">公式情報の出典 ↗</a>}
   {sake.officialBasis&&<p className="notice">根拠：{sake.officialBasis}</p>}<p className="hint">公式情報は手動入力の比較対象です。</p>
  </section>
  <section><h2>同じ銘柄の記録</h2>{data.records.filter(r=>r.sakeId===sake.id).map(r=><button key={r.id} className="record-link" onClick={()=>onOpen(r)}>{r.date}<span>{r.rating?`★ ${r.rating}`:'未評価'} →</span></button>)}</section>
 </>;
}
