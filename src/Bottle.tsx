const palette=['#284f40','#386467','#69503b','#a17c43','#354b68','#788477','#865b55','#687173'];

/** Product ID alone determines the decoration; ratings and names never affect it. */
export function bottleDesign(id:number){
 let seed=2166136261;
 for(const char of `sakeato:${id}`)seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
 const random=()=>{seed=(seed+0x6d2b79f5)>>>0;let n=seed;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296;};
 return {shape:Math.floor(random()*3),height:[124,136,146][Math.floor(random()*3)],width:[39,44,49][Math.floor(random()*3)],color:palette[Math.floor(random()*palette.length)],vertical:random()>.4,labelColor:['#f6f0dc','#e5e7d9','#eee2d1'][Math.floor(random()*3)],border:random()>.5,cap:['#b1bba3','#c5b18b','#c9ccbf','#8e8170'][Math.floor(random()*4)]};
}
export function Bottle({id,name}:{id:number;name:string}){
 const d=bottleDesign(id),top=160-d.height,left=40-d.width/2,right=40+d.width/2,nl=32,nr=48;
 const shoulder=d.shape===0?`V ${top+29} Q ${nl} ${top+37} ${left+6} ${top+44} Q ${left} ${top+48} ${left} ${top+56}`:d.shape===1?`V ${top+32} L ${left} ${top+49} V ${top+56}`:`V ${top+28} Q ${left} ${top+30} ${left} ${top+56}`;
 const otherShoulder=d.shape===0?`Q ${right} ${top+48} ${right-6} ${top+44} Q ${nr} ${top+37} ${nr} ${top+29}`:d.shape===1?`V ${top+49} L ${nr} ${top+32}`:`Q ${right} ${top+30} ${nr} ${top+28}`;
 const path=`M ${nl} ${top+6} ${shoulder} V 153 Q ${left} 160 ${left+6} 160 H ${right-6} Q ${right} 160 ${right} 153 V ${top+56} ${otherShoulder} V ${top+6} Z`;
 const labelTop=top+62,labelHeight=d.vertical?Math.min(62,146-labelTop):42,labelWidth=d.vertical?d.width-14:d.width-8;
 const chars=Array.from(name),short=chars.length>5?[...chars.slice(0,4),'…']:chars;
 const font=d.vertical?Math.min(13,labelHeight/(short.length+1)):Math.min(14,(labelWidth-6)/short.length);
 return <svg className="sake-bottle" viewBox="0 0 80 160" width="80" height="160" aria-hidden="true" data-design={JSON.stringify(d)}>
  <path d={path} fill={d.color}/>
  <path d={`M ${left+6} ${top+60} V 148`} stroke="#fff" strokeOpacity=".12" strokeWidth="2" strokeLinecap="round"/>
  <rect x="30" y={top} width="20" height="10" rx="2" fill={d.cap}/>
  <path d={`M 32 ${top+14} H 48`} stroke="#fff" strokeOpacity=".16"/>
  <rect x={40-labelWidth/2} y={labelTop} width={labelWidth} height={labelHeight} rx="1" fill={d.labelColor} stroke={d.border?'#b4aa8b':'none'} strokeWidth=".7"/>
  {d.vertical?<text fill="#354536" textAnchor="middle" fontFamily="serif" fontSize={font}>{short.map((char,i)=><tspan key={i} x="40" y={labelTop+(i+1)*labelHeight/(short.length+1)+font*.35}>{char}</tspan>)}</text>:<text x="40" y={labelTop+labelHeight/2+font*.35} fill="#354536" textAnchor="middle" fontFamily="serif" fontSize={font}>{short.join('')}</text>}
 </svg>;
}
