import {createController,movementKeys} from '../shared/player/controller.js';
import {protectControlSurface} from '../shared/player/control-surface.js';

const $=id=>document.getElementById(id);
const screen=$('screen');
const ctx=screen.getContext('2d');
ctx.scale(screen.width/480,screen.height/300);
const preview=new URLSearchParams(location.search).get('preview')==='cutscenes';
const foods=['Pretzel','Cuban','Wings'];
const stations=foods.map((food,i)=>({x:60+i*66,y:96,food}));
const mic={x:405,y:104};
const tap={x:279,y:103};
const seats=[
 [81,157,0,'#39748e','#926493'],[294,157,1,'#bd733e','#426b6a'],
 [188,239,2,'#55805b','#94465c'],[401,239,0,'#487491','#9a6b42'],
 [188,157,1,'#906482','#79996e'],[81,239,2,'#4b7c94','#b87561'],
 [401,157,0,'#8c6a42','#9c536a'],[294,239,1,'#558b7e','#776093'],
];
let tables=[];
const player={x:224,y:198,face:1,moving:false};
const mobile=matchMedia('(any-pointer:coarse)');
const duration=60, weeks=5, missLimit=3;
const interval=()=>4.05-week*.12;
const houseDelay=1.5;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const called=new Set();
let active=false, elapsed=0, nextCall=0, served=0, lost=0, late=0, timely=0, callIndex=0;
let week=1, energy=100, campaignPerfect=true, totalServed=0, halfway=false, advanced=false, campaignComplete=false, cut=null;
let guide='', guideAt=0, lastContext='';
let lastBall='', calledByHouse=false, bingoAt=0, bannerUntil=0, winner=null, tray=[], deck=[], feedback='', feedbackUntil=0, last=0;
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
 const winAt=11+Math.floor(week/2);
 const openings=new Map([[0,opening[0]],[3,opening[1]],[6,opening[2]],[8,opening[3]],[winAt,opening[4]]]);
 deck=Array.from({length:75},(_,i)=>openings.has(i)?openings.get(i):rest.shift());
 const eventualWinner=rand(tables.length);
 tables.forEach((table,i)=>{
  table.card=i===eventualWinner?winnerLine:line();
  if(i!==eventualWinner){
   const later=deck[winAt+6],column=Math.floor((later-1)/15);
   table.card[column]=later;
  }
 });
}
function setup(){
 elapsed=0;nextCall=interval();served=0;lost=0;late=0;timely=0;callIndex=0;lastBall='';
 winner=null;tray=[];feedback='';feedbackUntil=0;bannerUntil=0;called.clear();
 energy=100;halfway=false;cut=null;guide='Load two plates at the kitchen window.';guideAt=0;lastContext='';
 tables=seats.slice(0,3+week).map(([x,y,initial,a,b],i)=>({
  x,y,initial,shirts:[a,b],order:i<3?initial:null,expires:25+i*3-week*.65,
  restock:i<3?null:5+(i-2)*4,flash:0,
 }));
 roundCards();
 Object.assign(player,{x:224,y:198,face:1,moving:false});
}
function status(message){
 feedback=message;feedbackUntil=elapsed+3.8;
}
function cutTo(kind, detail=null, after=null){
 cut={kind, detail, after, at:performance.now(), seconds:{miss:3.4,refill:1.64,nice:2.05,mario:3.5,king:5}[kind]};
 $('touch-controls').hidden=true;
 fx(kind==='miss'?[52,44]:kind==='nice'?[68,76,84]:[60,67,72,79],.2,.13);
}
function finishCut(){
 const action=cut.after;
 cut=null;
 $('touch-controls').hidden=!active||!mobile.matches;
 action?.();
}

