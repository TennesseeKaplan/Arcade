import { passwordDigest } from './gate.js';
import { createController, movementKeys } from '../shared/player/controller.js';

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
const controller = createController(document.createElement('div'), { keys: { ...movementKeys, Space:'jump' } });
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

function note(midi, start, length, volume, type = 'triangle') {
  const tone = audio.createOscillator(), gain = audio.createGain();
  tone.type = type;
  tone.frequency.value = 440 * 2 ** ((midi - 69) / 12);
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + .018);
  gain.gain.exponentialRampToValueAtTime(.0001, start + length);
  tone.connect(gain).connect(titleMusic);
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
function drawTina(t,stretch) {
  ctx.save();ctx.translate(Math.round(tina.x),Math.round(tina.y));ctx.scale(tina.facing,1);
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
function frame(now) {
  const t=(now-phaseStart)/1000, dt=Math.min(.04,(now-(last||now))/1000);
  last=now;
  if (phase==='wake' && t>.18 && !playedYawn) {playedYawn=true;yawn();}
  if (phase==='wake' && t>=5) {
    phase='play';
    $('hint').hidden=false;
    $('greeting').hidden=false;
    $('greeting').textContent=greeting;
  }
  if (phase==='play') {
    const [dx]=controller.movement();
    if(dx)tina.facing=Math.sign(dx);
    tina.x=Math.max(18,Math.min(W-18,tina.x+dx*145*dt));
    if(controller.down('jump') && tina.y===ground)tina.vy=-245;
    tina.vy+=540*dt;
    tina.y=Math.min(ground,tina.y+tina.vy*dt);
    if(tina.y===ground)tina.vy=0;
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
  phase='wake';phaseStart=performance.now();
  clearInterval(melodyTimer);
  titleMusic?.disconnect();
  worldMusic.play().catch(error => console.warn('Could not play World One music.', error));
});
window.addEventListener('pagehide',()=>{
  clearInterval(melodyTimer);
  worldMusic.pause();
  audio?.close().catch(()=>{});
});
