import{mergeInk}from'./pdf-ink.js';
export const uid=()=>crypto.randomUUID();
export const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function rankNotes(notes,query,currentId){const words=query.toLowerCase().split(/\s+/).filter(w=>w.length>1);return notes.filter(n=>!n.deleted&&n.id!==currentId).map(n=>({n,score:words.reduce((s,w)=>s+(String(n.data.title).toLowerCase().includes(w)?4:0)+(String(n.data.text).toLowerCase().includes(w)?1:0),0)})).sort((a,b)=>b.score-a.score||b.n.updated-a.n.updated).slice(0,8).map(x=>x.n);}
export function safeRecord(r){return r&&typeof r.id==='string'&&/^[a-f\d-]{36}$/i.test(r.id)&&['note','chat','folder'].includes(r.kind)&&r.data&&typeof r.data==='object'&&!Array.isArray(r.data)&&Number.isFinite(r.updated);}
export function mergeRemote(local,remote){
 const samePdf=local?.data?.pdf?.id&&local.data.pdf.id===remote.data?.pdf?.id;
 if(samePdf){const pdfInk=mergeInk(local.data.pdfInk,remote.data.pdfInk),needsUpload=JSON.stringify(pdfInk)!==JSON.stringify(remote.data.pdfInk||{});remote={...remote,data:{...remote.data,pdfInk},dirty:needsUpload};}
 if(!local||!local.dirty)return {record:remote};if(local.rev===remote.rev)return {record:local};
 if(remote.deleted&&remote.data?.study?.deleted)return {record:remote};if(local.deleted&&local.data?.study?.deleted)return {record:{...local,rev:remote.rev,dirty:true}};
 if(samePdf){const withoutInk=d=>{const {pdfInk,...other}=d;return JSON.stringify(other)};if(local.deleted===remote.deleted&&withoutInk(local.data)===withoutInk(remote.data))return{record:remote};}
 return {record:remote,conflict:{...local,id:uid(),rev:0,dirty:true,updated:Date.now(),data:{...local.data,...(samePdf?{pdfInk:remote.data.pdfInk}:{}),title:(local.data.title||'')+' (conflict copy)'}}};}

export function buildContext(current,related){return [current,...related].filter(Boolean).map(n=>({id:n.id,title:String(n.data.title||'Untitled'),text:String(n.data.text||'').slice(0,16000)}));}
