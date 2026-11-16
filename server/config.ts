import {resolve} from 'node:path';
export const demoMode=process.env.APP_MODE==='demo';
// Demo always uses this dedicated path, even when DB_PATH is set in the shell.
export const databasePath=demoMode?resolve('data/sake-demo.sqlite'):(process.env.DB_PATH||resolve('data/sake.sqlite'));
export const apiPort=demoMode?3002:3001;
