import {spawn} from 'node:child_process';
import {importDemo} from './demo.ts';
const command=process.argv[2];
if(!['init','reset','start'].includes(command))throw new Error('demo-cli: init / reset / start');
process.env.APP_MODE='demo';
const {db}=await import('./db.ts');
try{console.log(importDemo(db,command==='reset'));}finally{db.close();}
if(command==='start'){
 const npm=process.env.npm_execpath;
 if(!npm)throw new Error('npm.cmd run dev:demo から起動してください');
 const child=spawn(process.execPath,[npm,'run','dev'],{stdio:'inherit',env:{...process.env,APP_MODE:'demo'}});
 child.on('error',e=>{console.error(e);process.exitCode=1;});
 child.on('exit',code=>{process.exitCode=code??1;});
}
