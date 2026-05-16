const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 540;
canvas.height = 700;

const HORIZON_Y   = 225;
const ROAD_HW_SCR = 185;
const ROAD_HW_WLD = 1.0;
const NEAR_DIST   = 130;
const SPAWN_DIST  = 270;
const DASH_H      = 95;

const S = { SELECT: 0, PLAYING: 1, LEVELWIN: 2, GAMEOVER: 3 };
let state = S.SELECT;

// Forest road themes for each level
const ROAD_THEMES = [
  { sky0:'#4a7fc1', sky1:'#a8d8a8', ground:'#5d8a3c', dirtA:'#8b6914', dirtB:'#9c7a1e', edgeA:'#3d5a1e', edgeB:'#4a6e25', name:'Summer Forest' },
  { sky0:'#2e6b3e', sky1:'#7ab87a', ground:'#2d6a3f', dirtA:'#7a5c10', dirtB:'#8a6818', edgeA:'#1a4a20', edgeB:'#256330', name:'Deep Forest' },
  { sky0:'#1a4a7a', sky1:'#5a9fd4', ground:'#1e5c2e', dirtA:'#6b5010', dirtB:'#7a5c18', edgeA:'#0d3318', edgeB:'#184028', name:'Rainy Forest' },
  { sky0:'#c47a2a', sky1:'#e8a84a', ground:'#7a4a1e', dirtA:'#a07828', dirtB:'#b8883a', edgeA:'#5a3010', edgeB:'#6e3c18', name:'Autumn Forest' },
  { sky0:'#6a3a8c', sky1:'#c084d8', ground:'#3a2a5c', dirtA:'#5c3c10', dirtB:'#6e4a18', edgeA:'#28185c', edgeB:'#38248a', name:'Mystic Forest' },
  { sky0:'#1a3a6a', sky1:'#4a7aaa', ground:'#14482a', dirtA:'#4a3a80', dirtB:'#5a4a90', edgeA:'#0a2848', edgeB:'#183868', name:'Night Forest' },
  { sky0:'#c84a2a', sky1:'#e86a3a', ground:'#5c2a14', dirtA:'#8c5c1c', dirtB:'#a06c24', edgeA:'#3a1808', edgeB:'#4e2010', name:'Fire Forest' },
  { sky0:'#b0c8d8', sky1:'#dceef8', ground:'#7a9aaa', dirtA:'#9ab0b8', dirtB:'#a8c0c8', edgeA:'#5a7888', edgeB:'#6a8898', name:'Snow Forest' },
  { sky0:'#0a1a2a', sky1:'#1a3a5a', ground:'#0a1a14', dirtA:'#1a1a2a', dirtB:'#222238', edgeA:'#040c14', edgeB:'#08141e', name:'Midnight' },
  { sky0:'#2a6a4a', sky1:'#6ab87a', ground:'#0a3a2a', dirtA:'#3a5a20', dirtB:'#4a6a28', edgeA:'#082818', edgeB:'#0e3820', name:'Jungle' },
  { sky0:'#8a3a8a', sky1:'#c870c8', ground:'#4a1a5a', dirtA:'#5a2a80', dirtB:'#6a3a90', edgeA:'#2a0a3a', edgeB:'#38104a', name:'Neon Forest' },
  { sky0:'#8a4a1a', sky1:'#d47a3a', ground:'#4a2808', dirtA:'#6e3a14', dirtB:'#7e4a1e', edgeA:'#2a1204', edgeB:'#3a1a08', name:'Volcanic' },
  { sky0:'#3a6a8a', sky1:'#6aaac8', ground:'#0a3a5a', dirtA:'#1e5c7a', dirtB:'#2a6c8a', edgeA:'#042838', edgeB:'#083848', name:'Swamp' },
  { sky0:'#d4aa2a', sky1:'#f0d060', ground:'#8a6a10', dirtA:'#c09030', dirtB:'#d0a040', edgeA:'#604808', edgeB:'#785c10', name:'Golden Forest' },
  { sky0:'#1a1a4a', sky1:'#3a3a8a', ground:'#08081e', dirtA:'#0a0a28', dirtB:'#121238', edgeA:'#040418', edgeB:'#080820', name:'Galaxy' },
  { sky0:'#0a4a0a', sky1:'#2a8a2a', ground:'#042804', dirtA:'#1a4a08', dirtB:'#245a0a', edgeA:'#021802', edgeB:'#042004', name:'Toxic' },
  { sky0:'#6a0a0a', sky1:'#c41a1a', ground:'#3a0404', dirtA:'#5a0808', dirtB:'#6a1010', edgeA:'#1e0202', edgeB:'#280404', name:'Inferno' },
  { sky0:'#0a2a6a', sky1:'#1a5aca', ground:'#04183a', dirtA:'#0a2a8a', dirtB:'#1a3a9a', edgeA:'#040c28', edgeB:'#081838', name:'Deep Sea' },
  { sky0:'#4a4a4a', sky1:'#8a8a8a', ground:'#1e1e1e', dirtA:'#383838', dirtB:'#484848', edgeA:'#0e0e0e', edgeB:'#181818', name:'Steel' },
  { sky0:'#000', sky1:'#1a0a2a', ground:'#080408', dirtA:'#1a0a00', dirtB:'#281400', edgeA:'#060208', edgeB:'#0a040e', name:'Final Boss' },
];

const LEVELS = Array.from({ length: 20 }, (_, i) => {
  const t = i / 19;
  const stage = i < 5 ? 'Beginner' : i < 10 ? 'Intermediate' : i < 15 ? 'Advanced' : 'Expert';
  return {
    num: i + 1, stage,
    targetDist: 3000 + i * 800,
    baseSpeed: 1.4 + t * 4.2,
    obstacleRate: Math.max(35, 110 - i * 4),
    powerupRate: Math.max(180, 400 - i * 10),
    spikeChance: 0.25 + t * 0.38,
    waterChance: 0.3,
    theme: ROAD_THEMES[i],
  };
});

// All 3 vehicles are monster trucks
const CARS = [
  { name: 'Grave Digger',  desc: 'Speed Demon',    color: '#1a1a1a', accent: '#2ecc71', trim: '#27ae60', body: '#111', spd: 1.3, hnd: 0.022, hp: 4, w: 52, h: 68 },
  { name: 'Bigfoot',       desc: 'Classic Beast',  color: '#1a4a8a', accent: '#e74c3c', trim: '#c0392b', body: '#0d2a52', spd: 1.0, hnd: 0.017, hp: 5, w: 56, h: 72 },
  { name: 'El Toro Loco',  desc: 'Wild Bull',      color: '#c0392b', accent: '#f39c12', trim: '#e67e22', body: '#922b21', spd: 0.8, hnd: 0.013, hp: 7, w: 60, h: 76 },
];

let selectedCar = 0, currentLevel = 0, totalScore = 0, wonGame = false;
let player, playerX, playerVX, playerZ;
let obstacles, powerups, particles;
let doubleTimer, slowTimer, invTimer, spawnTimer, puTimer, rampTimer;
let cameraRoll = 0;
let keys = {}, anim = 0;
let boostMeter = 100;
let playerJumpH = 0, jumpVY = 0, isJumping = false;
let lastSpaceTime = 0;

// ─── AUDIO ─────────────────────────────────────────────────────────────────
let audioCtx=null,engineOsc1=null,engineOsc2=null,engineGain=null;
let musicActive=false,musicTid=null,beatIdx=0,beatSched=0,sfxOut=null;
const MBPM=148,MBEAT=60/MBPM;
const MBASS=[55,55,82.4,55,65.4,55,73.4,55];
const MLEAD=[220,0,261.6,0,329.6,261.6,0,246.9,220,0,196,0,261.6,0,220,246.9];
const MK16=[1,0,0,0,1,0,0,0,1,0,0,0,1,0,1,0];
const MS16=[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0];
const MH16=[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1];

