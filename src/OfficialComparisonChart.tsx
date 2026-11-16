import {useState} from 'react';
import type {Data} from './types';
import {comparisonMessage,comparisonSakes,officialProvenance,recordsForSake} from './tasteAnalysis';

function DifferenceAxis({label,left,right,personal,official,axis}:{label:string;left:string;right:string;personal:number|null;official:number|null;axis:'dryness'|'richness'}){
 const scale=(v:number)=>24+v*2.72;
 return <div className="difference-axis">
  <h3>{label}</h3>
  <svg viewBox="0 0 320 90" role="img" aria-label={`${label}：自分 ${personal??'未評価'}、公式 ${official??'未登録'}`}>
   <line x1="24" x2="296" y1="34" y2="34" stroke="#d9ded0" strokeWidth="3"/>
   {[0,50,100].map(n=><g key={n}><line x1={scale(n)} x2={scale(n)} y1="29" y2="39" stroke="#a5b09c"/><text x={scale(n)} y="61" textAnchor="middle">{n}</text></g>)}
   {personal!==null&&official!==null&&<line className="difference-link" x1={scale(personal)} x2={scale(official)} y1="25" y2="43" stroke="#8b9e81" strokeWidth="3"/>}
   {official!==null&&<rect className="official-marker" x={scale(official)-6} y="37" width="12" height="12" fill="#b4844f" stroke="#fff" strokeWidth="1.5"/>}
   {personal!==null&&<circle className="personal-marker" cx={scale(personal)} cy="25" r="7" fill="#305949" stroke="#fff" strokeWidth="1.5"/>}
   <text x="24" y="82" textAnchor="start">{left}</text><text x="296" y="82" textAnchor="end">{right}</text>
  </svg>
  <div className="comparison-values"><span>● 自分 <b>{personal??'未評価'}</b></span><span>■ 公式 <b>{official??'未登録'}</b></span></div>
  <p className="hint">{comparisonMessage(personal,official,axis)}</p>
 </div>;
}

export function OfficialComparisonChart({data}:{data:Data}){
 const available=comparisonSakes(data.sakes);
 const [sakeId,setSakeId]=useState<number|null>(null),[recordId,setRecordId]=useState<number|null>(null);
 const sake=available.find(s=>s.id===sakeId)??available[0];
 if(!sake)return <div className="empty">比較できる公式の味覚情報がありません。<br/>日本酒の詳細から、出典・根拠と座標を登録できます。</div>;
 const records=recordsForSake(data.records,sake.id),record=records.find(r=>r.id===recordId)??records[0];
 const label=(id:number)=>{const s=available.find(s=>s.id===id)!;return available.filter(other=>other.name===s.name).length>1?`${s.name} · ${s.brewery||'酒蔵未登録'} (#${s.id})`:s.name;};
 const fictional=data.demoMode||sake.sample===1;
 return <div className="official-comparison">
  <label className="chart-select">比較する銘柄<select value={sake.id} onChange={e=>{setSakeId(Number(e.target.value));setRecordId(null);}}>{available.map(s=><option key={s.id} value={s.id}>{label(s.id)}</option>)}</select></label>
  <section className="comparison-card">
   <h2>{sake.name}</h2><p className="comparison-meta">{[sake.brewery,sake.prefecture,sake.designation].filter(Boolean).join(' · ')||'基本情報は未登録'}</p>
   {fictional&&<p className="sample-label">公式座標・説明も含め、すべて架空のデータです。</p>}
   <p className="comparison-provenance">{officialProvenance(sake,data.demoMode)}</p>
   {records.length>0?<label className="chart-select">比較する飲酒記録<select value={record.id} onChange={e=>setRecordId(Number(e.target.value))}>{records.map(r=><option key={r.id} value={r.id}>{r.date}{r.place?` · ${r.place}`:''} · 記録 #{r.id}</option>)}</select></label>:<p className="notice">この銘柄の飲酒記録はまだありません。自分の評価を記録すると比較できます。</p>}
   <div className="comparison-legend"><span>● 自分の評価</span><span>■ 登録された公式情報</span></div>
   <DifferenceAxis label="甘辛の比較" left="甘口" right="辛口" personal={record?.dryness??null} official={sake.officialDryness} axis="dryness"/>
   <DifferenceAxis label="濃淡の比較" left="淡麗" right="濃醇" personal={record?.richness??null} official={sake.officialRichness} axis="richness"/>
  </section>
  <section className="comparison-source"><h2>出典・補足情報</h2>
   {sake.sourceUrl?<a href={sake.sourceUrl} target="_blank" rel="noreferrer">登録された出典を確認 ↗</a>:<p className="hint">出典URLは未登録です。</p>}
   {sake.officialDescription&&<p className="memo">{sake.officialDescription}</p>}
   <p className="memo">{sake.officialBasis||'座標の根拠・取得方法は未登録です。'}</p>
   <p className="hint">公表値か推定値かは、登録された出典・根拠で確認してください。アプリでは判定・推定しません。公式情報は正解ではなく、主観評価との比較対象です。</p>
   <p className="hint">差が10以下を「近い評価」とするアプリ内の暫定基準です。統計的・科学的な基準ではありません。</p>
  </section>
 </div>;
}
