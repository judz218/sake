import {useEffect,useRef,useState} from 'react';
import * as d3 from 'd3';
import type {Data,TastingRecord} from './types';

export const colors=['#a6aaa5','#c5b99d','#c7a871','#73998b','#38776d','#bc754a'];

type Selection={id:number;dryness:number;richness:number};
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
function clientPoint(event:MouseEvent|TouchEvent){
 const point='changedTouches' in event?event.changedTouches[0]:event;
 return {x:point.clientX,y:point.clientY};
}

export function PersonalTasteMap({data,open,save,onBusyChange}:{data:Data;open:(r:TastingRecord)=>void;save:(r:TastingRecord)=>Promise<void>;onBusyChange:(busy:boolean)=>void}){
 const ref=useRef<SVGSVGElement>(null);
 const [editing,setEditing]=useState(false);
 const [selected,setSelected]=useState<Selection|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const pending=useRef(false),dragging=useRef(false),suppressClickUntil=useRef(0),selectedId=useRef<number|null>(null);
 // Keep handlers current without rebuilding the SVG during a drag or save.
 const callbacks=useRef({open,save,onBusyChange});callbacks.current={open,save,onBusyChange};
 const editable=editing;
 const plotted=data.records.filter(r=>r.dryness!==null&&r.richness!==null);
 const select=(r:TastingRecord)=>{
  selectedId.current=r.id;
  setSelected({id:r.id,dryness:r.dryness!,richness:r.richness!});
 };
 const activate=(r:TastingRecord)=>{
  if(pending.current||dragging.current||Date.now()<suppressClickUntil.current)return;
  if(editable)select(r);else callbacks.current.open(r);
 };

 useEffect(()=>{
  const svg=d3.select(ref.current);svg.selectAll('*').remove();
  const x=d3.scaleLinear().domain([0,100]).range([34,326]);
  const y=d3.scaleLinear().domain([0,100]).range([326,34]);
  svg.append('rect').attr('x',34).attr('y',34).attr('width',292).attr('height',292).attr('rx',12).attr('fill','#f0efe6');
  for(const n of [25,50,75]){
   svg.append('line').attr('x1',x(n)).attr('x2',x(n)).attr('y1',34).attr('y2',326).attr('stroke',n===50?'#b4b7a9':'#dfdfd4').attr('stroke-dasharray',n===50?'4 4':'2 5');
   svg.append('line').attr('y1',y(n)).attr('y2',y(n)).attr('x1',34).attr('x2',326).attr('stroke',n===50?'#b4b7a9':'#dfdfd4').attr('stroke-dasharray',n===50?'4 4':'2 5');
  }
  for(const [label,px,py] of [['濃醇',180,18],['淡麗',180,351],['甘口',17,183],['辛口',343,183],['濃醇甘口',86,57],['濃醇辛口',274,57],['淡麗甘口',86,313],['淡麗辛口',274,313]] as [string,number,number][]){
   svg.append('text').text(label).attr('x',px).attr('y',py).attr('text-anchor','middle').attr('font-size',label.length>2?10:12).attr('fill','#7b8273');
  }
  const nodes=svg.selectAll<SVGCircleElement,TastingRecord>('circle').data(plotted).join('circle')
   .attr('class','map-node').attr('data-record-id',r=>r.id)
   .attr('cx',r=>x(r.dryness!)).attr('cy',r=>y(r.richness!))
   .attr('r',9)
   .attr('fill',r=>colors[r.rating??0]).attr('stroke',editable?'#799482':'#fff').attr('stroke-width',2)
   .attr('tabindex',0).attr('role','button').attr('aria-label',r=>`${data.sakes.find(s=>s.id===r.sakeId)?.name} ${r.date}`)
   .style('touch-action',editable?'none':'pan-y')
   .on('click',(event,r)=>{if(!event.defaultPrevented)activate(r);})
   .on('keydown',(event,r)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate(r);}});

  // Viewing mode has no D3 drag listeners.
  if(editable)nodes.call(d3.drag<SVGCircleElement,TastingRecord>()
   .filter(event=>!event.button&&!event.ctrlKey&&!pending.current&&!dragging.current)
   .clickDistance(6)
   .on('start',function(event,r){
    dragging.current=true;callbacks.current.onBusyChange(true);select(r);setError('');
    const node=d3.select(this);node.raise();
    const start=clientPoint(event.sourceEvent);
    let moved=false,position={dryness:r.dryness!,richness:r.richness!};
    event.on('drag',function(e:d3.D3DragEvent<SVGCircleElement,TastingRecord,TastingRecord>){
     const current=clientPoint(e.sourceEvent);
     if(!moved&&Math.hypot(current.x-start.x,current.y-start.y)<6)return;
     moved=true;
     position={dryness:Math.round(clamp(x.invert(e.x))),richness:Math.round(clamp(y.invert(e.y)))};
     node.attr('cx',x(position.dryness)).attr('cy',y(position.richness));
     setSelected({id:r.id,...position});
    });
    event.on('end',()=>{
     dragging.current=false;
     if(moved)suppressClickUntil.current=Date.now()+500;
     if(!moved||(position.dryness===r.dryness&&position.richness===r.richness)){callbacks.current.onBusyChange(false);return;}
     pending.current=true;setSaving(true);
     void (async()=>{
      try{await callbacks.current.save({...r,...position});}
      catch(e){
       node.attr('cx',x(r.dryness!)).attr('cy',y(r.richness!));
       setSelected({id:r.id,dryness:r.dryness!,richness:r.richness!});
       setError(e instanceof Error?e.message:'保存に失敗しました。元の座標に戻しました。');
      }finally{pending.current=false;setSaving(false);callbacks.current.onBusyChange(false);}
     })();
    });
   }));
  return()=>{nodes.on('.drag',null);};
 },[data,editable]);

 useEffect(()=>{
  d3.select(ref.current).selectAll<SVGCircleElement,TastingRecord>('circle')
   .attr('stroke',r=>editable?(r.id===selectedId.current?'#193f37':'#799482'):'#fff')
   .attr('stroke-width',r=>editable&&r.id===selectedId.current?4:2)
   .attr('aria-pressed',r=>editable?String(r.id===selectedId.current):null);
 },[selected,data,editable]);

 return <>
  <div className={`map-card${editable?' is-editing':''}`} aria-busy={saving}>
  <div className="map-edit-toolbar"><button type="button" className={`map-edit-toggle${editable?' active':''}`} aria-pressed={editable} disabled={saving} onClick={()=>{
   if(pending.current||dragging.current)return;
   setEditing(!editable);setSelected(null);selectedId.current=null;setError('');
  }}>{editable?'✓ 完了':'✎ 編集'}</button><span role="status">{saving?'保存しています…':editable?'ドラッグ終了時に自動保存':''}</span></div>
  <svg ref={ref} viewBox="0 0 360 365" aria-label="甘辛と濃淡の味覚マップ"/><div className="legend">{colors.map((c,i)=><span key={c}><i style={{background:c}}/>{i?`★${i}`:'未評価'}</span>)}</div></div>
  <p className="hint">{editable?'ノードをドラッグして味の評価を変更できます。':'丸をタップすると詳細を確認できます。'}<br/>重なった記録は下の一覧から選べます。</p>
  {editable&&selected&&<div className="map-selection"><strong>{data.sakes.find(s=>s.id===data.records.find(r=>r.id===selected.id)?.sakeId)?.name}</strong><div>甘辛評価 <output>{selected.dryness}</output> / 100　濃淡評価 <output>{selected.richness}</output> / 100</div></div>}
  {error&&<p className="error" role="alert">{error}<br/>元の座標に戻しました。</p>}
  {!plotted.length&&<p className="empty">まだマップに記録がありません。<br/>甘辛・濃淡を評価すると、ここに表示されます。</p>}
  <p className="eyebrow">マップ上の記録 · {plotted.length}</p>
  <div className="map-list">{plotted.map(r=><button key={r.id} disabled={saving} onClick={()=>activate(r)}><i style={{background:colors[r.rating??0]}}/>{data.sakes.find(s=>s.id===r.sakeId)?.name}<small>{r.date}</small></button>)}</div>
  {data.records.length>plotted.length&&<p className="hint">味覚未評価の{data.records.length-plotted.length}件は履歴で確認できます。</p>}
 </>;
}
