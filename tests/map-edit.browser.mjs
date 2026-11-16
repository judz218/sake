// Run after npm run build. Static HTTP files + isolated Edge IndexedDB; no Express/SQLite.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const profile=mkdtempSync(join(tmpdir(),'sake-map-edit-test-'));
const root=resolve('dist');let apiRequests=0;
const server=createServer(async(req,res)=>{
 if(req.url.startsWith('/api')){apiRequests++;res.writeHead(500);res.end('No API exists in the static test');return;}
 const path=resolve(root,'.'+new URL(req.url,'http://local').pathname);
 if(!path.startsWith(root+sep)&&path!==root){res.writeHead(403);res.end();return;}
 try{const file=path===root?join(root,'index.html'):path;const body=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(file)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}
});
let browser,ws;
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 const edge=process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
 browser=spawn(edge,['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let debugPort;
 for(let i=0;i<100;i++){try{debugPort=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);break;}catch{await sleep(100);}}
 assert.ok(debugPort,'Edge startup');
 const pages=await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
 ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 let serial=0;const callbacks=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const c=callbacks.get(m.id);callbacks.delete(m.id);m.error?c.reject(new Error(c.method+': '+JSON.stringify(m.error)+' '+c.expression)):c.resolve(m.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;callbacks.set(id,{resolve,reject,method,expression:params.expression});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const waitFor=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await sleep(50);}throw new Error(`Timeout: ${expression}`);};
 const click=async selector=>{await evaluate(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new MouseEvent('click',{bubbles:true}))`);await sleep(80);};
 await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send('Emulation.setTouchEmulationEnabled',{enabled:true});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:"window.__pageToken=Math.random().toString(36)"});
 const reload=async()=>{
  const token=await evaluate('window.__pageToken');await send('Page.reload');
  await waitFor(`window.__pageToken!==${JSON.stringify(token)} && document.querySelectorAll('.map-node').length===40`);
 };
 await send('Page.navigate',{url:`http://127.0.0.1:${port}/`});
 await waitFor("document.querySelectorAll('svg circle').length===40");
 const assertEditButtonLayout=async()=>{
  const layout=await evaluate(`(()=>{const button=document.querySelector('.map-edit-toggle'),card=button.closest('.map-card'),b=button.getBoundingClientRect(),c=card.getBoundingClientRect(),s=card.querySelector('svg').getBoundingClientRect();return {inside:b.x>=c.x&&b.right<=c.right,above:b.bottom<=s.top,width:b.width,height:b.height,rightGap:c.right-b.right};})()`);
  assert.equal(layout.inside,true);assert.equal(layout.above,true,'button must not overlap SVG or its axis labels');
  assert.ok(layout.width>=44&&layout.height>=44);assert.ok(layout.rightGap>=10&&layout.rightGap<=16);
  return layout.width;
 };
 const editButtonWidth=await assertEditButtonLayout();
 assert.equal(await evaluate("document.querySelector('.map-edit-toggle').textContent"),'✎ 編集');
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__readData=()=>new Promise((resolve,reject)=>{const open=indexedDB.open('sake-notebook-presentation');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction(['sakes','records'],'readonly'),s=tx.objectStore('sakes').getAll(),r=tx.objectStore('records').getAll();tx.oncomplete=()=>{db.close();resolve({sakes:s.result,records:r.result});};};});`});
 // Install the same helper in the already loaded document.
 await evaluate(`window.__readData=()=>new Promise((resolve,reject)=>{const open=indexedDB.open('sake-notebook-presentation');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction(['sakes','records'],'readonly'),s=tx.objectStore('sakes').getAll(),r=tx.objectStore('records').getAll();tx.oncomplete=()=>{db.close();resolve({sakes:s.result,records:r.result});};};});`);
 const instrument=()=>evaluate(`window.__putCount=0;window.__fail=false;window.__delay=0;const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='records'){window.__putCount++;if(window.__fail)throw new Error('保存テストエラー');}return original.apply(this,args);};const descriptor=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete');Object.defineProperty(IDBTransaction.prototype,'oncomplete',{configurable:true,get:descriptor.get,set(fn){descriptor.set.call(this,function(e){if(window.__delay)setTimeout(()=>fn.call(this,e),window.__delay);else fn.call(this,e);});}});true;`);
 await instrument();
 let acceptDialogs=true;
 ws.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Page.javascriptDialogOpening')void send('Page.handleJavaScriptDialog',{accept:acceptDialogs});});
 const record=await evaluate(`(()=>{const circles=[...document.querySelectorAll('svg circle')];return Number(circles.find(c=>{
  const x=+c.getAttribute('cx'),y=+c.getAttribute('cy');return x>65&&x<280&&y>65&&y<280&&circles.every(o=>o===c||Math.hypot(x-+o.getAttribute('cx'),y-+o.getAttribute('cy'))>24);
 }).dataset.recordId)})()`);
 const selector=`svg circle[data-record-id="${record}"]`;
 const position=()=>evaluate(`(()=>{const c=document.querySelector(${JSON.stringify(selector)}),b=c.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2,cx:+c.getAttribute('cx'),cy:+c.getAttribute('cy')};})()`);
 const saved=()=>evaluate(`window.__readData().then(d=>d.records.find(r=>r.id===${record}))`);
 const original=await saved();
 const mouse=async(type,x,y)=>send('Input.dispatchMouseEvent',{type,x,y,button:'left',buttons:type==='mouseReleased'?0:1,clickCount:1});
 const dragStart=async()=>{const p=await position();await mouse('mousePressed',p.x,p.y);return p;};
 const dragMove=async(p,dx,dy)=>{await mouse('mouseMoved',p.x+dx,p.y+dy);await sleep(80);};
 const dragEnd=async(p,dx,dy)=>{await mouse('mouseReleased',p.x+dx,p.y+dy);await sleep(80);};

 // Viewing: no drag listeners or writes; tapping still opens detail.
 assert.equal(await evaluate("document.querySelector('.map-edit-toggle').getAttribute('aria-pressed')"),'false');
 assert.equal(await evaluate(`!!document.querySelector(${JSON.stringify(selector)}).__on?.some(h=>h.name==='drag')`),false);
 let p=await dragStart();await dragMove(p,30,-20);await dragEnd(p,30,-20);
 assert.equal(await evaluate('window.__putCount'),0);assert.equal((await saved()).dryness,original.dryness);
 await click('nav button:first-child');await waitFor("document.querySelector('svg')!==null");
 await click(selector);assert.equal(await evaluate("document.querySelector('.tasting-detail')!==null"),true);
 await click('nav button:first-child');await click('.map-edit-toggle');
 assert.equal(await evaluate("document.querySelector('.map-edit-toggle').textContent"),'✓ 完了');
 assert.equal(await assertEditButtonLayout(),editButtonWidth);
 await click(selector);assert.equal(await evaluate("document.querySelector('.map-selection')!==null"),true);
 assert.equal(await evaluate("document.querySelector('svg')!==null"),true);
 p=await dragStart();await dragMove(p,2,1);await dragEnd(p,2,1);
 assert.equal(await evaluate('window.__putCount'),0,'jitter does not save');

 // Live coordinates, one PUT only on release, lock controls while saving.
 await evaluate('window.__delay=600');
 p=await dragStart();await dragMove(p,30,-20);
 const live=await evaluate("[...document.querySelectorAll('.map-selection output')].map(n=>+n.value)");
 assert.notEqual(live[0],original.dryness);assert.equal(await evaluate('window.__putCount'),0);
 await dragEnd(p,30,-20);
 assert.equal(await evaluate("document.querySelector('.map-edit-toggle').disabled"),true);
 assert.equal(await evaluate("document.querySelectorAll('.tabs').length"),0);
 await waitFor("!document.querySelector('.map-edit-toggle').disabled");
 assert.equal(await evaluate('window.__putCount'),1);
 assert.deepEqual([(await saved()).dryness,(await saved()).richness],live);
 await click('.map-edit-toggle');assert.equal(await evaluate("document.querySelector('.map-edit-toggle').getAttribute('aria-pressed')"),'false');
 await reload();
 assert.equal(await evaluate("document.querySelector('.map-edit-toggle').getAttribute('aria-pressed')"),'false');
 assert.deepEqual([(await saved()).dryness,(await saved()).richness],live);
 await instrument();

 // Failure returns the circle and selected numeric values to their saved position.
 await click('.map-edit-toggle');await evaluate('window.__fail=true');
 p=await dragStart();await dragMove(p,-25,20);await dragEnd(p,-25,20);
 await waitFor("document.querySelector('.map-selection') && [...document.querySelectorAll('[role=alert]')].some(n=>n.textContent.includes('保存テストエラー'))");
 assert.deepEqual(await evaluate("[...document.querySelectorAll('.map-selection output')].map(n=>+n.value)"),live);
 const reverted=await position();assert.equal(reverted.cx,p.cx);assert.equal(reverted.cy,p.cy);
 assert.deepEqual([(await saved()).dryness,(await saved()).richness],live);

 await click('.map-edit-toggle');await sleep(550);
 const comparable=await evaluate(`window.__readData().then(d=>{const sake=d.sakes.find(s=>s.officialDryness!==null&&s.officialRichness!==null&&d.records.filter(r=>r.sakeId===s.id).length>1);return {sake,records:d.records.filter(r=>r.sakeId===sake.id).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id)}})`);
 const past=comparable.records.at(-1);
 const openFromHistory=async(id)=>{await click('nav button:nth-child(2)');await click('.history-card[data-record-id="'+id+'"]');};
 await click('svg .map-node[data-record-id="'+past.id+'"]');
 assert.equal(await evaluate("document.querySelector('.detail-back').textContent.includes('マップ')"),true);
 assert.equal(await evaluate("document.querySelector('.tasting-memo').textContent"),past.memo);
 assert.equal(await evaluate("document.querySelectorAll('.comparison-scatter').length"),1);
 assert.equal(await evaluate("document.querySelectorAll('.personal-marker,.official-marker').length"),2);
 assert.equal(await evaluate("document.querySelectorAll('main select').length"),0);
 assert.ok(Math.abs(await evaluate("Number(document.querySelector('.personal-marker').getAttribute('cx'))")-(34+past.dryness*2.92))<0.001);
 assert.ok(Math.abs(await evaluate("Number(document.querySelector('.personal-marker').getAttribute('cy'))")-(326-past.richness*2.92))<0.001);
 const comparisonRows=await evaluate("document.querySelector('.comparison-table').textContent");
 for(const width of [375,390,430]){await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate(`document.documentElement.scrollWidth<=${width}`),true);assert.equal(await evaluate("(()=>{const r=document.querySelector('.comparison-scatter').getBoundingClientRect();return Math.abs(r.width-r.height)<1;})()"),true);}
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await click('.detail-back');assert.equal(await evaluate("document.querySelectorAll('.map-node').length"),40);
 await openFromHistory(past.id);
 assert.equal(await evaluate("document.querySelector('.detail-back').textContent.includes('飲酒履歴')"),true);
 assert.equal(await evaluate("document.querySelector('.comparison-table').textContent"),comparisonRows);
 assert.equal(await evaluate("document.querySelector('.tasting-memo').textContent"),past.memo);
 await click('.detail-back');assert.equal(await evaluate("document.querySelectorAll('.history-card').length"),40);
 await click('nav button:nth-child(3)');
 assert.equal(await evaluate("document.querySelectorAll('.preference-chart').length"),1);
 assert.equal(await evaluate("document.querySelector('main section').classList.contains('preference-chart')"),true);
 const expectedGroups=await evaluate(`window.__readData().then(d=>{const groups=[[],[],[],[]];for(const r of d.records){if(r.dryness!==null&&r.richness!==null&&r.rating!==null)groups[(r.richness<50?2:0)+(r.dryness>=50?1:0)].push(r.rating);}return groups.map(g=>g.length?('★ '+(g.reduce((a,b)=>a+b,0)/g.length).toFixed(1)+'（'+g.length+'件）'):'記録なし');})`);
 assert.deepEqual(await evaluate("[...document.querySelectorAll('.preference-row .between span')].map(n=>n.textContent)"),expectedGroups);
 for(const width of [375,390,430]){await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate(`document.documentElement.scrollWidth<=${width}`),true);}
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await click('nav button:first-child');assert.equal(await evaluate("document.querySelector('.map-edit-toggle').getAttribute('aria-pressed')"),'false');
 assert.equal(await evaluate("document.querySelectorAll('.tabs').length"),0);
 // Touch viewing scrolls normally; editing captures only the touched node.
 await evaluate('window.__fail=false;window.__delay=0;window.__putCount=0;window.scrollTo(0,0)');
 const touch=async(type,p)=>send('Input.dispatchTouchEvent',{type,touchPoints:p?[{x:p.x,y:p.y,id:1}]:[]});
 const beforeTouch=await saved();
 p=await position();await touch('touchStart',p);
 for(const dy of [-10,-35,-70]){await touch('touchMove',{x:p.x,y:p.y+dy});await sleep(60);}
 await touch('touchEnd');await sleep(600);
 assert.ok(await evaluate('window.scrollY>0'),'viewing permits touch scroll');
 assert.equal((await saved()).dryness,beforeTouch.dryness);assert.equal(await evaluate('window.__putCount'),0);
 await evaluate('window.scrollTo(0,0)');await click('.map-edit-toggle');
 p=await position();await touch('touchStart',p);await touch('touchMove',{x:p.x+25,y:p.y+15});await sleep(80);
 assert.equal(await evaluate('window.scrollY'),0,'editing prevents page scroll');
 const touchLive=await evaluate("[...document.querySelectorAll('.map-selection output')].map(n=>+n.value)");
 assert.notEqual(touchLive[0],beforeTouch.dryness);
 await touch('touchEnd');await waitFor("!document.querySelector('.map-edit-toggle').disabled");
 assert.equal(await evaluate('window.__putCount'),1);
 assert.deepEqual([(await saved()).dryness,(await saved()).richness],touchLive);
 // Move away and back: unchanged final coordinates must not produce a PUT.
 await sleep(600);p=await dragStart();await dragMove(p,25,-15);await dragMove(p,0,0);await dragEnd(p,0,0);
 assert.equal(await evaluate('window.__putCount'),1);
 for(const width of [375,390,430]){await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate(`document.documentElement.scrollWidth<=${width}`),true);assert.equal(await assertEditButtonLayout(),editButtonWidth);}
 await click('nav button:nth-child(3)');assert.deepEqual(await evaluate("[...document.querySelectorAll('.stats strong')].map(n=>n.textContent)"),['40','30']);
 // Partial official information and missing personal axis, in this in-memory fixture only.
 await evaluate(`new Promise((resolve,reject)=>{const open=indexedDB.open('sake-notebook-presentation');open.onsuccess=()=>{const db=open.result,tx=db.transaction('sakes','readwrite');tx.objectStore('sakes').put({...${JSON.stringify(comparable.sake)},officialRichness:null,sourceUrl:'https://example.com/source'});tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};})`);
 await reload();
 await openFromHistory(past.id);
 assert.equal(await evaluate("document.querySelectorAll('.comparison-scatter').length"),0);
 assert.equal(await evaluate("document.querySelectorAll('.comparison-table tbody tr').length"),1);
 assert.equal(await evaluate("document.querySelector('.sake-information a').getAttribute('href')"),'https://example.com/source');
 assert.equal(await evaluate("document.querySelector('.record-comparison').textContent.includes('両軸がそろっていない')"),true);
 // No official axes: no comparison chart, and the full tasting memo remains visible.
 await evaluate(`new Promise(resolve=>{const open=indexedDB.open('sake-notebook-presentation');open.onsuccess=()=>{const db=open.result,tx=db.transaction('sakes','readwrite');tx.objectStore('sakes').put({...${JSON.stringify(comparable.sake)},officialDryness:null,officialRichness:null});tx.oncomplete=()=>{db.close();resolve();};};})`);
 await reload();await openFromHistory(past.id);
 assert.equal(await evaluate("document.querySelectorAll('.comparison-scatter').length"),0);
 assert.equal(await evaluate("document.querySelector('main').textContent.includes('比較用の公式情報が登録されていません')"),true);
 assert.equal(await evaluate("document.querySelector('.tasting-memo').textContent"),past.memo);
 // Empty datasets render all three modes without assuming a selected product or record.
 await evaluate(`new Promise(resolve=>{const open=indexedDB.open('sake-notebook-presentation');open.onsuccess=()=>{const db=open.result,tx=db.transaction(['sakes','records'],'readwrite');tx.objectStore('records').clear();tx.objectStore('sakes').clear();tx.oncomplete=()=>{db.close();resolve();};};})`);
 const emptyToken=await evaluate('window.__pageToken');await send('Page.reload');
 await waitFor(`window.__pageToken!==${JSON.stringify(emptyToken)} && document.querySelector('.map-edit-toggle')!==null && document.querySelectorAll('.map-node').length===0`);
 assert.equal(await evaluate("document.querySelectorAll('.map-node').length"),0);
 await click('nav button:nth-child(2)');assert.equal(await evaluate("document.querySelectorAll('.history-card').length"),0);
 await click('nav button:nth-child(3)');assert.equal(await evaluate("[...document.querySelectorAll('.preference-row .between span')].every(n=>n.textContent==='記録なし')"),true);
 // Reset requires confirmation, including after an intentionally emptied database.
 acceptDialogs=false;await click('.samples button');assert.equal((await evaluate('window.__readData()')).records.length,0);
 acceptDialogs=true;await click('.samples button');await waitFor("document.querySelectorAll('.map-node').length===40");
 assert.equal((await evaluate('window.__readData()')).sakes.length,30);
 const afterReset=await saved();assert.equal(afterReset.dryness,original.dryness);assert.equal(afterReset.richness,original.richness);
 await reload();assert.equal((await evaluate('window.__readData()')).records.length,40,'reload does not duplicate seed');

 // UI CRUD, including rollback when a new record fails after its sake is added.
 const fill=async(selector,value)=>{await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)}),proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);await sleep(50);};
 await click('.add-record');await fill('form input:not([type=range]):not([type=date])','ブラウザCRUD');
 await click('form .primary');await click('.stars button:nth-child(5)');await fill('form textarea','登録テスト');
 await evaluate(`window.__failCreate=true;const add=IDBObjectStore.prototype.add;IDBObjectStore.prototype.add=function(...args){if(this.name==='records'&&window.__failCreate)throw new Error('登録失敗テスト');return add.apply(this,args);}`);
 await click('form .primary');await waitFor("document.querySelector('form [role=alert]')!==null");
 let snapshot=await evaluate('window.__readData()');assert.equal(snapshot.sakes.length,30);assert.equal(snapshot.records.length,40);
 assert.equal(await evaluate("document.querySelector('form textarea').value"),'登録テスト');
 await evaluate('window.__failCreate=false');await click('form .primary');
 await waitFor("document.querySelector('h1')?.textContent==='ブラウザCRUD'");
 snapshot=await evaluate('window.__readData()');assert.equal(snapshot.sakes.length,31);assert.equal(snapshot.records.length,41);
 const addedSake=snapshot.sakes.find(s=>s.name==='ブラウザCRUD'),addedRecord=snapshot.records.find(r=>r.sakeId===addedSake.id);
 assert.equal(addedRecord.dryness,null);assert.equal(addedRecord.richness,null);assert.equal(addedRecord.rating,5);
 await click('section .secondary');await click('form .primary');await click('.stars button:nth-child(3)');await fill('form textarea','編集済み');await click('form .primary');
 await waitFor("document.querySelector('h1')?.textContent==='ブラウザCRUD'");
 await click('section .text-btn');await fill('form input','ブラウザCRUD編集済み');await click('form .primary');
 await waitFor("document.querySelector('h1')?.textContent==='ブラウザCRUD編集済み'");
 await send('Page.reload');await waitFor("document.querySelectorAll('.map-node').length===40");
 snapshot=await evaluate('window.__readData()');assert.equal(snapshot.records.length,41);assert.equal(snapshot.records.find(r=>r.id===addedRecord.id).memo,'編集済み');
 assert.equal(snapshot.sakes.find(s=>s.id===addedSake.id).name,'ブラウザCRUD編集済み');
 await click('nav button:nth-child(2)');
 const managerDelete=`[...document.querySelectorAll('.rank')].find(n=>n.textContent.includes('ブラウザCRUD編集済み')).querySelector('button').click()`;
 await evaluate(managerDelete);await waitFor("[...document.querySelectorAll('[role=alert]')].some(n=>n.textContent.includes('飲酒記録が残っている'))");
 assert.equal((await evaluate('window.__readData()')).sakes.length,31);
 await evaluate("[...document.querySelectorAll('.history-card')].find(n=>n.textContent.includes('ブラウザCRUD編集済み')).click()");
 await click('section .danger');await waitFor("document.querySelectorAll('.history-card').length===40");
 await evaluate(managerDelete);await waitFor("document.querySelectorAll('.rank').length===30");
 assert.equal((await evaluate('window.__readData()')).sakes.length,30);
 assert.equal(apiRequests,0,'the app must never request an API');
 console.log('PASS: static-only IndexedDB seed/no duplicates, reset confirmation, CRUD/atomic rollback/persistence, map edit/touch/save failure, detail comparison/back navigation, analysis preferences, empty states, 375/390/430px; API requests: 0');
 await send('Browser.close').catch(()=>{});
}finally{
 ws?.close();browser?.kill();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
 // The path is the exact temporary directory returned by mkdtempSync above.
 await sleep(300);rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
