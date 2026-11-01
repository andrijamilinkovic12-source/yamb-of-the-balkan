// Reuse the existing isolated production-renderer harness to export inert DOM.
// The application constructor, real accounts, server, ads and payouts never run.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'tmp/native-finish-2026-11-01');
fs.mkdirSync(directory, { recursive: true });
let source = fs.readFileSync(path.join(root, 'scripts/test-online-random-layout-runtime.cjs'), 'utf8');
function replaceOnce(before, after) {
    if (source.indexOf(before) < 0 || source.indexOf(before) !== source.lastIndexOf(before)) throw Error('Renderer harness changed; review export hook');
    source = source.replace(before, after);
}
replaceOnce("const root=path.resolve(__dirname,'..'),read=p=>", 'const root=process.cwd(),read=p=>');
replaceOnce("path.join(root,'tmp/online-random-layout-runtime')", "path.join(root,'tmp/native-finish-2026-11-01/generated')");
replaceOnce("const resizeOnly=process.env.YAMB_FINISH_RESIZE_AUDIT==='1';", 'const resizeOnly=true;');
const marker = '  for(const viewport of [{width:411,height:891}';
replaceOnce(marker, String.raw`
  const fragment=await page.evaluate(()=>{
   const node=document.getElementById('game-over-screen').cloneNode(true);
   node.querySelectorAll('script').forEach(e=>e.remove());
   [node,...node.querySelectorAll('*')].forEach(e=>{
    for(const a of [...e.attributes])if(/^on/i.test(a.name))e.removeAttribute(a.name);
    if(e.tagName==='BUTTON'){e.type='button';e.dataset.qaDisabled='true';}
    for(const a of ['src','href'])if(e.hasAttribute(a))e.setAttribute(a,e.getAttribute(a).replace(/^https?:\/\/online-random-fixture\.local/,'').replace(/^\/www\//,''));
   });
   return {bodyClass:document.body.className,screen:node.outerHTML,styles:[...document.head.querySelectorAll('link[rel=stylesheet]')].map(e=>e.getAttribute('href'))};
  });
  fs.mkdirSync(path.join(output,'samples'),{recursive:true});
  fs.writeFileSync(path.join(output,'samples',theme+'-'+state+'.json'),JSON.stringify(fragment,null,2));
  continue;
` + marker);
replaceOnce('PASS: ${rows.length} mobile finish resize states; centered safe bounds, no room/card scroll, loaded PNGs and no reward/rematch requests.', 'Exported inert DOM snapshots; this export does not perform viewport assertions.');
const runner = path.join(directory, 'export-renderer.cjs');
fs.writeFileSync(runner, source);
const result = spawnSync(process.execPath, [runner], { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true });
if (result.error || result.status !== 0) process.exit(result.status || 1);
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const files = themes.flatMap(theme => ['win', 'loss', 'draw'].map(state => path.join(directory, 'generated/samples', `${theme}-${state}.json`)));
for (const file of files) {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!value.screen.includes('is-online-duel-result') || /<script|\son[a-z]+=/i.test(value.screen)) throw Error('Invalid inert snapshot: ' + path.basename(file));
}
console.log(JSON.stringify({ snapshots: files.length, noConstructor: true, noGameApis: true, noClaims: true }));
