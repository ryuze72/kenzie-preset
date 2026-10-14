window.__AMPARTS=window.__AMPARTS||[];window.__AMPARTS[0]=document.currentScript&&false;
fetch('/amprem-src.html').then(r=>r.text()).then(t=>{window.__AMPARTS[0]=t;window.__AMPART_READY=(window.__AMPART_READY||0)+1;}).catch(()=>{});
