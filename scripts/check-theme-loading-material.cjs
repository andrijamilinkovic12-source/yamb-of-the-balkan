const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'www/theme-loading-material.css'),'utf8');
const backgrounds=JSON.parse(fs.readFileSync(path.join(root,'docs/theme-backgrounds-final.json'),'utf8')).entries;
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const lum=a=>a.map(v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
for(const bg of backgrounds){
    const block=css.match(new RegExp(`#theme-loading-gate\\.theme-${bg.themeId} \\{([^}]+)\\}`));
    assert.ok(block,`${bg.themeId}: destination palette missing`);
    assert.ok(block[1].includes(`url('${bg.appPath}')`),`${bg.themeId}: gate uses a different background`);
    assert.ok(fs.existsSync(path.join(root,'www',bg.appPath)),`${bg.themeId}: background missing`);
    const vars=Object.fromEntries([...block[1].matchAll(/--gate-([a-z]+):(#[a-f0-9]+);/g)].map(m=>[m[1],rgb(m[2])]));
    for(const text of ['ink','accent','muted']) for(const shade of [0,.04]) {
        const surface=vars.surface.map(v=>v*(1-shade)+255*shade);
        assert.ok(contrast(vars[text],surface)>=4.5,`${bg.themeId} ${text}: loading text below 4.5:1`);
    }
}
assert.ok(fs.readFileSync(path.join(root,'www/index.html'),'utf8').includes('theme-loading-material.css?v=2'));
console.log('Loading gate: ten destination palettes, approved backgrounds and 4.5:1 text contrast verified. Cold-load speed still requires device measurement.');
