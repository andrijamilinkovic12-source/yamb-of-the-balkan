// Publish existing public-resource and isolated-cache evidence; no network/device input.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),input=path.join(root,'tmp/startup-profile-2026-10-30');
const output=path.join(root,'docs/theme-visual-audit/preload-retention-2026-10-30');
const read=name=>JSON.parse(fs.readFileSync(path.join(input,name+'.json'),'utf8'));
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const network=read('public-resources'),before=read('preload-retention-before'),after=read('preload-retention-after');
const browserBefore=read('menu-browser-before'),browserAfter=read('menu-browser-after');
assert.equal(before.packRevalidatedAfterEviction,false);assert.equal(before.downloadsForPendingUrl,2);
assert.equal(after.packRevalidatedAfterEviction,true);assert.equal(after.downloadsForPendingUrl,1);
assert.equal(after.overlappingSourcesAndOldFailureGuard,'PASS');
assert.equal(browserBefore.rows.length,10);assert.equal(browserAfter.rows.length,10);
assert(browserAfter.rows.every(row=>row.ready));assert(browserBefore.revisit.missingAfter>0);
assert.equal(browserAfter.revisit.missingAfter,0);assert.equal(browserAfter.immediateRepeat.newImages,0);
assert.deepEqual(browserAfter.errors,[]);
const report={
 date:'2026-10-30',baselineCommit:before.baselineCommit,baselineGameVersion:'6.39',localGameVersion:'6.40',
 status:'R36 local, not deployed or Android verified',
 problems:[
  'Resolved theme warmup remained cached after its decoded images had been evicted by the LRU.',
  'LRU trimming could evict unfinished image entries, so a later caller could start the same download/decode twice.'
 ],
 fix:'Validate required resolved URLs against retained decoded entries before reusing a completed warmup. Keep shared unfinished image requests in the map until they settle; retain count/pixel limits for completed entries. Updated visible source sets join a new shared barrier, and an obsolete failure cannot delete its replacement.',
 unit:{before,after},browser:{before:browserBefore,after:browserAfter},publicResources:network,
 tests:['Real-PNG menu browser: ten themes, revisit after real LRU eviction, immediate repeat','Actual-method controlled image callbacks: pending pressure, overlapping source sets, obsolete failure','Existing menu warmup, image cache, decode/readiness, theme retry, quick skin, Settings and JS syntax checks'],
 limits:'Browser evidence is an isolated localhost fixture with actual methods/PNGs and synthetic navigation, not a full account/room visual audit. Network timings are bounded public QA GETs from a Node client, not a phone/WebView or cold hosting test. No real account, game, ad/reward, emulator input or auth inspection in this run. No proof that the Android ANR is fixed. No PNG, dimensions, palette, game rules, economy or server cache change.',
 next:'User commit/deploy, then targeted native return to an earlier theme after several switches; measure first/repeated ready times on physical S25 separately.'
};
fs.mkdirSync(output,{recursive:true});
for(const name of ['public-resources','preload-retention-before','preload-retention-after','menu-browser-before','menu-browser-after'])fs.copyFileSync(path.join(input,name+'.json'),path.join(output,name+'.json'));
fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
const summaryRows=[
 ['Povratak na Green posle deset tema: slike koje nedostaju u kešu',browserBefore.revisit.missingBefore,browserAfter.revisit.missingBefore],
 ['Slike koje još nedostaju nakon prijave „spremno”',browserBefore.revisit.missingAfter,browserAfter.revisit.missingAfter],
 ['Nove Image pripreme pri povratku',browserBefore.revisit.newImages,browserAfter.revisit.newImages],
 ['Nove Image pripreme pri odmah ponovljenom izboru',browserBefore.immediateRepeat.newImages,browserAfter.immediateRepeat.newImages],
 ['Učitavanja istog još nezavršenog URL-a pri kontrolisanom pritisku',before.downloadsForPendingUrl,after.downloadsForPendingUrl]
];
fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Keš tema — R36/v6.40</title><style>body{background:#17242e;color:#edf4f7;font:16px/1.5 system-ui;padding:24px}main{max-width:1000px;margin:auto}a{color:#9cddff}table{border-collapse:collapse;width:100%;margin:24px 0}th,td{padding:12px;border:1px solid #546b7a;text-align:left}strong{color:#ffe0a3}</style><main><h1>Keš tema — lokalna R36/v6.40</h1><p><strong>Nije objavljeno niti potvrđeno na Androidu.</strong> Osnova je v6.39/${esc(report.baselineCommit)}.</p><p>Reprodukovane dve greške: završena priprema ostaje označena kao spremna i kada njene slike više nisu zadržane u memorijskom kešu; zapis slike koja se još učitava može biti izbačen i izazvati duplo učitavanje.</p><p>Ispravka proverava zadržane dekodirane URL-ove pre ponovne upotrebe završene pripreme i čuva zajednički zahtev dok učitavanje traje. Broj/pikseli završenog keša i dalje su ograničeni; izgled i PNG nisu menjani.</p><table><thead><tr><th>Provera</th><th>Pre</th><th>Posle</th></tr></thead><tbody>${summaryRows.map(row=>`<tr>${row.map(cell=>`<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table><p>Stvarni PNG u lokalnom browseru: svih deset tema spremno, bez404/browser grešaka. Pri povratku nedostajućih18slika ponovo pripremljeno; odmah ponovljen izbor koristi isti gotov paket. Trajanja u sirovim podacima odnose se samo na lokalni test.</p><p>Javni QA uzorak:86lokalnih JS/CSS referenci,3.665.259B nekompresovanih fajlova; testirani tekstualni odgovori koriste Brotli, PNG dugotrajni keš, JS/CSS max-age0. To nije broj zahteva izmeren u WebView-u niti dokaz uzroka ANR-a.</p><p><a href="report.json">Sve mere i granice</a> · <a href="public-resources.json">Javni HTTP uzorak</a> · <a href="menu-browser-before.json">Browser pre</a> · <a href="menu-browser-after.json">Browser posle</a> · <a href="../remaining-work-plan-2026-10-29.md">Preostale provere</a></p><p>Ovaj nastavak nema novu partiju, reklamu, nagradu ili unos na emulatoru. Hladni start, fizički S25 i uzrok ranijeg ANR-a ostaju otvoreni.</p></main></html>\n`);
console.log('WROTE R36 evidence: ten real PNG theme packs,18→0missing retained images,2→1pending-URL loads; local v6.40, native confirmation pending.');