function ensureAudio(){
  if(audioCtx){if(audioCtx.state==='suspended')audioCtx.resume();return;}
  audioCtx=new(window.AudioContext||window.webkitAudioContext)();
  const master=audioCtx.createGain();master.gain.value=0.65;master.connect(audioCtx.destination);
  sfxOut=audioCtx.createGain();sfxOut.gain.value=1;sfxOut.connect(master);
  const lfo=audioCtx.createOscillator();lfo.frequency.value=14;
  const lfoG=audioCtx.createGain();lfoG.gain.value=9;lfo.connect(lfoG);lfo.start();
  engineOsc1=audioCtx.createOscillator();engineOsc1.type='sawtooth';engineOsc1.frequency.value=70;
  engineOsc2=audioCtx.createOscillator();engineOsc2.type='square';engineOsc2.frequency.value=140;
  lfoG.connect(engineOsc1.frequency);
  const ef=audioCtx.createBiquadFilter();ef.type='lowpass';ef.frequency.value=450;ef.Q.value=1.5;
  engineGain=audioCtx.createGain();engineGain.gain.value=0;
  engineOsc1.connect(ef);engineOsc2.connect(ef);ef.connect(engineGain);engineGain.connect(master);
  engineOsc1.start();engineOsc2.start();
}
function _ad(){return sfxOut||audioCtx.destination;}
function updateEngineSound(speed,boosting){
  if(!audioCtx||!engineGain)return;
  const f=58+speed*22+(boosting?30:0);
  engineOsc1.frequency.setTargetAtTime(f,audioCtx.currentTime,0.1);
  engineOsc2.frequency.setTargetAtTime(f*2.07,audioCtx.currentTime,0.1);
  const tg=state===S.PLAYING?(boosting?0.14:0.07):0;
  engineGain.gain.setTargetAtTime(tg,audioCtx.currentTime,0.06);
}
function _schedMusic(){
  if(!audioCtx||!musicActive)return;
  const now=audioCtx.currentTime;
  while(beatSched<now+0.35){
    const b16=beatIdx%16,b8=beatIdx%8,t=beatSched;
    if(MK16[b16])_mKick(t);if(MS16[b16])_mSnare(t);if(MH16[b16])_mHat(t);
    if(b16%2===0){const n=MBASS[b8%8];if(n)_mBass(n,t,MBEAT*0.85);}
    const ln=MLEAD[b16];if(ln)_mLead(ln,t,MBEAT*0.35);
    beatSched+=MBEAT/4;beatIdx++;
  }
  musicTid=setTimeout(_schedMusic,100);
}
function startMusic(){
  if(!audioCtx)return;
  musicActive=true;beatSched=audioCtx.currentTime+0.05;beatIdx=0;_schedMusic();
}
function stopMusic(){
  musicActive=false;if(musicTid){clearTimeout(musicTid);musicTid=null;}
  if(engineGain)engineGain.gain.setTargetAtTime(0,audioCtx.currentTime,0.1);
}
function _mKick(t){
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(0.01,t+0.18);
  g.gain.setValueAtTime(0.7,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.22);
  o.connect(g).connect(_ad());o.start(t);o.stop(t+0.25);
}
function _mSnare(t){
  const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*0.1,audioCtx.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  const ns=audioCtx.createBufferSource();ns.buffer=buf;
  const f=audioCtx.createBiquadFilter();f.type='bandpass';f.frequency.value=2200;f.Q.value=0.7;
  const g=audioCtx.createGain();g.gain.setValueAtTime(0.28,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.1);
  ns.connect(f).connect(g).connect(_ad());ns.start(t);ns.stop(t+0.15);
  const o=audioCtx.createOscillator(),g2=audioCtx.createGain();
  o.frequency.value=180;g2.gain.setValueAtTime(0.18,t);g2.gain.exponentialRampToValueAtTime(0.001,t+0.06);
  o.connect(g2).connect(_ad());o.start(t);o.stop(t+0.09);
}
function _mHat(t){
  const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*0.03,audioCtx.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  const ns=audioCtx.createBufferSource();ns.buffer=buf;
  const f=audioCtx.createBiquadFilter();f.type='highpass';f.frequency.value=9000;
  const g=audioCtx.createGain();g.gain.setValueAtTime(0.12,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.03);
  ns.connect(f).connect(g).connect(_ad());ns.start(t);ns.stop(t+0.04);
}
function _mBass(freq,t,dur){
  const o=audioCtx.createOscillator();o.type='sawtooth';o.frequency.value=freq;
  const f=audioCtx.createBiquadFilter();f.type='lowpass';f.frequency.value=380;
  const g=audioCtx.createGain();g.gain.setValueAtTime(0.38,t);g.gain.setValueAtTime(0.3,t+dur*0.7);g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  o.connect(f).connect(g).connect(_ad());o.start(t);o.stop(t+dur+0.01);
}
function _mLead(freq,t,dur){
  const o=audioCtx.createOscillator();o.type='square';o.frequency.value=freq;
  const f=audioCtx.createBiquadFilter();f.type='lowpass';f.frequency.value=1100;f.Q.value=2.5;
  const g=audioCtx.createGain();g.gain.setValueAtTime(0.1,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  o.connect(f).connect(g).connect(_ad());o.start(t);o.stop(t+dur+0.01);
}
function sfxPowerup(){
  if(!audioCtx)return;
  [523,659,784,1047].forEach((f,i)=>{
    const o=audioCtx.createOscillator(),g=audioCtx.createGain(),st=audioCtx.currentTime+i*0.07;
    g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(0.2,st+0.02);g.gain.exponentialRampToValueAtTime(0.001,st+0.18);
    o.frequency.value=f;o.connect(g).connect(_ad());o.start(st);o.stop(st+0.22);
  });
}
function sfxHit(){
  if(!audioCtx)return;
  const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*0.25,audioCtx.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,1.5);
  const ns=audioCtx.createBufferSource();ns.buffer=buf;
  const g=audioCtx.createGain();g.gain.value=0.6;
  ns.connect(g).connect(_ad());ns.start();
}
function sfxJump(){
  if(!audioCtx)return;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.frequency.setValueAtTime(180,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(440,audioCtx.currentTime+0.25);
  g.gain.setValueAtTime(0.22,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.3);
  o.connect(g).connect(_ad());o.start();o.stop(audioCtx.currentTime+0.35);
}
function sfxLand(){
  if(!audioCtx)return;
  const o=audioCtx.createOscillator();o.type='sawtooth';const g=audioCtx.createGain();
  o.frequency.setValueAtTime(130,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(40,audioCtx.currentTime+0.18);
  g.gain.setValueAtTime(0.4,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.22);
  o.connect(g).connect(_ad());o.start();o.stop(audioCtx.currentTime+0.28);
}
function sfxRamp(){
  if(!audioCtx)return;
  const o=audioCtx.createOscillator();o.type='sawtooth';const g=audioCtx.createGain();
  o.frequency.setValueAtTime(80,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(700,audioCtx.currentTime+0.28);
  g.gain.setValueAtTime(0.35,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.33);
  o.connect(g).connect(_ad());o.start();o.stop(audioCtx.currentTime+0.4);
}

// Forest trees (pre-generated world positions)
const TREES = Array.from({ length: 80 }, (_, i) => ({
  side: i % 2,
  z: i * 70 + Math.random() * 30,
  offset: 20 + Math.random() * 50,
  h: 50 + Math.random() * 60,
  w: 18 + Math.random() * 22,
  dark: Math.random() > 0.5,
}));

// ─── INIT ──────────────────────────────────────────────────────────────────

function initGame() {
  const car = CARS[selectedCar];
  player = { hp: car.hp, maxHp: car.hp, hnd: car.hnd, color: car.color, accent: car.accent, trim: car.trim, body: car.body };
  playerX = 0; playerVX = 0; playerZ = 0;
  obstacles = []; powerups = []; particles = [];
  doubleTimer = 0; slowTimer = 0; invTimer = 0; spawnTimer = 0; puTimer = 0; rampTimer = 0;
  cameraRoll = 0;
  boostMeter = 100; playerJumpH = 0; jumpVY = 0; isJumping = false; lastSpaceTime = 0;
}

// ─── ROAD CURVE ────────────────────────────────────────────────────────────

function getCurvature(z) {
  z = z || playerZ;
  return Math.sin(z / 380) * 0.7 + Math.sin(z / 160) * 0.22;
}

// ─── PROJECTION ────────────────────────────────────────────────────────────

function project(worldX, relZ) {
  if (relZ < 1) return null;
  const t = NEAR_DIST / (relZ + NEAR_DIST);
  const curve = getCurvature(playerZ + relZ * 0.5);
  const curveOff = curve * (1 - t) * 160;
  const roadHW = ROAD_HW_SCR * t;
  const roadCX = canvas.width / 2 - playerX * ROAD_HW_SCR * t + curveOff;
  const screenY = HORIZON_Y + t * (canvas.height - HORIZON_Y - DASH_H);
  const screenX = roadCX + (worldX / ROAD_HW_WLD) * roadHW;
  return { screenX, screenY, scale: t, roadHW, roadCX };
}

// ─── BACKGROUND (forest) ───────────────────────────────────────────────────

function getTheme() {
  return (state === S.PLAYING || state === S.LEVELWIN || state === S.GAMEOVER)
    ? LEVELS[currentLevel].theme : ROAD_THEMES[0];
}

function drawBackground3D() {
  const th = getTheme();
  const curve = getCurvature();

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
  sky.addColorStop(0, th.sky0); sky.addColorStop(1, th.sky1);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, canvas.width, HORIZON_Y);

  // Clouds (shift with curve)
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  [[70,35],[230,22],[420,38]].forEach(([bcx, bcy]) => {
    const x = ((bcx - playerZ * 0.03 - curve * 30) % canvas.width + canvas.width) % canvas.width;
    ctx.beginPath(); ctx.arc(x, bcy, 20, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+20, bcy+5, 14, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x-14, bcy+5, 12, 0, Math.PI*2); ctx.fill();
  });

  // Forest horizon silhouette
  ctx.fillStyle = th.ground;
  ctx.fillRect(0, HORIZON_Y - 40, canvas.width, 45);

  // Tree canopy line at horizon
  for (let i = 0; i < 28; i++) {
    const tx = i * 20 - (playerZ * 0.15 + curve * 40) % 20 + (i % 3) * 5;
    const th2 = 20 + (i * 7 % 22);
    ctx.fillStyle = i % 3 === 0 ? '#1a4a1a' : i % 3 === 1 ? '#1e5a1e' : '#246424';
    ctx.beginPath();
    ctx.moveTo(tx, HORIZON_Y - 4);
    ctx.lineTo(tx + 10, HORIZON_Y - 4 - th2);
    ctx.lineTo(tx + 20, HORIZON_Y - 4);
    ctx.closePath(); ctx.fill();
  }

  // Ground / grass sides
  ctx.fillStyle = th.ground;
  ctx.fillRect(0, HORIZON_Y, canvas.width, canvas.height - HORIZON_Y);

  // Draw perspective trees on sides
  const bottomY = canvas.height - DASH_H;
  const TREE_CYCLE = 80 * 70;
  TREES.forEach(tr => {
    const cycle = TREE_CYCLE;
    const relZ = ((tr.z - playerZ % cycle) + cycle) % cycle;
    if (relZ < 8 || relZ > SPAWN_DIST + 60) return;
    const t = NEAR_DIST / (relZ + NEAR_DIST);
    const screenY = HORIZON_Y + t * (bottomY - HORIZON_Y);
    if (screenY < HORIZON_Y + 5 || screenY > bottomY + 20) return;

    const curve2 = getCurvature(playerZ + relZ * 0.5);
    const curveOff = curve2 * (1 - t) * 160;
    const roadCX = canvas.width / 2 - playerX * ROAD_HW_SCR * t + curveOff;
    const edgePx = (ROAD_HW_SCR + tr.offset * 1.5) * t;
    const x = tr.side === 0 ? roadCX - edgePx : roadCX + edgePx;

    const treeH = tr.h * t * 2.2;
    const treeW = tr.w * t * 1.8;

    // Trunk
    ctx.fillStyle = tr.dark ? '#3d2208' : '#5c3410';
    ctx.fillRect(x - treeW * 0.12, screenY, treeW * 0.24, treeH * 0.35);

    // Canopy layers
    const g1 = tr.dark ? '#1a4010' : '#245c18';
    const g2 = tr.dark ? '#1e4a14' : '#2a6e1e';
    ctx.fillStyle = g1;
    ctx.beginPath(); ctx.moveTo(x, screenY - treeH); ctx.lineTo(x - treeW*0.8, screenY - treeH*0.3); ctx.lineTo(x + treeW*0.8, screenY - treeH*0.3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.moveTo(x, screenY - treeH*0.7); ctx.lineTo(x - treeW*0.65, screenY); ctx.lineTo(x + treeW*0.65, screenY); ctx.closePath(); ctx.fill();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(x + treeW*0.15, screenY + 3, treeW*0.45, 4*t, 0, 0, Math.PI*2); ctx.fill();
  });
}

// ─── ROAD (dirt track + curves) ────────────────────────────────────────────

function drawRoad3D() {
  const th = getTheme();
  const bottomY = canvas.height - DASH_H;

  for (let y = HORIZON_Y; y < bottomY; y++) {
    const t = (y - HORIZON_Y) / (bottomY - HORIZON_Y);
    if (t <= 0.001) continue;
    const relZ = NEAR_DIST * (1 / t - 1);
    const worldZ = playerZ + relZ;
    const seg = Math.floor(worldZ / 60);

    // Curve offset for this scanline
    const curve2 = getCurvature(worldZ);
    const curveOff = curve2 * (1 - t) * 160;
    const roadHW = ROAD_HW_SCR * t;
    const roadCX = canvas.width / 2 - playerX * ROAD_HW_SCR * t + curveOff;

    // Dirt track
    ctx.fillStyle = seg % 2 === 0 ? th.dirtA : th.dirtB;
    ctx.fillRect(roadCX - roadHW, y, roadHW * 2, 1);

    // Track edges (grass/earth border)
    const edgeW = Math.max(2, roadHW * 0.1);
    ctx.fillStyle = seg % 2 === 0 ? th.edgeA : th.edgeB;
    ctx.fillRect(roadCX - roadHW - edgeW, y, edgeW, 1);
    ctx.fillRect(roadCX + roadHW, y, edgeW, 1);

    // Tyre tracks (two parallel lines)
    if (t > 0.04) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      const trackOff = roadHW * 0.35;
      ctx.fillRect(roadCX - trackOff - 2, y, 4, 1);
      ctx.fillRect(roadCX + trackOff - 2, y, 4, 1);
    }
  }
}

// ─── OBSTACLES 3D ──────────────────────────────────────────────────────────

function drawObstacles3D() {
  [...obstacles]
    .sort((a, b) => (b.worldZ - playerZ) - (a.worldZ - playerZ))
    .forEach(o => {
      const relZ = o.worldZ - playerZ;
      const proj = project(o.worldX, relZ);
      if (!proj || proj.screenY > canvas.height - DASH_H || proj.screenY < HORIZON_Y) return;
      const sw = o.worldW * proj.roadHW;
      const sh = o.worldH * proj.scale * 90;
      if (o.type === 'spike')  drawSpike3D(proj.screenX, proj.screenY, sw, sh);
      else if (o.type === 'mud')   drawMud3D(proj.screenX, proj.screenY, sw, sh * 0.55);
      else if (o.type === 'water') drawWater3D(proj.screenX, proj.screenY, sw, sh * 0.45);
      else if (o.type === 'ramp')  drawRamp3D(o);
    });
}

function drawSpike3D(cx, cy, hw, sh) {
  ctx.save();
  ctx.beginPath(); ctx.rect(cx - hw, cy - 5, hw * 2, 9); ctx.clip();
  const sw2 = Math.max(3, hw / 6);
  for (let i = 0; i <= Math.ceil(hw*2/sw2)+1; i++) {
    ctx.fillStyle = i%2===0 ? '#f1c40f' : '#333';
    ctx.fillRect(cx-hw+i*sw2, cy-5, sw2, 9);
  }
  ctx.restore();
  ctx.strokeStyle='#555'; ctx.lineWidth=1; ctx.strokeRect(cx-hw,cy-5,hw*2,9);
  const count = Math.max(2, Math.floor(hw*2/13));
  const step = hw*2/count;
  for (let i=0;i<count;i++){
    const sx=cx-hw+step*(i+0.5), h2=Math.min(sh,60);
    ctx.fillStyle='#c0392b'; ctx.strokeStyle='#7b241c'; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.moveTo(sx-step*0.38,cy-5); ctx.lineTo(sx,cy-h2); ctx.lineTo(sx+step*0.38,cy-5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.moveTo(sx-1,cy-5); ctx.lineTo(sx,cy-h2+5); ctx.lineTo(sx+1,cy-5); ctx.fill();
  }
}

function drawMud3D(cx, cy, hw, hh) {
  ctx.fillStyle='#5d4037'; ctx.beginPath(); ctx.ellipse(cx,cy,hw+5,hh+4,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#795548'; ctx.beginPath(); ctx.ellipse(cx,cy,hw,hh,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#8d6e63'; ctx.beginPath(); ctx.ellipse(cx-hw*0.1,cy-hh*0.1,hw*0.3,hh*0.3,0.4,0,Math.PI*2); ctx.fill();
  if (hw>20){ctx.fillStyle='rgba(255,255,255,0.65)';ctx.font=`bold ${Math.max(9,hw/5)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('MUD',cx,cy);}
}

function drawWater3D(cx, cy, hw, hh) {
  // Outer glow
  const wg = ctx.createRadialGradient(cx,cy,2,cx,cy,hw+10);
  wg.addColorStop(0,'rgba(79,195,247,0.6)'); wg.addColorStop(1,'rgba(79,195,247,0)');
  ctx.fillStyle=wg; ctx.beginPath(); ctx.ellipse(cx,cy,hw+10,hh+6,0,0,Math.PI*2); ctx.fill();

  // Water body
  ctx.fillStyle='#29b6f6'; ctx.beginPath(); ctx.ellipse(cx,cy,hw,hh,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#4fc3f7'; ctx.beginPath(); ctx.ellipse(cx,cy,hw*0.85,hh*0.8,0,0,Math.PI*2); ctx.fill();

  // Highlight
  ctx.fillStyle='rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.ellipse(cx-hw*0.18,cy-hh*0.22,hw*0.38,hh*0.28,-0.3,0,Math.PI*2); ctx.fill();

  // Ripples
  ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.ellipse(cx,cy,hw*0.55,hh*0.45,0,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,0.2)';
  ctx.beginPath(); ctx.ellipse(cx,cy,hw*0.28,hh*0.22,0,0,Math.PI*2); ctx.stroke();

  if (hw>20){
    ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font=`bold ${Math.max(9,hw/4.5)}px Arial`;
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('💧',cx,cy);
  }
}

function drawRamp3D(o) {
  const RDEPTH = 55;
  const relZE = o.worldZ - playerZ;        // near entry end (bottom of screen)
  const relZL = relZE + RDEPTH;            // far launch end (toward horizon)
  if (relZE < 1 || relZL > SPAWN_DIST + 90) return;
  const pE = project(o.worldX, relZE);
  const pL = project(o.worldX, relZL);
  if (!pE || !pL) return;
  if (pE.screenY > canvas.height - DASH_H + 12) return;

  const hwE = o.worldW * pE.roadHW;
  const hwL = o.worldW * pL.roadHW;
  const yE = pE.screenY, yL = pL.screenY;
  const rH = Math.max(5, pL.scale * 90); // ramp height at launch end

  // Ramp surface (slope going away toward horizon)
  const grad = ctx.createLinearGradient(pE.screenX, yE, pL.screenX, yL - rH);
  grad.addColorStop(0, '#f39c12'); grad.addColorStop(1, '#e67e22');
  ctx.fillStyle = grad; ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pE.screenX - hwE, yE);
  ctx.lineTo(pE.screenX + hwE, yE);
  ctx.lineTo(pL.screenX + hwL, yL - rH);
  ctx.lineTo(pL.screenX - hwL, yL - rH);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Side faces
  ctx.fillStyle = '#d35400';
  ctx.beginPath();
  ctx.moveTo(pE.screenX - hwE, yE); ctx.lineTo(pE.screenX - hwE, yE + 3);
  ctx.lineTo(pL.screenX - hwL, yL); ctx.lineTo(pL.screenX - hwL, yL - rH);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pE.screenX + hwE, yE); ctx.lineTo(pE.screenX + hwE, yE + 3);
  ctx.lineTo(pL.screenX + hwL, yL); ctx.lineTo(pL.screenX + hwL, yL - rH);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Warning stripes clipped to ramp surface
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pE.screenX - hwE, yE); ctx.lineTo(pE.screenX + hwE, yE);
  ctx.lineTo(pL.screenX + hwL, yL - rH); ctx.lineTo(pL.screenX - hwL, yL - rH);
  ctx.closePath(); ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = Math.max(2, hwE * 0.18);
  for (let i = 0; i < 6; i++) {
    const tx = (i / 5) * (hwE * 2) - hwE;
    ctx.beginPath();
    ctx.moveTo(pE.screenX + tx, yE);
    ctx.lineTo(pL.screenX + tx * (hwL / hwE), yL - rH);
    ctx.stroke();
  }
  ctx.restore();

  // Launch lip at top
  ctx.fillStyle = '#e74c3c'; ctx.strokeStyle = '#922b21'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pL.screenX - hwL, yL - rH - 4);
  ctx.lineTo(pL.screenX + hwL, yL - rH - 4);
  ctx.lineTo(pL.screenX + hwL, yL - rH + 4);
  ctx.lineTo(pL.screenX - hwL, yL - rH + 4);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Label
  if (hwE > 16) {
    const lx = (pE.screenX + pL.screenX) / 2;
    const ly = (yE + yL - rH) / 2;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
    ctx.font = `bold ${Math.max(9, hwE / 3.5)}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeText('RAMP', lx, ly); ctx.fillText('RAMP', lx, ly);
  }
}

// ─── POWERUPS 3D ───────────────────────────────────────────────────────────

function drawPowerups3D() {
  powerups.forEach(p => {
    const relZ = p.worldZ - playerZ;
    const proj = project(p.worldX, relZ);
    if (!proj || proj.screenY > canvas.height-DASH_H || proj.screenY < HORIZON_Y) return;
    const r = Math.max(7,22*proj.scale);
    const bob = Math.sin(anim*0.12+p.phase)*5*proj.scale;
    ctx.save(); ctx.translate(proj.screenX, proj.screenY-r*0.5+bob);
    const grd=ctx.createRadialGradient(0,0,2,0,0,r*1.6);
    grd.addColorStop(0,'rgba(255,220,0,0.85)'); grd.addColorStop(1,'rgba(255,220,0,0)');
    ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(0,0,r*1.6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#f39c12'; ctx.strokeStyle='#e67e22'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill(); ctx.stroke();
    const s=r*0.58; ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.moveTo(s*0.3,-s); ctx.lineTo(-s*0.15,0); ctx.lineTo(s*0.15,0); ctx.lineTo(-s*0.3,s); ctx.lineTo(s*0.6,-s*0.15); ctx.lineTo(s*0.2,-s*0.15); ctx.lineTo(s*0.7,-s); ctx.closePath(); ctx.fill();
    ctx.restore();
  });
}

// ─── FINISH LINE ───────────────────────────────────────────────────────────

function drawFinishLine() {
  const lvl = LEVELS[currentLevel];
  const finishRelZ = lvl.targetDist - playerZ;
  if (finishRelZ < 0 || finishRelZ > SPAWN_DIST + 80) return;
  const proj = project(0, finishRelZ);
  if (!proj || proj.screenY < HORIZON_Y || proj.screenY > canvas.height - DASH_H) return;
  const y=proj.screenY, hw=proj.roadHW, cx=proj.roadCX;
  const sqW=hw*2/12, sqH=Math.max(3,18*proj.scale);
  for (let i=0;i<12;i++){ctx.fillStyle=i%2===0?'#fff':'#000';ctx.fillRect(cx-hw+i*sqW,y-sqH,sqW+0.5,sqH*2);}
  ctx.strokeStyle='#f1c40f'; ctx.lineWidth=Math.max(1,2*proj.scale);
  ctx.beginPath(); ctx.moveTo(cx-hw,y-sqH); ctx.lineTo(cx+hw,y-sqH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx-hw,y+sqH); ctx.lineTo(cx+hw,y+sqH); ctx.stroke();
  if (finishRelZ<120){
    const fs=Math.max(12,26*proj.scale);
    ctx.font=`bold ${fs}px Arial`; ctx.strokeStyle='#000'; ctx.lineWidth=4;
    ctx.strokeText('🏁 FINISH! 🏁',cx,y-sqH-fs*0.7);
    ctx.fillStyle='#f1c40f'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🏁 FINISH! 🏁',cx,y-sqH-fs*0.7);
  }
}

// ─── MONSTER TRUCK DASHBOARD ───────────────────────────────────────────────

function drawDashboard() {
  const by = canvas.height - DASH_H;
  const cx = canvas.width / 2;

  // Windshield glass
  const wg = ctx.createLinearGradient(0,HORIZON_Y+10,0,by);
  wg.addColorStop(0,'rgba(180,225,255,0.05)'); wg.addColorStop(1,'rgba(180,225,255,0.2)');
  ctx.fillStyle=wg;
  ctx.beginPath(); ctx.moveTo(canvas.width*0.1,by-4); ctx.lineTo(canvas.width*0.14,HORIZON_Y+12); ctx.lineTo(canvas.width*0.86,HORIZON_Y+12); ctx.lineTo(canvas.width*0.9,by-4); ctx.closePath(); ctx.fill();

  // Mud/dirt splatter on windshield
  ctx.fillStyle='rgba(100,70,30,0.15)';
  [[0.25,0.7,8],[0.7,0.55,12],[0.45,0.85,6],[0.6,0.4,9]].forEach(([rx,ry,r])=>{
    const wx=canvas.width*0.14+(canvas.width*0.72)*rx, wy=HORIZON_Y+12+(by-HORIZON_Y-16)*ry;
    ctx.beginPath(); ctx.ellipse(wx,wy,r,r*0.7,Math.random(),0,Math.PI*2); ctx.fill();
  });

  // Glare
  ctx.fillStyle='rgba(255,255,255,0.06)';
  ctx.beginPath(); ctx.moveTo(canvas.width*0.3,HORIZON_Y+14); ctx.lineTo(canvas.width*0.42,HORIZON_Y+14); ctx.lineTo(canvas.width*0.36,by-4); ctx.lineTo(canvas.width*0.24,by-4); ctx.closePath(); ctx.fill();

  // A-pillars (thick, monster truck style)
  ctx.fillStyle=player.color; ctx.strokeStyle='#111'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(canvas.width*0.1,by-4); ctx.lineTo(canvas.width*0.14,HORIZON_Y+12); ctx.lineTo(canvas.width*0.19,HORIZON_Y+12); ctx.lineTo(canvas.width*0.15,by-4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(canvas.width*0.9,by-4); ctx.lineTo(canvas.width*0.86,HORIZON_Y+12); ctx.lineTo(canvas.width*0.81,HORIZON_Y+12); ctx.lineTo(canvas.width*0.85,by-4); ctx.closePath(); ctx.fill(); ctx.stroke();

  // Monster truck hood (wide, tall)
  ctx.fillStyle=player.color; ctx.strokeStyle='#111'; ctx.lineWidth=3;
  ctx.beginPath();
  ctx.moveTo(0,canvas.height);
  ctx.lineTo(canvas.width*0.05,by+2);
  ctx.lineTo(canvas.width*0.28,by+8);
  ctx.lineTo(canvas.width*0.72,by+8);
  ctx.lineTo(canvas.width*0.95,by+2);
  ctx.lineTo(canvas.width,canvas.height);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Hood bulge (engine bump)
  ctx.fillStyle=player.body||player.accent;
  ctx.beginPath(); ctx.moveTo(cx-55,by+8); ctx.lineTo(cx-45,by-8); ctx.lineTo(cx+45,by-8); ctx.lineTo(cx+55,by+8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#111'; ctx.lineWidth=1.5; ctx.stroke();

  // Accent stripes on hood
  ctx.fillStyle=player.accent;
  ctx.fillRect(cx-18,by+8,10,canvas.height-by-8);
  ctx.fillRect(cx+8,by+8,10,canvas.height-by-8);
  ctx.strokeStyle='#111'; ctx.lineWidth=1;
  ctx.strokeRect(cx-18,by+8,10,canvas.height-by-8);
  ctx.strokeRect(cx+8,by+8,10,canvas.height-by-8);

  // Trim line
  ctx.fillStyle=player.trim; ctx.fillRect(0,by-4,canvas.width,5);
  ctx.strokeStyle='#111'; ctx.lineWidth=1; ctx.strokeRect(0,by-4,canvas.width,5);

  // Big side mirrors
  ctx.fillStyle=player.color; ctx.strokeStyle='#111'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.roundRect(canvas.width*0.02,by-8,38,20,4); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(canvas.width*0.87,by-8,38,20,4); ctx.fill(); ctx.stroke();
  // Mirror glass
  ctx.fillStyle='rgba(150,200,220,0.5)';
  ctx.beginPath(); ctx.roundRect(canvas.width*0.02+3,by-5,32,14,3); ctx.fill();
  ctx.beginPath(); ctx.roundRect(canvas.width*0.87+3,by-5,32,14,3); ctx.fill();

  // Windshield frame bar
  ctx.fillStyle='#111'; ctx.fillRect(canvas.width*0.1,by-7,canvas.width*0.8,7);

  // ── Steering wheel ──
  const steerY=canvas.height-16, steerR=44;
  const steerAngle=-cameraRoll*10+(keys['ArrowLeft']||keys['a']||keys['A']?-0.28:keys['ArrowRight']||keys['d']||keys['D']?0.28:0);
  ctx.save(); ctx.translate(cx,steerY); ctx.rotate(steerAngle);

  // Column
  ctx.fillStyle='#1a1a1a'; ctx.fillRect(-7,0,14,32);

  // Outer ring
  ctx.strokeStyle='#2a2a2a'; ctx.lineWidth=12;
  ctx.beginPath(); ctx.arc(0,0,steerR,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle=player.accent; ctx.lineWidth=3;
  ctx.beginPath(); ctx.arc(0,0,steerR,0,Math.PI*2); ctx.stroke();

  // Spokes (3-spoke like real monster truck)
  [270,30,150].forEach(deg=>{
    const a=deg*Math.PI/180;
    ctx.strokeStyle='#2a2a2a'; ctx.lineWidth=8;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*steerR*0.88,Math.sin(a)*steerR*0.88); ctx.stroke();
    ctx.strokeStyle='#444'; ctx.lineWidth=5;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*steerR*0.88,Math.sin(a)*steerR*0.88); ctx.stroke();
  });

  // Hub
  ctx.fillStyle=player.color; ctx.strokeStyle='#111'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle=player.accent;
  ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill();

  ctx.restore();
}

// ─── PARTICLES ─────────────────────────────────────────────────────────────

function addParticles(x,y,color,n){
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=1.5+Math.random()*3.5;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,color,size:3+Math.random()*4});}
}
function updateParticles(){particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.09;p.life-=0.033;});particles=particles.filter(p=>p.life>0);}
function drawParticles(){particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;}

// ─── HUD ───────────────────────────────────────────────────────────────────

function drawHUD() {
  const lvl = LEVELS[currentLevel];
  ctx.fillStyle='rgba(0,0,0,0.52)'; ctx.fillRect(0,0,canvas.width,53);
  ctx.fillStyle='#f1c40f'; ctx.font='bold 14px Arial'; ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText(`LVL ${lvl.num}/20  ${lvl.stage.toUpperCase()}`,10,7);
  ctx.fillStyle='#fff'; ctx.font='bold 14px Arial'; ctx.textAlign='center';
  ctx.fillText(`Score: ${Math.floor(totalScore+playerZ*0.5)}`,canvas.width/2,7);
  ctx.textAlign='right'; ctx.font='18px Arial';
  for(let i=0;i<player.maxHp;i++){ctx.fillStyle=i<player.hp?'#e74c3c':'rgba(255,255,255,0.18)';ctx.fillText('♥',canvas.width-8-i*Math.min(22,(canvas.width-150)/player.maxHp),5);}
  const prog=Math.min(playerZ/lvl.targetDist,1);
  ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.fillRect(10,37,canvas.width-20,11);
  const bg=ctx.createLinearGradient(10,0,canvas.width-20,0);
  bg.addColorStop(0,'#27ae60'); bg.addColorStop(1,'#f1c40f');
  ctx.fillStyle=bg; ctx.fillRect(10,37,(canvas.width-20)*prog,11);
  ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1; ctx.strokeRect(10,37,canvas.width-20,11);
  if(doubleTimer>0){ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(canvas.width/2-68,56,136,28);ctx.fillStyle='#f1c40f';ctx.font='bold 14px Arial';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText('⚡ 2X SPEED',canvas.width/2,59);ctx.fillStyle='#f39c12';ctx.fillRect(canvas.width/2-58,74,116*(doubleTimer/300),6);}
  if(slowTimer>0){const sy=doubleTimer>0?88:56;ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(canvas.width/2-68,sy,136,24);ctx.fillStyle='#795548';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText('STUCK!',canvas.width/2,sy+5);}
  // Boost bar
  const boostY=canvas.height-DASH_H-60;
  ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(8,boostY,72,14);
  const bc=boostMeter>50?'#2ecc71':boostMeter>20?'#f39c12':'#e74c3c';
  ctx.fillStyle=bc; ctx.fillRect(8,boostY,72*(boostMeter/100),14);
  ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1; ctx.strokeRect(8,boostY,72,14);
  ctx.fillStyle='#fff'; ctx.font='bold 9px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('BOOST [SPACE]',44,boostY+7);
  if(isJumping){ctx.fillStyle='#2ecc71';ctx.font='bold 13px Arial';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('↑ JUMP',10,boostY-18);}
  // Speedometer
  const spd=Math.round((doubleTimer>0?lvl.baseSpeed*2:lvl.baseSpeed)*(slowTimer>0?0.3:1)*60);
  ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(canvas.width-42,canvas.height-DASH_H-42,36,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(canvas.width-42,canvas.height-DASH_H-42,36,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle='#f1c40f'; ctx.font='bold 14px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(spd,canvas.width-42,canvas.height-DASH_H-44);
  ctx.fillStyle='#aaa'; ctx.font='9px Arial'; ctx.fillText('KM/H',canvas.width-42,canvas.height-DASH_H-28);
  // Level name
  ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='10px Arial'; ctx.textAlign='right'; ctx.textBaseline='top';
  ctx.fillText(lvl.theme.name,canvas.width-8,56);
}

// ─── UPDATE ────────────────────────────────────────────────────────────────

function update() {
  anim++;
  const lvl = LEVELS[currentLevel];
  let speed = doubleTimer > 0 ? lvl.baseSpeed * 2 : lvl.baseSpeed;

  const boostHeld = keys[' '] && boostMeter > 0 && !isJumping;
  if (boostHeld) { speed *= 2; boostMeter = Math.max(0, boostMeter - 1.5); }
  else { boostMeter = Math.min(100, boostMeter + 0.5); }
  if (slowTimer > 0) speed *= 0.35;

  if (isJumping) {
    playerJumpH += jumpVY; jumpVY -= 0.9;
    if (playerJumpH <= 0) { playerJumpH=0; jumpVY=0; isJumping=false; addParticles(canvas.width/2,canvas.height-DASH_H-10,'#aaa',8); sfxLand(); }
  }

  updateEngineSound(speed, boostHeld);
  playerZ += speed;
  if (doubleTimer > 0) doubleTimer--;
  if (slowTimer  > 0) slowTimer--;
  if (invTimer   > 0) invTimer--;

  if (playerZ >= lvl.targetDist) {
    totalScore += Math.floor(playerZ*0.5)+player.hp*250;
    state = currentLevel < LEVELS.length-1 ? S.LEVELWIN : S.GAMEOVER;
    wonGame = currentLevel >= LEVELS.length-1;
    return;
  }

  // Steering + curve drift
  const curv = getCurvature();
  const hnd = player.hnd * (slowTimer > 0 ? 0.5 : 1);
  const leftP  = keys['ArrowLeft']  || keys['a'] || keys['A'];
  const rightP = keys['ArrowRight'] || keys['d'] || keys['D'];
  if (leftP)  { playerVX -= hnd; cameraRoll = Math.min(cameraRoll+0.003,0.05); }
  else if (rightP) { playerVX += hnd; cameraRoll = Math.max(cameraRoll-0.003,-0.05); }
  else { cameraRoll *= 0.88; }

  // Curve naturally pushes car
  playerVX += curv * 0.007;
  // Camera leans into curve
  cameraRoll += (-curv * 0.022 - cameraRoll) * 0.04;

  playerVX *= 0.83;
  playerX  += playerVX;
  playerX   = Math.max(-ROAD_HW_WLD*0.93, Math.min(ROAD_HW_WLD*0.93, playerX));

  // Spawn obstacles
  spawnTimer++;
  if (spawnTimer >= lvl.obstacleRate) {
    spawnTimer = 0;
    const r = Math.random();
    let type, ww, wh;
    if (r < lvl.spikeChance)                     { type='spike'; ww=0.42; wh=0.38; }
    else if (r < lvl.spikeChance + lvl.waterChance){ type='water'; ww=0.72; wh=0.45; }
    else                                           { type='mud';   ww=0.55; wh=0.32; }
    obstacles.push({ worldX:(Math.random()*2-1)*ROAD_HW_WLD*0.7, worldZ:playerZ+SPAWN_DIST, worldW:ww, worldH:wh, type, hit:false });
  }

  puTimer++;
  if (puTimer >= lvl.powerupRate) {
    puTimer=0;
    powerups.push({worldX:(Math.random()*2-1)*ROAD_HW_WLD*0.6,worldZ:playerZ+SPAWN_DIST,phase:Math.random()*Math.PI*2});
  }

  rampTimer++;
  if (rampTimer >= Math.max(500, 900 - currentLevel * 25)) {
    rampTimer = 0;
    obstacles.push({ worldX:(Math.random()*1.2-0.6)*ROAD_HW_WLD, worldZ:playerZ+SPAWN_DIST, worldW:0.68, worldH:0.6, type:'ramp', hit:false });
  }

  obstacles = obstacles.filter(o => o.worldZ - playerZ > -70);
  powerups  = powerups.filter(p => p.worldZ - playerZ > -8);

  // Ramp collision (independent of invTimer)
  for (const o of obstacles) {
    if (o.type !== 'ramp' || o.hit) continue;
    const relZ = o.worldZ - playerZ;
    if (relZ < 18 && relZ > -55 && Math.abs(playerX - o.worldX) < o.worldW + 0.1) {
      o.hit = true;
      if (!isJumping) { isJumping=true; jumpVY=22; playerJumpH=1; addParticles(canvas.width/2,canvas.height-DASH_H-20,'#f39c12',18); sfxRamp(); }
    }
  }

  if (invTimer <= 0) {
    for (const o of obstacles) {
      if (o.hit || o.type === 'ramp') continue;
      const relZ = o.worldZ - playerZ;
      if (relZ < 18 && relZ > -6 && Math.abs(playerX - o.worldX) < o.worldW + 0.08) {
        if (isJumping && playerJumpH > 20) { o.hit=true; continue; }
        o.hit = true;
        if (o.type === 'spike') {
          player.hp--; invTimer=100; sfxHit();
          addParticles(canvas.width/2,canvas.height-DASH_H-60,'#e74c3c',16);
          if (player.hp<=0) { state=S.GAMEOVER; wonGame=false; }
        } else if (o.type === 'water') {
          slowTimer = 60; sfxHit();
          addParticles(canvas.width/2,canvas.height-DASH_H-60,'#29b6f6',18);
        } else {
          slowTimer=160; sfxHit();
          addParticles(canvas.width/2,canvas.height-DASH_H-60,'#795548',12);
        }
      }
    }
  }
  powerups = powerups.filter(p => {
    const relZ=p.worldZ-playerZ;
    if(relZ<16&&relZ>-6&&Math.abs(playerX-p.worldX)<0.38){doubleTimer=300;sfxPowerup();addParticles(canvas.width/2,canvas.height-DASH_H-80,'#f1c40f',20);return false;}
    return true;
  });
  updateParticles();
}

// ─── MONSTER TRUCK (select screen) ─────────────────────────────────────────

function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}

function drawMonsterTruck(x, y, color, accent, trim, scale) {
  scale = scale || 1;
  const W=56*scale, H=60*scale, WR=22*scale; // wheel radius huge
  ctx.save(); ctx.translate(x,y);

  // Shadow
  ctx.fillStyle='rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(2,H/2+WR*0.3,W*0.7,WR*0.4,0,0,Math.PI*2); ctx.fill();

  // Big wheels (drawn first, behind body)
  const wy=H*0.15, wx=W*0.36;
  [[-wx,-wy],[wx,-wy],[-wx,wy],[wx,wy]].forEach(([dx,dy])=>{
    // Tyre
    ctx.fillStyle='#111'; ctx.strokeStyle='#333'; ctx.lineWidth=2*scale;
    ctx.beginPath(); ctx.arc(dx,dy+WR*0.1,WR,0,Math.PI*2); ctx.fill(); ctx.stroke();
    // Rim
    ctx.fillStyle='#888';
    ctx.beginPath(); ctx.arc(dx,dy+WR*0.1,WR*0.55,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#aaa'; ctx.lineWidth=1.5*scale;
    ctx.beginPath(); ctx.arc(dx,dy+WR*0.1,WR*0.55,0,Math.PI*2); ctx.stroke();
    // Spokes
    ctx.strokeStyle='#666'; ctx.lineWidth=2*scale;
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.moveTo(dx+Math.cos(a)*WR*0.18,dy+WR*0.1+Math.sin(a)*WR*0.18);ctx.lineTo(dx+Math.cos(a)*WR*0.48,dy+WR*0.1+Math.sin(a)*WR*0.48);ctx.stroke();}
    // Hub cap
    ctx.fillStyle='#ccc';
    ctx.beginPath(); ctx.arc(dx,dy+WR*0.1,WR*0.15,0,Math.PI*2); ctx.fill();
  });

  // Body (lifted high above wheels)
  ctx.fillStyle=color; ctx.strokeStyle='#111'; ctx.lineWidth=2.5*scale;
  rr(-W/2,-H/2,W,H,8*scale); ctx.fill(); ctx.stroke();

  // Roll cage bars
  ctx.strokeStyle='rgba(180,180,180,0.6)'; ctx.lineWidth=3*scale;
  ctx.beginPath(); ctx.moveTo(-W/2+6*scale,-H/2+6*scale); ctx.lineTo(-W/2+6*scale,H/2-6*scale); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W/2-6*scale,-H/2+6*scale); ctx.lineTo(W/2-6*scale,H/2-6*scale); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-W/2+6*scale,-H/2+6*scale); ctx.lineTo(W/2-6*scale,-H/2+6*scale); ctx.stroke();

  // Hood
  ctx.fillStyle=accent;
  rr(-W/2+3*scale,-H/2,W-6*scale,H*0.32,[8*scale,8*scale,0,0]); ctx.fill(); ctx.stroke();

  // Windshield
  ctx.fillStyle='rgba(180,230,255,0.85)'; ctx.lineWidth=1.5*scale;
  rr(-W/2+7*scale,-H/2+9*scale,W-14*scale,H*0.19,4*scale); ctx.fill(); ctx.stroke();

  // Cabin roof
  ctx.fillStyle=accent; ctx.lineWidth=2*scale;
  rr(-W/2+6*scale,-H/2+H*0.28,W-12*scale,H*0.2,4*scale); ctx.fill(); ctx.stroke();

  // Rear window
  ctx.fillStyle='rgba(180,230,255,0.6)'; ctx.lineWidth=1.2*scale;
  rr(-W/2+8*scale,-H/2+H*0.49,W-16*scale,H*0.12,3*scale); ctx.fill(); ctx.stroke();

  // Trim
  ctx.fillStyle=trim; ctx.fillRect(-W/2,-3*scale,W,5*scale);

  // Bull bar (front)
  ctx.fillStyle='#888'; ctx.strokeStyle='#555'; ctx.lineWidth=2*scale;
  rr(-W/2+2*scale,-H/2-8*scale,W-4*scale,10*scale,3*scale); ctx.fill(); ctx.stroke();
  // Bull bar cross bars
  ctx.strokeStyle='#666'; ctx.lineWidth=1.5*scale;
  ctx.beginPath(); ctx.moveTo(-W/2+8*scale,-H/2-3*scale); ctx.lineTo(W/2-8*scale,-H/2-3*scale); ctx.stroke();

  // Headlights
  ctx.fillStyle='#ffe066'; ctx.strokeStyle='#cc9900'; ctx.lineWidth=1.5*scale;
  rr(-W/2+5*scale,-H/2,W/2-10*scale,7*scale,2*scale); ctx.fill(); ctx.stroke();
  rr(5*scale,-H/2,W/2-10*scale,7*scale,2*scale); ctx.fill(); ctx.stroke();

  // Taillights
  ctx.fillStyle='#e74c3c'; ctx.strokeStyle='#900'; ctx.lineWidth=1.2*scale;
  rr(-W/2+5*scale,H/2-7*scale,W/2-10*scale,7*scale,2*scale); ctx.fill(); ctx.stroke();
  rr(5*scale,H/2-7*scale,W/2-10*scale,7*scale,2*scale); ctx.fill(); ctx.stroke();

  ctx.restore();
}

