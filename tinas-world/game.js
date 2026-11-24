import { passwordDigest } from './gate.js';
import { createController, movementKeys } from '../shared/player/controller.js?v=2';

const $ = id => document.getElementById(id);
const canvas = $('screen');
const worldMusic = $('world-music');
const ctx = canvas.getContext('2d');
const W = 640, H = 360, ground = 274;
const palette = ['#ff649e','#ff925f','#ffe475','#b7ec85','#79d9ec','#bc9dfa'];
const greeting = "Well if it isn't my favorite person!";
const background = new Image();
background.src = 'meadow.webp';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const controller = createController($('controls'), { keys: { ...movementKeys, Space:'interact' }, joystick:true, buttons:[{action:'interact',label:'Jump',face:'A'}], onAction:act });
let phase = 'locked', phaseStart = 0, last = 0;
let audio, titleMusic, melodyTimer, playedYawn = false;
const tina = { x:160, y:ground, vy:0, facing:1 };
const flowers = [[58,270,.82],[101,272,.63],[232,272,.67],[369,272,.79],[462,272,.98],[548,272,.68],[583,272,.86]];
const rainbowBits = Array.from({ length:125 }, (_, i) => ({
  angle: i * 2.39996, speed: 42 + (i * 71) % 236, size: 2 + i % 5, color:palette[i % palette.length],
}));

function audioOn() {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return;
  audio ??= new Context();
  audio.resume().catch(() => {});
}

function note(midi, start, length, volume, type = 'triangle', output = titleMusic) {
  const tone = audio.createOscillator(), gain = audio.createGain();
  tone.type = type;
  tone.frequency.value = 440 * 2 ** ((midi - 69) / 12);
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + .018);
  gain.gain.exponentialRampToValueAtTime(.0001, start + length);
  tone.connect(gain).connect(output);
  tone.start(start);
  tone.stop(start + length + .01);
}

const tune = [
  [60,64,67,72,74,72,67,64], [62,65,69,74,76,74,69,65],
  [64,67,71,76,79,76,74,71], [65,69,72,77,76,72,69,67],
  [60,64,67,72,74,76,72,67], [69,72,76,81,79,76,74,72],
  [65,69,72,77,76,74,72,69], [67,71,74,79,77,74,71,67],
];
function startMusic() {
  if (!audio || melodyTimer) return;
  titleMusic = audio.createGain();
  titleMusic.connect(audio.destination);
  let bar = 0, next = audio.currentTime + .04;
  const beat = 60 / 156;
  function schedule() {
    if (document.hidden || audio.state !== 'running') { next = audio.currentTime + .04; return; }
    if (next < audio.currentTime) next = audio.currentTime + .04;
    if (next > audio.currentTime + .12) return;
    const phrase = tune[bar];
    phrase.forEach((pitch, i) => {
      note(pitch, next + i * beat / 2, .23, i % 2 ? .048 : .078);
    });
    for (const i of [0, 2]) {
      note(phrase[0] - 24, next + i * beat, .37, .08, 'sine');
      for (const pitch of phrase.slice(0,3)) note(pitch - 12, next + (i+1) * beat, .28, .022);
    }
    next += beat * 4;
    bar = (bar + 1) % tune.length;
  }
  schedule();
  melodyTimer = setInterval(schedule, 45);
}

function yawn() {
  if (!audio || audio.state !== 'running') return;
  const at=audio.currentTime, voice=audio.createOscillator(), filter=audio.createBiquadFilter(), gain=audio.createGain();
  voice.type='sawtooth';
  voice.frequency.setValueAtTime(173,at);
  voice.frequency.linearRampToValueAtTime(260,at+.46);
  voice.frequency.linearRampToValueAtTime(115,at+1.25);
  filter.type='bandpass';filter.Q.value=1.2;
  filter.frequency.setValueAtTime(330,at);
  filter.frequency.linearRampToValueAtTime(840,at+.5);
  filter.frequency.linearRampToValueAtTime(290,at+1.25);
  gain.gain.setValueAtTime(.0001,at);
  gain.gain.linearRampToValueAtTime(.34,at+.23);
  gain.gain.linearRampToValueAtTime(.22,at+.77);
  gain.gain.exponentialRampToValueAtTime(.0001,at+1.29);
  voice.connect(filter).connect(gain).connect(audio.destination);
  voice.start();
  voice.stop(at+1.3);
}

