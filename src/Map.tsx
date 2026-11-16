import type {Data,TastingRecord} from './types';
import {PersonalTasteMap} from './PersonalTasteMap';

export function TasteMap({data,open,save}:{data:Data;open:(r:TastingRecord)=>void;save:(r:TastingRecord)=>Promise<void>}){
 return <PersonalTasteMap data={data} open={open} save={save} onBusyChange={()=>{}}/>;
}
