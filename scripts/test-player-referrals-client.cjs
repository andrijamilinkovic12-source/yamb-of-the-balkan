'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../www/player-referrals.js'), 'utf8');
const code = 'ABCDEF123456';
const origin = 'https://referral-qa.example.invalid';
const flush = () => new Promise(resolve => setImmediate(resolve));

async function harness(storage = new Map(), options = {}) {
    const listeners = {};
    const elements = Object.fromEntries(['referral-code','referral-entry','player-mailbox-referral','player-mailbox-manage-status']
        .map(id => [id,{ value:'',hidden:true,open:false,disabled:false,textContent:'',handlers:{},
            addEventListener(event, fn) { this.handlers[event] = fn; } }]));
    const shared = [];
    const requests = [];
    const native = options.native ? { shareReferral: async input => shared.push(input.url) } : undefined;
    const context = {
        URL, AbortSignal, Event,
        SERVER_URL:origin, location:{href:origin+'/'}, t:key=>key,
        document:{getElementById:id=>elements[id],addEventListener:(event,fn)=>{listeners[event]=fn;}},
        localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
        fetch:async url=>{
            assert.equal(String(url),origin+'/api/referrals/config');
            return {ok:true,json:async()=>({enabled:options.enabled!==false})};
        },
        navigator:{clipboard:{writeText:async text=>shared.push(text)}},
        window:{Capacitor:{Plugins:{AccountIdentity:native}},dispatchEvent(){},prompt(){throw new Error('Unexpected prompt');},
            app:{authenticateSocketIdentity:async()=>({ok:true}),emitSocketAck:async(event,payload)=>{
                requests.push(event);
                return options.response ? options.response() : {ok:true,recipientUid:'player-a',code};
            }}}
    };
    vm.createContext(context);
    vm.runInContext(source,context);
    listeners.DOMContentLoaded();
    await flush();
    return {context,api:context.window.yambReferrals,elements,shared,storage,requests};
}

(async()=>{
    const h = await harness();
    assert.equal(h.api.isEnabled(),true);
    assert.equal(h.elements['referral-entry'].hidden,false);
    h.api.acceptLink('https://other.example.invalid/?ref='+code);
    assert.equal(h.elements['referral-code'].value,'');
    h.api.acceptLink(origin+'/?ref='+code.toLowerCase());
    assert.equal(h.elements['referral-code'].value,code);
    const reloaded = await harness(h.storage);
    assert.equal(reloaded.elements['referral-code'].value,code,'invitation survives a restart before sign-in');
    assert.equal(reloaded.api.codeForSync('player-a'),code);
    assert.equal(reloaded.api.codeForSync('player-b'),'','keep the code bound to its first account');
    h.storage.set('yamb_uid','player-a');
    reloaded.api.acknowledge({referralChecked:true,recipientUid:'player-b'});
    assert.equal(reloaded.elements['referral-code'].value,code);
    reloaded.api.acknowledge({referralChecked:true,recipientUid:'player-a'});
    assert.equal(reloaded.elements['referral-code'].value,'');
    assert.equal(h.storage.has('yamb_pending_referral'),false);

    const manual=await harness();
    manual.elements['referral-code'].value=code.toLowerCase();
    manual.elements['referral-code'].handlers.input();
    const manualReload=await harness(manual.storage);
    assert.equal(manualReload.api.codeForSync('new-player'),code,'manual entry survives provider sign-in reloads');
    manual.storage.set('yamb_uid','existing-player');
    manual.api.acceptLink(origin+'/?ref=000000000000');
    assert.equal(manual.elements['referral-code'].value,code.toLowerCase(),'signed-in accounts cannot replace an invitation');

    for(const native of [false,true]) {
        const s=await harness(new Map([['yamb_uid','player-a'],['yamb_lang','en']]),{native});
        s.elements['player-mailbox-referral'].hidden=false;
        await s.elements['player-mailbox-referral'].handlers.click();
        assert.equal(s.requests[0],'player_referral_code');
        assert.equal(s.shared.length,1);
        const link=new URL(s.shared[0]);
        assert.equal(link.origin,origin);
        assert.equal(link.pathname,'/referral.html');
        assert.equal(link.searchParams.get('ref'),code);
        assert.equal(link.searchParams.get('lang'),'en');
        assert.equal(s.elements['player-mailbox-referral'].disabled,false);
    }
    const mismatch=await harness(new Map([['yamb_uid','player-a']]),{response:async()=>({ok:true,recipientUid:'player-b',code})});
    await mismatch.elements['player-mailbox-referral'].handlers.click();
    assert.equal(mismatch.shared.length,0,'never share another account\'s referral code');
    const changedStorage=new Map([['yamb_uid','player-a']]);
    const changed=await harness(changedStorage,{response:async()=>{
        changedStorage.set('yamb_uid','player-b');
        return {ok:true,recipientUid:'player-a',code};
    }});
    await changed.elements['player-mailbox-referral'].handlers.click();
    assert.equal(changed.shared.length,0,'identity changes cancel stale share replies');
    const disabled=await harness(new Map([['yamb_uid','player-a']]),{enabled:false});
    await disabled.elements['player-mailbox-referral'].handlers.click();
    assert.equal(disabled.elements['referral-entry'].hidden,true);
    assert.equal(disabled.shared.length,0);
    assert.equal(disabled.requests.length,0);
    console.log('PASS: manual/deep-link code, restart persistence, first-account binding, scoped acknowledgement, native sharing, clipboard fallback, identity changes and disabled referrals.');
})().catch(error=>{console.error(error);process.exitCode=1;});
