import {useState} from 'react';
import type {Data,TastingRecord} from './types';
import {PersonalTasteMap} from './PersonalTasteMap';
import {OfficialComparisonChart} from './OfficialComparisonChart';
import {PreferenceChart} from './PreferenceChart';

const modes=['自分の評価','公式情報と比較','好みの傾向'];
export function TasteMap({data,open,save}:{data:Data;open:(r:TastingRecord)=>void;save:(r:TastingRecord)=>Promise<void>}){
 const [mode,setMode]=useState(modes[0]),[busy,setBusy]=useState(false);
 return <>
  <div className="tabs">{modes.map(m=><button key={m} type="button" disabled={busy} className={m===mode?'active':''} aria-pressed={m===mode} onClick={()=>setMode(m)}>{m}</button>)}</div>
  {mode===modes[0]?<PersonalTasteMap data={data} open={open} save={save} onBusyChange={setBusy}/>:mode===modes[1]?<OfficialComparisonChart data={data}/>:<PreferenceChart records={data.records}/>}
 </>;
}
