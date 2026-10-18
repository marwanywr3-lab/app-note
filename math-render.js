import {escapeHTML as esc} from './core.js';
export const KATEX_BASE='https://cdn.jsdelivr.net/npm/katex@0.19.0/dist/';
export const MATH_WRITING_RULES=String.raw`Mathematical output: write valid KaTeX-compatible LaTeX. Use \( ... \) for inline math and \[ ... \] for display math; balance delimiters, braces and environments. Preserve command backslashes exactly, including \frac{a}{b}, \sqrt{x}, \times and \div. Do not wrap formulas in backticks or Markdown code fences. Use \begin{aligned} ... \end{aligned} for multiline derivations, with \\ only between rows, never between separate ordinary sentences. Keep Arabic explanations OUTSIDE math delimiters. Use simple Latin variable symbols and define their meanings in the surrounding Arabic prose; preserve the source symbol's identity and relationships. Keep each equation self-contained; do not mix prose into arrays. Prefer readable fractions or aligned steps over long-division array art. Check mathematical equivalence, signs, numerator/denominator order, decimal digits and units before answering. If source notation is unreadable, say so rather than inventing or silently correcting a value.`;
const escaped=(s,i)=>{let n=0;while(i>0&&s[--i]==='\\')n++;return n%2===1};
const DELIMITERS=[['\\[','\\]',true],['\\(','\\)',false],['$$','$$',true],['$','$',false]];
export function splitMath(input){
 const s=String(input),out=[];let start=0,i=0;
 const pushText=end=>{if(end>start)out.push({type:'text',text:s.slice(start,end)})};
 while(i<s.length){
  const code=s.startsWith('```',i)?'```':s[i]==='`'?'`':null;
  if(code&&!escaped(s,i)){const end=s.indexOf(code,i+code.length);if(end>=0){pushText(i);out.push({type:'code',text:s.slice(i+code.length,end),block:code.length===3});i=end+code.length;start=i;continue}}
  let matched=false;
  for(const [left,right,display]of DELIMITERS){
   if(!s.startsWith(left,i)||escaped(s,i)||(left==='$'&&(s[i+1]==='$'||s[i-1]==='$')))continue;
   let end=s.indexOf(right,i+left.length);while(end>=0&&escaped(s,end))end=s.indexOf(right,end+right.length);
   if(end<0)continue;const tex=s.slice(i+left.length,end);
   if(!tex.trim()||(left==='$'&&(/\n/.test(tex)||tex!==tex.trim()||tex.length>1200)))continue;
   pushText(i);out.push({type:'math',text:tex.trim(),display});i=end+right.length;start=i;matched=true;break;
  }
  if(!matched)i++;
 }
 pushText(s.length);return out;
}
const prose=s=>esc(s).replace(/^#{1,6}\s+(.+)$/gm,'<strong class="message-heading">$1</strong>').replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>');
export function formatMathMessage(text){return splitMath(text).map(part=>part.type==='text'?prose(part.text):part.type==='code'?`<${part.block?'pre':'code'} dir="ltr">${esc(part.text)}</${part.block?'pre':'code'}>`:`<span class="math-expression ${part.display?'math-display':'math-inline'}" dir="ltr" data-tex="${esc(part.text)}" data-display="${part.display?'1':'0'}"><code>${esc(part.text)}</code></span>`).join('')}
export const mathOptions=display=>({displayMode:display,throwOnError:true,trust:false,strict:'ignore',output:'htmlAndMathml',maxExpand:500,maxSize:20,macros:{}});
let library;
function loadMath(){return library??=Promise.all([import(KATEX_BASE+'katex.mjs'),new Promise((resolve,reject)=>{let link=document.querySelector('link[data-katex]');if(link?.sheet)return resolve();if(!link){link=document.createElement('link');link.rel='stylesheet';link.href=KATEX_BASE+'katex.min.css';link.dataset.katex='true';document.head.append(link)}link.addEventListener('load',resolve,{once:true});link.addEventListener('error',()=>{link.remove();reject(Error('Math styles unavailable'))},{once:true})})]).then(([module])=>module.default).catch(e=>{library=null;throw e})}
function fallback(element,lang,unavailable){element.classList.add('math-unavailable');const details=document.createElement('details'),summary=document.createElement('summary'),code=document.createElement('code');summary.textContent=lang==='ar'?(unavailable?'تعذر تحميل عرض المعادلة؛ اضغط لعرض الصيغة':'صيغة رياضية غير سليمة؛ أعد طلب صياغتها. عرض الأصل'):(unavailable?'Math display unavailable; view formula':'Invalid math syntax; ask AI to rewrite it. View original');code.textContent=element.dataset.tex;code.dir='ltr';details.append(summary,code);element.replaceChildren(details)}
export async function renderMessageMath(root,lang='ar'){
 if(!root)return;const nodes=[...root.querySelectorAll('.math-expression:not([data-rendered])')];if(!nodes.length)return;
 let katex;try{katex=await loadMath()}catch{for(const node of nodes)if(node.isConnected)fallback(node,lang,true);return}
 for(let i=0;i<nodes.length;i++){
  const node=nodes[i];if(!node.isConnected)continue;
  try{if(node.dataset.tex.length>16000)throw Error('Expression too long');katex.render(node.dataset.tex,node,mathOptions(node.dataset.display==='1'));node.dataset.rendered='true'}catch{fallback(node,lang,false);node.dataset.rendered='error'}
  if(i%20===19)await new Promise(resolve=>setTimeout(resolve,0));
 }
}
