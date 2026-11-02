// CSS viewport mode also works where element Fullscreen API is unavailable (iPhone).
export function createPdfFullscreen(doc=document){
 let panel=null,noteId=null,previousFocus=null,native=false;
 function apply(){doc.body.classList.toggle('pdf-is-fullscreen',!!panel);if(!panel)return;panel.classList.add('pdf-fullscreen');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','PDF')}
 function exit(){const old=panel;panel=null;noteId=null;native=false;old?.classList.remove('pdf-fullscreen');old?.removeAttribute('role');old?.removeAttribute('aria-modal');old?.removeAttribute('aria-label');doc.body.classList.remove('pdf-is-fullscreen');if(doc.fullscreenElement===old)doc.exitFullscreen?.().catch(()=>{});if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});previousFocus=null}
 function enter(element,id){if(!element)return;previousFocus=doc.activeElement;panel=element;noteId=id;apply();element.querySelector('[data-action="pdf-fullscreen-exit"]')?.focus({preventScroll:true});if(element.requestFullscreen&&doc.fullscreenEnabled)element.requestFullscreen().catch(()=>{})}
 function restore(element,id){if(!noteId)return;if(!element||id!==noteId){exit();return}panel=element;apply()}
 doc.addEventListener('fullscreenchange',()=>{if(panel&&doc.fullscreenElement===panel)native=true;else if(native)exit()});
 doc.addEventListener('keydown',e=>{if(!panel)return;if(e.key==='Escape'){e.preventDefault();exit();return}if(e.key!=='Tab')return;const controls=[...panel.querySelectorAll('button,input,select,textarea,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);if(!controls.length)return;const first=controls[0],last=controls.at(-1);if(e.shiftKey&&doc.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&doc.activeElement===last){e.preventDefault();first.focus()}});
 return{enter,exit,restore,get active(){return !!noteId}};
}
