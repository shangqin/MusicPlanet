import {mkdir,readdir,readFile,writeFile,cp,rm} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const cleanName=s=>s.replace(/^\d+[\s_.、-]+/u,'').normalize('NFC');
export const stableId=(dir,file)=>[...dir.split('/').filter(Boolean).map(cleanName),cleanName(file.replace(/\.[^.]+$/,''))].join('/');
const order=(a,b)=>a.localeCompare(b,'zh-CN',{numeric:true});
export async function scan(root){
 const albums=[];
 async function walk(dir=''){
  const entries=(await readdir(path.join(root,dir),{withFileTypes:true})).sort((a,b)=>order(a.name,b.name));
  const files=entries.filter(e=>e.isFile()&&/\.(mp3|m4a|aac|wav|ogg|flac)$/i.test(e.name));
  if(files.length){
   const cover=entries.find(e=>e.isFile()&&/^cover\.(jpg|jpeg|png|webp)$/i.test(e.name));
   const url=f=>'music/'+[...dir.split('/').filter(Boolean),f].map(encodeURIComponent).join('/');
   albums.push({id:dir.split('/').map(cleanName).join('/')||'音乐',name:cleanName(dir.split('/').at(-1)||'音乐'),cover:cover?url(cover.name):'icon.svg',tracks:files.map(f=>({id:stableId(dir,f.name),title:cleanName(f.name.replace(/\.[^.]+$/,'')),url:url(f.name)}))});
  }
  for(const entry of entries)if(entry.isDirectory())await walk(path.join(dir,entry.name));
 }
 await walk();
 const ids=albums.flatMap(a=>a.tracks.map(t=>t.id));
 if(new Set(ids).size!==ids.length)throw Error('存在去除数字前缀后同名的歌曲，请修改名称以保证歌曲标识唯一。');
 return albums;
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const albums=await scan('music');
 await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
 await cp('public','dist',{recursive:true});await cp('music','dist/music',{recursive:true,filter:p=>!p.endsWith('.DS_Store')});
 const hash=createHash('sha256').update(JSON.stringify(albums));
 for(const name of (await readdir('public')).sort())hash.update(await readFile(path.join('public',name)));
 const version=hash.digest('hex').slice(0,12);
 await writeFile('dist/library.json',JSON.stringify({version,albums},null,2));
 let html=await readFile('dist/index.html','utf8');
 let sw=await readFile('dist/sw.js','utf8');
 for(const name of ['app.js','style.css']){
  const ext=path.extname(name);const versioned=name.slice(0,-ext.length)+'.'+version+ext;
  await cp(path.join('dist',name),path.join('dist',versioned));
  html=html.replaceAll(name,versioned);sw=sw.replaceAll(name,versioned);
 }
 await writeFile('dist/index.html',html);
 await writeFile('dist/sw.js',sw.replace('__VERSION__',version));
 console.log(`已构建 ${albums.length} 个歌单、${idsCount(albums)} 首歌曲 → dist/`);
}
function idsCount(a){return a.reduce((n,x)=>n+x.tracks.length,0)}