// ─── SCREENS ───────────────────────────────────────────────────────────────

function drawCarSelect() {
  anim++;
  const bg=ctx.createLinearGradient(0,0,0,canvas.height);
  bg.addColorStop(0,'#0a1a0a'); bg.addColorStop(1,'#001400');
  ctx.fillStyle=bg; ctx.fillRect(0,0,canvas.width,canvas.height);
  // Grid
  ctx.strokeStyle='rgba(46,180,46,0.1)'; ctx.lineWidth=1;
  for(let x=0;x<canvas.width;x+=28){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();}

  ctx.shadowColor='#2ecc71'; ctx.shadowBlur=18;
  ctx.fillStyle='#f1c40f'; ctx.font='bold 38px Arial'; ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText('MONSTER TRUCK MADNESS',canvas.width/2,24); ctx.shadowBlur=0;
  ctx.fillStyle='#2ecc71'; ctx.font='14px Arial';
  ctx.fillText('20 LEVELS — OFF-ROAD FOREST RACE',canvas.width/2,72);
  ctx.fillStyle='#5a9a5a'; ctx.font='12px Arial';
  ctx.fillText('Choose your monster truck',canvas.width/2,96);

  const stageN=['Beginner','Intermediate','Advanced','Expert'];
  const stageC=['#2ecc71','#f39c12','#e74c3c','#9b59b6'];
  stageN.forEach((st,i)=>{
    const bx=22+i*124;
    ctx.fillStyle=stageC[i]+'33'; ctx.strokeStyle=stageC[i]; ctx.lineWidth=1.5;
    rr(bx,118,118,20,10); ctx.fill(); ctx.stroke();
    ctx.fillStyle=stageC[i]; ctx.font='bold 10px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(`${st} Lv${i*5+1}-${i*5+5}`,bx+59,128);
  });

  const gap=155, sx=canvas.width/2-gap;
  CARS.forEach((car,i)=>{
    const cx=sx+i*gap, sel=i===selectedCar, cy=sel?278+Math.sin(anim*0.06)*5:286;
    ctx.fillStyle=sel?'rgba(46,204,113,0.12)':'rgba(255,255,255,0.03)';
    ctx.strokeStyle=sel?'#2ecc71':'#333'; ctx.lineWidth=sel?2.5:1;
    rr(cx-60,cy-78,120,212,14); ctx.fill(); ctx.stroke();

    drawMonsterTruck(cx,cy,car.color,car.accent,car.trim,1.0);

    ctx.fillStyle=sel?'#f1c40f':'#bbb'; ctx.font=sel?'bold 13px Arial':'12px Arial';
    ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText(car.name,cx,cy+92);
    ctx.fillStyle='#666'; ctx.font='11px Arial'; ctx.fillText(car.desc,cx,cy+108);
    ctx.fillStyle='#222'; ctx.fillRect(cx-44,cy+120,88,7);
    ctx.fillStyle='#e74c3c'; ctx.fillRect(cx-44,cy+120,88*(car.spd/1.3),7);
    ctx.fillStyle='#888'; ctx.font='10px Arial'; ctx.fillText('SPEED',cx,cy+130);
    ctx.fillStyle='#222'; ctx.fillRect(cx-44,cy+142,88,7);
    ctx.fillStyle='#2ecc71'; ctx.fillRect(cx-44,cy+142,88*(car.hp/7),7);
    ctx.fillText('HP',cx,cy+152);
  });

  ctx.fillStyle='#2ecc71'; ctx.font='bold 30px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('◀',sx-52,286); ctx.fillText('▶',sx+gap*2+52,286);
  ctx.fillStyle='#444'; ctx.font='11px Arial'; ctx.textBaseline='top';
  ctx.fillText('← → to select  |  Space=boost  |  2x Space=jump  |  ← →=steer',canvas.width/2,510);

  ctx.fillStyle='#1a5c1a'; ctx.strokeStyle='#2ecc71'; ctx.lineWidth=2.5;
  rr(canvas.width/2-95,538,190,50,25); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.font='bold 22px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('▶  START RACE',canvas.width/2,563);
  ctx.fillStyle='#333'; ctx.font='10px Arial'; ctx.textBaseline='top';
  ctx.fillText('▲ Spikes=damage  |  💧 Water=slip  |  ☁ Mud=stuck  |  ⚡=2x speed',canvas.width/2,606);
}

