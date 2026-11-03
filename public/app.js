const $=s=>document.querySelector(s), audio=$('#audio');
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{status('设备存储不可用，播放设置暂时仅在本次打开有效。')}};
let library,all=[],queue=[],current=null,albumId=null,mode=read('planet-mode',0),sleepAt=0,timerHandle;
const modes=['列表循环','单曲循环','随机播放'];
const status=message=>$('#status').textContent=message;
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
function filtered(){return all.filter(t=>t.album.id===albumId)}
function navigate(){const id=new URLSearchParams(location.hash.slice(1)).get('album');albumId=library?.albums.some(a=>a.id===id)?id:null;render()}
function render(){
 if(!library)return;
 const album=library.albums.find(a=>a.id===albumId);
 $('#page-label').textContent=album?.name||'音乐目录';$('#collections').hidden=!!album;$('#song-section').hidden=!album;
 $('#album-count').textContent=`${library.albums.length} 个目录 · ${all.length} 首歌曲`;
 const grid=$('#album-grid');grid.replaceChildren();
 library.albums.forEach((a,i)=>{const b=el('button','album');b.setAttribute('aria-label',`打开目录：${a.name}`);const art=el('div','album-art');if(a.cover!=='icon.svg'){const img=el('img');img.src=a.cover;img.alt='';art.append(img)}else art.textContent=['♫','☾','✿','☀'][i%4];const copy=el('div','album-copy');copy.append(el('strong',null,a.name),el('small',null,`${a.tracks.length} 首歌曲`));b.append(art,copy);b.onclick=()=>{location.hash='album='+encodeURIComponent(a.id)};grid.append(b)});
 const tracks=filtered();$('#list-title').firstChild.textContent=album?.name||'';$('#track-count').textContent=`${tracks.length} 首歌曲`;$('#tracks').replaceChildren();
 tracks.forEach((t,i)=>{const row=el('div','track'+(current?.id===t.id?' current':''));row.append(el('span','number',current?.id===t.id&&!audio.paused?'♫':String(i+1).padStart(2,'0')));const b=el('button','track-title');b.append(el('i','track-icon','♪'),el('span',null,t.title));b.onclick=()=>{queue=tracks;play(t)};row.append(b);$('#tracks').append(row)});
 status(album&&!tracks.length?'这个目录还没有歌曲。':!library.albums.length?'music 目录中还没有音乐。':'');updateButtons();
}
function updateButtons(){$('#toggle').textContent=audio.paused?'▶':'Ⅱ';$('#toggle').setAttribute('aria-label',audio.paused?'播放':'暂停');$('#mode').title=modes[mode];$('#mode').setAttribute('aria-label',`播放模式：${modes[mode]}，点击切换`);$('#mode').textContent=['↻','↺₁','⤨'][mode];if('mediaSession'in navigator)navigator.mediaSession.playbackState=audio.paused?'paused':'playing'}
async function play(t){if(!t)return;const changed=current?.url!==t.url;current=t;if(changed){audio.src=t.url;audio.load()}$('#now-title').textContent=t.title;$('#now-album').textContent=t.album.name;$('#now-cover').src=t.album.cover;
 if('mediaSession'in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:t.album.name,album:'音乐星球',artwork:[{src:new URL(t.album.cover==='icon.svg'?'icon-512.png':t.album.cover,location.href).href}]})}
 save('planet-last',t.id);try{await audio.play()}catch{status('播放未能开始，请再点一次播放；也可检查音频格式和网络。')}render()}
function step(direction=1,ended=false){if(!queue.length)queue=filtered();if(!queue.length)return;let i=queue.findIndex(t=>t.id===current?.id);if(ended&&mode===1){audio.currentTime=0;play(current);return}if(mode===2&&queue.length>1){const other=queue.filter(t=>t.id!==current?.id);play(other[Math.floor(Math.random()*other.length)])}else play(queue[(i+direction+queue.length)%queue.length])}
function toggle(){if(!current){queue=filtered();if(!queue.length){status('先打开一个音乐目录，再选择歌曲吧。');return}play(queue[0]);return}audio.paused?play(current):audio.pause()}
const time=n=>Number.isFinite(n)?`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`:'0:00';
$('#toggle').onclick=toggle;$('#prev').onclick=()=>step(-1);$('#next').onclick=()=>step();
$('#mode').onclick=()=>{mode=(mode+1)%3;save('planet-mode',mode);updateButtons()};
$('#play-all').onclick=()=>{queue=filtered();play(queue[0])};
 document.querySelector('[data-view=home]').onclick=()=>{location.hash='home'};
 $('#back-home').onclick=()=>{location.hash='home'};
 window.addEventListener('hashchange',navigate);
