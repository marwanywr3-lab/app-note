import{fileParts}from'./pdf-core.js';
import{digestBytes}from'./pdf-transfer.js';
import{abortError}from'./gemini.js';
// Assemble verified cloud parts as Blobs, not one large JS ArrayBuffer.
// Parsing starts only after a complete file exists on this device.
export function createPdfReplica({owner,user,readPart,readLocal,saveLocal,progress=()=>{}}){
 const jobs=new Map();let generation=0;
 async function obtain(record,{force=false}={}){
  const scope=owner(),epoch=generation,p=structuredClone(record.data.pdf),key=scope+':'+p.id;
  const check=()=>{if(scope!==owner()||epoch!==generation)throw abortError()};
  if(!force){const local=await readLocal(record).catch(()=>null);check();if(local)return{file:local,persisted:true,existing:true}}
  if(!p.cloudReady)throw Error('PDF_NOT_UPLOADED');
  if(!user()||p.owner!==user())throw Error('PDF_OWNER_MISMATCH');
  if(jobs.has(key))return jobs.get(key);
  const snapshot={id:record.id,data:{pdf:p}};
  const job=Promise.resolve().then(async()=>{try{const blobs=[];progress(record,'device-download',0,p.size);for(const part of fileParts(p.size)){check();const bytes=await readPart(snapshot,part.index);check();if(bytes.byteLength!==part.end-part.start)throw Error('PDF_PART_INTEGRITY');blobs.push(new Blob([bytes]));progress(record,'device-download',part.end,p.size)}
   const file=new Blob(blobs,{type:'application/pdf'});blobs.length=0;
   if(file.size!==p.size)throw Error('PDF_PART_INTEGRITY');
   if(!new TextDecoder().decode(await file.slice(0,1024).arrayBuffer()).includes('%PDF-'))throw Error('PDF_INVALID_CLOUD_FILE');
   if(p.fingerprint){const first=new Uint8Array(await file.slice(0,65536).arrayBuffer()),last=new Uint8Array(await file.slice(Math.max(0,file.size-65536)).arrayBuffer()),combined=new Uint8Array(first.length+last.length);combined.set(first);combined.set(last,first.length);if(await digestBytes(combined)!==p.fingerprint)throw Error('PDF_FILE_INTEGRITY')}
   check();let persisted=true;try{await saveLocal(scope,p.id,file)}catch{persisted=false}check();progress(record,persisted?'device-ready':'device-memory',p.size,p.size);return{file,persisted,existing:false};
  }catch(error){if(error.name!=='AbortError')progress(record,'device-error',0,p.size,error.message);throw error}finally{if(jobs.get(key)===job)jobs.delete(key)}});
  jobs.set(key,job);return job;
 }
 return{obtain,clear(){generation++;jobs.clear()}};
}