function drawLevelWin() {
  drawBackground3D(); drawRoad3D();
  ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.shadowColor='#f39c12'; ctx.shadowBlur=30;
  ctx.fillStyle='#f1c40f'; ctx.font='bold 50px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('LEVEL CLEAR!',canvas.width/2,canvas.height/2-90); ctx.shadowBlur=0;
  if(currentLevel+1<LEVELS.length){const nl=LEVELS[currentLevel+1];ctx.fillStyle='#2ecc71';ctx.font='bold 20px Arial';ctx.fillText(`Next: ${nl.theme.name}`,canvas.width/2,canvas.height/2-38);}
  ctx.fillStyle='#ecf0f1'; ctx.font='18px Arial'; ctx.fillText(`Total Score: ${Math.floor(totalScore)}`,canvas.width/2,canvas.height/2+12);
  const btnY=canvas.height/2+80;
  ctx.fillStyle='#1a5c1a'; ctx.strokeStyle='#2ecc71'; ctx.lineWidth=2;
  rr(canvas.width/2-95,btnY-24,190,48,24); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.font='bold 20px Arial'; ctx.fillText('NEXT LEVEL →',canvas.width/2,btnY);
  ctx.fillStyle='#555'; ctx.font='13px Arial'; ctx.fillText('ENTER or click',canvas.width/2,btnY+40);
}

