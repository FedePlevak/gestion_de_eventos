const fs = require('fs');
const path = require('path');
const {pathToFileURL} = require('url');
const {chromium} = require('C:/Users/FedeP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async()=>{
  const root=path.resolve(__dirname,'../..');
  const out=path.join(root,'output/pdf');
  const tmp=path.join(root,'tmp/brand-qa');
  fs.mkdirSync(out,{recursive:true});fs.mkdirSync(tmp,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page=await browser.newPage({viewport:{width:1360,height:1000},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,'rondia-dossier.html')).href);
  await page.screenshot({path:path.join(tmp,'desktop.png'),fullPage:false});
  await page.locator('#brand-board').screenshot({path:path.join(__dirname,'lamina-de-marca.png')});
  const qa={viewport_checks:[],interactions:[],console_errors:errors};
  for(const width of [1360,1024,736,360,320]){
    await page.setViewportSize({width,height:1000});
    const info=await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth,images:[...document.images].every(i=>i.complete&&i.naturalWidth>0)}));
    qa.viewport_checks.push(info);
    if(info.overflow||!info.images)throw Error('Invalid layout '+JSON.stringify(info));
    if(width===360){await page.locator('#family-app').screenshot({path:path.join(tmp,'mobile.png')});}
  }
  await page.getByRole('button',{name:'Responder',exact:true}).click();
  await page.getByLabel('Sí, vamos',{exact:true}).check();
  await page.getByRole('button',{name:'Guardar respuesta de ejemplo'}).click();
  const family=await page.locator('#family-pending').textContent();
  if(!family.includes('pago sigue esperando verificación'))throw Error('Payment semantics lost');
  qa.interactions.push({action:'Guardar respuesta familiar',pass:true,paymentStillUnverified:true});
  await page.getByRole('button',{name:'Ver un pago de ejemplo'}).click();
  await page.getByRole('button',{name:'Simular recepción verificada'}).click();
  const verified=await page.locator('#verified-money').textContent();
  const reported=await page.locator('#reported-money').textContent();
  if(verified!=='UYU 142.500'||reported!=='UYU 17.500')throw Error('Incorrect totals');
  qa.interactions.push({action:'Simular verificación administrativa',pass:true,verified,reported});
  await page.reload();
  await page.setViewportSize({width:1360,height:1000});
  await page.pdf({path:path.join(out,'rondia-brief-e-identidad.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="font-family:Arial;font-size:9px;width:100%;margin:0 15mm;color:#52645D;display:flex;justify-content:space-between"><span>RONDIA · PROPUESTA DE NEGOCIO E IDENTIDAD · 13/09/2026</span><span class="pageNumber"></span></div>'});
  for(const [src,dest,width,height] of [['app-icon.svg','app-icon-512.png',512,512],['favicon.svg','favicon-32.png',32,32],['pieza-social.svg','pieza-social.png',1200,630]]){
    await page.setViewportSize({width,height});
    const svg=fs.readFileSync(path.join(__dirname,src),'utf8');
    await page.setContent('<style>html,body{margin:0;width:100%;height:100%;background:transparent}svg{display:block;width:100%;height:100%}</style>'+svg);
    await page.screenshot({path:path.join(__dirname,dest),omitBackground:true});
  }
  fs.writeFileSync(path.join(__dirname,'verificacion.json'),JSON.stringify(qa,null,2));
  await browser.close();
  console.log(JSON.stringify(qa));
})().catch(e=>{console.error(e);process.exitCode=1});
