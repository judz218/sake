import type {Data,Sake} from './types';
import {Bottle} from './Bottle';
import {shelfItems,type ShelfSort} from './shelfData';

export function Shelf({data,query,sort,onQuery,onSort,onOpen,onAdd}:{data:Data;query:string;sort:ShelfSort;onQuery:(q:string)=>void;onSort:(sort:ShelfSort)=>void;onOpen:(s:Sake)=>void;onAdd:()=>void}){
 const items=shelfItems(data,query,sort),total=shelfItems(data).length;
 const rows=Array.from({length:Math.ceil(items.length/4)},(_,i)=>items.slice(i*4,i*4+4));
 return <div className="shelf-home">
  <div className="between shelf-heading"><h1>わたしの酒棚</h1><span>{total}銘柄</span></div>
  <div className="shelf-search"><label htmlFor="shelf-search" className="sr-only">銘柄名・酒蔵名で検索</label><input id="shelf-search" type="search" placeholder="銘柄名・酒蔵名で検索" value={query} onChange={e=>onQuery(e.target.value)}/>{query&&<button className="search-clear" aria-label="検索をクリア" onClick={()=>onQuery('')}>×</button>}</div>
  <label className="shelf-sort">並び替え<select value={sort} onChange={e=>onSort(e.target.value as ShelfSort)}><option value="recent">最近飲んだ順</option><option value="rating">星評価が高い順</option><option value="name">銘柄名順</option><option value="count">飲んだ回数順</option></select></label>
  {rows.length?<div className="shelf-rows">{rows.map((row,i)=><div className="shelf-row" key={i}>{row.map(item=><button type="button" className="shelf-bottle" key={item.sake.id} data-sake-id={item.sake.id} aria-label={`${item.sake.name}、${item.sake.brewery||'酒蔵未登録'}、${item.count}件の記録`} onClick={()=>onOpen(item.sake)}><span className="bottle-stage"><Bottle id={item.sake.id} name={item.sake.name}/></span><span className="bottle-caption" title={item.sake.name}>{item.sake.name}</span></button>)}</div>)}</div>:total?<div className="empty shelf-empty"><p>該当する銘柄がありません</p><button className="text-btn" onClick={()=>onQuery('')}>検索をクリア</button></div>:<div className="shelf-empty"><div className="empty-shelf-board"/><p>まだ日本酒の記録がありません</p><button className="secondary" onClick={onAdd}>＋ 最初の一杯を記録</button></div>}
 </div>;
}
