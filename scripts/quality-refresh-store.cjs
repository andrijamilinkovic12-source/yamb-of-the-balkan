const fs=require('node:fs'),path=require('node:path');
const file=path.resolve(__dirname,'../source-assets/theme-quality-refresh-v2/manifest.json'),lock=file+'.lock';
function update(callback){
 let handle;for(let attempt=0;attempt<250;attempt++){
  try{handle=fs.openSync(lock,'wx');break;}catch(error){if(error.code!=='EEXIST')throw error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,20);}
 }
 if(handle===undefined)throw Error('Quality manifest is busy; retry this update.');
 try{const data=JSON.parse(fs.readFileSync(file,'utf8'));const result=callback(data);fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');return result;}
 finally{fs.closeSync(handle);fs.unlinkSync(lock);}
}
module.exports={update,file};
