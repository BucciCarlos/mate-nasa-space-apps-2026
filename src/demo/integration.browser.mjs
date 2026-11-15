import assert from 'node:assert/strict';
import { demo } from './demoDock.helpers.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_BIN,args:['--no-sandbox']});
const base=process.env.FD30_BASE_URL || 'http://127.0.0.1:5174/';
const at=h=>Date.parse(`2027-03-10T${h}:00Z`), key='mate:fd30:imp02:v1';
const results=[];
try {
for(const locale of ['en','es']) for(const width of [1440,390]) {
 const context=await browser.newContext({viewport:{width,height:1000}}), page=await context.newPage(), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base); await page.getByRole('button',{name:locale.toUpperCase(),exact:true}).click();
 await demo(page,async()=>page.getByRole('button',{name:locale==='es'?'Pausar':'Pause',exact:true}).click());
 const saved=()=>page.evaluate(k=>JSON.parse(sessionStorage.getItem(k)),key);
 const seek=async h=>demo(page,async()=>page.getByRole('slider').evaluate((el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},at(h)));
 const unchanged=async before=>{const after=await saved();assert.equal(after.offsetMs,before.offsetMs);assert.equal(after.activeCrewId,before.activeCrewId);};
 await seek('11:44'); const before=await saved();
 await page.locator('#td-lab').click(); await page.locator('.laboratory-history').waitFor(); await unchanged(before);
 assert.equal(await page.locator('.fd-lab-sample.fd-session-highlight').count(),1);
 const bloodRow=page.locator('[data-laboratory-record="iss:sample-lf-b1"]');
 assert.doesNotMatch(await bloodRow.innerText(),/Result available|Resultado disponible/);
 await seek('11:45'); assert.match(await bloodRow.innerText(),/Result available|Resultado disponible/);
 await seek('11:44'); assert.doesNotMatch(await bloodRow.innerText(),/Result available|Resultado disponible/);
 assert.equal(await page.locator('[data-laboratory-day]').count(),7);
 await page.getByRole('button',{name:'FD01–FD30',exact:true}).click();assert.equal(await page.locator('[data-laboratory-day]').count(),30); await unchanged(before);
 for(const owner of ['iss:crew-ti','iss:crew-mo']) {
  await demo(page,async()=>page.locator('.fd-view-as select').selectOption(owner));
  assert.equal(await page.locator('[data-laboratory-record]').count(),0);assert.equal(await page.locator('[data-sample-id]').count(),0);
 }
 await demo(page,async()=>page.locator('.fd-view-as select').selectOption('iss:crew-lf'));
 // Real Today access at the received blood result, retaining its highlight over the newer urine sample object.
 await seek('11:45');await page.locator('.fd-brand').click();await page.locator('#td-lab').click();
 assert.equal(await page.locator('[data-sample-id="iss:sample-lf-b1"].fd-session-highlight').count(),1);
 const stable=await saved();
 await page.locator('.fd-nav a[href="#/onboard/personal/catalog"]').click();
 await page.locator('[data-available="fd30-crew-dynamics"] a').click();await page.locator('.crew-dynamics').waitFor();await unchanged(stable);
 assert.ok(page.url().endsWith('#/onboard/personal/m/crew'));
 assert.match(await page.locator('.crew-dynamics').innerText(),/Only FD30|solo dispone del plan de FD30/);
 const dinnerText=await page.locator('[data-crew-owner]').evaluateAll(rows=>rows.filter(row=>{const interval=row.querySelectorAll('td')[0].textContent;const [a,b]=interval.split('–').map(v=>{const [h,m]=v.split(':').map(Number);return h*60+m;});return a<=18*60+30 && b>18*60+30;}).map(row=>row.innerText));
 assert.equal(dinnerText.length,3);for(const text of dinnerText){assert.match(text,/Scheduled at the same time|Programados al mismo tiempo/);assert.doesNotMatch(text,/Shared activity|Actividad compartida/);}
 assert.match(await page.locator('.crew-dynamics tbody').allInnerTexts().then(x=>x.join('\n')),/Planned rest|Descanso planificado/);
 await page.getByRole('button',{name:'FD01–FD30',exact:true}).click();assert.equal(await page.locator('[data-crew-day]').count(),30);
 assert.match(await page.locator('[data-crew-day="1"]').textContent(),/No plan available|Sin plan disponible/);await unchanged(stable);
 await page.getByRole('button',{name:locale==='es'?'Últimos 7 días':'Last 7 days',exact:true}).click();assert.equal(await page.locator('[data-crew-day]').count(),7);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(process.env.INT_SCREENSHOTS) await page.screenshot({path:`${process.env.INT_SCREENSHOTS}/${locale}-${width}.png`});
 await demo(page,async()=>page.locator('.fd-perspective-switch').click());await page.locator('.ops-role select').waitFor();
 let opsText;
 for(const role of ['mission_operator','medical_professional']) {
  await page.locator('.ops-role select').selectOption(role);
  await page.locator('.fd-nav a[href="#/demo/fd30/ground/catalog"]').click();
  await page.locator('[data-available="fd30-crew-dynamics"] a').click();await page.locator('.crew-dynamics').waitFor();
  assert.ok(page.url().endsWith('#/demo/fd30/ground/m/crew'));await unchanged(stable);
  const text=await page.locator('.crew-dynamics').innerText();if(opsText)assert.equal(text,opsText);else opsText=text;
  assert.equal(await page.locator('.laboratory-history,.fd-chat').count(),0);
  await page.locator('.fd-brand').click();await page.locator('.ops-role select').waitFor();
 }
 await demo(page,async()=>page.locator('.fd-perspective-switch').click());await page.locator('.crew-dynamics').waitFor();await unchanged(stable);
 assert.deepEqual(errors,[]);results.push({locale,width,laboratory:true,highlight:true,crew:true,roles:true,clockAndOwner:true});await context.close();
}
} finally {await browser.close();}
console.log(JSON.stringify(results,null,2));
