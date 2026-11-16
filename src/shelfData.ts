import type {Data,Sake,TastingRecord} from './types';

export type ShelfSort='recent'|'rating'|'name'|'count';
export interface ShelfItem {sake:Sake;records:TastingRecord[];latestDate:string;averageRating:number|null;count:number}
export function shelfItems(data:Data,query='',sort:ShelfSort='recent'):ShelfItem[]{
 const bySake=new Map<number,TastingRecord[]>();
 for(const record of data.records){const rows=bySake.get(record.sakeId)??[];rows.push(record);bySake.set(record.sakeId,rows);}
 const normalize=(s:string)=>s.normalize('NFKC').toLocaleLowerCase('ja').trim();
 const search=normalize(query),collator=new Intl.Collator('ja',{numeric:true});
 const items: ShelfItem[]=[];
 for(const sake of data.sakes){
  const rows=bySake.get(sake.id);if(!rows?.length)continue;
  if(search&&![sake.name,sake.brewery].some(s=>normalize(s).includes(search)))continue;
  const records=[...rows].sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
  const rated=records.filter(r=>r.rating!==null);
  items.push({sake,records,count:records.length,latestDate:records[0].date,averageRating:rated.length?rated.reduce((sum,r)=>sum+r.rating!,0)/rated.length:null});
 }
 const recent=(a:ShelfItem,b:ShelfItem)=>b.latestDate.localeCompare(a.latestDate)||a.sake.id-b.sake.id;
 return items.sort((a,b)=>{
  if(sort==='rating')return (b.averageRating??-1)-(a.averageRating??-1)||recent(a,b);
  if(sort==='name')return collator.compare(a.sake.name,b.sake.name)||recent(a,b);
  if(sort==='count')return b.count-a.count||recent(a,b);
  return recent(a,b);
 });
}