function ellipse(x,y,rx,ry,color) {
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  ctx.fill();
}
function rect(x,y,w,h,color) {
  ctx.fillStyle=color;
  ctx.fillRect(Math.round(x),Math.round(y),w,h);
}
function polygon(points,color) {
  ctx.fillStyle=color;
  ctx.beginPath();
  points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.closePath();ctx.fill();
}
function rainbow(x,y,r,alpha) {
  ctx.save();ctx.globalAlpha=alpha;ctx.lineWidth=5;
  palette.forEach((color,i)=>{
    ctx.strokeStyle=color;ctx.beginPath();ctx.arc(x,y,r-i*5,Math.PI,Math.PI*2);ctx.stroke();
  });
  ctx.restore();
}
function world(t) {
  if (background.complete && background.naturalWidth) {
    ctx.drawImage(background,0,0,W,H);
  } else {
    rect(0,0,W,H,'#ffc1e0');
    ellipse(60,251,180,135,'#ed8bbf');ellipse(363,255,208,119,'#da83bd');ellipse(617,250,170,140,'#f2a5d0');
    for (let i=0;i<8;i++)ellipse((i*111+24)%W,42+i%3*22,41,11,'#ffe9f3');
  }
  rect(0,ground,W,86,'#e696ba');
  rect(0,ground,W,7,'#7aca9f');
  rect(0,ground+7,W,4,'#4c9e84');
  for (let i=0;i<33;i++) {
    const x=(i*53)%W, y=291+(i*29)%60;
    rect(x,y,5,3,i%2?'#f6b6d1':'#c96a9c');
  }
  if (phase==='wake'||phase==='play') {
    const wake=Math.max(0,t-1.25);
    const alpha=Math.min(.9,wake*.48);
    const x=phase==='wake'?410-wake*30:275;
    rainbow(x,181,91,alpha);
    if (wake>1.15 || phase==='play') rainbow(500,155,63,alpha*.67);
  }
}
function flower(x,y,size,t,sing) {
  const bob=Math.sin(t*6+x*.1)*2;
  ctx.save();ctx.translate(x,y);ctx.scale(size,size);
  rect(-2,-24,4,25,'#417d74');
  ellipse(7,-9,8,3,'#6db28e');ellipse(-7,-14,8,3,'#79bd94');
  for(let i=0;i<6;i++) {
    const a=i*Math.PI/3;
    ellipse(Math.cos(a)*9,-29+bob+Math.sin(a)*9,6,6,x%2?'#ffd16d':'#ff97bb');
  }
  ellipse(0,-29+bob,7,7,'#ffe69a');
  rect(-3,-32+bob,2,2,'#6d3d55');rect(2,-32+bob,2,2,'#6d3d55');
  ellipse(0,-27+bob,2.4,sing?1+Math.abs(Math.sin(t*12+x)) * 2.7:1,'#a0546f');
  if(sing && ((t*1.8+x)%2)<.75) {
    ctx.fillStyle='#a74080';ctx.font='bold 13px sans-serif';ctx.fillText('♪',9,-43-bob);
  }
  ctx.restore();
}
function drawTina(t,stretch,outfit='dress') {
  const pajamas=outfit==='pajamas'||outfit==='sleep';
  ctx.save();ctx.translate(Math.round(tina.x),Math.round(tina.y));ctx.scale(tina.facing,1);
  if(['seated','kneeling','chewing'].includes(outfit))ctx.scale(1,.81);
  ellipse(0,0,17,4,'#52797855');
  const arm=Math.round(22*stretch);
  rect(-12,-32-arm,5,13+arm,'#d99078');rect(8,-32-arm,5,13+arm,'#efad87');
  rect(-11,-32-arm,4,4,'#f8c4a0');rect(9,-32-arm,4,4,'#f8c4a0');
  rect(-7,-13,5,11,'#efb18e');rect(4,-13,5,11,'#e4a283');
  rect(-9,-5,8,5,'#6e3b65');rect(3,-5,9,5,'#6e3b65');
  polygon([[-8,-31],[8,-31],[14,-13],[10,-10],[-12,-10],[-14,-14]],'#b94286');
  polygon([[-6,-30],[6,-30],[11,-14],[7,-12],[-10,-12],[-11,-15]],'#ff7fb7');
  rect(-8,-25,16,3,'#ffe6f0');rect(-1,-20,3,6,'#ffb8d7');
  for (const x of [-8,-3,2,7]) rect(x,-13,3,2,'#ffcfdf');
  rect(-3,-28,7,2,'#ffb5d3');
  rect(-12,-51,25,24,'#2d2033');rect(-14,-43,5,16,'#39253e');rect(10,-44,5,16,'#39253e');
  rect(-9,-46,19,16,'#edac88');rect(-7,-45,15,13,'#ffd0a5');
  polygon([[-13,-50],[-8,-55],[9,-54],[14,-49],[14,-44],[4,-48],[-4,-44],[-13,-43]],'#2d2033');
  rect(-8,-51,11,2,'#4a304e');
  const yawning = stretch > .18;
  for (const eye of [-5,4]) {
    rect(eye,-42,3,yawning?1:4,'#42283c');
    if(!yawning)rect(eye,-42,1,1,'#fff7e8');
  }
  rect(-8,-37,4,2,'#f08fa2');rect(7,-37,3,2,'#f08fa2');
  if (yawning) ellipse(1,-35,3.3,4.2,'#7e385a');
  else {
    rect(-2,-36,1,1,'#9b536e');rect(3,-36,1,1,'#9b536e');
    rect(-1,-35,4,1.5,'#9b536e');rect(0,-34,2,1,'#ee8fa0');
  }
  polygon([[2,-52],[-7,-59],[-9,-68],[-4,-68],[5,-60],[13,-68],[18,-67],[18,-59],[10,-52]],'#a83980');
  polygon([[3,-55],[-6,-60],[-6,-65],[4,-60],[6,-57],[15,-65],[15,-60],[10,-55]],'#ff79b9');
  rect(4,-60,6,7,'#ffb3d5');
  rect(-4,-63,2,2,'#ffbfdd');rect(14,-63,2,2,'#ffbfdd');
  if(pajamas){
    rect(-10,-31,20,18,'#f787bc');rect(-9,-14,7,9,'#f5a2ca');rect(3,-14,7,9,'#f5a2ca');
    for(const y of [-29,-25,-21,-17])rect(-9,y,18,1,'#ffe5f3');
    rect(-1,-29,2,13,'#fff1f6');
    if(outfit==='sleep'){rect(-10,-45,21,7,'#d85c9b');rect(-8,-44,17,4,'#ffb2d6');rect(10,-38,3,3,'#ffe49c');}
  }
  if(outfit==='chewing')ellipse(1,-35,4,3,'#a84b65');
  ctx.restore();
}
function sun(x,y,t) {
  ctx.save();ctx.translate(x,y);
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6+t*.15;
    polygon([[Math.cos(a-.13)*23,Math.sin(a-.13)*23],[Math.cos(a)*39,Math.sin(a)*39],[Math.cos(a+.13)*23,Math.sin(a+.13)*23]],'#ffb55b');
  }
  ellipse(0,0,25,25,'#e88d65');ellipse(0,-1,22,22,'#ffda78');
  ellipse(-9,-5,2.5,4,'#6e4351');ellipse(8,-5,2.5,4,'#6e4351');
  ellipse(-12,5,4,2,'#f79a81');ellipse(12,5,4,2,'#f79a81');
  ellipse(0,8,6,4,'#9e4d60');
  ctx.restore();
}
function speech() {
  ctx.fillStyle='#713b66';ctx.beginPath();ctx.roundRect(227,83,254,44,13);ctx.fill();
  ctx.fillStyle='#fff5ec';ctx.beginPath();ctx.roundRect(230,86,248,38,10);ctx.fill();
  polygon([[454,120],[481,137],[468,119]],'#fff5ec');
  ctx.fillStyle='#522b49';ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.fillText(greeting,354,110);
}
const stageNames = ['garden', 'church', 'dinner', 'bed'];
const art = Object.fromEntries(stageNames.map(stage => {
  const image = new Image();
  image.src = stage + '.webp';
  return [stage, image];
}));
const flowerNames = ['Tulip', 'Rose', 'Daisy', 'Sunflower'];
const plants = Array.from({length:20}, (_, i) => ({
  x:105 + (i % 5)*98 + (Math.floor(i/5)%2)*24,
  y:137 + Math.floor(i/5)*57 - i%2*10, type:i%4, picked:false,
}));
const pewX=275, seatX=452, plateX=413, plateY=235;
let picked=0, lastFlower='', prayer=0, praying=false, eaten=0, stack=0;
let seated=false, flight=null, nextSteak=0, chewUntil=0, bedtimeCue=0;

