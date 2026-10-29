const fs=require('node:fs'),path=require('node:path');
const sharp=require(process.env.YAMB_SHARP_PATH||'sharp');
const {resolve}=require('../www/theme-quality-assets.js');
const root=path.resolve(__dirname,'..'),raw=path.join(root,'tmp/emulator-tournament-2026-10-28'),out=path.join(root,'docs/theme-visual-audit/emulator-tournament-2026-10-29');
const themes=['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const names=['Zelena','Svetlo zlato','Trula višnja','Plavi okean','Neon Cyber','Kraljevski ametist','Vaskršnja','Pustinjsko staklo','Mesečev sjaj','Severna maglina'];
const chosen={
 dark:['dark-info','dark-bracket','dark-final','dark-duel','dark-hall'],
 light:['light-info','light-bracket','light-final','light-duel','light-hall'],
 medium:['medium-registration','medium-bracket','medium-final','medium-duel','medium-hall'],
 winter:['winter-info','winter-bracket','winter-final-ready','winter-duel','winter-hall'],
 neon:['neon-info','neon-bracket','neon-final','neon-duel','neon-hall-ready'],
 amethyst:['amethyst-info','amethyst-qf','amethyst-final','amethyst-duel','amethyst-bracket'],
 easter:['easter-info','easter-bracket','easter-final','easter-duel','easter-hall-ready'],
 desert:['desert-info','desert-bracket','desert-final','desert-duel','desert-open'],
 moon:['moon-info','moon-bracket','moon-final','moon-duel','moon-hall-ready'],
 severna:['severna-info','severna-bracket','severna-final','severna-duel','severna-open']
};
const titles=['Info / prijavljeni učesnici','Kostur / četvrtfinale','Kostur / finale','Detalj odigranog meča','Dvorana slavnih / prve kartice'];
const entries=themes.flatMap((theme,i)=>chosen[theme].map((file,j)=>({theme,file,title:`${names[i]} — ${titles[j]}`})));
for(const theme of themes.slice(3))entries.push({theme,file:`${theme}-intro`,title:`${names[themes.indexOf(theme)]} — intro, pehar sa zvezdom`});
entries.push({theme:'medium',file:'medium-open',title:'Trula višnja — intro, pehar sa zvezdom'},
 {theme:'extra',file:'dark-semifinal',title:'Zelena — dodatno polufinale'},
 {theme:'extra',file:'dark-journey',title:'Zelena — dodatno Put do titule'},
 {theme:'extra',file:'neon-settings',title:'Prelazak teme — nedostaje X dok se PNG učitava'},
 {theme:'extra',file:'dark-main-restored-original',title:'Vraćena Zelena i originalna rezolucija'});
const useMap=JSON.parse(fs.readFileSync(path.join(root,'docs/theme-canonical-use-map.json'),'utf8'));
const config=fs.readFileSync(path.join(root,'www/config.js'),'utf8');
const vm=require('node:vm');let selected='dark';
const context={localStorage:{getItem:()=>selected},globalThis:{resolveThemeQualityAsset:resolve}};
vm.createContext(context);vm.runInContext(config.slice(config.indexOf('function getThemeMedalSource'),config.indexOf('// Export'))+';globalThis.medal=getThemeMedalSource;',context);
const results=themes.map((theme,i)=>{
 selected=theme;const prefix=theme==='dark'?'assets/green-soft-clay/canonical':`assets/theme-packs/${theme}/canonical`,star=['winter','neon','amethyst','easter','desert','moon','severna'].includes(theme)?2:1;
 const roles={champion:`${prefix}/tournament-awards/champion-trophy-v${star}.png`,finalist:`${prefix}/tournament-awards/finalist-silver-v${star}.png`};
 for(const role of ['tab-info','tab-bracket','tab-hall-of-fame'])roles[role]=`${prefix}/tournament-navigation/${role}-v1.png`;
 for(const role of ['state-register','state-unregister','state-registration-locked','state-start','state-match-active','state-match-complete'])roles[role]=`${prefix}/tournament-states/${role}-v1.png`;
 for(const tier of ['gold','silver','bronze'])roles[`medal-${tier}`]=context.globalThis.medal('tournament',tier,theme);
 const canonical=useMap.themes.find(t=>t.id===theme);
 const shared=canonical.concepts.filter(c=>['ducat','power-index','close'].includes(c.key)).map(c=>({key:c.key,primary:c.primary}));
 return{theme,name:names[i],status:'Osnovni Android prolaz pregledan; R21 lokalno ispravljeno, potvrda čeka deploy.',pngStatus:'U snimljenim prikazima odgovarajući kanonski pehar sa zvezdom i ikone aktivne teme; nema potrebe za novim PNG crtežima u ovom prolazu.',turnirSemanticRoles:14,roles:Object.fromEntries(Object.entries(roles).map(([k,v])=>[k,'www/'+resolve(v)])),sharedCanonical:shared,roomTrophyDerivative:theme==='dark'?null:`www/${prefix}/tournament-awards/champion-trophy-room-v${star}.png`,evidence:entries.filter(e=>e.theme===theme).map(e=>e.file+'.jpg')};
});
const report={date:'2026-10-29',startedOn:'2026-10-28',room:'Turnir',scope:'Stvarni Android emulator 360×780: u svih deset tema Info sa već prijavljenim nalogom/8 učesnika, četvrtfinale, prelazak na finale, detalj istog odigranog četvrtfinalnog meča i prve kartice Dvorane slavnih. Green dodatno polufinale i Put do titule. Intro kadrovi sačuvani za osam dodatnih tema.',deployment:'Android snimci prikazuju postojeću objavljenu verziju. R21 i ranije lokalne dorade nisu commitovane niti deployovane.',
 findings:{R21:'Kartica osvajača smešta rezultat ispod imena, uz istu širinu kartice i avatara, da rezultat ne sužava ime na nekoliko slova. Zajednička Green debljina/razmak naslova, 14px tab radius i tipografija modala. Tabovi, aktivna navigacija, popunjene prijave, statusne akcije i kartice osvajača prate površine/ink/akcent teme; uklonjeni stari Easter ljubičasti rubovi, plavi status i generička zelena/siva/zlatna podloga. Opis/oznaka prijave koriste čitljivi muted, poraženi nisu zatamnjeni opacity/filter slojem, a pobednik ostaje označen debljinom i rezultatom. Uklonjene stare zamućujuće tekstualne senke u detalju meča.',css:'www/theme-tournament-final.css?v=3',png:'Nema PNG izmene, novih assetsa, promene DNK, pravca ili palete.',navigation:'Na snimljenim četvrtfinalnim i finalnim stranama sve tri tačke su vidljive, aktivna je cela. Funkcije navigacije nisu menjane.'},
 inventory:'14 turnirskih semantičkih uloga po temi: pehar, finalista, tri taba, šest stanja i tri turnirske medalje. Dukat, Indeks moći i X su deljeni kanonski identiteti iste teme. Devet tema ima dodatnu tehničku 512px room izvedenicu istog 384px pehara; Green koristi kanonski 384px PNG. To je namerni tehnički izuzetak, ne dodatni identitet. Nisu svih 14 uloga istovremeno na ekranu; medalje različitih takmičenja nisu spajane.',
 tests:{static:'PASS: check:theme-tournament-final — deset tema ×14 različitih kanonskih PNG uloga, intro konfiguracija, tematske putanje i dodatne regresione tvrdnje CSS ugovora.',runtime:'PASS: 210 izolovanih slučajeva (10 tema ×7 stanja ×320×568/360×780/412×915), stvarni TournamentManager/ModalManager i CSS sa sintetičkim turnirom. Izračunate Green mere/fontovi, safe bounds, ispravni vidljivi PNG, navigacija44/10px, dovoljno prostora za ime i paletni opis/prijava.',runtimeEvidence:'local-layout-report.json',online:'PASS: check:online-duel-finish; pet online režima, turnirski uslov revanša, zajedničke nagrade/rekordi. Sintetička regresija, nije nova stvarna isplata.',fontLimit:'Montserrat je deklarisan; izolovani offline test može koristiti fallback. Animacije su u fixture-u isključene radi stabilnog merenja, pa test ne meri motion ili trajanje intra.'},
 switching:'Devet izbora posedovanih tema kroz Podešavanja i vraćanje Zelene uspeli su iz prvog pokušaja u ovom prolazu. Tokom prvog učitavanja X i pojedine ikone nisu odmah kompletni; ranija lokalna decode dorada čeka deploy. Ovo nije merenje hladnog mrežnog cache-a.',safety:'Nema nove partije, prijave/odjave sa turnira, kupovine, nagradne reklame, isplate, deljenja kartice ili slanja poruka/poziva. Otvarani su samo postojeći prikazi i zatvarani informativni modali. Automatski test interstitiali zatvoreni Android Back kontrolom bez klika na oglas. Nije bilo blokirajućeg poziva u ovom prolazu.',restoration:'Zelena vraćena kroz UI. wm size/density resetovani na originalnih1440×3120/560dpi; emulator ostao otvoren i prijavljen.',
 limits:['Nije nova Android provera prijave/odjave, praznog turnira, prihvatanja pravila, zakazivanja, prihvatanja termina ili pokretanja duela. Ti tokovi nisu pokretani na nalogu.','Dvorana slavnih prikazana je sa prvim karticama, ne sa svakom istorijskom titulom; Put do titule novim Android dokazom obuhvaćen samo u Zelenoj. Polufinale dodatno samo u Zelenoj.','Nije sada izazvana šampionska/finalistička ceremonija ili nagradno/grešno obaveštenje; završni online ekran i stvarna isplata nisu novi Android dokaz.','Nisu merene tačne sekunde intra, fps, hladni transfer, drugi jezik ili fizički Samsung S25.','Nove lokalne ispravke zahtevaju korisnikov deploy i naknadnu Android potvrdu.'],results,entries};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const test=JSON.parse(fs.readFileSync(path.join(root,'tmp/tournament-layout-runtime/report.json'),'utf8'));if(test.rows.length!==210||test.failures.length)throw Error('Successful 210-case runtime report required');
 fs.copyFileSync(path.join(root,'tmp/tournament-layout-runtime/report.json'),path.join(out,'local-layout-report.json'));
 for(const e of entries)await sharp(path.join(raw,e.file+'.png')).resize({width:540}).jpeg({quality:88,chromaSubsampling:'4:4:4'}).toFile(path.join(out,e.file+'.jpg'));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 const card=e=>`<article><h3>${esc(e.title)}</h3><a href="${e.file}.jpg"><img loading="lazy" src="${e.file}.jpg" alt="${esc(e.title)}"></a></article>`;
 fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Turnir — emulator 28–29.10.</title><style>*{box-sizing:border-box}body{font:16px/1.5 system-ui;background:#14232e;color:#edf5fc;margin:0;padding:24px}main{max-width:1500px;margin:auto}a{color:#afe4ff}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}article{background:#233847;border:1px solid #7997a9;border-radius:12px;padding:12px}img{width:100%;height:auto}h3{font-size:17px}nav{display:flex;gap:12px;flex-wrap:wrap}</style><main><h1>Turnir — svih deset tema, 28–29.10.</h1><p>${esc(report.scope)}</p><p><b>${esc(report.deployment)}</b></p><nav><a href="report.json">Kanonske putanje i rezultati</a><a href="local-layout-report.json">Lokalni test210slučajeva</a>${results.map(r=>`<a href="#${r.theme}">${esc(r.name)}</a>`).join('')}</nav><h2>Lokalne dorade koje snimci još ne potvrđuju</h2><p>${esc(report.findings.R21)}</p><p>${esc(report.tests.runtime)} ${esc(report.tests.fontLimit)}</p><p>${esc(report.inventory)}</p><h2>Granice provere</h2><ul>${report.limits.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${results.map(r=>`<section id="${r.theme}"><h2>${esc(r.name)}</h2><p>${esc(r.status)}</p><div class="grid">${entries.filter(e=>e.theme===r.theme).map(card).join('')}</div></section>`).join('')}<h2>Dodatni dokazi</h2><div class="grid">${entries.filter(e=>e.theme==='extra').map(card).join('')}</div><p>${esc(report.safety)}</p><p>${esc(report.restoration)}</p></main></html>`);
 console.log(`Tournament: ${results.length} themes, ${entries.length} scoped Android screenshots, 210 isolated cases.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
