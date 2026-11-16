import {useEffect,useState} from 'react';
import type {Data,Sake,TastingRecord} from './types';
import {api} from './api';
export const tags=['フルーティー','米の旨み','すっきり','まろやか','酸味がある','キレがある','余韻が長い','飲みやすい'];
type SakeInput=Omit<Sake,'id'|'sample'|'createdAt'|'updatedAt'>;
type EntryInput=Pick<TastingRecord,'date'|'dryness'|'richness'|'aroma'|'rating'|'tags'|'memo'|'place'>;
export const blankSake:SakeInput={name:'',brewery:'',prefecture:'',designation:'',classifications:'',officialDescription:'',sourceUrl:'',nihonshudo:null,acidity:null,officialDryness:null,officialRichness:null,officialBasis:''};
export const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export function SakeFields({value,set,official=false}:{value:SakeInput;set:(s:SakeInput)=>void;official?:boolean}){
 const field=(key:keyof SakeInput,label:string,numeric=false)=><label key={key}>{label}<input type={numeric?'number':'text'} step="any" value={value[key]??''} onChange={e=>set({...value,[key]:numeric?(e.target.value===''?null:Number(e.target.value)):e.target.value})}/></label>;
 return <>{field('brewery','酒蔵名')}{field('prefecture','産地（都道府県）')}
 <label>特定名称<select value={value.designation} onChange={e=>set({...value,designation:e.target.value})}>{['','普通酒','本醸造酒','特別本醸造酒','純米酒','特別純米酒','吟醸酒','純米吟醸','大吟醸酒','純米大吟醸',...(!['','普通酒','本醸造酒','特別本醸造酒','純米酒','特別純米酒','吟醸酒','純米吟醸','大吟醸酒','純米大吟醸'].includes(value.designation)?[value.designation]:[])].map(v=><option key={v}>{v}</option>)}</select></label>
 {field('classifications','その他の分類（生酒・原酒など）')}
 {official&&<><label>公式説明文<textarea value={value.officialDescription} onChange={e=>set({...value,officialDescription:e.target.value})}/></label>{field('sourceUrl','公式情報の出典URL')}{field('nihonshudo','日本酒度',true)}{field('acidity','酸度',true)}{field('officialDryness','公式の甘辛（0 甘口〜100 辛口）',true)}{field('officialRichness','公式の濃淡（0 淡麗〜100 濃醇）',true)}<label>公式座標の根拠・取得方法<textarea value={value.officialBasis} onChange={e=>set({...value,officialBasis:e.target.value})}/></label><p className="hint">根拠がある場合のみ座標を入力してください。日本酒度・酸度から自動変換しません。</p></>}</>;
}
function Slider({label,left,right,value,set,help}:{label:string;left:string;right:string;value:number|null;set:(v:number|null)=>void;help:string}){
 return <fieldset className="slider"><legend>{label}<strong>{value===null?'未評価':value}</strong></legend><p className="hint">{help}</p><input aria-label={label} type="range" min="0" max="100" value={value??50} onChange={e=>set(Number(e.target.value))}/><div className="between"><span>{left}</span><span>{right}</span></div><div className="slider-actions"><button type="button" onClick={()=>set(50)}>中間の50に評価</button><button type="button" onClick={()=>set(null)}>分からない・未評価</button></div></fieldset>;
}
export function RecordForm({data,record,done,cancel}:{data:Data;record?:TastingRecord;done:(id:number)=>Promise<void>;cancel:()=>void}){
 const key=`sake-draft-${record?.id??'new'}`;
 const initial=():{sake:SakeInput;sakeId:number;entry:EntryInput}=>{try{const d=sessionStorage.getItem(key);if(d)return JSON.parse(d);}catch{}return {sake:blankSake,sakeId:record?.sakeId??0,entry:record??{date:today(),dryness:null,richness:null,aroma:'',rating:null,tags:[],memo:'',place:''}};};
 const [draft,setDraft]=useState(initial),[step,setStep]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const {entry,sake}=draft;
 const setEntry=(e:Partial<EntryInput>)=>setDraft({...draft,entry:{...entry,...e}});
 useEffect(()=>{sessionStorage.setItem(key,JSON.stringify(draft));const fn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',fn);return()=>window.removeEventListener('beforeunload',fn);},[draft]);
 async function submit(){setBusy(true);setError('');try{let id=record?.id;if(record)await api(`/records/${record.id}`,'PUT',{...entry,sakeId:draft.sakeId});else id=(await api<{id:number}>('/entries','POST',{sakeId:draft.sakeId,sake,record:entry})).id;await done(id!);sessionStorage.removeItem(key);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const ratings=['好みではない','あまり好みではない','普通','好き','とても好き'];
 return <form onSubmit={e=>{e.preventDefault();if(step===1)setStep(2);else void submit();}}>
 <div className="between"><button type="button" className="text-btn" disabled={busy} onClick={()=>{if(confirm('入力内容は下書きとして残ります。画面を閉じますか？'))cancel();}}>閉じる</button><span className="eyebrow">STEP {step} / 2</span></div>
 <h1>{record?'記録を編集':step===1?'一杯を、記憶に。':'その余韻を残す。'}</h1><p className="subtitle">{step===1?'感じたままの味で、大丈夫。':'好きのかたちを、少しずつ。'}</p>{error&&<p role="alert" className="error">{error}</p>}
 {step===1?<>
 <label>銘柄を選ぶ<select disabled={!!record} value={draft.sakeId} onChange={e=>setDraft({...draft,sakeId:Number(e.target.value)})}><option value={0}>＋ 新しい銘柄を登録</option>{data.sakes.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
 {!draft.sakeId&&<><label>銘柄名 <small>必須</small><input required maxLength={200} value={sake.name} placeholder="例：今日出会った日本酒" onChange={e=>setDraft({...draft,sake:{...sake,name:e.target.value}})}/></label><details><summary>酒蔵・産地などの詳細を追加</summary><SakeFields value={sake} set={sake=>setDraft({...draft,sake})}/></details></>}
 <label>飲んだ日<input type="date" required value={entry.date} onChange={e=>setEntry({date:e.target.value})}/></label><h2>味わいの印象</h2>
 <Slider label="甘口 〜 辛口" left="甘口" right="辛口" help="甘みを感じるか、すっきり辛く感じるか。" value={entry.dryness} set={dryness=>setEntry({dryness})}/>
 <Slider label="淡麗 〜 濃醇" left="軽やか・すっきり" right="濃厚・コクがある" help="味の厚みや、口に残るコクの印象です。" value={entry.richness} set={richness=>setEntry({richness})}/>
 <label>香りの印象<select value={entry.aroma} onChange={e=>setEntry({aroma:e.target.value})}><option value="">分からない・未評価</option><option>穏やか</option><option>華やか・強い</option></select></label><p className="hint">香りの強さは、味の濃さとは別の特徴です。</p>
 </>:<>
 <h2>どのくらい好き？</h2><div className="stars">{[1,2,3,4,5].map(n=><button type="button" key={n} aria-label={`${n}：${ratings[n-1]}`} aria-pressed={entry.rating===n} className={(entry.rating??0)>=n?'selected':''} onClick={()=>setEntry({rating:n})}>★</button>)}</div><p className="hint">{entry.rating?ratings[entry.rating-1]:'未評価'}</p><button type="button" className="text-btn" onClick={()=>setEntry({rating:null})}>未評価に戻す</button>
 <h2>味をことばに</h2><div className="chips">{tags.map(t=><button type="button" aria-pressed={entry.tags.includes(t)} className={entry.tags.includes(t)?'selected':''} key={t} onClick={()=>setEntry({tags:entry.tags.includes(t)?entry.tags.filter(v=>v!==t):[...entry.tags,t]})}>{t}</button>)}</div>
 <label>一言メモ<textarea placeholder="香り、料理との相性、その日の気分…" value={entry.memo} onChange={e=>setEntry({memo:e.target.value})}/></label><label>飲んだ場所<input value={entry.place} placeholder="自宅、お店の名前など" onChange={e=>setEntry({place:e.target.value})}/></label>
 </>}
 <div className="form-bottom">{step===2&&<button type="button" className="secondary" disabled={busy} onClick={()=>setStep(1)}>戻る</button>}<button className="primary" disabled={busy}>{busy?'保存しています…':step===1?'感想の入力へ →':'記録する'}</button></div></form>;
}
export function SakeEditor({sake,done,cancel}:{sake:Sake;done:()=>Promise<void>;cancel:()=>void}){
 const [v,set]=useState<SakeInput>({...sake}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const fn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',fn);return()=>window.removeEventListener('beforeunload',fn);},[]);
 return <form onSubmit={async e=>{e.preventDefault();setBusy(true);try{await api(`/sakes/${sake.id}`,'PUT',v);await done();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><button type="button" className="text-btn" disabled={busy} onClick={()=>{if(JSON.stringify(v)===JSON.stringify(sake)||confirm('編集内容を破棄して戻りますか？'))cancel();}}>← 詳細に戻る</button><h1>日本酒情報</h1><p className="hint">この銘柄のすべての飲酒記録に反映されます。</p>{error&&<p role="alert" className="error">{error}</p>}<label>銘柄名<input required value={v.name} onChange={e=>set({...v,name:e.target.value})}/></label><SakeFields value={v} set={set} official/><button className="primary" disabled={busy}>{busy?'保存中…':'日本酒情報を保存'}</button></form>;
}
