// Publish existing isolated measurements and an inspected native screenshot.
// No network, emulator input, account reads/writes or game actions.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require(process.env.YAMB_SHARP_PATH||'sharp');
const root=path.resolve(__dirname,'..');
const input=path.join(root,'tmp/control-loading-2026-10-30');
const out=path.join(root,'docs/theme-visual-audit/startup-loading-2026-10-30');
async function main(){
  const before=JSON.parse(fs.readFileSync(path.join(input,'before.json'),'utf8'));
  const after=JSON.parse(fs.readFileSync(path.join(input,'after.json'),'utf8'));
  assert.equal(before.mode,'before');assert.equal(after.mode,'after');
  assert.equal(before.startupPngRequests,17);assert.equal(before.startupPngBytes,1172537);
  assert.equal(after.startupPngRequests,0);assert.equal(after.hiddenThemeChangePngRequests,0);
  assert.equal(after.rows.length,10);assert.equal(new Set(after.rows.map(x=>x.theme)).size,10);
  assert(after.rows.every(x=>x.status==='PASS'&&x.settingsCount===9&&x.headerCount===9));
  assert.equal(after.raceChecks.length,1);assert.deepEqual(after.errors,[]);
  fs.mkdirSync(out,{recursive:true});
  for(const name of ['before','after']) fs.copyFileSync(path.join(input,name+'.json'),path.join(out,name+'.json'));
  const source=path.join(root,'tmp/two-emulator-qa-2026-10-29/screens/qa-perf638-start-p1.png');
  const meta=await sharp(source).metadata();assert.equal(meta.width,1440);assert.equal(meta.height,3120);
  await sharp(source).resize({width:540}).jpeg({quality:88}).toFile(path.join(out,'qa-menu-before.jpg'));
  console.log('WROTE startup audit: isolated17→0PNG requests,10theme rows, stale-theme guard and one existing v6.38 native menu. Not Android proof of v6.39.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
