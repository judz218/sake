// Run after `npm run build`. Windows Edge, isolated profile and in-memory SQLite.
import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const profile=mkdtempSync(join(tmpdir(),'sake-map-edit-test-'));
const server=spawn(process.execPath,['--import','tsx','--input-type=module','-e',`
 import {app} from './server/app.ts';import {db} from './server/db.ts';import {importDemo} from './server/demo.ts';
 importDemo(db);const server=app.listen(0,'127.0.0.1',()=>console.log('PORT='+server.address().port));
`],{env:{...process.env,APP_MODE:'',DB_PATH:':memory:'},windowsHide:true,stdio:['ignore','pipe','pipe']});
let browser,ws;
try{
 const port=await new Promise((resolve,reject)=>{
  let out='';const timeout=setTimeout(()=>reject(new Error('Fixture API startup timeout')),15000);
  server.stdout.on('data',chunk=>{out+=chunk;const match=out.match(/PORT=(\d+)/);if(match){clearTimeout(timeout);resolve(Number(match[1]));}});
  server.on('exit',code=>{clearTimeout(timeout);reject(new Error(`Fixture API exited: ${code}`));});
 });
 const edge=process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
 browser=spawn(edge,['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let debugPort;
 for(let i=0;i<100;i++){try{debugPort=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);break;}catch{await sleep(100);}}
 assert.ok(debugPort,'Edge startup');
 const pages=await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
 ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 let serial=0;const callbacks=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const c=callbacks.get(m.id);callbacks.delete(m.id);m.error?c.reject(m.error):c.resolve(m.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;callbacks.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const waitFor=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await sleep(50);}throw new Error(`Timeout: ${expression}`);};
 const click=async selector=>{await evaluate(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new MouseEvent('click',{bubbles:true}))`);await sleep(80);};
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send('Emulation.setTouchEmulationEnabled',{enabled:true});
 await send('Page.navigate',{url:`http://127.0.0.1:${port}/`});
 await waitFor("document.querySelectorAll('svg circle').length===40");
 const instrument=()=>evaluate(`window.__putCount=0;window.__fail=false;window.__delay=0;const original=window.fetch.bind(window);window.fetch=(url,options)=>{
  if(String(url).includes('/api/records/')&&options?.method==='PUT'){
   window.__putCount++;
   if(window.__fail)return Promise.resolve(new Response(JSON.stringify({error:'保存テストエラー'}),{status:500,headers:{'Content-Type':'application/json'}}));
   if(window.__delay)return new Promise(resolve=>setTimeout(()=>resolve(original(url,options)),window.__delay));
  }return original(url,options);
 };`);
 await instrument();
 const record=await evaluate(`(()=>{const circles=[...document.querySelectorAll('svg circle')];return Number(circles.find(c=>{
  const x=+c.getAttribute('cx'),y=+c.getAttribute('cy');return x>65&&x<280&&y>65&&y<280&&circles.every(o=>o===c||Math.hypot(x-+o.getAttribute('cx'),y-+o.getAttribute('cy'))>24);
 }).dataset.recordId)})()`);
 const selector=`svg circle[data-record-id="${record}"]`;
 const position=()=>evaluate(`(()=>{const c=document.querySelector(${JSON.stringify(selector)}),b=c.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2,cx:+c.getAttribute('cx'),cy:+c.getAttribute('cy')};})()`);
 const saved=()=>evaluate(`fetch('/api/data').then(r=>r.json()).then(d=>d.records.find(r=>r.id===${record}))`);
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
 await click(selector);assert.equal(await evaluate("document.querySelector('svg')===null"),true);
 await click('nav button:first-child');await click('.map-edit-toggle');
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
 assert.equal(await evaluate("[...document.querySelectorAll('.tabs button')].every(n=>n.disabled)"),true);
 await waitFor("!document.querySelector('.map-edit-toggle').disabled");
 assert.equal(await evaluate('window.__putCount'),1);
 assert.deepEqual([(await saved()).dryness,(await saved()).richness],live);
 await click('.map-edit-toggle');assert.equal(await evaluate("document.querySelector('.map-edit-toggle').getAttribute('aria-pressed')"),'false');
 await send('Page.reload');await waitFor("document.querySelectorAll('svg circle').length===40");
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

 await click('.tabs button:nth-child(2)');assert.equal(await evaluate("document.querySelector('.map-edit-toggle')===null"),true);
 assert.equal(await evaluate("document.querySelectorAll('svg rect').length"),33);
 assert.equal(await evaluate("[...document.querySelectorAll('svg circle')].some(n=>n.__on?.some(h=>h.name==='drag'))"),false);
 await click('.tabs button:nth-child(3)');assert.equal(await evaluate("document.querySelectorAll('svg circle').length"),40);
 assert.equal(await evaluate("[...document.querySelectorAll('svg circle')].some(n=>n.__on?.some(h=>h.name==='drag'))"),false);
 await click('.tabs button:first-child');assert.equal(await evaluate("document.querySelector('.map-edit-toggle').getAttribute('aria-pressed')"),'false');
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
 for(const width of [375,390,430]){await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate(`document.documentElement.scrollWidth<=${width}`),true);}
 await click('nav button:nth-child(3)');assert.deepEqual(await evaluate("[...document.querySelectorAll('.stats strong')].map(n=>n.textContent)"),['40','30']);
 console.log('PASS: view/edit, tap, drag threshold, live coordinates, single save, pending lock, reload, rollback, tabs, comparison, touch scroll/drag, unchanged drag, analysis, 375/390/430px');
 await send('Browser.close').catch(()=>{});
}finally{
 ws?.close();browser?.kill();server.kill();
 // The path is the exact temporary directory returned by mkdtempSync above.
 await sleep(300);rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
