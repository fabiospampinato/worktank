
/* COMPILED WORKER */

export default '(()=>{var i=(()=>{if(typeof postMessage=="function"){let t=globalThis;return{on:(n,r)=>{t.addEventListener(n,d=>{r(d.data)})},send:n=>{t.postMessage(n)}}}else{let t=require("worker_threads").parentPort;return{on:(n,r)=>{t.on(n,r)},send:n=>{t.postMessage(n)}}}})(),o={methods:{},exec:(e,t)=>{let n=o.methods[e],r={require:globalThis.require},d=new Promise(s=>s(n.apply(r,t))),g=s=>{try{i.send({type:"result",value:s})}catch(c){a(c)}},a=s=>{s=s instanceof Error?s:typeof s=="string"?new Error(s):new Error;let{message:c,name:u,stack:p}=s;i.send({type:"result",error:{message:c,name:u,stack:p}})};d.then(g,a)},init:e=>{o.register(e),i.send({type:"ready"})},message:e=>{if(e.type==="init")return o.init(e.methods);if(e.type==="exec")return o.exec(e.method,e.args)},register:e=>{for(let t in e){let n=new Function(`return (${e[t]})`)();o.methods[t]=n}}};i.on("message",o.message);})();';
