import http from 'node:http';
import {stat,readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
http.createServer(async(req,res)=>{try{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(file!==root&&!file.startsWith(root+path.sep))throw Error();
 const target=(await stat(file)).isDirectory()?path.join(file,'index.html'):file;
 const data=await readFile(target); const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
 const range=req.headers.range;res.setHeader('Content-Type',types[path.extname(target)]||'application/octet-stream');res.setHeader('Accept-Ranges','bytes');
 if(range){const match=/^bytes=(\d+)-(\d*)$/.exec(range);if(!match){res.writeHead(416);return res.end()};const start=+match[1],end=match[2]?Math.min(+match[2],data.length-1):data.length-1;if(start> end){res.writeHead(416);return res.end()};res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});res.end(data.subarray(start,end+1));}else{res.setHeader('Content-Length',data.length);res.end(data)}
 }catch{res.writeHead(404);res.end('Not found')}}).listen(4173,'127.0.0.1',()=>console.log('http://127.0.0.1:4173'));
