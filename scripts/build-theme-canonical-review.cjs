const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const map = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-canonical-use-map.json'), 'utf8'));
const data = map.themes.map(theme => ({
    id: theme.id,
    name: theme.name,
    concepts: theme.concepts.map(concept => ({
        key: concept.key,
        label: concept.label,
        primary: concept.primary?.file,
        variants: concept.variants.map(asset => asset.file),
        sites: concept.sites.map(site => site.room),
        exception: concept.exception || '',
        visualStatus: concept.visualStatus
    }))
}));
const serialized = JSON.stringify(data).replaceAll('<', '\\u003c');
const html = `<!doctype html>
<html lang="sr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kanonski PNG — 10 tema</title>
<style>
:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#101725;color:#edf3f8}
*{box-sizing:border-box}body{margin:0;padding:24px}main{max-width:1480px;margin:auto}
h1{font-size:clamp(1.45rem,3vw,2rem);margin:0 0 8px}p{color:#b9c7d6;line-height:1.55}
.controls{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0;align-items:center}
select,input,button{font:inherit;border:1px solid #526277;border-radius:10px;background:#1d2939;color:#fff;padding:10px 12px;min-height:44px}
input{min-width:min(100%,320px);flex:1}button{cursor:pointer}button[aria-pressed=true]{background:#327e92;border-color:#9ce7ed}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:12px}
figure{margin:0;padding:12px;background:#1b2737;border:1px solid #3b4d62;border-radius:14px;min-width:0}
.frame{height:176px;display:grid;place-items:center;border-radius:9px;background:linear-gradient(135deg,#26364b,#152030)}
.frame img{max-width:100%;max-height:164px;object-fit:contain}.name{font-weight:700;font-size:.91rem;margin:10px 0 4px}
.path,.sites,.exception{font-size:.72rem;color:#b7c6d6;overflow-wrap:anywhere;line-height:1.38}
.path{color:#8fd7e4}.sites{margin-top:7px}.exception{color:#e2c5a1}.minor{font-size:.71rem;color:#a9bad1;margin-top:6px}
.comparison .frame{height:210px}.comparison .frame img{max-height:198px}
.notice{background:#24354b;border-left:3px solid #7bd6d4;padding:10px 14px;border-radius:7px;margin:14px 0 20px}
</style>
</head>
<body><main>
<h1>Kanonski PNG assetsi — svih 10 tema</h1>
<p>Za svaki identitet su navedeni glavni aktivni fajl, tehničke varijante i mesta upotrebe. Menjajte temu ili uporedite jedan identitet kroz svih deset tema. Istorijski fajlovi nisu prikazani kao aktivni.</p>
<p class="notice">Tehnička provera potvrđuje putanje, PNG format, dimenzije i resolver. Prikaz ovde služi za vizuelnu proveru motiva, kompozita, kontrasta i čitljivosti.</p>
<div class="controls"><label for="theme">Tema</label><select id="theme"></select><label for="search">Traži</label><input id="search" type="search" placeholder="Dukat, turnirska medalja, soba…"><button id="compare" type="button" aria-pressed="false">Uporedi 10 tema</button></div>
<p id="count"></p><div id="grid" class="grid"></div>
<script>
const themes=${serialized};
const themeSelect=document.getElementById('theme');const search=document.getElementById('search');const compare=document.getElementById('compare');
const grid=document.getElementById('grid');const count=document.getElementById('count');
for(const theme of themes){const option=document.createElement('option');option.value=theme.id;option.textContent=theme.name+' ('+theme.id+')';themeSelect.append(option)}
function addText(parent,className,text){const node=document.createElement('div');node.className=className;node.textContent=text;parent.append(node)}
function card(theme,concept,comparison){const figure=document.createElement('figure');if(comparison)figure.classList.add('comparison');
 const frame=document.createElement('div');frame.className='frame';const img=document.createElement('img');img.loading='lazy';img.decoding='async';img.src='../'+concept.primary;img.alt=concept.label;frame.append(img);figure.append(frame);
 addText(figure,'name',(comparison?theme.name+' · ':'')+concept.label);addText(figure,'path',concept.primary);
 if(!comparison&&concept.variants.length)addText(figure,'minor','Varijante: '+concept.variants.join(' · '));
 if(!comparison)addText(figure,'sites','Prikaz: '+[...new Set(concept.sites)].join(' · '));
 if(concept.exception)addText(figure,'exception',concept.exception);return figure}
function render(){grid.replaceChildren();const q=search.value.trim().toLocaleLowerCase('sr');const selected=themes.find(theme=>theme.id===themeSelect.value)||themes[0];const comparison=compare.getAttribute('aria-pressed')==='true';
 if(comparison){const keys=selected.concepts.filter(c=>c.key.toLocaleLowerCase('sr').includes(q)||c.label.toLocaleLowerCase('sr').includes(q));const key=keys[0]?.key;count.textContent=key?'Poređenje: '+keys[0].label+' · 10 tema':'Nema rezultata';
 if(key)for(const theme of themes){const concept=theme.concepts.find(item=>item.key===key);grid.append(card(theme,concept,true))}}
 else{const concepts=selected.concepts.filter(c=>c.key.toLocaleLowerCase('sr').includes(q)||c.label.toLocaleLowerCase('sr').includes(q)||c.sites.some(s=>s.toLocaleLowerCase('sr').includes(q)));count.textContent=selected.name+' · '+concepts.length+' identiteta';for(const concept of concepts)grid.append(card(selected,concept,false))}}
themeSelect.addEventListener('change',render);search.addEventListener('input',render);compare.addEventListener('click',()=>{const next=compare.getAttribute('aria-pressed')!=='true';compare.setAttribute('aria-pressed',String(next));render()});render();
</script></main></body></html>`;
const file = path.join(root, 'docs/theme-canonical-use-review.html');
if (process.argv.includes('--check')) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== html) throw new Error('Review page is stale');
    console.log('PASS: theme-canonical-use-review.html matches the use map');
} else {
    fs.writeFileSync(file, html);
    console.log('WROTE docs/theme-canonical-use-review.html');
}
