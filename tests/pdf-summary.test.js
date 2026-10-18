import test from 'node:test';import assert from 'node:assert/strict';
import {summarizeDocument,classificationSample,assertCompletePages,SUMMARY_VERSION,documentMode,STUDY_GUIDANCE,countSummaryWords,fitSummaryLength} from '../pdf-summary.js';
import {generateText} from '../gemini.js';
import {summaryBatches} from '../pdf-core.js';
const base={title:'Mathematics',question:'لخص أهم المعلومات',language:'ar',options:{key:'test',model:'mock'}};
test('Summary reads and independently reviews every source span, including the final page, before synthesis and audit',async()=>{
 const pages=Array.from({length:9},(_,i)=>({number:i+1,text:`UNIQUE_PAGE_${i+1} `+'x'.repeat(9000),scanned:false})),calls=[],stages=[];
 const answer=await summarizeDocument({...base,pages,total:9,progress:s=>stages.push(s),generate:async req=>{calls.push(req);return req.system.includes('FINAL factual')?'FINAL AUDITED SUMMARY':'DOCUMENT_MODE: EXPLAIN\nReviewed evidence with original page references.'}});
 assert.equal(answer,'FINAL AUDITED SUMMARY');assert.equal(stages[0],'classify');
 const extraction=calls.filter(r=>r.system.includes('Build an evidence ledger'));
 const review=calls.filter(r=>r.system.includes('Independently reread ALL'));
 for(const rows of [extraction,review]){const content=rows.map(r=>r.contents[0].parts[0].text).join('\n');for(const p of pages)assert.ok(content.includes(p.text),'Every page text must reach each pass');}
 assert.ok(stages.indexOf('classify-final')>stages.lastIndexOf('review'));
 assert.deepEqual(stages.slice(-2),['compose','audit']);
 for(const c of calls){assert.equal(c.requireComplete,true);assert.ok(c.system.includes('conditions'));assert.ok(c.system.includes('partnership'));assert.ok(c.system.includes('Psychology'));}
});
test('Incomplete or still unreadable documents fail before claiming full coverage',async()=>{
 assert.throws(()=>assertCompletePages([{number:1,text:'partial'}],2));
 assert.throws(()=>assertCompletePages([{number:1,text:'x',scanned:true}],1));
 assert.throws(()=>assertCompletePages([{number:2,text:'wrong page'}],1));
 let requests=0;await assert.rejects(()=>summarizeDocument({...base,pages:[],total:3,generate:async()=>{requests++;return 'x'}}));assert.equal(requests,0);
});
test('Classification samples opening, middle and end without substituting samples for full review',()=>{
 const pages=Array.from({length:120},(_,i)=>({number:i+1,text:'p'+(i+1)+' '+'a'.repeat(4000)}));const sample=classificationSample(pages);
 assert.ok(sample.includes('[PDF page 1;'));assert.ok(sample.includes('[PDF page 120;'));assert.ok(sample.includes('[PDF page 67;'));assert.ok(sample.length<18000);
});
test('Analysis cache separates prompt version, language, user preferences, source content and model',async()=>{
 const keys=[];const generate=async()=> 'DOCUMENT_MODE: EXPLAIN\nEvidence';const cache=async(k,run)=>{keys.push(k);return run()};const pages=[{number:1,text:'Numbers 12 and 39'}];
 await summarizeDocument({...base,pages,total:1,cache,generate});const first=keys[0];assert.ok(first.startsWith(SUMMARY_VERSION));
 for(const variant of [{language:'en'},{question:'Summarize contractual obligations'},{options:{key:'test',model:'different'}},{pages:[{number:1,text:'Numbers 12 and 40'}]}]){keys.length=0;await summarizeDocument({...base,pages,total:1,...variant,cache,generate});assert.notEqual(keys[0],first);}
});
test('Cancellation stops before another processing stage or a cached response is used',async()=>{
 const control=new AbortController();let requests=0;
 await assert.rejects(()=>summarizeDocument({...base,pages:[{number:1,text:'text'}],total:1,options:{...base.options,signal:control.signal},generate:async()=>{requests++;control.abort();return 'cancelled'}}),{name:'AbortError'});assert.equal(requests,1);
});
test('Gemini refuses to display a token-truncated analysis as a completed summary',async()=>{
 const original=globalThis.fetch;
 try{globalThis.fetch=async()=>({ok:true,json:async()=>({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'Incomplete draft'}]}}]})});await assert.rejects(()=>generateText({key:'test',model:'mock',contents:[],requireComplete:true}),/did not finish/);}finally{globalThis.fetch=original;}
});
test('Large evidence consolidation includes every reviewed group instead of truncating the beginning or end',async()=>{
 const pages=Array.from({length:8},(_,i)=>({number:i+1,text:'text '+i+' '+'x'.repeat(12000)}));let ledger=0;const groups=[];
 await summarizeDocument({...base,pages,total:8,generate:async req=>{
  if(req.system.includes('Independently reread ALL'))return `LEDGER_${++ledger} `+'e'.repeat(13000);
  if(req.system.includes('Consolidate every reviewed ledger')){groups.push(req.contents[0].parts[0].text);return 'Consolidated important evidence with original references.';}
  return 'DOCUMENT_MODE: EXPLAIN\nAnalysis or final summary';
 }});
 assert.ok(groups.length>1);for(let i=1;i<=ledger;i++)assert.ok(groups.join('\n').includes('LEDGER_'+i+' '));
});
test('Textbooks review every source page but deliver one study summary within the total word budget',async()=>{
 const pages=Array.from({length:7},(_,i)=>({number:i+1,text:'ORIGINAL_LESSON_'+(i+1)+' '+'معلومة '.repeat(1800)})),calls=[],stages=[];
 const final='مفهوم '.repeat(899)+'نهاية';
 const answer=await summarizeDocument({...base,pages,total:7,progress:s=>stages.push(s),generate:async req=>{
  calls.push(req);if(req.system.includes('FINAL factual'))return final;
  return 'DOCUMENT_MODE: STUDY\nMathematics textbook. Definitions and worked examples.';
 }});
 for(const pass of ['Build an evidence ledger','Independently reread ALL']){const all=calls.filter(c=>c.system.includes(pass)).map(c=>c.contents[0].parts[0].text).join('\n');for(const part of summaryBatches(pages,18000).flat())assert.ok(all.includes(part.text));}
 assert.equal(answer,final);assert.equal(countSummaryWords(answer),900);assert.equal(stages.filter(s=>s==='compose').length,1);assert.equal(stages.filter(s=>s==='audit').length,1);
 assert.ok(calls.find(c=>c.system.includes('Write the final summary')).system.includes('1200 words TOTAL'));
 assert.ok(STUDY_GUIDANCE.includes('Biology'));assert.ok(STUDY_GUIDANCE.includes('Languages'));assert.ok(STUDY_GUIDANCE.includes('History'));assert.ok(STUDY_GUIDANCE.includes('Religious'));
});
test('Document routing distinguishes educational content from explanatory documents and rejects missing classification',()=>{
 assert.equal(documentMode('DOCUMENT_MODE: STUDY\nPsychology textbook'),'STUDY');assert.equal(documentMode('DOCUMENT_MODE: EXPLAIN\nPartnership contract'),'EXPLAIN');assert.equal(documentMode('DOCUMENT_MODE: MIXED\nCourse and policies'),'MIXED');assert.throws(()=>documentMode('This document may be a textbook'));assert.ok(SUMMARY_VERSION!=='document-review-v2');
});

