// Keep the native prompt until an explicit user click. No simulated installation.
export function createInstallController(host){
 let deferred=null,installed=!!host.navigator?.standalone||!!host.matchMedia?.('(display-mode: standalone)').matches;
 const listeners=new Set();const notify=()=>listeners.forEach(fn=>fn({available:!!deferred,installed}));
 host.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferred=event;notify()});
 host.addEventListener('appinstalled',()=>{installed=true;deferred=null;notify()});
 return {
  state:()=>({available:!!deferred,installed}),
  subscribe(fn){listeners.add(fn);fn({available:!!deferred,installed});return ()=>listeners.delete(fn)},
  async request(){
   if(installed)return {status:'installed'};
   if(!deferred)return {status:'unavailable'};
   const event=deferred;deferred=null;notify();
   try{await event.prompt();const choice=await event.userChoice;return {status:choice.outcome==='accepted'?'accepted':'dismissed'}}
   catch{return {status:'error'}}
  }
 };
}
