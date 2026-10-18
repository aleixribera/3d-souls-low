// Optional end-to-end tutorial quality tests. Requires Playwright and Edge, like performance.cjs.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2] || path.join(root,'.scratch/quality-picker-ui'));fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,d)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.webp')?'image/webp':'text/plain');res.end(d);});});

const assert=require('node:assert/strict');
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('combat-arena-3d.settings',JSON.stringify({graphics:'high'})));
 await page.goto(`http://127.0.0.1:${server.address().port}/combat-arena-3d.html#dev`);
 await page.waitForFunction(()=>window.__arenaReady&&window.__arena.tests,{timeout:120000});
 await page.evaluate(()=>{Game.manualClock=true;story.use('ashmere');Game.showMenu('storyTutorial');Game.select(0);Game.confirm();});
 assert.equal(await page.evaluate(()=>Game.screen),'tutorialQuality');
 assert.equal(await page.evaluate(()=>Game.selected),1);
 await page.locator('#menuList img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
 const cards=await page.locator('#menuList .menuBtn').evaluateAll(btns=>btns.map(b=>({caption:b.querySelector('.d').textContent,src:b.querySelector('img').getAttribute('src'),loaded:b.querySelector('img').naturalWidth>0})));
 assert.equal(await page.locator('.quality-recommended').count(),1);
 assert.ok(await page.evaluate(()=>Game.menuItems[[...document.querySelectorAll('#menuList .menuBtn')].findIndex(b=>b.querySelector('.quality-recommended'))].id===autoQuality.result().pick));
 assert.equal(cards.length,3); assert.equal(new Set(cards.map(c=>c.src)).size,3);
 for(const card of cards){assert.equal(card.caption.split(/\s+/).length,3);assert.ok(card.loaded);}
 for(const [width,height] of [[1280,720],[1920,1080],[800,600],[640,480]]){
  await page.setViewportSize({width,height});
  const boxes=await page.locator('#menuList .menuBtn').evaluateAll(btns=>btns.map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
  assert.ok(boxes[0].right<boxes[1].x&&boxes[1].right<boxes[2].x,'three cards stay side by side');
  assert.ok(boxes.every(b=>b.x>=0&&b.right<=width&&b.bottom<=height-45),'cards and guidance fit');
  await page.screenshot({path:path.join(out,`picker-${width}.png`)});
 }
 await page.setViewportSize({width:1280,height:720});
 // Real keyboard event path, including WASD and arrows, wraps all three choices.
 for(const [key,selected] of [['ArrowRight',2],['KeyD',0],['ArrowLeft',2],['KeyA',1],['ArrowUp',0],['KeyS',1]]){
  await page.keyboard.press(key);assert.equal(await page.evaluate(()=>Game.selected),selected,key);
 }
 await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>Game.screen),'storyTutorial');
 assert.equal(await page.evaluate(()=>settings.graphics),'high','back preserves the setting');
 assert.ok(await page.evaluate(()=>Game.tutorialQualityStart===null),'back discards the continuation');
 // A controller D-pad and stick use the same real menuInput path; confirm starts the tutorial.
 await page.evaluate(()=>{Game.select(0);Game.confirm();input.use('pad');gamepad.menuDir=null;gamepad.down=new Set(['PadRight']);gamepad.menuInput([],CONFIG.step);});
 assert.equal(await page.evaluate(()=>Game.selected),2);
 assert.match(await page.locator('#menuHint').textContent(),/D-pad/);
 await page.evaluate(()=>{gamepad.down.clear();gamepad.move={x:-1,y:0};gamepad.menuInput([],CONFIG.step);});
 assert.equal(await page.evaluate(()=>Game.selected),1);
 await page.evaluate(()=>{gamepad.move={x:0,y:0};gamepad.menuInput(['PadA'],CONFIG.step);gamepad.release();});
 assert.ok(await page.evaluate(()=>Game.isTutorial()&&Game.story));
 // Click each actual preset button; the choice is applied and persisted BEFORE level creation.
 for(const [index,q] of ['low','high','ultra'].entries()){
  await page.evaluate(()=>{Game.story=false;Game.chooseTutorialQuality(()=>{Game.qualityAtTutorialStart=visuals.quality();Game.startLevel('tutorial');},'tests');});
  await page.locator('#menuList .menuBtn').nth(index).click();
  assert.deepEqual(await page.evaluate(()=>({setting:settings.graphics,saved:JSON.parse(localStorage.getItem(SETTINGS_KEY)).graphics,tutorial:Game.isTutorial(),quality:Game.qualityAtTutorialStart===CONFIG.VISUALS.quality[settings.graphics]})),{setting:q,saved:q,tutorial:true,quality:true});
 }
 await page.evaluate(()=>{Game.story=false;Game.showMenu('storyJump');const item=Game.menuItems.find(i=>i.name===STORY.short+': '+story.campaigns[STORY.id].levelName(STORY.tutorial.level));item.go();});
 assert.equal(await page.evaluate(()=>Game.screen),'tutorialQuality');await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>Game.screen),'storyJump');
 // Skipping the tutorial never asks for a tutorial quality choice.
 await page.evaluate(()=>{story.use('ashmere');Game.showMenu('storyTutorial');Game.select(1);Game.confirm();});
 assert.ok(await page.evaluate(()=>Game.mode==='play'&&Game.level.id==='long-hall'&&Game.story));
 await page.evaluate(()=>{Game.story=false;Game.showMenu('main');});
 assert.equal(await page.locator('#menu.quality-choice').count(),0,'comparison styling leaves with the page');
 assert.deepEqual(errors,[]);console.log('Quality picker: story flow, 3 previews, 4 viewport sizes, keyboard, controller, clicks, saved settings, back and skip passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
