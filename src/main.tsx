import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import type {Data,Sake,TastingRecord} from './types';
import type {ShelfSort} from './shelfData';
import {repository} from './data/repository';
import {TasteMap} from './Map';
import {RecordForm,SakeEditor} from './Form';
import {Analysis} from './Analysis';
import {RecordDetail} from './RecordDetail';
import {Shelf} from './Shelf';
import {SakeDetail} from './SakeDetail';
import './style.css';

type Page='shelf'|'map'|'analysis'|'sake'|'detail'|'form'|'sake-edit';
function App(){
 const [data,setData]=useState<Data>({sakes:[],records:[]}),[page,setPage]=useState<Page>('shelf');
 const [selected,setSelected]=useState<number|null>(null),[selectedSake,setSelectedSake]=useState<number|null>(null),[edit,setEdit]=useState<TastingRecord>();
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[pending,setPending]=useState(false),[dataVersion,setDataVersion]=useState(0);
 const [detailOrigin,setDetailOrigin]=useState<'map'|'sake'>('sake'),[formOrigin,setFormOrigin]=useState<Page>('shelf'),[sakeEditOrigin,setSakeEditOrigin]=useState<Page>('sake');
 const [query,setQuery]=useState(''),[sort,setSort]=useState<ShelfSort>('recent');
 const shelfScroll=useRef(0);
 const reload=async()=>{const next=await repository.listData();setData(next);return next;};
 useEffect(()=>{void reload().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 const navigate=(next:Page,scroll=0)=>{setPage(next);setError('');requestAnimationFrame(()=>window.scrollTo(0,scroll));};
 const openSake=(sake:Sake)=>{shelfScroll.current=window.scrollY;setSelectedSake(sake.id);navigate('sake');};
 const open=(record:TastingRecord)=>{
  if(page!=='detail')setDetailOrigin(page==='map'?'map':'sake');
  setSelected(record.id);setSelectedSake(record.sakeId);navigate('detail');
 };
 const addRecord=()=>{setEdit(undefined);setFormOrigin(page);setDetailOrigin(page==='map'?'map':'sake');navigate('form');};
 const run=async(fn:()=>Promise<void>)=>{setError('');setPending(true);try{await fn();}catch(e){setError((e as Error).message);}finally{setPending(false);}};
 const save=async(record:TastingRecord)=>{try{await repository.updateRecord(record.id,record);await reload();}catch(e){setError((e as Error).message);throw e;}};
 const record=data.records.find(r=>r.id===selected),sake=data.sakes.find(s=>s.id===selectedSake);
 const major=page==='map'||(page==='detail'&&detailOrigin==='map')?'map':page==='analysis'?'analysis':'shelf';
 const isForm=page==='form'||page==='sake-edit';
 return <div className="app">
  <header><div className="brand-group"><button className="brand" aria-label="酒跡（さけあと） ホーム" onClick={()=>{if(!isForm)navigate('shelf');}}><span className="brand-name">酒跡</span><span className="brand-reading">さけあと</span></button>{data.demoMode&&<small className="demo-badge">デモ · すべて架空</small>}</div>{!isForm&&<button className="add-record" onClick={addRecord}>＋ 記録</button>}</header>
  <main className={page==='map'?'home':page==='shelf'?'shelf-main':undefined}>
   {error&&<div className="error" role="alert">{error}<button onClick={()=>void run(async()=>{await reload();})}>再読み込み</button></div>}
   {loading?<p className="empty">記録を読み込んでいます…</p>:page==='form'?<RecordForm key={edit?.id??'new'} data={data} record={edit} cancel={()=>navigate(formOrigin)} done={async id=>{
    const fresh=await reload(),saved=fresh.records.find(r=>r.id===id)!;setSelected(id);setSelectedSake(saved.sakeId);navigate('detail');
   }}/>:page==='sake-edit'&&sake?<SakeEditor sake={sake} done={async()=>{await reload();navigate(sakeEditOrigin);}} cancel={()=>navigate(sakeEditOrigin)}/>:page==='detail'&&record&&sake?<RecordDetail data={data} sake={sake} record={record} backLabel={detailOrigin==='map'?'マップ':'銘柄詳細'} onBack={()=>navigate(detailOrigin)} onOpen={open} onEdit={()=>{setEdit(record);setFormOrigin('detail');navigate('form');}} onEditSake={()=>{setSakeEditOrigin('detail');navigate('sake-edit');}} pending={pending} onDelete={()=>{
    if(confirm('この飲酒記録を削除しますか？'))void run(async()=>{await repository.deleteRecord(record.id);await reload();navigate(detailOrigin);});
   }}/>:page==='sake'&&sake?<SakeDetail data={data} sake={sake} onBack={()=>navigate('shelf',shelfScroll.current)} onOpen={open} onEdit={()=>{setSakeEditOrigin('sake');navigate('sake-edit');}}/>:<>
    {page==='shelf'?<Shelf data={data} query={query} sort={sort} onQuery={setQuery} onSort={setSort} onOpen={openSake} onAdd={addRecord}/>:page==='map'?<TasteMap key={dataVersion} data={data} open={open} save={save}/>:<><p className="eyebrow">PREFERENCE JOURNAL</p><h1>あなたの「好き」を知る。</h1><p className="subtitle">記録の中にある、小さな発見。</p><Analysis data={data}/></>}
    {page==='shelf'&&<details className="sake-manager"><summary>登録済みの日本酒を管理（{data.sakes.length}銘柄）</summary>{data.sakes.map(s=><div className="rank" key={s.id}><span>{s.name}</span><button className="text-btn" disabled={pending} onClick={()=>{
     if(confirm(`「${s.name}」を削除しますか？飲酒記録が残っている場合は削除できません。`))void run(async()=>{await repository.deleteSake(s.id);await reload();});
    }}>削除</button></div>)}</details>}
    <p className="hint">発表用デモです。記録はこのブラウザ内だけに保存されます。サイトデータの削除などで失われるため、長期保存には向きません。</p>
    <details className="samples"><summary>デモデータ</summary><p className="hint">初期データの30銘柄・40記録と公式情報はすべて架空です。リセットすると、このブラウザでの追加・編集・削除も初期状態に戻ります。</p><button className="danger" disabled={pending} onClick={()=>{
     if(confirm('このブラウザの追加・編集内容をすべて破棄し、架空の30銘柄・40記録に戻しますか？'))void run(async()=>{
      await repository.resetDemo();setDataVersion(v=>v+1);for(const key of Object.keys(sessionStorage)){if(key.startsWith('sake-draft-'))sessionStorage.removeItem(key);}setSelected(null);setSelectedSake(null);setEdit(undefined);setQuery('');setSort('recent');await reload();navigate('shelf');
     });
    }}>デモを初期状態に戻す</button></details>
   </>}
  </main>
  {!isForm&&<nav aria-label="メインナビゲーション">{[['shelf','▤','酒棚'],['map','◉','マップ'],['analysis','▥','分析']].map(([p,icon,name])=><button key={p} data-page={p} className={major===p?'active':''} onClick={()=>navigate(p as Page)}><span>{icon}</span>{name}</button>)}</nav>}
 </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
