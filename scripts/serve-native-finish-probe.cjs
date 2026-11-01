// Isolated, inert production-renderer snapshots. No app constructor, account,
// Socket.IO, game APIs, ads, rewards, or device-private inspection.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const generated = path.join(root, 'tmp/native-finish-2026-11-01/generated/samples');
const output = path.join(root, 'tmp/native-finish-2026-11-01/results');
const www = path.join(root, 'www');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const states = ['win', 'loss', 'draw'];
fs.mkdirSync(output, { recursive: true });
const childScript = String.raw`
document.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();},true);
const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
window.addEventListener('message',async event=>{
 if(event.source!==parent||event.origin!==location.origin||event.data?.measure!==true)return;
 await Promise.all([...document.querySelectorAll('#game-over-screen img')].map(async i=>{i.loading='eager';await Promise.race([i.decode().catch(()=>{}),new Promise(r=>setTimeout(r,15000))]);}));
 await new Promise(r=>setTimeout(r,1100));
 const screen=document.getElementById('game-over-screen'),card=screen.querySelector('.modal-box'),r=card.getBoundingClientRect();
 const visible=e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0;};
 const actions=['#btn-ad-double','.game-over-claim-button','#btn-rematch'].map(selector=>({selector,...rect(screen.querySelector(selector))}));
 const images=[...screen.querySelectorAll('img')].filter(visible).map(i=>({source:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0}));
 const overflow=[...screen.querySelectorAll('.modal-box,#go-title,#go-msg,#hotseat-result-comment,.hotseat-result-player,.solo-record-panel-grid,.solo-record-panel-footer,#solo-finish-stats,#btn-ad-double,.game-over-claim-button,#btn-rematch')].filter(e=>visible(e)&&e.scrollWidth>e.clientWidth+1).map(e=>e.id||e.className);
 const row={id:event.data.id,card:rect(card),screen:rect(screen),viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,visualWidth:visualViewport.width,visualHeight:visualViewport.height,visualScale:visualViewport.scale},inside:r.left>=11&&r.right<=innerWidth-11&&r.top>=24&&r.bottom<=innerHeight-24+.5,centered:Math.abs((r.left+r.right)/2-innerWidth/2)<1,cardScroll:card.scrollHeight>card.clientHeight+1,screenScroll:screen.scrollHeight>screen.clientHeight+1,actionsInside:actions.every(a=>a.x>=r.left&&a.right<=r.right+.5&&a.y>=r.top&&a.bottom<=r.bottom+.5),actions,images,overflow};
 parent.postMessage({kind:'native-finish-measurement',row},location.origin);
});
`;
const parentScript = String.raw`
const themes=THEMES,states=['win','loss','draw'],frame=document.querySelector('iframe'),status=document.querySelector('#status'),start=document.querySelector('#start');
const rows=[];let queue=[],current=null,running=false,timer;
const sameDocument=new URLSearchParams(location.search).get('same')==='1',total=sameDocument?4:90;
if(sameDocument)start.textContent='POKRENI 4 PROMENE ISTOG PANELA';
const samples=()=>[{width:Math.min(411,innerWidth),height:innerHeight-40},{width:Math.min(360,innerWidth),height:Math.min(640,innerHeight-40)},{width:Math.min(320,innerWidth),height:Math.min(568,innerHeight-40)}];
async function finish(){running=false;clearTimeout(timer);const report={android:/Android/.test(navigator.userAgent),sameDocument,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},scope:'Inert actual production-renderer DOM and CSS in Android Chrome same-origin iframes, three content viewport sizes, safe-top/bottom24px fixture. Not the authenticated app WebView or Android wm/density changes. No game APIs, ads, rewards or account.',rows};
 const r=await fetch('/result',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});const result=await r.json();status.textContent=result.saved?'ZAVRŠENO '+rows.length+' / '+rows.filter(x=>x.pass).length+' OK':'ČUVANJE NEUSPEŠNO';start.disabled=false;}
function next(){clearTimeout(timer);if(!queue.length){finish().catch(()=>status.textContent='Greška čuvanja');return;}current=queue.shift();const availableWidth=visualViewport.width;frame.style.left='0px';frame.style.width=Math.min(current.width,availableWidth)+'px';frame.style.height=current.height+'px';frame.style.left=Math.max(0,(availableWidth-current.width)/2)+'px';if(!sameDocument||current.id===1)frame.src='/sample/'+current.theme+'/'+current.state+'?id='+current.id;else frame.contentWindow.postMessage({measure:true,id:current.id},location.origin);status.textContent=(rows.length+1)+'/'+total+' '+current.theme+' '+current.state+' '+current.width+'×'+current.height;timer=setTimeout(()=>{rows.push({...current,pass:false,error:'timeout'});next();},25000);}
frame.addEventListener('load',()=>{if(running&&current)frame.contentWindow.postMessage({measure:true,id:current.id},location.origin);});
window.addEventListener('message',event=>{if(!running||event.source!==frame.contentWindow||event.origin!==location.origin||event.data?.kind!=='native-finish-measurement'||event.data.row.id!==current?.id)return;const row=event.data.row;const box=frame.getBoundingClientRect();row.outer={layoutWidth:innerWidth,visualWidth:visualViewport.width,visualScale:visualViewport.scale,scrollWidth:document.documentElement.scrollWidth,frameLeft:box.left,frameRight:box.right,frameBottom:box.bottom,height:innerHeight};row.parentInside=box.left>=-.5&&box.right<=visualViewport.width+.5&&box.bottom<=innerHeight+.5&&document.documentElement.scrollWidth<=innerWidth;const pass=row.parentInside&&row.inside&&row.centered&&!row.cardScroll&&!row.screenScroll&&row.actionsInside&&!row.overflow.length&&row.images.every(i=>i.loaded);rows.push({...current,...row,pass});current=null;next();});
start.onclick=()=>{if(running)return;running=true;start.disabled=true;rows.length=0;let id=0;queue=sameDocument?[...samples(),samples()[0]].map(v=>({id:++id,theme:'moon',state:'win',...v})):themes.flatMap(theme=>states.flatMap(state=>samples().map(v=>({id:++id,theme,state,...v}))));next();};
`;
function sample(theme, state) {
    const data = JSON.parse(fs.readFileSync(path.join(generated, `${theme}-${state}.json`), 'utf8'));
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="/www/">${data.styles.map(href => `<link rel="stylesheet" href="${href}">`).join('')}<style>:root{--safe-top:24px;--safe-bottom:24px;--safe-left:0px;--safe-right:0px}</style></head><body class="${data.bodyClass}">${data.screen}<script>${childScript}</script></body></html>`;
}
function validate(value) {
    if (!value || typeof value.android !== 'boolean' || !Array.isArray(value.rows) || value.rows.length !== (value.sameDocument === true ? 4 : 90)) throw Error('Invalid results');
    const seen = new Set();
    for (const row of value.rows) {
        if (!themes.includes(row.theme) || !states.includes(row.state) || !Number.isInteger(row.id) || row.id < 1 || row.id > 90 || seen.has(row.id) || typeof row.pass !== 'boolean') throw Error('Invalid case');
        seen.add(row.id);
        if (JSON.stringify(row).length > 20000) throw Error('Oversized case');
    }
    return value;
}
const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, 'http://localhost');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'; frame-src 'self'; base-uri 'self'; form-action 'none'");
        if (req.method === 'GET' && url.pathname === '/') {
            res.setHeader('Content-Type', 'text/html;charset=utf-8');
            res.end(`<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QA završni panel — bez naloga</title><style>html,body{margin:0;width:100%;overflow:hidden;background:#17242e;color:#fff;font:11px system-ui}header{height:36px;width:100%;box-sizing:border-box;display:flex;align-items:center;gap:6px;overflow:hidden}button{font:11px system-ui;padding:6px;max-width:65vw;flex-shrink:1}#status{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}iframe{position:absolute;top:40px;border:0;background:#17242e}</style><header><button id="start">POKRENI 90 PRIKAZA</button><span id="status">Bez naloga, igre i nagrada</span></header><iframe title="Izdvojeni završni prikaz"></iframe><script>${parentScript.replace('THEMES', JSON.stringify(themes))}</script></html>`);
            return;
        }
        const match = url.pathname.match(/^\/sample\/([a-z]+)\/(win|loss|draw)$/);
        if (req.method === 'GET' && match && themes.includes(match[1])) {
            res.setHeader('Content-Type', 'text/html;charset=utf-8'); res.end(sample(match[1], match[2])); return;
        }
        if (req.method === 'GET' && url.pathname.startsWith('/www/')) {
            const file = path.resolve(www, '.' + decodeURIComponent(url.pathname.slice(4)));
            if (!file.startsWith(www + path.sep) || !['.css', '.png', '.woff', '.woff2', '.ttf'].includes(path.extname(file))) { res.writeHead(404); res.end(); return; }
            res.setHeader('Content-Type', ({ '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' })[path.extname(file)]);
            res.end(fs.readFileSync(file)); return;
        }
        if (req.method === 'POST' && url.pathname === '/result') {
            if (req.headers.origin !== `http://${req.headers.host}`) { res.writeHead(403); res.end(); return; }
            let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 1000000) throw Error('Too large'); }
            const value = validate(JSON.parse(body));
            const file = path.join(output, `${value.android ? 'android' : 'desktop'}-${Date.now()}.json`);
            fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
            res.setHeader('Content-Type', 'application/json'); res.end('{"saved":true}');
            console.log(JSON.stringify({ file, android: value.android, cases: value.rows.length, passed: value.rows.filter(r => r.pass).length })); if(process.argv.includes('--once'))setTimeout(()=>server.close(()=>process.exit()),1000); return;
        }
        res.writeHead(404); res.end();
    } catch (_) { res.writeHead(400); res.end('Invalid fixture request'); }
});
server.listen(0, '127.0.0.1', () => { const port = server.address().port; console.log(JSON.stringify({ ready: true, port, androidUrl: `http://10.0.2.2:${port}/`, desktopUrl: `http://127.0.0.1:${port}/` })); });
const lifetime = setTimeout(() => server.close(() => process.exit()), 12 * 60 * 1000);
process.stdin.setEncoding('utf8'); process.stdin.on('data', value => { if (value.trim() === 'stop') { clearTimeout(lifetime); server.close(() => process.exit()); } });