test('Summary word limits include Arabic, English and numeric tokens at the boundaries',async()=>{
 assert.equal(countSummaryWords('تعريف قانون 0.625 formula ** عنوان'),5);
 for(const n of [700,1200]){const text='كلمة '.repeat(n);assert.equal(await fitSummaryLength(text,{rewrite:()=>{throw Error('Unneeded rewrite')}}),text);}
});
test('Overlong summaries are rewritten as complete answers instead of being cut at word 1200',async()=>{
 let calls=0;const final='أساسي '.repeat(899)+'خاتمة';
 const result=await fitSummaryLength('تفصيل '.repeat(3000),{rewrite:async(text,count)=>{calls++;assert.equal(count,3000);assert.ok(text.endsWith('تفصيل '));return final}});
 assert.equal(calls,1);assert.equal(result,final);assert.equal(countSummaryWords(result),900);assert.ok(result.endsWith('خاتمة'));
});
test('A stubborn model never exposes an answer over the maximum, and retries are bounded',async()=>{
 let calls=0;await assert.rejects(()=>fitSummaryLength('كلمة '.repeat(1201),{rewrite:async()=>{calls++;return 'كلمة '.repeat(1400)}}),/1200/);assert.equal(calls,3);
});
test('Underlength book summaries are expanded from evidence; short sources need no filler',async()=>{
 const result=await fitSummaryLength('تعريف '.repeat(200),{rewrite:async()=> 'تعريف '.repeat(800)});assert.equal(countSummaryWords(result),800);
 assert.equal(await fitSummaryLength('مستند قصير',{minimum:0,rewrite:()=>{throw Error('No padding')}}),'مستند قصير');
});
