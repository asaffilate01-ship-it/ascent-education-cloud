import { chromium } from '@playwright/test';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const source = ts.transpileModule(readFileSync('src/lib/coding/isolatedRunner.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {isolatedRunner} = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined,args:['--no-sandbox']});
try {
 const page = await browser.newPage({ignoreHTTPSErrors:true});
 page.on('console', m=>console.log('browser:',m.text())); page.on('pageerror',e=>console.log('page error:',e.message));
 await page.setContent('<iframe sandbox="allow-scripts"></iframe>');
 async function run(language,code,input='') {
  const doc = isolatedRunner(language,code,input,'test-token');
  return page.evaluate(doc => new Promise((resolve,reject)=>{
   const frame=document.querySelector('iframe');
   const timeout=setTimeout(()=>{window.removeEventListener('message',listener);reject(new Error('Browser test timed out'));},100000);
   function listener(e){if(e.source!==frame.contentWindow||e.origin!=='null'||e.data?.token!=='test-token'||e.data.phase!=='done')return;
    clearTimeout(timeout);window.removeEventListener('message',listener);resolve(e.data.output);}
   window.addEventListener('message',listener);frame.srcdoc=doc;
  }),doc);
 }
 assert.match(await run('javascript','console.log([1,2,3].map(x=>x*2))'), /\[2,4,6\]/);
 assert.match(await run('javascript','console.log(parent.document.cookie)'), /Error|SecurityError|ReferenceError/);
 assert.match(await run('javascript','while(true){}'), /stopped after 10 seconds/);
 assert.match(await run('python','import statistics\nprint(statistics.mean([2,4,6]))\nprint(input().upper())','Pakistan'), /4\nPAKISTAN/);
 assert.match(await run('python','while True: pass'), /stopped after 10 seconds/);
 assert.match(await run('javascript', 'console.log("</script><script>parent.hacked=true</script>")'), /<\/script>/);
 assert.ok((await run('javascript', 'console.log("x".repeat(50000))')).length < 20500);
 assert.match(await run('python','raise ValueError("example failure")'), /ValueError: example failure/);
 console.log('PASS: JavaScript execution, origin isolation, loop termination, real Python standard library/input Python errors, Python loop termination, output limits and script-tag escaping');
} finally { await browser.close(); }
