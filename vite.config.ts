import {defineConfig} from 'vite';
import tailwindcss from '@tailwindcss/vite';
const demo=process.env.APP_MODE==='demo';
export default defineConfig({plugins:[tailwindcss()],server:{host:'0.0.0.0',port:demo?5174:5173,strictPort:true,proxy:{'/api':`http://127.0.0.1:${demo?3002:3001}`}}});