function drawGameOverScreen() {
  drawBackground3D(); drawRoad3D();
  ctx.fillStyle='rgba(0,0,0,0.68)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  if(wonGame){
    ctx.shadowColor='#f39c12'; ctx.shadowBlur=28;
    ctx.fillStyle='#f1c40f'; ctx.font='bold 46px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('YOU WON! 🏆',canvas.width/2,canvas.height/2-95);
    ctx.font='bold 24px Arial'; ctx.fillText('ALL 20 LEVELS CRUSHED!',canvas.width/2,canvas.height/2-48); ctx.shadowBlur=0;
  } else {
    ctx.shadowColor='#c0392b'; ctx.shadowBlur=24;
    ctx.fillStyle='#e74c3c'; ctx.font='bold 52px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('GAME OVER',canvas.width/2,canvas.height/2-80); ctx.shadowBlur=0;
    ctx.fillStyle='#aaa'; ctx.font='18px Arial';
    ctx.fillText(`Reached Level ${currentLevel+1} / 20`,canvas.width/2,canvas.height/2-35);
  }
  ctx.fillStyle='#ecf0f1'; ctx.font='22px Arial'; ctx.fillText(`Final Score: ${Math.floor(totalScore)}`,canvas.width/2,canvas.height/2+20);
  const btnY=canvas.height/2+88;
  ctx.fillStyle='#1a5c1a'; ctx.strokeStyle='#2ecc71'; ctx.lineWidth=2;
  rr(canvas.width/2-150,btnY-22,130,44,22); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.font='bold 18px Arial'; ctx.fillText('RETRY',canvas.width/2-85,btnY);
  ctx.fillStyle='#2980b9'; ctx.strokeStyle='#1a5276';
  rr(canvas.width/2+20,btnY-22,130,44,22); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.fillText('MENU',canvas.width/2+85,btnY);
  ctx.fillStyle='#555'; ctx.font='12px Arial'; ctx.fillText('R=retry  M=menu',canvas.width/2,btnY+36);
}

