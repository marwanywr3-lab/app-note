import{PART_SIZE,fileParts,validatedPartPath}from'./pdf-core.js';
import{abortError,pause}from'./gemini.js';
export const digestBytes=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
// Every reader receives its own buffer: PDF.js can transfer and detach buffers.
export function createPartReader({owner,user,request,cacheGet=async()=>null,cachePut=async()=>{},progress=()=>{},online=()=>navigator.onLine,retryPause=pause}){
 const memory=new Map(),jobs=new Map(),controllers=new Set();let generation=0;
 const check=(scope,epoch)=>{if(scope!==owner()||epoch!==generation)throw abortError()};
 async function readPart(record,index){const p=record.data.pdf,scope=owner(),epoch=generation,expected=fileParts(p.size)[index];if(!expected||p.owner!==user())throw Error('PDF owner or part is invalid');const object=validatedPartPath(p.owner,p.id,index),key=scope+':'+object+':'+(p.fingerprint||p.size),length=expected.end-expected.start,hash=p.partHashes?.[index];
  async function valid(bytes){return bytes instanceof Uint8Array&&bytes.byteLength===length&&(!hash||await digestBytes(bytes)===hash)}
  if(memory.has(key)){const value=memory.get(key);memory.delete(key);if(value.hash===hash){memory.set(key,value);return value.bytes.slice()}}
  if(!jobs.has(key)){const job=(async()=>{const cached=await cacheGet(key).catch(()=>null);check(scope,epoch);if(cached&&await valid(cached))return cached;if(!online())throw Error('PDF_OFFLINE_PART');let last;
   for(let attempt=0;attempt<3;attempt++){check(scope,epoch);const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);controllers.add(controller);try{progress('download',expected.start,p.size);const response=await request(object,{signal:controller.signal});const bytes=new Uint8Array(await response.arrayBuffer());check(scope,epoch);if(!await valid(bytes))throw Error('PDF_PART_INTEGRITY');await cachePut(key,bytes).catch(()=>{});check(scope,epoch);return bytes}catch(error){last=error;check(scope,epoch);if([400,401,403,404].includes(error.status)||!online()||attempt===2)break;progress('retry',attempt+1,3);await retryPause(500*2**attempt)}finally{controllers.delete(controller);clearTimeout(timer)}}throw last;
  })();jobs.set(key,job);job.finally(()=>{if(jobs.get(key)===job)jobs.delete(key)}).catch(()=>{})}
  const bytes=await jobs.get(key);check(scope,epoch);memory.set(key,{bytes,hash});while(memory.size>5)memory.delete(memory.keys().next().value);return bytes.slice();
 }
 return{readPart,async read(record,begin,end){const size=record.data.pdf.size;if(!Number.isInteger(begin)||!Number.isInteger(end)||begin<0||end>size||end<begin)throw Error('Invalid PDF range');const output=new Uint8Array(end-begin);for(let i=Math.floor(begin/PART_SIZE);i<=Math.floor((end-1)/PART_SIZE)&&end>begin;i++){const part=await readPart(record,i),a=Math.max(begin,i*PART_SIZE),b=Math.min(end,(i+1)*PART_SIZE);output.set(part.subarray(a-i*PART_SIZE,b-i*PART_SIZE),a-begin)}return output},clear(){generation++;for(const controller of controllers)controller.abort();controllers.clear();memory.clear();jobs.clear()}};
}
