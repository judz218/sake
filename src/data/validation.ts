export class InputError extends Error {}
export function validate(body:unknown,kind:'sakes'|'records'):Record<string,string|number|null> {
 if(!body || typeof body!=='object' || Array.isArray(body)) throw new InputError('入力形式が不正です');
 const b=body as Record<string,unknown>, out:Record<string,string|number|null>={};
 const strings=kind==='sakes'?['name','brewery','prefecture','designation','classifications','officialDescription','sourceUrl','officialBasis']:['date','aroma','memo','place'];
 for(const key of strings){const v=b[key]??'';if(typeof v!=='string'||v.length>5000)throw new InputError(`${key}の入力を確認してください`);out[key]=v.trim();}
 const numbers=kind==='sakes'?['nihonshudo','acidity','officialDryness','officialRichness']:['sakeId','dryness','richness','rating'];
 for(const key of numbers){const v=b[key]??null;if(v!==null&&(typeof v!=='number'||!Number.isFinite(v)))throw new InputError(`${key}は数値で入力してください`);out[key]=v as number|null;}
 for(const key of ['dryness','richness','officialDryness','officialRichness']){const v=out[key];if(typeof v==='number'&&(v<0||v>100))throw new InputError('味覚評価は0〜100です');}
 if(kind==='sakes'){
 if(!out.name)throw new InputError('銘柄名を入力してください');
 if(out.sourceUrl){try{if(!['http:','https:'].includes(new URL(String(out.sourceUrl)).protocol))throw 0;}catch{throw new InputError('URLはhttpまたはhttpsで入力してください');}}
 if((out.officialDryness!==null||out.officialRichness!==null)&&!out.officialBasis)throw new InputError('公式座標の根拠を入力してください');
 }else{
 if(!Number.isInteger(out.sakeId)||Number(out.sakeId)<1)throw new InputError('銘柄を選択してください');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(out.date))||isNaN(Date.parse(String(out.date)))||new Date(String(out.date)).toISOString().slice(0,10)!==out.date)throw new InputError('日付を確認してください');
 if(out.rating!==null&&(!Number.isInteger(out.rating)||Number(out.rating)<1||Number(out.rating)>5))throw new InputError('星は1〜5です');
 if(!['','穏やか','華やか・強い'].includes(String(out.aroma)))throw new InputError('香りの入力を確認してください');
 if(!Array.isArray(b.tags)||b.tags.length>30||b.tags.some(t=>typeof t!=='string'||t.length>100))throw new InputError('タグの入力を確認してください');out.tags=JSON.stringify(b.tags);
 }return out;
}
