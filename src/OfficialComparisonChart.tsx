import type {Sake,TastingRecord} from './types';
import {comparisonSummary,officialProvenance} from './tasteAnalysis';

/** Read-only comparison of this single tasting with its product's registered values. */
export function OfficialComparisonChart({sake,record,demoMode=false}:{sake:Sake;record:TastingRecord;demoMode?:boolean}){
 const axes=[{key:'dryness',label:'甘辛',personal:record.dryness,official:sake.officialDryness},{key:'richness',label:'濃淡',personal:record.richness,official:sake.officialRichness}];
 const available=axes.filter(a=>a.official!==null);
 if(!available.length)return <p className="hint">この銘柄には比較用の公式情報が登録されていません。</p>;
 const canPlot=record.dryness!==null&&record.richness!==null&&sake.officialDryness!==null&&sake.officialRichness!==null;
 const x=(v:number)=>34+v*2.92,y=(v:number)=>326-v*2.92;
 return <div className="record-comparison">
  <h3>公式情報との比較</h3>
  {(demoMode||sake.sample===1)&&<p className="sample-label">公式座標・説明も含め、すべて架空のデータです。</p>}
  <p className="comparison-provenance">{officialProvenance(sake,demoMode)}</p>
  {canPlot?<>
   <svg className="comparison-scatter" viewBox="0 0 360 360" role="img" aria-label={`自分の評価：甘辛${record.dryness}・濃淡${record.richness}。公式情報：甘辛${sake.officialDryness}・濃淡${sake.officialRichness}`}>
    <rect x="34" y="34" width="292" height="292" rx="12" fill="#f0efe6"/>
    {[25,50,75].map(n=><g key={n} stroke={n===50?'#b4b7a9':'#dfdfd4'} strokeDasharray={n===50?'4 4':'2 5'}><line x1={x(n)} x2={x(n)} y1="34" y2="326"/><line x1="34" x2="326" y1={y(n)} y2={y(n)}/></g>)}
    {[['濃醇',180,18],['淡麗',180,351],['甘口',17,183],['辛口',343,183]].map(([label,px,py])=><text key={label} x={px} y={py} textAnchor="middle" fontSize="12" fill="#7b8273">{label}</text>)}
    <line className="difference-link" x1={x(record.dryness!)} y1={y(record.richness!)} x2={x(sake.officialDryness!)} y2={y(sake.officialRichness!)} stroke="#a5b09c" strokeWidth="1.5"/>
    {/* A larger outline keeps the square identifiable even at identical coordinates. */}
    <rect className="official-marker" x={x(sake.officialDryness!)-10} y={y(sake.officialRichness!)-10} width="20" height="20" fill="#b4844f" fillOpacity="0.25" stroke="#b4844f" strokeWidth="2"/>
    <circle className="personal-marker" cx={x(record.dryness!)} cy={y(record.richness!)} r="7" fill="#305949" stroke="#fff" strokeWidth="1.5"/>
   </svg>
   <div className="comparison-legend"><span>● 自分の評価</span><span>■ 登録された公式情報</span></div>
  </>:<p className="hint">両軸がそろっていないため散布図は表示しません。登録済みの軸の数値だけを比較します。</p>}
  <table className="comparison-table"><caption className="sr-only">自分の評価と公式情報の数値</caption><thead><tr><th scope="col">項目</th><th scope="col">自分</th><th scope="col">公式</th></tr></thead><tbody>{available.map(a=><tr key={a.key}><th scope="row">{a.label}</th><td>{a.personal??'未評価'}</td><td>{a.official}</td></tr>)}</tbody></table>
  <p className="comparison-comment">{comparisonSummary(record,sake)}</p>
  <p className="hint">公式情報は正解ではなく、自分の感じ方との比較対象です。差が10以下を「近い評価」とするアプリ内の暫定基準で、科学的な判定ではありません。</p>
 </div>;
}
