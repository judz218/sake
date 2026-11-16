import {app} from './app.ts';
import {apiPort,demoMode} from './config.ts';
app.listen(apiPort,'127.0.0.1',()=>console.log(`API: http://127.0.0.1:${apiPort}${demoMode?' (DEMO: すべて架空のデータ)':''}`));