function effect(notes, type='triangle', length=.15, volume=.12) {
  if (audio?.state !== 'running') return;
  const at=audio.currentTime+.01;
  notes.forEach((pitch,i)=>note(pitch,at+i*.075,length,volume,type,audio.destination));
}
function crunch() {
  if (audio?.state !== 'running') return;
  const buffer=audio.createBuffer(1,Math.floor(audio.sampleRate*.16),audio.sampleRate);
  const sample=buffer.getChannelData(0);
  for(let i=0;i<sample.length;i++){
    const t=i/audio.sampleRate;
    sample[i]=(Math.random()*2-1)*Math.exp(-t*26)*(.45+.55*Math.abs(Math.cos(t*105)));
  }
  const bite=audio.createBufferSource(), filter=audio.createBiquadFilter(), gain=audio.createGain();
  bite.buffer=buffer;filter.type='lowpass';filter.frequency.value=1600;gain.gain.value=.34;
  bite.connect(filter).connect(gain).connect(audio.destination);
  bite.start();
}
function prompt(text, action='') {
  const hint=$('hint');
  const value=action ? text+' · '+action : text;
  if(hint.dataset.value===value)return;
  hint.dataset.value=value;
  hint.textContent=text;
  $('tina-key-action').hidden = !action;
  if (action) {
    $('tina-key-label').textContent = action;
    controller.setActionLabel('interact',action);
  }
}
function enter(stage) {
  phase=stage;phaseStart=performance.now();
  tina.x=stage==='wake'?160:35;
  tina.y=ground;tina.vy=0;tina.facing=1;
  $('info').hidden=stage==='wake';
  $('controls').hidden=stage==='wake';
  showInteraction(false);
  if(stage==='wake') {
    playedYawn=false;
    $('greeting').hidden=true;
    $('greeting').textContent='';
    picked=0;lastFlower='';prayer=0;praying=false;eaten=0;stack=0;
    seated=false;flight=null;nextSteak=0;chewUntil=0;bedtimeCue=0;
    plants.forEach(plant=>{plant.picked=false;});
    worldMusic.currentTime=0;
    worldMusic.play().catch(error=>console.warn('Could not play World One music.',error));
  } else if(stage==='garden') {
    worldMusic.pause();
    tina.y=224;
    effect([72,76]);
  }
}
function nearestPlant() {
  return plants.find(plant=>!plant.picked && Math.hypot(tina.x-plant.x,tina.y-plant.y)<29);
}
function act() {
  if(phase==='play' && tina.y===ground) {
    tina.vy=-245;
  } else if(phase==='garden') {
    const plant=nearestPlant();
    if(!plant)return;
    plant.picked=true;picked++;
    lastFlower=flowerNames[plant.type];
    effect(picked===20?[72,76,81]:[76,83],'triangle',.11);
  } else if(phase==='church' && !praying && prayer<10 && Math.abs(tina.x-pewX)<33) {
    praying=true;tina.x=pewX;
    effect([55,60,64],'sine',.45,.085);
  } else if(phase==='dinner' && seated && stack>0 && eaten<5) {
    stack--;eaten++;
    chewUntil=performance.now()+210;
    crunch();
    if(eaten===5)effect([67,72,76],'triangle',.26,.085);
  } else if(phase==='bed' && performance.now()-phaseStart>=4200) {
    enter('wake');
  }
}
function updateStage(dt,t,now) {
  const [dx,dy]=controller.movement();
  const move = !praying && !(phase==='dinner'&&seated&&eaten<5) && phase!=='bed';
  if(move) {
    tina.x=Math.max(18,Math.min(630,tina.x+dx*140*dt));
    if(dx)tina.facing=Math.sign(dx);
  }
  if(phase==='garden'){
    tina.y=Math.max(111,Math.min(331,tina.y+dy*120*dt));
    $('objective').textContent='Flowers '+picked+' / 20';
    const plant=nearestPlant();
    if (picked===20) prompt('Walk through the gate on the right.');
    else if (plant) prompt('Pick a '+flowerNames[plant.type],'Pick a '+flowerNames[plant.type]);
    else prompt(lastFlower ? lastFlower+' picked. Find another.' : 'Walk up to a flower');
    if(tina.x>=627 && picked===20){enter('church');return;}
  } else if(phase==='church') {
    if(praying) {
      prayer=Math.min(10,prayer+dt);
      if(prayer>=10){praying=false;effect([60,64,67,72],'sine',.57,.08);}
    }
    $('objective').textContent=prayer>=10?'Prayer Complete':praying?'Praying · '+Math.ceil(10-prayer)+' s':'Find an Empty Pew';
    if(prayer>=10)prompt('Walk right to go to dinner.');
    else if(praying)prompt('Stay for the blessing');
    else if(Math.abs(tina.x-pewX)<33)prompt('Kneel and Pray','Pray');
    else prompt('Walk to the empty pew');
    if(tina.x>=627 && prayer>=10){enter('dinner');return;}
  } else if(phase==='dinner') {
    if(!seated && eaten<5 && Math.abs(tina.x-seatX)<15) {
      seated=true;tina.x=seatX;tina.facing=-1;
    }
    if(!flight && now>=nextSteak && stack<4)flight={start:now};
    if(flight && now-flight.start>=710){
      flight=null;stack++;nextSteak=now+400;
      effect([62],'sine',.12,.07);
    }
    $('objective').textContent='Steaks '+eaten+' / 5';
    if(eaten>=5) {
      if (now>=chewUntil) seated=false;
      prompt('Joe: Sweet dreams! Walk right →');
    } else if(seated && stack)prompt('Eat a Steak','Eat a Steak');
    else if(seated)prompt('Joe is cooking another steak');
    else prompt('Walk up to your chair');
    if(tina.x>=627 && eaten>=5){enter('bed');return;}
  } else if(phase==='bed') {
    $('objective').textContent=t>=4.2?'Goodnight, Tina':'Bedtime';
    if(t>=4.2)prompt('Start the Next Morning','Wake');
    else prompt('');
    if(t>=.7 && bedtimeCue===0){bedtimeCue++;effect([72,78,84],'sine',.28);}
    if(t>=1.65 && bedtimeCue===1){bedtimeCue++;effect([83,88],'triangle',.28);}
    if(t>=3.1 && bedtimeCue===2){bedtimeCue++;effect([69,60],'sine',.38);}
  }
  const enabled=(phase==='garden'&&picked<20&&Boolean(nearestPlant()))||
    (phase==='church'&&!praying&&prayer<10&&Math.abs(tina.x-pewX)<33)||
    (phase==='dinner'&&seated&&stack>0&&eaten<5)||(phase==='bed'&&t>=4.2);
  showInteraction(enabled);
}
let actionVisible;
function showInteraction(visible) {
  if(actionVisible===visible)return;
  actionVisible=visible;
  controller.showActions(visible?['interact']:[]);
}
function roomArt(stage) {
  const image=art[stage];
  if(image.complete&&image.naturalWidth)ctx.drawImage(image,0,0,W,H);
  else {rect(0,0,W,H,'#f4a9c8');rect(0,ground,W,H-ground,'#c67aa9');}
}
function blossom(plant,t) {
  const {x,y,type,picked}=plant;
  rect(x-2,y-17,4,17,'#387d67');
  if(picked)return;
  ellipse(x+4,y-7,6,2,'#62aa75');
  const colors=['#fd597d','#d8437e','#fff2ed','#ffc434'];
  const color=colors[type];
  if(type===0) {
    polygon([[x-9,y-24],[x-9,y-35],[x-3,y-31],[x,y-36],[x+4,y-31],[x+9,y-35],[x+8,y-24],[x,y-19]],color);
  } else {
    for(let i=0;i<7;i++){
      const a=i*Math.PI*2/7;
      ellipse(x+Math.cos(a)*7,y-26+Math.sin(a)*7,5,5,color);
    }
    ellipse(x,y-26,4,4,type===3?'#854531':type===2?'#fec652':'#ff9aba');
  }
  if(Math.hypot(tina.x-x,tina.y-y)<29) {
    ctx.strokeStyle='#fff4cb';ctx.lineWidth=2;ctx.beginPath();
    ctx.ellipse(x,y+2,11+Math.sin(t*6),4,0,0,Math.PI*2);ctx.stroke();
  }
}
function steak(x,y,scale=1) {
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  ellipse(0,0,14,6,'#613241');ellipse(0,-2,13,5,'#ad5549');
  rect(-6,-4,2,4,'#f19b71');rect(0,-4,2,4,'#f19b71');rect(6,-4,2,4,'#f19b71');
  ctx.restore();
}
function joe(t,throwing) {
  const x=163,y=273;
  rect(x-10,y-28,7,26,'#66506a');rect(x+3,y-28,7,26,'#66506a');
  rect(x-14,y-4,12,5,'#574157');rect(x+3,y-4,12,5,'#574157');
  rect(x-13,y-47,26,25,'#f5d4b5');rect(x-7,y-45,15,24,'#fff0df');
  rect(x-5,y-35,10,6,'#fba9c8');
  rect(x-11,y-65,22,20,'#efbb94');rect(x-12,y-69,24,11,'#eec971');
  rect(x-8,y-71,16,5,'#f8dc8e');rect(x-9,y-57,3,4,'#6e4a58');rect(x+5,y-57,3,4,'#6e4a58');
  ellipse(x+1,y-50,4,2,'#8d4b61');
  const panY=y-35-(throwing?11:Math.sin(t*7)*3);
  rect(x+10,panY,24,5,'#edb28e');ellipse(x+40,panY+2,12,4,'#644353');
}
function drawStage(t,now) {
  roomArt(phase);
  if(phase==='garden'){
    let drawn=false;
    for(const plant of [...plants].sort((a,b)=>a.y-b.y)){
      if(!drawn&&plant.y>tina.y){drawTina(t,0);drawn=true;}
      blossom(plant,t);
    }
    if(!drawn)drawTina(t,0);
  }else if(phase==='church'){
    if(prayer>0){
      ctx.save();ctx.globalAlpha=.2+prayer*.049;
      polygon([[498,81],[510,98],[pewX+47,ground],[pewX-37,ground]],'#ffeaa6');
      ellipse(pewX,ground,53,10,'#ffe99a');ctx.restore();
    }
    rect(pewX-28,ground-19,56,8,'#934e5b');rect(pewX-26,ground-11,5,11,'#653951');rect(pewX+21,ground-11,5,11,'#653951');
    drawTina(t,0,praying?'kneeling':'dress');
  }else if(phase==='dinner'){
    joe(t,Boolean(flight));
    rect(seatX-10,ground-40,22,32,'#a55678');
    if(seated)drawTina(t,0,now<chewUntil?'chewing':'seated');else drawTina(t,0);
    rect(343,247,9,28,'#8c4569');rect(450,247,9,28,'#8c4569');
    rect(334,237,132,18,'#ac5685');rect(334,237,132,9,'#fdaecb');
    ellipse(plateX,plateY,20,6,'#fff4f1');
    for(let i=0;i<stack;i++)steak(plateX,plateY-3-i*5,.83);
    if(flight){
      const p=Math.min(1,(now-flight.start)/710);
      steak(201+(plateX-201)*p,224+(plateY-224)*p-67*Math.sin(Math.PI*p));
    }
  }else if(phase==='bed'){
    const f=Math.max(0,Math.min(1,(t-2.1)/1.1));
    const x=125+f*278,y=ground-(reducedMotion.matches?0:65*Math.sin(Math.PI*f))-f*36;
    ctx.save();ctx.translate(x,y);ctx.rotate(f*Math.PI/2);
    const originalX=tina.x,originalY=tina.y;
    tina.x=0;tina.y=0;
    drawTina(t,0,t<.7?'dress':t<1.65?'pajamas':'sleep');
    tina.x=originalX;tina.y=originalY;
    ctx.restore();
    if(!reducedMotion.matches&&t>.65&&t<2.2)for(let i=0;i<11;i++){
      const a=i*2.399;
      ellipse(x+Math.cos(a)*41,y-40+Math.sin(a)*35,2+i%3,2+i%3,palette[i%6]);
    }
    if(t>=3.2){
      ctx.font='bold 24px system-ui';ctx.fillStyle='#fff1e1';ctx.textAlign='center';
      ctx.fillText('Z Z Z',470,175-(reducedMotion.matches?0:Math.sin(t*2)*6));
    }
  }
}