$('#volume').oninput=e=>{audio.volume=+e.target.value;save('planet-volume',audio.volume)};audio.volume=read('planet-volume',.8);$('#volume').value=audio.volume;
$('#seek').oninput=e=>{if(Number.isFinite(audio.duration))audio.currentTime=audio.duration*e.target.value/100};
function progress(){$('#elapsed').textContent=time(audio.currentTime);$('#duration').textContent=time(audio.duration);$('#seek').value=Number.isFinite(audio.duration)&&audio.duration?audio.currentTime/audio.duration*100:0;if('mediaSession'in navigator&&navigator.mediaSession.setPositionState&&Number.isFinite(audio.duration)&&audio.duration>0){navigator.mediaSession.setPositionState({duration:audio.duration,playbackRate:audio.playbackRate,position:Math.min(audio.currentTime,audio.duration)})}}
audio.addEventListener('timeupdate',()=>{progress();checkSleep()});audio.addEventListener('loadedmetadata',progress);audio.addEventListener('play',updateButtons);audio.addEventListener('pause',updateButtons);audio.addEventListener('ended',()=>{if(!checkSleep())step(1,true)});audio.addEventListener('error',()=>status('这首歌暂时无法播放，请检查网络或尝试下一首。'));
function checkSleep(){if(sleepAt&&Date.now()>=sleepAt){audio.pause();sleepAt=0;clearInterval(timerHandle);$('#timer-label').textContent='';status('睡眠定时已结束，晚安。');return true}return false}
$('#timer').onclick=()=>{const minutes=[0,15,30,60];const last=+$('#timer').dataset.minutes||0;const next=minutes[(minutes.indexOf(last)+1)%4];$('#timer').dataset.minutes=next;sleepAt=next?Date.now()+next*60000:0;$('#timer-label').textContent=next?`${next} 分钟` :'';$('#timer').title=next?`${next} 分钟后停止`:'睡眠定时';clearInterval(timerHandle);if(next)timerHandle=setInterval(checkSleep,1000);status(next?`将在 ${next} 分钟后暂停，再次点击可切换或关闭。`:'已关闭睡眠定时。')};
if('mediaSession'in navigator){for(const [action,handler]of Object.entries({play:()=>current?play(current):toggle(),pause:()=>audio.pause(),previoustrack:()=>step(-1),nexttrack:()=>step(),seekto:d=>{if(Number.isFinite(d.seekTime))audio.currentTime=d.seekTime},seekbackward:d=>audio.currentTime=Math.max(0,audio.currentTime-(d.seekOffset||10)),seekforward:d=>{if(Number.isFinite(audio.duration))audio.currentTime=Math.min(audio.duration,audio.currentTime+(d.seekOffset||10))}})){try{navigator.mediaSession.setActionHandler(action,handler)}catch{}}}
let installPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});$('#install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null}else $('#help').showModal()};$('#close-help').onclick=()=>$('#help').close();
async function refresh(){try{const response=await fetch('library.json',{cache:'no-store'});if(!response.ok)throw Error();const next=await response.json();if(next.version===library?.version)return;library=next;all=library.albums.flatMap(album=>album.tracks.map(t=>({...t,album})));queue=queue.map(t=>all.find(x=>x.id===t.id)).filter(Boolean);if(current){const latest=all.find(t=>t.id===current.id);if(latest)current=latest}navigate()}catch{status(library?'暂时无法检查曲库更新，当前歌曲仍可播放。':'曲库加载失败，请检查网络后刷新。')}}
await refresh();document.addEventListener('visibilitychange',()=>{if(!document.hidden){checkSleep();refresh()}});window.addEventListener('online',refresh);
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
