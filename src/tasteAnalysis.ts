import type {Sake,TastingRecord} from './types';

export const quadrantNames=['濃醇甘口','濃醇辛口','淡麗甘口','淡麗辛口'] as const;
export interface QuadrantRating {name:typeof quadrantNames[number];count:number;average:number|null}
// Aggregate independent tasting experiences, never product averages or nulls.
export function quadrantRatings(records:readonly TastingRecord[]):QuadrantRating[]{
 const groups=quadrantNames.map(name=>({name,count:0,total:0}));
 for(const r of records){
  if(r.dryness===null||r.richness===null||r.rating===null)continue;
  const index=(r.richness<50?2:0)+(r.dryness>=50?1:0);
  groups[index].count++;groups[index].total+=r.rating;
 }
 return groups.map(({name,count,total})=>({name,count,average:count?total/count:null}));
}
export function preferenceSummary(groups:readonly QuadrantRating[]):string{
 const rated=groups.filter(g=>g.average!==null);
 const total=rated.reduce((sum,g)=>sum+g.count,0);
 if(total<10||rated.length<4||rated.some(g=>g.count<3))return '記録が増えると好みの傾向を確認しやすくなります。まだ領域ごとの評価が十分ではありません。';
 if(Math.max(...rated.map(g=>g.count))>Math.min(...rated.map(g=>g.count))*3)return '領域ごとの記録件数に偏りがあります。いろいろな味わいを記録して比べてみましょう。';
 const sorted=[...rated].sort((a,b)=>b.average!-a.average!);
 if(sorted[0].average!-sorted[1].average!<0.5)return '領域間の平均評価は近く、はっきりした好みの違いはまだ見られません。';
 return `${sorted[0].name}の日本酒を比較的高く評価しています。今ある記録の範囲での傾向です。`;
}
export function comparisonMessage(personal:number|null,official:number|null,axis:'dryness'|'richness'):string{
 if(official===null)return 'この軸の公式情報は未登録です。';
 if(personal===null)return 'この記録の自分の評価は未評価です。';
 const difference=personal-official;
 if(Math.abs(difference)<=10)return '公式情報と近い評価です。';
 return axis==='dryness'?`公式情報より${difference<0?'甘口':'辛口'}寄りに感じています。`:`公式情報より${difference<0?'淡麗':'濃醇'}に感じています。`;
}
export function comparisonSakes(sakes:readonly Sake[]):Sake[]{
 return sakes.filter(s=>s.officialDryness!==null||s.officialRichness!==null);
}
export function recordsForSake(records:readonly TastingRecord[],sakeId:number):TastingRecord[]{
 return records.filter(r=>r.sakeId===sakeId).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
}
export function officialProvenance(sake:Sake,demoMode=false):string{
 if(demoMode||sake.sample===1)return '架空の比較値（デモ・サンプル）';
 if(/推定|推測|算出|換算|estimate/i.test(sake.officialBasis))return '推定値（登録された根拠による）';
 if(/公表|明記|掲載/.test(sake.officialBasis))return '公表値（登録された根拠による・アプリでは未検証）';
 return '取得方法未確認：公表値・推定値の別は根拠を確認してください';
}
