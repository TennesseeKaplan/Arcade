import {createController,movementKeys} from '../shared/player/controller.js';
import {protectControlSurface} from '../shared/player/control-surface.js';

const $=id=>document.getElementById(id);
const ctx=$('screen').getContext('2d');
const foods=['Pretzel','Cuban','Wings'];
const stations=foods.map((food,i)=>({x:60+i*66,y:96,food}));
const mic={x:405,y:104};
const tables=[
 {x:96,y:164,initial:0,shirts:['#39748e','#926493']},
 {x:310,y:161,initial:1,shirts:['#bd733e','#426b6a']},
 {x:166,y:243,initial:2,shirts:['#55805b','#94465c']},
 {x:378,y:241,initial:0,shirts:['#487491','#9a6b42']},
];
const player={x:224,y:198,face:1,moving:false};
const mobile=matchMedia('(any-pointer:coarse)');
const duration=120, interval=14, grace=6;
const called=new Set();
let active=false, elapsed=0, nextCall=interval, served=0, lost=0, late=0, timely=0, callIndex=0;
let lastBall='', bannerUntil=0, winner=null, tray=[], deck=[], feedback='', feedbackUntil=0, last=0;
let audio, notesAt=0, step=0, muted=false;
const controls=createController($('inputs'),{
 keys:{...movementKeys,Space:'interact'},joystick:true,buttons:[{action:'interact',label:'Interact',face:'A'}],
 onAction: action=>{if(action==='interact')interact();},
});
protectControlSurface($('inputs'));
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const rand=n=>Math.floor(Math.random()*n);
const ballLabel=n=>'BINGO'[Math.floor((n-1)/15)]+'-'+n;
function shuffle(list){
 for(let i=list.length-1;i>0;i--){const j=rand(i+1);[list[i],list[j]]=[list[j],list[i]];}
 return list;
}
function roundCards(){
 const balls=shuffle(Array.from({length:75},(_,i)=>i+1));
 const line=()=>Array.from({length:5},(_,column)=>column*15+1+rand(15));
 const winnerLine=line(), opening=shuffle([...winnerLine]);
 const rest=balls.filter(ball=>!winnerLine.includes(ball));
 deck=[...opening.slice(0,4),rest[0],opening[4],...rest.slice(1)];
 const eventualWinner=rand(tables.length);
 tables.forEach((table,i)=>{table.card=i===eventualWinner?winnerLine:line();});
}
function setup(){
 elapsed=0;nextCall=interval;served=0;lost=0;late=0;timely=0;callIndex=0;lastBall='';
 winner=null;tray=[];feedback='';feedbackUntil=0;bannerUntil=0;called.clear();roundCards();
 Object.assign(player,{x:224,y:198,face:1,moving:false});
 tables.forEach((table,i)=>Object.assign(table,{order:table.initial,expires:29+i*4,restock:null,flash:0}));
}
function status(message){
 feedback=message;feedbackUntil=elapsed+2.3;
}
function target(){
 const station=stations.find(spot=>distance(player,spot)<30);
 if(station)return{kind:'food',station,label:'Pick Up'};
 if(distance(player,mic)<36)return{kind:'mic',label:'Call Ball'};
 const table=tables.find(place=>distance(player,place)<47);
 if(table===winner&&table)return{kind:'win',table,label:'Verify'};
 if(table)return{kind:'table',table,label:'Serve'};
 return null;
}
function interact(){
 if(!active)return;
 const here=target();
 if(!here)return;
 if(here.kind==='food'){
  if(tray.length===2){status('Swapped the oldest plate for '+here.station.food.toLowerCase()+'.');tray.shift();}
  tray.push(foods.indexOf(here.station.food));
  fx([71,77],.09,.12);
 }else if(here.kind==='mic'){
  if(winner){status('Someone has bingo! Check their table.');return;}
  if(elapsed<nextCall){status('The next call isn’t due yet.');return;}
  const ball=deck[callIndex++];
  called.add(ball);lastBall=ballLabel(ball);bannerUntil=elapsed+3.1;
  if(elapsed<=nextCall+grace)timely++;else late++;
  nextCall=elapsed+interval;
  fx([46,58,73],.11,.19,'square');
  winner=tables.find(table=>table.card.every(number=>called.has(number)))??null;
  if(winner){status('BINGO! Check the flashing table.');fx([72,76,79,84],.19,.13);}
 }else if(here.kind==='win'){
  end(true);
 }else{
  const {table}=here;
  if(table.order===null){status('This table is all set for now.');return;}
  const found=tray.indexOf(table.order);
  if(found<0){status('This table wants '+foods[table.order].toLowerCase()+'.');fx([43],.11,.12);return;}
  tray.splice(found,1);served++;table.order=null;
  table.restock=elapsed+4+rand(5);table.flash=elapsed+1.2;
  status('Order served!');fx([67,74,79],.11,.13);
 }
 updateHud();
}
function update(dt){
 elapsed+=dt;
 const [dx,dy]=controls.movement();
 player.moving=Boolean(dx||dy);
 if(dx)player.face=Math.sign(dx);
 const mx=clamp(player.x+dx*128*dt,22,458);
 const my=clamp(player.y+dy*122*dt,93,281);
 const blocked=(x,y)=>tables.some(t=>Math.abs(x-t.x)<29&&Math.abs(y-t.y)<18);
 if(!blocked(mx,player.y))player.x=mx;
 if(!blocked(player.x,my))player.y=my;
 for(const table of tables){
  if(table.order!==null&&elapsed>=table.expires){
   lost++;table.order=null;table.restock=elapsed+4;table.flash=0;
   status('A table gave up waiting.');fx([48,44],.1,.08);
  }else if(table.order===null&&table.restock!==null&&elapsed>=table.restock){
   table.order=rand(3);table.restock=null;table.expires=elapsed+clamp(34-served*.6,21,34);
  }
 }
 if(elapsed>=duration)end(false);
}
function updateHud(){
 const remain=Math.max(0,Math.ceil(duration-elapsed));
 $('shift').textContent='Shift '+Math.floor(remain/60)+':'+String(remain%60).padStart(2,'0');
 const due=active&&!winner&&elapsed>=nextCall;
 $('call').dataset.due=String(due);
 $('call').textContent=winner?'Bingo!':!active?'Next Call —':due?'Call Ball Now':'Next Call '+Math.ceil(nextCall-elapsed)+'s';
 $('served').textContent='Served '+served;
 $('tray').textContent='Plates '+tray.length+' / 2'+(tray.length?' · '+tray.map(i=>foods[i]).join(', '):'');
 if(!active)return;
 const here=target();
 $('status').textContent=feedbackUntil>elapsed?feedback:winner?'Go to the flashing table to verify the card.':due?'Return to the mic and call the next ball.':here?here.kind==='food'?'Pick up '+here.station.food.toLowerCase()+'.':here.kind==='table'?'Deliver an order to this table.':'The mic is ready when the countdown ends.':'Pick up food at the window or deliver an order.';
}
let label='';
function syncAction(){
 const next=target()?.label??'Interact';
 if(next!==label){label=next;controls.setActionLabel('interact',next);}
}
function end(confirmed){
 active=false;
 $('touch-controls').hidden=true;$('cover').hidden=false;
 $('heading').textContent=confirmed?'Bingo Night Complete':'Closing Time';
 $('message').textContent=confirmed?
  'Winner verified! Orders served: '+served+' · On-time calls: '+timely+' · Late calls: '+late+' · Missed orders: '+lost+'.':
  'The shift ended before a winner was verified. Orders served: '+served+' · On-time calls: '+timely+'.';
 $('start').textContent='Play Again';
 $('status').textContent=confirmed?'The crowd cheers for Doctor Bingo.':'The room is closed for the night.';
 if(confirmed)fx([60,64,67,72,76,84],.32,.18);
}
$('start').addEventListener('click',()=>{
 bootAudio();setup();active=true;$('cover').hidden=true;$('touch-controls').hidden=!mobile.matches;
 $('start').blur();updateHud();fx([60,67,72],.16,.14);
});
$('sound').addEventListener('click',()=>{
 muted=!muted;$('sound').textContent=muted?'Unmute':'Mute';$('sound').setAttribute('aria-pressed',String(muted));
 if(!muted)bootAudio();
});
mobile.addEventListener('change',()=>{$('touch-controls').hidden=!active||!mobile.matches;});
function bootAudio(){
 const Audio=window.AudioContext||window.webkitAudioContext;
 if(!Audio||muted)return;
 audio??=new Audio();
 audio.resume().catch(()=>{});
}
function tone(midi,at,duration,volume,type){
 const osc=audio.createOscillator(), gain=audio.createGain(), damping=audio.createBiquadFilter();
 osc.type=type;osc.frequency.value=440*2**((midi-69)/12);
 damping.type='lowpass';damping.frequency.value=2900;
 gain.gain.setValueAtTime(.001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.013);
 gain.gain.exponentialRampToValueAtTime(.001,at+duration);
 osc.connect(damping).connect(gain).connect(audio.destination);
 osc.start(at);osc.stop(at+duration+.015);
}
function fx(notes,length,volume,type='triangle'){
 if(!audio||muted||audio.state!=='running')return;
 notes.forEach((note,i)=>tone(note,audio.currentTime+i*.08+.01,length,volume,type));
}
const saloon=[
 [60,64,67,69,67,64,63,60],[65,69,72,74,72,69,67,65],
 [60,64,67,72,69,67,64,60],[67,71,74,77,74,71,67,64],
 [60,63,64,67,69,67,64,63],[65,69,72,76,74,72,69,65],
 [60,64,67,71,69,67,64,60],[67,74,71,67,65,64,63,59],
];
function music(){
 if(!active||muted||!audio||audio.state!=='running')return;
 const now=audio.currentTime;
 if(notesAt<now)notesAt=now+.03;
 if(notesAt>now+.10)return;
 const measure=saloon[Math.floor(step/8)%8], rank=step%8;
 tone(measure[rank]+12,notesAt,.17,.045,'triangle');
 tone(measure[rank]+12.10,notesAt+.006,.115,.016,'square');
 if(rank%2===0)tone(measure[0]-18+(rank===4?7:0),notesAt,.25,.044,'triangle');
 else if(rank%4===1){tone(measure[0],notesAt,.16,.022,'triangle');tone(measure[2],notesAt,.17,.023,'triangle');}
 notesAt+=rank%2===0?.188:.145;step++;
}
function rect(x,y,w,h,color){
 ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);
}
function oval(x,y,rx,ry,color){
 ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
}
function text(value,x,y,size,color='#ffedc1',align='center'){
 ctx.font='bold '+size+'px monospace';ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(value,x,y);
}
function plate(i,x,y,scale=1){
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);
 oval(0,3,12,6,'#4f3c42');oval(0,1,11,6,'#dfdfc8');
 if(i===0){
  ctx.strokeStyle='#b56937';ctx.lineWidth=4;
  for(const side of [-1,1]){
   ctx.beginPath();ctx.ellipse(side*3,-1,4.5,3.2,side*.4,0,Math.PI*2);ctx.stroke();
  }
  rect(-4,-4,2,1,'#fff5cc');rect(3,0,1,1,'#fff5cc');
 }else if(i===1){
  rect(-8,-3,16,7,'#b57b44');rect(-7,0,14,2,'#657f51');rect(-7,1,14,2,'#b36551');
  rect(-8,-5,16,4,'#e5ba74');
  for(const stripe of [-5,0,5])rect(stripe,-5,1,4,'#926237');
 }else{
  for(const [dx,dy] of [[-5,-2],[3,-3],[1,2]]){
   oval(dx,dy,4,3,'#b65036');oval(dx-2,dy-1,1.5,1.2,'#e58d4e');
   rect(dx+2,dy,2,1,'#f5cca5');
  }
 }
 ctx.restore();
}
function sprite(x,y,shirt,skin,hair,doctor=false,moving=false){
 const stride=moving?Math.trunc(Math.sin(elapsed*18)*2):0;
 oval(x,y+1,9,4,'#37273266');
 rect(x-7,y-7,5,7+stride,'#3c4c60');rect(x+2,y-7,5,7-stride,'#3c4c60');
 rect(x-8,y-2+stride,5,2,'#2c2835');rect(x+2,y-2-stride,6,2,'#2c2835');
 rect(x-9,y-23,18,17,'#573c45');rect(x-8,y-23,16,15,shirt);
 rect(x-11,y-20,4,7,shirt);rect(x+7,y-20,4,7,shirt);
 rect(x-11,y-14,4,4,skin);rect(x+7,y-14,4,4,skin);
 rect(x-6,y-35,12,12,skin);rect(x-7,y-34,2,8,hair);rect(x+5,y-35,2,6,hair);
 rect(x-6,y-36,12,5,hair);rect(x-4,y-38,8,3,hair);rect(x-5,y-36,7,1,'#d39a63');
 rect(x-3,y-29,2,2,'#403039');rect(x+3,y-29,2,2,'#403039');
 if(doctor){
   rect(x-5,y-25,10,3,'#8b5a48');rect(x,y-25,4,1,'#fff2d2');
   rect(x-2,y-22,4,12,'#6999a6');rect(x-5,y-21,1,6,'#575766');
   rect(x+4,y-21,1,6,'#575766');rect(x-4,y-15,8,1,'#575766');
   rect(x+5,y-17,2,2,'#628354');
 }
}
function room(){
 rect(0,0,480,300,'#372c3a');
 rect(9,11,462,280,'#794c44');
 rect(13,78,454,209,'#b48462');
 for(let y=80;y<288;y+=10){
  rect(13,y,454,1,'#93694f');
  for(let x=14+((y*13)%45);x<465;x+=52){
   rect(x,y,1,10,'#956850');rect(x+6,y+3,11,1,'#bc906c');
  }
 }
 rect(11,26,457,51,'#593a39');rect(11,29,457,2,'#a17052');
 rect(11,75,457,5,'#4f343b');
 for(const x of [240,298,356]){
  rect(x,29,48,26,'#292733');rect(x+3,32,42,19,'#477495');
  rect(x+6,41,35,8,'#6299ab');rect(x+10,40,6,3,'#a8c3b4');
  rect(x+22,36,11,2,'#e3c986');
 }
 rect(23,27,194,57,'#392b32');rect(26,30,188,52,'#734740');
 rect(29,33,182,27,'#544d4c');
 for(let x=34;x<209;x+=9){rect(x,58,4,9,'#dac1a1');rect(x,58,2,3,'#7b8a8b');}
 rect(26,68,188,25,'#77483d');rect(26,67,188,9,'#d09660');rect(26,77,188,3,'#9c5b44');
 text('KITCHEN WINDOW',120,22,8);
 for(const [i,station] of stations.entries()){
  rect(station.x-26,71,52,21,'#533437');rect(station.x-25,71,50,2,'#c18a65');
  plate(i,station.x,75,.65);
  text(['PRETZEL','CUBAN','WINGS'][i],station.x,89,6);
 }
 const ready=active&&!winner&&elapsed>=nextCall;
 rect(381,64,70,22,'#503440');rect(381,61,70,6,ready?'#ffbf60':'#a86a57');
 rect(400,47,3,15,'#262730');oval(402,46,4,3,'#2c2536');
 oval(429,52,11,8,'#333136');oval(429,51,8,6,'#9d8876');
 for(let i=0;i<5;i++)rect(423+i*3,49+(i%2)*3,2,2,['#e2745c','#edd380','#79b6ad'][i%3]);
 text('BINGO MIC',415,78,7);
 if(ready){rect(382,86,68,3,'#ffd07c');text('CALL NOW',415,98,7,'#4c273a');}
 for(const x of [19,453])for(const y of [116,176,242]){
  rect(x-4,y,9,29,'#354d67');rect(x-4,y,3,28,'#56839d');
 }
 for(const x of [44,227,453]){
  rect(x,12,12,9,'#f8d48e');rect(x+2,12,8,2,'#fff1bb');
 }
 rect(19,286,442,3,'#5f3c3e');
}
function tableArt(table,i){
 const {x,y}=table;
 oval(x,y+4,31,18,'#6b423d77');
 rect(x-32,y-5,11,18,'#45657d');rect(x+21,y-5,11,18,'#45657d');
 sprite(x-30,y+8,table.shirts[0],i%2?'#b57960':'#e2aa82','#59404a');
 sprite(x+30,y+9,table.shirts[1],i%2?'#efb590':'#b87d61','#79534a');
 oval(x,y,29,15,table===winner?'#f0b65a':'#754941');
 oval(x,y-3,27,12,table===winner?'#ffc866':'#d29a6a');
 rect(x-11,y-9,21,13,'#fff0cc');
 for(let k=0;k<5;k++)rect(x-9+k*4,y-6,3,4,called.has(table.card[k])?'#b75f6f':'#b7a98e');
 rect(x+13,y-9,4,7,'#79a8ab');rect(x+13,y-9,4,2,'#c0d4c7');
 if(table===winner){
  rect(x-23,y-46,46,13,'#42283a');text('BINGO!',x,y-36,10,'#ffd37b');
 }else if(table.order!==null){
  rect(x-15,y-54,30,26,'#604345');rect(x-14,y-54,28,22,'#fff0cb');
  plate(table.order,x,y-44,.87);
  rect(x-13,y-34,26,2,'#d5ae8b');
  rect(x-13,y-34,Math.round(26*clamp((table.expires-elapsed)/24,0,1)),2,'#619777');
 }else if(table.flash>elapsed)text('✓',x,y-37,14,'#d0ffd2');
}
function draw(){
 room();
 const actors=[...tables.map((table,i)=>({y:table.y,draw:()=>tableArt(table,i)})),{
  y:player.y,draw:()=>{
   sprite(player.x,player.y,'#f4ede5','#e6ad87','#895941',true,player.moving);
   tray.forEach((food,i)=>plate(food,player.x+(i===0?-13:13),player.y-13,.70));
  },
 }];
 actors.sort((a,b)=>a.y-b.y).forEach(actor=>actor.draw());
 if(lastBall&&elapsed<bannerUntil){
  rect(205,33,66,38,'#372438');rect(207,35,62,34,'#fff0cc');
  text('CALLED',238,46,7,'#7b4f55');text(lastBall,238,62,15,'#4b3041');
 }
}
setup();
function frame(now){
 const dt=Math.min(.05,(now-(last||now))/1000);last=now;
 if(active&&!document.hidden){update(dt);updateHud();syncAction();music();}
 draw();
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