function frame(now) {
  const t=(now-phaseStart)/1000, dt=Math.min(.04,(now-(last||now))/1000);
  last=now;
  if (phase==='wake' && t>.18 && !playedYawn) {playedYawn=true;yawn();}
  if (phase==='wake' && t>=5) {
    phase='play';
    $('info').hidden=false;
    $('controls').hidden=false;
    $('objective').textContent='Morning';
    prompt('Jump or walk right to the garden →','Jump');
    showInteraction(true);
    $('greeting').hidden=false;
    $('greeting').textContent=greeting;
  }
  if (phase==='play') {
    const [dx]=controller.movement();
    if(dx)tina.facing=Math.sign(dx);
    tina.x=Math.max(18,Math.min(W-17,tina.x+dx*145*dt));
    tina.vy+=540*dt;
    tina.y=Math.min(ground,tina.y+tina.vy*dt);
    if(tina.y===ground)tina.vy=0;
    if(tina.x>=620)enter('garden');
  }
  if(stageNames.includes(phase)) {
    updateStage(dt,t,now);
    drawStage(phaseStart>now?0:(now-phaseStart)/1000,now);
    requestAnimationFrame(frame);
    return;
  }
  world(t);
  flowers.forEach(([x,y,size])=>flower(x,y,size,t,(phase==='wake'&&t>1.9)||phase==='play'));
  if(phase==='title') {
    rainbow(320,221,147,.76);
    if(!reducedMotion.matches&&t<2.2)for(const dot of rainbowBits){
      ctx.globalAlpha=Math.max(0,1-t/2.2);
      rect(320+Math.cos(dot.angle)*dot.speed*t,154+Math.sin(dot.angle)*dot.speed*t+28*t*t,dot.size,dot.size,dot.color);
    }
    ctx.globalAlpha=1;
  } else {
    const stretch=phase==='wake'?Math.max(0,Math.sin(Math.PI*Math.min(1,t/1.8))):0;
    drawTina(t,stretch);
    const descent=Math.max(0,Math.min(1,(t-2.35)/2.25));
    sun(509,phase==='play'?134:-40+174*(1-(1-descent)**2),t);
    if(phase==='play')speech();
  }
  requestAnimationFrame(frame);
}

$('unlock').addEventListener('submit',async event=>{
  event.preventDefault();
  if(phase!=='locked')return;
  audioOn();
  const buffer=await crypto.subtle.digest('SHA-256',new TextEncoder().encode($('password').value));
  const attempt=Array.from(new Uint8Array(buffer),byte=>byte.toString(16).padStart(2,'0')).join('');
  if(attempt!==passwordDigest){$('gate-error').textContent='Incorrect password.';$('password').select();return;}
  if(phase!=='locked')return;
  $('password').value='';
  $('gate').hidden=true;$('game').hidden=false;
  document.title='Tina’s World';
  phase='title';phaseStart=performance.now();
  startMusic();
  $('start').focus();
  requestAnimationFrame(frame);
});
$('start').addEventListener('click',()=>{
  audioOn();
  $('start').blur();
  $('title').hidden=true;
  clearInterval(melodyTimer);
  titleMusic?.disconnect();
  enter('wake');
});
window.addEventListener('pagehide',()=>{
  clearInterval(melodyTimer);
  worldMusic.pause();
  audio?.close().catch(()=>{});
});