// ─── INPUT ─────────────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  keys[e.key] = true;
  ensureAudio();
  if(state===S.SELECT){
    if(e.key==='ArrowLeft') selectedCar=(selectedCar+2)%3;
    if(e.key==='ArrowRight') selectedCar=(selectedCar+1)%3;
    if(e.key==='Enter'||e.key===' ') startGame();
  }
  if(state===S.LEVELWIN&&(e.key==='Enter'||e.key===' ')) nextLevel();
  if(state===S.GAMEOVER){
    if(e.key==='r'||e.key==='R'||e.key==='Enter') retryLevel();
    if(e.key==='m'||e.key==='M') goMenu();
  }
  if(e.key===' '&&state===S.PLAYING){
    const now=Date.now();
    if(now-lastSpaceTime<320&&!isJumping){isJumping=true;jumpVY=14;playerJumpH=1;addParticles(canvas.width/2,canvas.height-DASH_H-20,'#fff',10);sfxJump();}
    lastSpaceTime=now;
  }
  if(['ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.key]=false; });

canvas.addEventListener('click', e => {
  ensureAudio();
  const rect=canvas.getBoundingClientRect();
  const mx=(e.clientX-rect.left)*(canvas.width/rect.width);
  const my=(e.clientY-rect.top)*(canvas.height/rect.height);
  if(state===S.SELECT){
    const gap=155,sx=canvas.width/2-gap;
    if(mx<sx-22&&my>255&&my<320) selectedCar=(selectedCar+2)%3;
    if(mx>sx+gap*2+22&&my>255&&my<320) selectedCar=(selectedCar+1)%3;
    CARS.forEach((_,i)=>{const cx=sx+i*gap;if(Math.abs(mx-cx)<60&&my>200&&my<500) selectedCar=i;});
    if(mx>canvas.width/2-95&&mx<canvas.width/2+95&&my>538&&my<588) startGame();
  }
  if(state===S.LEVELWIN){const btnY=canvas.height/2+80;if(mx>canvas.width/2-95&&mx<canvas.width/2+95&&my>btnY-24&&my<btnY+24) nextLevel();}
  if(state===S.GAMEOVER){
    const btnY=canvas.height/2+88;
    if(mx>canvas.width/2-150&&mx<canvas.width/2-20&&my>btnY-22&&my<btnY+22) retryLevel();
    if(mx>canvas.width/2+20&&mx<canvas.width/2+150&&my>btnY-22&&my<btnY+22) goMenu();
  }
});

function startGame()  { currentLevel=0; totalScore=0; initGame(); state=S.PLAYING; startMusic(); }
function nextLevel()  { currentLevel++; initGame(); state=S.PLAYING; startMusic(); }
function retryLevel() { initGame(); state=S.PLAYING; startMusic(); }
function goMenu()     { state=S.SELECT; stopMusic(); }

// ─── MAIN LOOP ─────────────────────────────────────────────────────────────

function loop() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(state===S.SELECT){
    drawCarSelect();
  } else if(state===S.PLAYING){
    update();
    ctx.save();
    ctx.translate(canvas.width/2,canvas.height/2);
    ctx.rotate(cameraRoll);
    ctx.translate(-canvas.width/2,-canvas.height/2);
    drawBackground3D();
    drawRoad3D();
    drawFinishLine();
    drawObstacles3D();
    drawPowerups3D();
    ctx.restore();
    drawDashboard();
    drawParticles();
    drawHUD();
    if(invTimer>0&&Math.floor(Date.now()/80)%2===0){ctx.fillStyle='rgba(255,0,0,0.13)';ctx.fillRect(0,0,canvas.width,canvas.height);}
    if(slowTimer>0){ctx.fillStyle=`rgba(121,85,72,${Math.min(0.15,slowTimer/160*0.15)})`;ctx.fillRect(0,0,canvas.width,canvas.height);}
    if(isJumping){ctx.fillStyle=`rgba(255,255,255,${Math.min(0.06,playerJumpH/200*0.06)})`;ctx.fillRect(0,0,canvas.width,canvas.height);}
  } else if(state===S.LEVELWIN){
    anim++; drawLevelWin();
  } else if(state===S.GAMEOVER){
    drawGameOverScreen();
  }
  requestAnimationFrame(loop);
}

loop();
