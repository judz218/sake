import source from '../../demo/sake_demo_40.json';
import type {Data,Sake,TastingRecord} from '../types';
import {validate} from './validation';

export type SakeInput=Omit<Sake,'id'|'sample'|'createdAt'|'updatedAt'>;
export type RecordInput=Pick<TastingRecord,'sakeId'|'date'|'dryness'|'richness'|'aroma'|'rating'|'tags'|'memo'|'place'>;
export function validateSake(input:unknown):SakeInput{return validate(input,'sakes') as unknown as SakeInput;}
export function validateRecord(input:unknown):RecordInput{
 const validated=validate(input,'records');
 return {...validated,tags:JSON.parse(String(validated.tags))} as unknown as RecordInput;
}
export function demoData():Data{
 if(!source.metadata.fictional)throw new Error('デモデータは架空情報に限定します');
 const now=new Date().toISOString(),ids=new Map<string,number>();
 const sakes=source.sakes.map((s,index):Sake=>{
  if(ids.has(s.id))throw new Error('デモの銘柄IDが重複しています');ids.set(s.id,index+1);
  return {...validateSake({name:s.name,brewery:s.brewery,prefecture:s.prefecture,designation:s.specialDesignation,
   classifications:s.otherClassifications.join('・'),officialDescription:s.officialDescription,sourceUrl:s.officialSourceUrl??'',
   nihonshudo:s.sakeMeterValue,acidity:s.acidity,officialDryness:s.officialSweetDry,officialRichness:s.officialLightRich,
   officialBasis:`発表用の架空情報。実在する日本酒の公式情報ではありません。取得元: ${s.officialCoordinateSource}`}),
   id:index+1,sample:1,createdAt:now,updatedAt:now};
 });
 const aroma:Record<string,string>={none:'穏やか',light:'穏やか',strong:'華やか・強い',unknown:''};
 const records=source.tastingRecords.map((r,index):TastingRecord=>{
  if(!ids.has(r.sakeId)||!(r.aroma in aroma))throw new Error('デモ記録の参照・香りが不正です');
  return {...validateRecord({sakeId:ids.get(r.sakeId),date:r.drankAt,dryness:r.sweetDry,richness:r.lightRich,
   aroma:aroma[r.aroma],rating:r.rating,tags:r.tags,memo:r.memo,place:r.place}),id:index+1,sample:1,createdAt:now,updatedAt:now};
 });
 return {sakes,records,demoMode:true};
}
