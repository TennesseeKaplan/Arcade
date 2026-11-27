from playwright.sync_api import sync_playwright
import os
url=os.getenv('BOBBY_PREVIEW','http://127.0.0.1:8731/legend-of-bobby/preview/')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_BIN'),args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1200,'height':900})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m: print(m.type,m.text[:260]) if m.type in ('error','warning') else None)
 page.goto(url)
 page.get_by_role('button',name='Start Playtest').click()
 page.locator('#cover').wait_for(state='hidden',timeout=45000)
 assert page.get_by_role('link',name='Back to Arcade',exact=False).count()==1
 page.wait_for_function('window.bobbyState?.x===0')
 state=lambda:page.evaluate('bobbyState')
 def key_to(key,condition):
  page.keyboard.down(key)
  try: page.wait_for_function(condition,timeout=24000)
  finally: page.keyboard.up(key)
  page.wait_for_timeout(130)
 def press(key): page.keyboard.press(key)
 press('Space')
 page.wait_for_function('bobbyState.swings===1 && !bobbyState.swing')
 assert state()['hits']==0
 key_to('w','bobbyState.z < .42')
 key_to('e','bobbyState.arm<3.2')
 press('f')
 page.wait_for_function('Math.abs(bobbyState.yaw)<.12')
 key_to('d','bobbyState.x > 4.31')
 page.wait_for_function('bobbyState.talk && bobbyState.rinaDistance<1.6')
 print('Rina reached',state())
 press('r')
 page.locator('#dialogue').wait_for(state='visible')
 assert page.locator('#rina-line').inner_text()=='Ready when you are.'
 press('r')
 page.locator('#dialogue').wait_for(state='hidden')
 page.locator('summary').click()
 page.get_by_label('Edit Line',exact=True).fill('Give me a second.')
 page.get_by_role('button',name='Preview Line').click()
 page.get_by_role('button',name='Replay Dialogue').click()
 assert page.locator('#rina-line').inner_text()=='Give me a second.'
 before=state()
 page.keyboard.down('w')
 page.wait_for_timeout(280)
 page.keyboard.up('w')
 assert abs(state()['z']-before['z'])<.03
 press('r')
 page.locator('#dialogue').wait_for(state='hidden')
 key_to('w','bobbyState.z < -4.32')
 print('Strike location',state())
 press('Space')
 page.wait_for_function('bobbyState.swings===2 && !bobbyState.swing',timeout=24000)
 print('Strike end',state())
 assert state()['hits']==1
 page.get_by_role('button',name='Restart',exact=True).click()
 page.wait_for_function('bobbyState.hits===0 && bobbyState.swings===0 && bobbyState.z>5')
 assert state()['line']=='Give me a second.'
 assert not errors,errors
 print('Browser encounter passed')