function target(){
 const station=stations.find(spot=>distance(player,spot)<30);
 if(station)return{kind:'food',station,label:'Pick Up'};
 if(distance(player,tap)<29)return{kind:'tap',label:'Refill'};
 if(distance(player,mic)<36)return{kind:'mic',label:'Call Ball'};
 const closest=tables.reduce((best,place)=>distance(player,place)<distance(player,best)?place:best);
 const table=distance(player,closest)<47?closest:null;
 if(table===winner&&table)return{kind:'win',table,label:'Verify'};
 if(table)return{kind:'table',table,label:'Serve'};
 return null;
}
function interact(){
 if(!active||cut)return;
 const here=target();
 if(!here)return;
 if(here.kind==='food'){
  if(tray.length===2){status('Swapped the oldest plate for '+here.station.food.toLowerCase()+'.');tray.shift();}
  tray.push(foods.indexOf(here.station.food));
  fx([71,77],.09,.12);
 }else if(here.kind==='tap'){
  if(Math.round(energy)===100){status('Energy is already full.');updateHud();return;}
  cutTo('refill',null,()=>{
   energy=Math.min(100,energy+65);
   status('Energy Refilled');
   fx([48,55,63],.13,.14);
   updateHud();
  });
 }else if(here.kind==='mic'){
  if(winner){status('Someone has bingo! Check their table.');return;}
  if(elapsed<nextCall-1){status('The next call isn’t due yet.');return;}
  callBall(false);
 }else if(here.kind==='win'){
  finishShift();
 }else{
  const {table}=here;
  if(table.order===null){status('This table is all set for now.');return;}
  const found=tray.indexOf(table.order);
  if(found<0){status('This table wants '+foods[table.order].toLowerCase()+'.');fx([43],.11,.12);return;}
  tray.splice(found,1);served++;table.order=null;
  table.restock=elapsed+14+rand(6);table.flash=elapsed+1.2;
  status('Order served!');fx([67,74,79],.11,.13);
 }
 updateHud();
}
function callBall(byHouse){
 const ball=deck[callIndex++];
 called.add(ball);
 lastBall=ballLabel(ball);
 calledByHouse=byHouse;
 bannerUntil=elapsed+3.1;
 if(byHouse)late++;else timely++;
 nextCall+=interval();
 fx([46,58,73],.11,.19,'square');
 winner=tables.find(table=>table.card.every(number=>called.has(number)))??null;
 if(winner){
  bingoAt=performance.now();
  status('BINGO! Check the flashing table.');
  fx([60,67,72,76,79,84,88,96],.095,.17);
 }
}
function update(dt){
 if(!winner)elapsed=Math.min(duration,elapsed+dt);
 const [dx,dy]=controls.movement();
 player.moving=Boolean(dx||dy);
 if(dx)player.face=Math.sign(dx);
 const pace=.56+.44*(energy/100)**.3;
 energy=Math.max(0,energy-dt*(player.moving?2.35:.35));
 const mx=clamp(player.x+dx*128*dt*pace,22,458);
 const my=clamp(player.y+dy*122*dt*pace,93,281);
 const blocked=(x,y)=>tables.some(t=>Math.abs(x-t.x)<29&&Math.abs(y-t.y)<18);
 if(!blocked(mx,player.y))player.x=mx;
 if(!blocked(player.x,my))player.y=my;
 if(winner)return;
 if(elapsed>=nextCall+houseDelay)callBall(true);
 if(winner)return;
 for(const table of tables){
  if(table.order!==null&&elapsed>=table.expires){
   const order=table.order;
   lost++;table.order=null;table.restock=elapsed+7;table.flash=0;
   status('Missed Order · '+lost+' / '+missLimit);
   cutTo('miss',{table,order},lost>=missLimit?()=>end(false,'Three Missed Orders'):null);
   return;
  }else if(table.order===null&&table.restock!==null&&elapsed>=table.restock){
   table.order=rand(3);table.restock=null;table.expires=elapsed+clamp(31-week*.85-served*.14,23,30);
  }
 }
 if(!halfway&&elapsed>=duration/2){
  halfway=true;
  cutTo('nice');return;
 }

}
function updateHud(){
 const remain=Math.max(0,Math.ceil(duration-elapsed));
 $('shift').textContent='Shift '+Math.floor(remain/60)+':'+String(remain%60).padStart(2,'0');
 const due=active&&!winner&&elapsed>=nextCall-1;
 $('call').dataset.due=String(due);
 $('call').textContent=winner?'Bingo!':!active?'Next Call —':due?'Call Ball Now':'Next Call '+Math.ceil(nextCall-elapsed)+'s';
 $('served').textContent='Served '+served;
 $('week').textContent='Wednesday '+week+' / '+weeks;
 $('missed').textContent='Misses '+lost+' / '+missLimit;
 const energyValue=Math.round(energy);
 const lowEnergy=energyValue<50;
 const energyBlock=$('energy-block');
 if(energyBlock.dataset.low!==String(lowEnergy))energyBlock.dataset.low=String(lowEnergy);
 $('energy').value=energyValue;
 $('energy-value').textContent=energyValue+'%';
 $('tray').textContent='Plates '+tray.length+' / 2'+(tray.length?' · '+tray.map(i=>foods[i]).join(', '):'');
 if(!active)return;
 const here=target();
 const context=winner?'Verify the winning card at the flashing table.':due?'Call the next ball at the mic.':lowEnergy?'Low energy. Take a beer break at the tap.':
   here?.kind==='food'?'Pick Up '+here.station.food:here?.kind==='table'?'Serve the Table':here?.kind==='tap'?'Refill Energy':
   'Serve orders and keep an eye on the next call.';
 const urgent=winner||due;
 if(context!==lastContext&&(elapsed>=guideAt||urgent)){
  guide=context;lastContext=context;guideAt=elapsed+2.7;
 }
 const line=feedbackUntil>elapsed&&!urgent?feedback:guide;
 if($('status').textContent!==line)$('status').textContent=line;
}
let label='';
function syncAction(){
 const next=target()?.label??'Interact';
 if(next!==label){label=next;controls.setActionLabel('interact',next);}
}
function finishShift(){
 campaignPerfect&&=lost===0&&late===0;
 totalServed+=served;
 if(week<weeks){end(true,'Wednesday '+week+' Complete');return;}
 const crown=()=>cutTo('king',null,()=>end(true,'King Bingo'));
 if(campaignPerfect)cutTo('mario',null,crown);
 else crown();
}
function end(confirmed,title){
 active=false;
 advanced=confirmed&&week<weeks;
 campaignComplete=confirmed&&week===weeks;
 if(!confirmed)campaignPerfect=false;
 $('touch-controls').hidden=true;$('cover').hidden=false;
 $('heading').textContent=title;
 $('message').textContent=confirmed
  ? week===weeks?'Five Wednesdays complete. Orders served: '+totalServed+'.'
    :'Winner verified. Orders served: '+served+' · On-time calls: '+timely+' · Missed orders: '+lost+'.'
  : 'Orders served: '+served+' · On-time calls: '+timely+'.';
 $('start').textContent=advanced?'Next Wednesday':campaignComplete?'Play Again':'Retry Wednesday';
 $('status').textContent=confirmed?'The crowd cheers for Doctor Bingo.':'The room is closed for the night.';
 if(confirmed)fx([60,64,67,72,76,84],.32,.18);
}
$('start').addEventListener('click',()=>{
 bootAudio();
 if(preview){playCutsceneReel();return;}
 if(advanced)week++;
 else if(campaignComplete){week=1;campaignPerfect=true;totalServed=0;}
 campaignComplete=false;
 advanced=false;setup();active=true;$('cover').hidden=true;$('touch-controls').hidden=!mobile.matches;
 $('how-to').open=false;
 $('start').blur();updateHud();fx([60,67,72],.16,.14);
});
$('sound').addEventListener('click',()=>{
 muted=!muted;$('sound').textContent=muted?'Unmute':'Mute';$('sound').setAttribute('aria-pressed',String(muted));
 if(!muted)bootAudio();
});
mobile.addEventListener('change',()=>{$('touch-controls').hidden=!active||Boolean(cut)||!mobile.matches;});
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
 ctx.font='700 '+size+'px system-ui, sans-serif';ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(value,x,y);
}
function ink(points,color){
 ctx.fillStyle=color;ctx.beginPath();
 points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
 ctx.closePath();ctx.fill();
}
function plate(i,x,y,scale=1){
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);
 oval(0,4,17,8,'#58464f');oval(0,2,17,8,'#f5e7c9');oval(0,2,13,6,'#dad6bd');
 if(i===0){
  ctx.lineCap='round';ctx.lineJoin='round';
  const shape=new Path2D('M -9 3 C -19 -12 -7 -15 0 -7 C 7 -15 19 -12 9 3 C 3 7 -3 7 -9 3 M -9 3 L 5 -9 M 9 3 L -5 -9');
  for(const [width,color] of [[5.5,'#673320'],[3.9,'#c97435']]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke(shape);}
  for(const [dx,dy] of [[-11,-8],[-8,-10],[-4,-4],[3,-1],[9,-8],[7,3],[-4,4]])rect(dx,dy,1.5,1.5,'#f9e8bc');
 }else if(i===1){
  ink([[-14,-4],[9,-9],[15,-4],[14,4],[-9,8],[-14,3]],'#895136');
  ink([[-13,0],[12,-3],[14,0],[-10,6]],'#5a8148');
  ink([[-13,-2],[13,-5],[13,-1],[-11,3]],'#f7bf76');
  ink([[-14,-4],[-10,-8],[10,-10],[15,-5],[9,-2],[-10,2]],'#edbb74');
  for(let j=0;j<4;j++)ink([[-8+j*5,-7],[-6+j*5,-7],[-9+j*5,-1],[-11+j*5,-1]],'#915838');
 }else{
  for(const [dx,dy,angle] of [[-7,-2,-.64],[6,-4,.47],[2,4,-.56]]){
   ctx.save();ctx.translate(dx,dy);ctx.rotate(angle);
   rect(1,-1,7,2,'#f4dab4');oval(8,-1,1.8,1.7,'#f4dab4');oval(7,1,1.8,1.7,'#f4dab4');
   ink([[-7,1],[-8,-3],[-5,-6],[0,-5],[4,-2],[4,1],[1,4],[-5,4]],'#743529');
   ink([[-6,-1],[-5,-5],[-1,-5],[2,-3],[2,1],[-2,3],[-5,2]],'#c9532e');
   rect(-5,-4,3,1,'#f38d4e');rect(-3,-2,4,1,'#e27743');
   ctx.restore();
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
 text('Kitchen Window',120,23,10);
 for(const [i,station] of stations.entries()){
  rect(station.x-26,71,52,21,'#533437');rect(station.x-25,71,50,2,'#c18a65');
  plate(i,station.x,75,.57);
  text(foods[i],station.x,89,8);
 }
 const ready=active&&!winner&&elapsed>=nextCall-1;
 rect(381,64,70,22,'#503440');rect(381,61,70,6,ready?'#ffbf60':'#a86a57');
 rect(400,47,3,15,'#262730');oval(402,46,4,3,'#2c2536');
 oval(429,52,11,8,'#333136');oval(429,51,8,6,'#9d8876');
 for(let i=0;i<5;i++)rect(423+i*3,49+(i%2)*3,2,2,['#e2745c','#edd380','#79b6ad'][i%3]);
 text('Bingo Mic',415,79,9);
 rect(246,65,66,26,'#573a40');rect(246,64,66,5,'#b78259');
 mug(279,71,.45);
 text('Beer Tap',279,86,9);
 if(ready){rect(382,86,68,3,'#ffd07c');text('Call Now',415,100,8,'#4c273a');}
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
 const jumping=table===winner&&!reducedMotion.matches;
 const bounce=jumping?Math.abs(Math.sin(performance.now()/150))*10:0;
 oval(x,y+4,31,18,'#6b423d77');
 rect(x-32,y-5,11,18,'#45657d');rect(x+21,y-5,11,18,'#45657d');
 sprite(x-30,y+8-bounce,table.shirts[0],i%2?'#b57960':'#e2aa82','#59404a');
 sprite(x+30,y+9-bounce*.8,table.shirts[1],i%2?'#efb590':'#b87d61','#79534a');
 oval(x,y,29,15,table===winner?'#f0b65a':'#754941');
 oval(x,y-3,27,12,table===winner?'#ffc866':'#d29a6a');
 rect(x-11,y-9,21,13,'#fff0cc');
 for(let k=0;k<5;k++)rect(x-9+k*4,y-6,3,4,called.has(table.card[k])?'#b75f6f':'#b7a98e');
 rect(x+13,y-9,4,7,'#79a8ab');rect(x+13,y-9,4,2,'#c0d4c7');
 if(table===winner){
  text('VERIFY HERE',x,y-30,10,'#fff0bd');
 }else if(table.order!==null){
  rect(x-21,y-62,42,31,'#604345');rect(x-20,y-61,40,27,'#fff0cb');
  plate(table.order,x,y-48,1.04);
  rect(x-18,y-37,36,2,'#d5ae8b');
  const remain=table.expires-elapsed;
  rect(x-18,y-37,Math.round(36*clamp(remain/30,0,1)),2,remain<8?'#b2494a':'#619777');
 }else if(table.flash>elapsed)text('✓',x,y-37,14,'#d0ffd2');
}
function draw(){
 room();
 const actors=[...tables.map((table,i)=>({y:table.y,draw:()=>tableArt(table,i)})),{
  y:player.y,draw:()=>{
   sprite(player.x,player.y,'#f4ede5','#e6ad87','#895941',true,player.moving);
   tray.forEach((food,i)=>plate(food,player.x+(i===0?-15:15),player.y-13,.64));
  },
 }];
 actors.sort((a,b)=>a.y-b.y).forEach(actor=>actor.draw());
 if(winner){
  bingoCelebration();
 }else if(lastBall&&elapsed<bannerUntil){
  rect(205,33,66,38,'#372438');rect(207,35,62,34,'#fff0cc');
  text(calledByHouse?'House Call':'Called',238,46,9,'#7b4f55');text(lastBall,238,62,15,'#4b3041');
 }
}
function bingoCelebration(){
 const age=(performance.now()-bingoAt)/1000;
 const motion=!reducedMotion.matches;
 const beat=motion?(1+Math.sin(age*8))/2:.55;
 const colors=['#ffc76b','#ff87bc','#75e6cf','#a6b5ff'];
 const {x,y}=winner;
 ctx.save();
 ctx.globalAlpha=.22+beat*.16;
 ink([[x-14,14],[x+14,14],[x+57,y+17],[x-57,y+17]],'#ffd183');
 ctx.restore();
 for(let i=0;i<24;i++){
  const angle=i*Math.PI/12+(motion?age*.65:0);
  const radius=42+(i%3)*8;
  rect(x+Math.cos(angle)*radius,y-14+Math.sin(angle)*radius*.52,3,4,colors[i%4]);
 }
 const top=age<2.6?29:12;
 const size=age<2.6?43:25;
 rect(158,top,164,size+14,'#392037');
 for(let i=0;i<14;i++){
  const color=colors[(i+Math.floor(beat*3))%4];
  oval(164+i*11.5,top+4,2,2,color);
  oval(164+i*11.5,top+size+10,2,2,color);
 }
 text('BINGO!',240,top+size+3,size,beat>.5?'#fff0b2':'#ffc46e');
}
function mug(x,y,scale=1){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 rect(8,-7,10,13,'#eadfc5');rect(10,-5,5,8,'#6e4646');
 ink([[-13,-11],[12,-11],[9,16],[-10,16]],'#fff4d2');
 ink([[-11,-7],[10,-7],[7,13],[-8,13]],'#d9923f');
 rect(-7,-3,2,13,'#fff2ac');rect(2,-6,2,4,'#fee19d');
 oval(0,-10,12,4,'#fff3d5');
 ctx.restore();
}
function portrait(x,y,kind,options={}){
 const isDoc=kind==='doc', mario=kind==='mario', angry=kind==='customer';
 const skin=mario?'#c68762':angry?'#e49376':'#e9ad81';
 const light=mario?'#e4aa7d':angry?'#ffc0a1':'#ffc79b';
 const shade=mario?'#a6604e':angry?'#b85b59':'#c37f64';
 const hair=mario?'#59505a':isDoc?'#81533e':'#5d384a';
 const clothes=isDoc?'#e9ddd3':mario?'#697e6d':options.shirt??'#a86476';
 ctx.save();ctx.translate(x,y);ctx.scale(options.scale??1,options.scale??1);
 ink([[-87,76],[-81,44],[-52,23],[-31,14],[31,14],[58,26],[82,45],[89,76]],'#392d3d');
 ink([[-80,72],[-75,47],[-49,29],[-22,22],[21,22],[55,30],[77,48],[82,72]],clothes);
 ink([[-72,47],[-43,30],[-28,29],[-40,66],[-77,71]],isDoc?'#fff1de':clothes);
 if(isDoc){
  ink([[-29,23],[0,46],[29,23],[17,75],[-15,75]],'#547d91');
  ink([[-36,25],[-9,51],[-29,47],[-18,72],[-47,47]],'#c9b6b5');
  ink([[36,25],[9,51],[29,47],[18,72],[47,47]],'#c9b6b5');
  ctx.lineWidth=3;ctx.strokeStyle='#5b545f';ctx.beginPath();ctx.moveTo(-36,33);ctx.quadraticCurveTo(-31,64,-19,58);ctx.stroke();
 }
 if(mario)ink([[-43,-49],[-54,-15],[-47,36],[-24,43],[32,43],[48,35],[53,-21],[43,-50]],hair);
 ink([[-42,-52],[-20,-61],[22,-59],[44,-44],[48,-10],[39,16],[20,34],[-14,35],[-38,19],[-48,-16]],'#49323c');
 ink([[-40,-43],[-21,-53],[20,-54],[39,-39],[43,-12],[35,14],[16,29],[-12,29],[-34,15],[-42,-13]],skin);
 ink([[-30,-41],[-14,-49],[18,-47],[31,-37],[34,-11],[25,13],[10,21],[-13,21],[-29,13],[-34,-15]],light);
 ink([[19,-42],[34,-37],[40,-15],[34,11],[23,22],[17,16],[24,-8]],shade);
 oval(-42,-13,7,11,shade);oval(42,-13,6,10,shade);
 rect(-43,-17,3,8,skin);rect(42,-17,3,8,skin);
 ink([[-44,-31],[-44,-49],[-27,-61],[-11,-59],[6,-64],[27,-58],[43,-46],[46,-32],[34,-31],[23,-47],[-12,-45],[-24,-37],[-37,-40]],hair);
 ink([[-36,-50],[-20,-54],[-4,-53],[15,-57],[24,-53],[6,-49],[-17,-47]],mario?'#9f9799':'#aa7754');
 if(mario){rect(-42,-38,4,57,'#94888c');rect(37,-36,4,54,'#a49a9d');}
 if(angry){
  ink([[-29,-30],[-8,-24],[-9,-19],[-28,-25]],hair);
  ink([[8,-24],[28,-30],[29,-25],[9,-19]],hair);
 }else{
  rect(-28,-28,18,3,hair);rect(10,-28,17,3,hair);
 }
 rect(-27,-19,16,6,'#fff0d7');rect(11,-19,16,6,'#fff0d7');
 rect(-19,-20,5,8,'#514054');rect(15,-20,5,8,'#514054');
 ink([[-1,-20],[-6,-4],[0,1],[8,-3],[6,-7],[1,-6]],shade);
 rect(-1,-9,4,3,'#f7bf95');
 if(isDoc||mario){
  ink([[-26,5],[-18,10],[-8,8],[7,8],[18,9],[26,4],[22,21],[11,28],[-12,28],[-22,21]],mario?'#66515a':'#98654b');
  if(mario)rect(-3,18,7,9,'#aea2a2');
 }
 if(options.grin){
  ink([[-20,3],[-10,7],[10,7],[21,2],[17,18],[0,23],[-16,17]],'#693442');
  ink([[-17,6],[-9,9],[10,9],[18,5],[15,13],[-14,13]],'#fff4dc');
  for(const i of [-9,-3,3,9])rect(i,9,1,4,'#d2a59c');
 }else if(angry){
  oval(0,13,16,11,'#6e2e41');rect(-10,5,20,4,'#ffe6cd');
 }else{
  ink([[-10,9],[6,11],[13,6],[12,14],[-8,14]],'#773c44');
 }
 if(options.glasses){
  ctx.save();ctx.translate(0,options.glassesY??0);
  ink([[-32,-24],[-5,-24],[0,-20],[5,-24],[32,-24],[28,-10],[8,-10],[0,-15],[-8,-10],[-28,-10]],'#242638');
  ink([[-27,-21],[-15,-21],[-23,-14],[-28,-14]],'#afa7ae');
  ink([[10,-21],[22,-21],[15,-14],[10,-14]],'#afa7ae');
  ctx.restore();
 }
 if(options.sweat){
  const drip=options.sweat;
  ink([[34,-26+drip],[40,-14+drip],[37,-10+drip],[32,-15+drip]],'#aee3ed');
 }
 ctx.restore();
}
function drawGulp(age){
 const lift=clamp(age/.48,0,1);
 const lower=clamp((age-1.06)/.48,0,1);
 const hold=Math.sin((lift-lower)*Math.PI/2);
 const tilt=-.53*hold;
 const x=290-41*hold,y=208-45*hold;
 const gripX=x+14*Math.cos(tilt)+3*Math.sin(tilt);
 const gripY=y+14*Math.sin(tilt)-3*Math.cos(tilt);
 ctx.save();
 ctx.lineCap='round';ctx.lineJoin='round';
 for(const [width,color] of [[19,'#705467'],[15,'#f3e4d5']]){
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();
  ctx.moveTo(304,190);ctx.quadraticCurveTo(326,218,gripX,gripY);ctx.stroke();
 }
 oval(gripX,gripY,8,7,'#d08b71');
 ctx.translate(x,y);ctx.rotate(tilt);
 mug(0,0,1);
 oval(14,-3,5.5,6,'#e6a983');
 rect(12,-7,3,2,'#f5b992');rect(13,-3,4,1,'#cd896d');
 ctx.restore();
}
function caption(who,line){
 rect(0,231,480,69,'#251b29');rect(0,231,480,2,'#c48a62');
 text(who,22,252,11,'#e6a577','left');text(line,22,276,16,'#fff0d9','left');
}
function drawCloseup(now){
 const age=(now-cut.at)/1000;
 const zoom=.95+Math.min(.12,age*.18);
 rect(0,0,480,300,cut.kind==='miss'?'#744753':'#564052');
 for(let i=0;i<12;i++)rect(0,i*20,480,1,cut.kind==='miss'?'#99606a':'#765366');
 if(cut.kind==='miss'){
  if(age<1.65){
   const closed=Math.floor(age*14)%3===0;
   portrait(240,143+(closed?2:0),'customer',{shirt:cut.detail.table.shirts[0],scale:zoom});
   caption('CUSTOMER',(cut.detail.order===2?'Where are my wings?!':'Where is my '+['pretzel','Cuban'][cut.detail.order]+'?!'));
  }else{
   const gulpAge=age-1.65;
   portrait(240,143,'doc',{scale:zoom,sweat:clamp((gulpAge-.3)*41,1,44)});
   drawGulp(gulpAge);
   caption('DOCTOR BINGO','Gulp.');
  }
 }else if(cut.kind==='refill'){
  portrait(240,143,'doc',{scale:1.07});
  drawGulp(age);
  caption('DOCTOR BINGO','Beer break. Refilling energy.');
 }else if(cut.kind==='nice'){
  const shades=clamp((age-.16)/.40,0,1);
  portrait(240,143,'doc',{scale:zoom,grin:shades===1,glasses:age>.16,glassesY:-42*(1-shades)});
  caption('DOCTOR BINGO',shades===1?'NICE!':'Halfway through the shift.');
 }else if(cut.kind==='mario'){
  portrait(157,143,'mario',{grin:true,scale:.88});
  portrait(327,145,'doc',{grin:true,scale:.85});
  const handY=195+Math.sin(age*14)*4;
  ink([[182,185],[225,188],[247,handY],[244,handY+11],[222,207],[182,202]],'#a86d57');
  ink([[305,184],[265,188],[242,handY],[244,handY+11],[267,207],[305,200]],'#dda382');
  caption('MARIO',"That's my boy!");
 }else{
  rect(141,64,198,162,'#38273e');rect(147,68,186,154,'#c58a4e');
  rect(157,78,166,142,'#7a3d59');rect(170,87,140,124,'#a45568');
  portrait(240,154,'doc',{grin:true,glasses:true,scale:.81});
  ink([[207,103],[204,79],[218,86],[235,72],[250,86],[272,77],[268,103]],'#f5c75d');
  rect(209,98,57,5,'#ffda7b');rect(234,88,7,5,'#c35d68');
  rect(111,210,258,14,'#875458');rect(111,207,258,5,'#d39666');
  plate(0,161,201,1.3);plate(1,240,201,1.3);plate(2,319,201,1.3);
  const bite=Math.sin(age*5);
  if(bite>.43){
   const food=Math.floor(age)%3;
   const reach=(bite-.43)/.57, handX=205+25*reach, handY=208-48*reach;
   ink([[183,192],[191,200],[handX+4,handY+6],[handX-4,handY-1]],'#e8ac84');
   plate(food,handX,handY-4,.53);
  }
  caption('KING BINGO','Make it a pretzel, wings, and a Cuban.');
 }
}

function playCutsceneReel(){
 active=false;
 $('cover').hidden=true;
 $('touch-controls').hidden=true;
 $('status').textContent='Cutscene Preview';
 cutTo('miss',{table:tables[0],order:2},()=>{
  cutTo('refill',null,()=>cutTo('nice',null,()=>cutTo('mario',null,()=>cutTo('king',null,()=>{
   $('heading').textContent='Cutscene Preview Complete';
   $('message').textContent='Replay the close-ups or return to the game.';
   $('start').textContent='Replay Cutscenes';
   $('cover').hidden=false;
  }))));
 });
}
setup();
if(preview)playCutsceneReel();
function frame(now){
 const dt=Math.min(.05,(now-(last||now))/1000);last=now;
 if(cut){
  if(now-cut.at>=cut.seconds*1000)finishCut();
 }
 if(active&&!cut&&!document.hidden){update(dt);updateHud();syncAction();music();}
 if(cut)drawCloseup(now);else draw();
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
