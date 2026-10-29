const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const storage=new Map([['yamb_theme','easter']]),applied=[],pending=[],notices=[];
const context={window:{app:{themeSwitchRequestToken:0,prepareTreasuryTheme:()=>new Promise(resolve=>pending.push(resolve)),
 rememberManualThemeSelection:theme=>applied.push('remember:'+theme),applyTheme:theme=>applied.push(theme)},showNotification:(...args)=>notices.push(args)},
 document:{addEventListener(){},getElementById:()=>null},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))},console,_safeT:key=>key};
vm.runInNewContext(fs.readFileSync('www/managers.js','utf8')+'\nglobalThis.Shop=ShopManager;',context);
const shop=Object.create(context.Shop.prototype);
Object.assign(shop,{type:'theme',items:[{id:'light'},{id:'moon'}],unlocked:['light','moon'],activeKey:'yamb_theme',activeItem:'easter',render(){},getItemById(id){return this.items.find(i=>i.id===id);}});
(async()=>{
 const first=shop.equip('light');assert.equal(storage.get('yamb_theme'),'easter');assert.equal(applied.length,0);
 const second=shop.equip('moon');pending[0](true);await first;
 assert.equal(storage.get('yamb_theme'),'easter','An older preparation cannot apply over a newer selection');
 pending[1](true);await second;assert.equal(storage.get('yamb_theme'),'moon');assert.deepEqual(applied,['remember:moon','moon']);
 const failure=shop.equip('light');pending[2](false);await failure;
 assert.equal(storage.get('yamb_theme'),'moon','Failed image preparation preserves the complete theme');assert.equal(notices.length,1);
 const revoked=shop.equip('light');shop.unlocked=['moon'];pending[3](true);await revoked;
 assert.equal(storage.get('yamb_theme'),'moon','Ownership is rechecked after awaiting images');
 console.log('PASS: Treasury theme waits for images; latest choice, failed load and changed ownership are safe.');
})().catch(error=>{console.error(error);process.exitCode=1;});
