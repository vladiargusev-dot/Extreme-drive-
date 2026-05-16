const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 540;
canvas.height = 700;

// 3D view constants
const HORIZON_Y   = 225;
const ROAD_HW_SCR = 188;  // road half-width in pixels at screen bottom
const ROAD_HW_WLD = 1.0;  // road half-width in world units
const NEAR_DIST   = 130;  // world units → maps to screen bottom
const SPAWN_DIST  = 270;  // spawn obstacles this far ahead
const DASH_H      = 88;   // dashboard height from bottom

const S = { SELECT: 0, PLAYING: 1, LEVELWIN: 2, GAMEOVER: 3 };
let state = S.SELECT;

// Road themes: [skyTop, skyBot, grass, roadA, roadB, curbA, curbB, flowerA, flowerB]
const ROAD_THEMES = [
  { sky0:'#3a7bd5', sky1:'#87ceeb', grass:'#4caf50', roadA:'#7a7a7a', roadB:'#898989', curbA:'#e74c3c', curbB:'#fff', flowers:['#ff69b4','#ffff00'] },  // L1  green summer
  { sky0:'#1a6b3a', sky1:'#5dba7a', grass:'#388e3c', roadA:'#6d6d6d', roadB:'#7a7a7a', curbA:'#f39c12', curbB:'#fff', flowers:['#fff176','#a5d6a7'] },  // L2  forest
  { sky0:'#0d47a1', sky1:'#42a5f5', grass:'#2e7d32', roadA:'#555',    roadB:'#666',    curbA:'#ff5722', curbB:'#fff', flowers:['#ff8a65','#80cbc4'] },  // L3  deep forest
  { sky0:'#b71c1c', sky1:'#ef9a9a', grass:'#558b2f', roadA:'#616161', roadB:'#757575', curbA:'#e53935', curbB:'#ffd740', flowers:['#f48fb1','#ffcc02'] }, // L4  sunset
  { sky0:'#4a148c', sky1:'#ab47bc', grass:'#33691e', roadA:'#424242', roadB:'#616161', curbA:'#ce93d8', curbB:'#fff', flowers:['#ce93d8','#ff80ab'] },  // L5  purple dusk
  { sky0:'#01579b', sky1:'#80d8ff', grass:'#00695c', roadA:'#546e7a', roadB:'#607d8b', curbA:'#00bcd4', curbB:'#fff', flowers:['#80deea','#b2ebf2'] },  // L6  ocean
  { sky0:'#e65100', sky1:'#ffcc02', grass:'#827717', roadA:'#8d6e63', roadB:'#a1887f', curbA:'#ff6d00', curbB:'#fff8e1', flowers:['#ffe082','#ffb74d'] }, // L7  desert
  { sky0:'#880e4f', sky1:'#f48fb1', grass:'#4a148c', roadA:'#4a148c', roadB:'#6a1b9a', curbA:'#f06292', curbB:'#ce93d8', flowers:['#ea80fc','#ff80ab'] }, // L8  candy
  { sky0:'#212121', sky1:'#616161', grass:'#1b5e20', roadA:'#333',    roadB:'#444',    curbA:'#ff1744', curbB:'#fff', flowers:['#ff5252','#ff6d00'] },  // L9  night
  { sky0:'#1a237e', sky1:'#283593', grass:'#0d47a1', roadA:'#1a237e', roadB:'#283593', curbA:'#7986cb', curbB:'#e8eaf6', flowers:['#9fa8da','#c5cae9'] }, // L10 midnight
  { sky0:'#004d40', sky1:'#26a69a', grass:'#006064', roadA:'#00695c', roadB:'#00796b', curbA:'#1de9b6', curbB:'#fff', flowers:['#a7ffeb','#64ffda'] },  // L11 jungle
  { sky0:'#bf360c', sky1:'#ff7043', grass:'#5d4037', roadA:'#795548', roadB:'#8d6e63', curbA:'#ff5722', curbB:'#ffe0b2', flowers:['#ffab91','#ff8a65'] }, // L12 volcano
  { sky0:'#b0bec5', sky1:'#eceff1', grass:'#90a4ae', roadA:'#cfd8dc', roadB:'#b0bec5', curbA:'#78909c', curbB:'#fff', flowers:['#b2dfdb','#e0f2f1'] },  // L13 snow
  { sky0:'#f57f17', sky1:'#ffee58', grass:'#f9a825', roadA:'#f57f17', roadB:'#fb8c00', curbA:'#ffff00', curbB:'#fff', flowers:['#fff59d','#ffe082'] },  // L14 golden
  { sky0:'#311b92', sky1:'#7e57c2', grass:'#4527a0', roadA:'#4527a0', roadB:'#512da8', curbA:'#ea80fc', curbB:'#fff', flowers:['#e040fb','#aa00ff'] },  // L15 galaxy
  { sky0:'#00c853', sky1:'#b9f6ca', grass:'#1b5e20', roadA:'#2e7d32', roadB:'#388e3c', curbA:'#69f0ae', curbB:'#fff', flowers:['#ccff90','#b9f6ca'] },  // L16 neon green
  { sky0:'#d50000', sky1:'#ff8a80', grass:'#b71c1c', roadA:'#c62828', roadB:'#d32f2f', curbA:'#ff6e40', curbB:'#fff', flowers:['#ff9e80','#ff6d00'] },  // L17 inferno
  { sky0:'#006064', sky1:'#80deea', grass:'#004d40', roadA:'#004d40', roadB:'#00695c', curbA:'#18ffff', curbB:'#fff', flowers:['#84ffff','#a7ffeb'] },  // L18 deep sea
  { sky0:'#37474f', sky1:'#90a4ae', grass:'#263238', roadA:'#37474f', roadB:'#455a64', curbA:'#ff6f00', curbB:'#ffe57f', flowers:['#ffd740','#ffab40'] }, // L19 steel
  { sky0:'#000000', sky1:'#212121', grass:'#1a237e', roadA:'#000',    roadB:'#111',    curbA:'#ffd700', curbB:'#fff', flowers:['#ffd700','#ff4081'] },  // L20 final
];

const LEVELS = Array.from({ length: 20 }, (_, i) => {
  const t = i / 19;
  const stage = i < 5 ? 'Beginner' : i < 10 ? 'Intermediate' : i < 15 ? 'Advanced' : 'Expert';
  return {
    num: i + 1, stage,
    targetDist: 3000 + i * 800,
    baseSpeed: 1.4 + t * 4.2,
    obstacleRate: Math.max(38, 115 - i * 4),
    powerupRate:  Math.max(190, 400 - i * 10),
    spikeChance:  0.28 + t * 0.42,
    theme: ROAD_THEMES[i],
  };
});

const CARS = [
  { name: 'Sports Car',    desc: 'Fast & Furious',  color: '#e74c3c', accent: '#c0392b', trim: '#ff8a80', spd: 1.3, hnd: 0.025, hp: 3, w: 34, h: 58 },
  { name: 'Muscle Car',    desc: 'Balanced Beast',  color: '#f39c12', accent: '#d68910', trim: '#ffd166', spd: 1.0, hnd: 0.018, hp: 4, w: 40, h: 65 },
  { name: 'Monster Truck', desc: 'Tough & Steady',  color: '#27ae60', accent: '#1a7a44', trim: '#55efc4', spd: 0.7, hnd: 0.013, hp: 6, w: 50, h: 72 },
];

let selectedCar = 0, currentLevel = 0, totalScore = 0, wonGame = false;
let player, playerX, playerVX, playerZ;
let obstacles, powerups, particles;
let doubleTimer, slowTimer, invTimer, spawnTimer, puTimer;
let cameraRoll = 0;
let keys = {}, anim = 0;

// Boost (hold Space) + Jump (double-tap Space)
let boostMeter = 100;
let playerJumpH = 0, jumpVY = 0, isJumping = false;
let lastSpaceTime = 0;

// Pre-generate crowd
const CROWD_CLR = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#ecf0f1'];
const crowd = [];
for (let row = 0; row < 5; row++)
  for (let col = 0; col < 29; col++)
    crowd.push({ x: col * 19, row, c: CROWD_CLR[Math.floor(Math.random()*CROWD_CLR.length)], phase: Math.random()*Math.PI*2 });

// ─── INIT ──────────────────────────────────────────────────────────────────

function initGame() {
  const car = CARS[selectedCar];
  const lvl = LEVELS[currentLevel];
  player = { hp: car.hp, maxHp: car.hp, hnd: car.hnd, color: car.color, accent: car.accent, trim: car.trim };
  playerX = 0; playerVX = 0; playerZ = 0;
  obstacles = []; powerups = []; particles = [];
  doubleTimer = 0; slowTimer = 0; invTimer = 0; spawnTimer = 0; puTimer = 0;
  cameraRoll = 0;
  boostMeter = 100; playerJumpH = 0; jumpVY = 0; isJumping = false; lastSpaceTime = 0;
}

// ─── PROJECTION ────────────────────────────────────────────────────────────

function project(worldX, relZ) {
  if (relZ < 1) return null;
  const t = NEAR_DIST / (relZ + NEAR_DIST);           // 0=far, 1=near
  const roadHW = ROAD_HW_SCR * t;
  const roadCX = canvas.width / 2 - playerX * ROAD_HW_SCR * t;
  const screenY = HORIZON_Y + t * (canvas.height - HORIZON_Y - DASH_H);
  const screenX = roadCX + (worldX / ROAD_HW_WLD) * roadHW;
  return { screenX, screenY, scale: t, roadHW, roadCX };
}

// ─── BACKGROUND ────────────────────────────────────────────────────────────

function getTheme() {
  return (state === S.PLAYING || state === S.LEVELWIN || state === S.GAMEOVER)
    ? LEVELS[currentLevel].theme : ROAD_THEMES[0];
}

const FLOWERS = Array.from({ length: 60 }, (_, i) => ({
  side: i % 2, z: i * 95 + 30,
  offset: 12 + Math.random() * 28,
  size: 5 + Math.random() * 5,
  shape: Math.floor(Math.random() * 3),
}));

function drawFlower(x, y, r, color, shape, color2) {
  if (shape === 0) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  } else if (shape === 1) {
    ctx.fillStyle = color; ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = i*Math.PI*2/5 - Math.PI/2, b = a + Math.PI/5;
      ctx.lineTo(x+Math.cos(a)*r, y+Math.sin(a)*r);
      ctx.lineTo(x+Math.cos(b)*r*0.45, y+Math.sin(b)*r*0.45);
    }
    ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = color;
    for (let i = 0; i < 6; i++) {
      const a = i*Math.PI/3;
      ctx.beginPath(); ctx.ellipse(x+Math.cos(a)*r*0.7, y+Math.sin(a)*r*0.7, r*0.45, r*0.25, a, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = color2 || '#ffe066';
    ctx.beginPath(); ctx.arc(x, y, r*0.4, 0, Math.PI*2); ctx.fill();
  }
}

function drawBackground3D() {
  const th = getTheme();

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
  sky.addColorStop(0, th.sky0); sky.addColorStop(1, th.sky1);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, canvas.width, HORIZON_Y);

  // Clouds
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  [[80,38],[250,24],[430,42]].forEach(([cx, cy]) => {
    const x = ((cx - playerZ * 0.04) % canvas.width + canvas.width) % canvas.width;
    ctx.beginPath(); ctx.arc(x, cy, 22, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+22, cy+6, 16, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x-16, cy+6, 13, 0, Math.PI*2); ctx.fill();
  });

  // Tribune band
  ctx.fillStyle = th.grass;
  ctx.fillRect(0, HORIZON_Y - 115, canvas.width, 120);
  for (let r = 0; r < 5; r++) {
    ctx.fillStyle = r % 2 === 0 ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, HORIZON_Y - 110 + r * 21, canvas.width, 21);
  }

  // Crowd
  const wobble = state === S.LEVELWIN ? 9 : 2.5;
  crowd.forEach(p => {
    const dy = Math.sin(anim * 0.09 + p.phase) * wobble;
    const y = HORIZON_Y - 105 + p.row * 21 + dy;
    ctx.fillStyle = p.c; ctx.fillRect(p.x - 5, y + 6, 10, 10);
    ctx.fillStyle = '#fce8c8'; ctx.beginPath(); ctx.arc(p.x, y, 6, 0, Math.PI*2); ctx.fill();
  });

  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, HORIZON_Y-4); ctx.lineTo(canvas.width, HORIZON_Y-4); ctx.stroke();

  // Flags
  ctx.fillStyle = '#555';
  ctx.fillRect(14, HORIZON_Y-115, 4, 32); ctx.fillRect(canvas.width-18, HORIZON_Y-115, 4, 32);
  const fw = Math.sin(anim * 0.11) * 5;
  ctx.fillStyle = th.curbA;
  ctx.beginPath(); ctx.moveTo(18,HORIZON_Y-115); ctx.lineTo(42,HORIZON_Y-107+fw); ctx.lineTo(18,HORIZON_Y-99); ctx.closePath(); ctx.fill();
  ctx.fillStyle = th.flowers[0];
  ctx.beginPath(); ctx.moveTo(canvas.width-14,HORIZON_Y-115); ctx.lineTo(canvas.width-38,HORIZON_Y-107+fw); ctx.lineTo(canvas.width-14,HORIZON_Y-99); ctx.closePath(); ctx.fill();

  // Grass sides
  ctx.fillStyle = th.grass;
  ctx.fillRect(0, HORIZON_Y, canvas.width, canvas.height - HORIZON_Y);

  // Perspective flowers on grass
  const bottomY = canvas.height - DASH_H;
  FLOWERS.forEach(f => {
    const cycle = 60 * 95;
    const relZ = ((f.z - playerZ % cycle) + cycle) % cycle;
    if (relZ < 5 || relZ > SPAWN_DIST) return;
    const t = NEAR_DIST / (relZ + NEAR_DIST);
    const screenY = HORIZON_Y + t * (bottomY - HORIZON_Y);
    if (screenY < HORIZON_Y + 5 || screenY > bottomY) return;
    const roadCX = canvas.width / 2 - playerX * ROAD_HW_SCR * t;
    const edgePx = (ROAD_HW_SCR + f.offset * 1.8) * t;
    const x = f.side === 0 ? roadCX - edgePx : roadCX + edgePx;
    const r = Math.max(2, f.size * t * 1.6);
    ctx.strokeStyle = '#4caf50'; ctx.lineWidth = Math.max(1, r * 0.3);
    ctx.beginPath(); ctx.moveTo(x, screenY); ctx.lineTo(x, screenY + r * 1.5); ctx.stroke();
    drawFlower(x, screenY, r, th.flowers[f.shape % th.flowers.length], f.shape, th.flowers[1 % th.flowers.length]);
  });
}

// ─── ROAD (scanlines) ──────────────────────────────────────────────────────

function drawRoad3D() {
  const th = getTheme();
  const bottomY = canvas.height - DASH_H;
  for (let y = HORIZON_Y; y < bottomY; y++) {
    const t = (y - HORIZON_Y) / (bottomY - HORIZON_Y);
    if (t <= 0.001) continue;
    const roadHW = ROAD_HW_SCR * t;
    const roadCX = canvas.width / 2 - playerX * ROAD_HW_SCR * t;
    const relZ = NEAR_DIST * (1 / t - 1);
    const seg = Math.floor((playerZ + relZ) / 55);

    ctx.fillStyle = seg % 2 === 0 ? th.roadA : th.roadB;
    ctx.fillRect(roadCX - roadHW, y, roadHW * 2, 1);

    const curbW = Math.max(1, roadHW * 0.065);
    ctx.fillStyle = seg % 2 === 0 ? th.curbA : th.curbB;
    ctx.fillRect(roadCX - roadHW - curbW, y, curbW, 1);
    ctx.fillRect(roadCX + roadHW,         y, curbW, 1);

    if (Math.floor((playerZ + relZ) / 33) % 2 === 0 && t > 0.06) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(roadCX - 2, y, 4, 1);
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
      const sw = o.worldW * proj.roadHW;    // half-width pixels
      const sh = o.worldH * proj.scale * 90;
      o.type === 'spike' ? drawSpike3D(proj.screenX, proj.screenY, sw, sh)
                         : drawMud3D(proj.screenX, proj.screenY, sw, sh * 0.55);
    });
}

function drawSpike3D(cx, cy, hw, sh) {
  // Base strip
  ctx.save();
  ctx.beginPath(); ctx.rect(cx - hw, cy - 5, hw * 2, 9); ctx.clip();
  const sw2 = Math.max(3, hw / 6);
  for (let i = 0; i <= Math.ceil(hw * 2 / sw2) + 1; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#f1c40f' : '#333';
    ctx.fillRect(cx - hw + i * sw2, cy - 5, sw2, 9);
  }
  ctx.restore();
  ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
  ctx.strokeRect(cx - hw, cy - 5, hw * 2, 9);

  // Spike triangles
  const count = Math.max(2, Math.floor(hw * 2 / 13));
  const step = hw * 2 / count;
  for (let i = 0; i < count; i++) {
    const sx = cx - hw + step * (i + 0.5);
    const h2 = Math.min(sh, 60);
    ctx.fillStyle = '#c0392b'; ctx.strokeStyle = '#7b241c'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx - step * 0.38, cy - 5);
    ctx.lineTo(sx, cy - h2);
    ctx.lineTo(sx + step * 0.38, cy - 5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.moveTo(sx - 1, cy - 5); ctx.lineTo(sx, cy - h2 + 5); ctx.lineTo(sx + 1, cy - 5); ctx.fill();
  }
}

function drawMud3D(cx, cy, hw, hh) {
  ctx.fillStyle = '#5d4037';
  ctx.beginPath(); ctx.ellipse(cx, cy, hw + 5, hh + 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#795548';
  ctx.beginPath(); ctx.ellipse(cx, cy, hw, hh, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#8d6e63';
  ctx.beginPath(); ctx.ellipse(cx - hw * 0.1, cy - hh * 0.1, hw * 0.3, hh * 0.3, 0.4, 0, Math.PI*2); ctx.fill();
  if (hw > 22) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `bold ${Math.max(9, hw / 5)}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('MUD', cx, cy);
  }
}

// ─── POWERUPS 3D ───────────────────────────────────────────────────────────

function drawPowerups3D() {
  powerups.forEach(p => {
    const relZ = p.worldZ - playerZ;
    const proj = project(p.worldX, relZ);
    if (!proj || proj.screenY > canvas.height - DASH_H || proj.screenY < HORIZON_Y) return;
    const r = Math.max(7, 22 * proj.scale);
    const bob = Math.sin(anim * 0.12 + p.phase) * 5 * proj.scale;
    ctx.save(); ctx.translate(proj.screenX, proj.screenY - r * 0.5 + bob);
    const grd = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 1.6);
    grd.addColorStop(0, 'rgba(255,220,0,0.85)'); grd.addColorStop(1, 'rgba(255,220,0,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#f39c12'; ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    const s = r * 0.58;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(s*0.3,-s); ctx.lineTo(-s*0.15,0); ctx.lineTo(s*0.15,0);
    ctx.lineTo(-s*0.3,s); ctx.lineTo(s*0.6,-s*0.15); ctx.lineTo(s*0.2,-s*0.15); ctx.lineTo(s*0.7,-s);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  });
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────

function drawDashboard() {
  const by = canvas.height - DASH_H;
  const cx = canvas.width / 2;

  // ── Windshield glass (overlay on 3D view) ──
  const wGrad = ctx.createLinearGradient(0, HORIZON_Y + 10, 0, by);
  wGrad.addColorStop(0, 'rgba(180,225,255,0.06)');
  wGrad.addColorStop(1, 'rgba(180,225,255,0.22)');
  ctx.fillStyle = wGrad;
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.11, by - 4);
  ctx.lineTo(canvas.width * 0.16, HORIZON_Y + 12);
  ctx.lineTo(canvas.width * 0.84, HORIZON_Y + 12);
  ctx.lineTo(canvas.width * 0.89, by - 4);
  ctx.closePath(); ctx.fill();

  // Windshield glare streak
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.32, HORIZON_Y + 14);
  ctx.lineTo(canvas.width * 0.42, HORIZON_Y + 14);
  ctx.lineTo(canvas.width * 0.36, by - 4);
  ctx.lineTo(canvas.width * 0.26, by - 4);
  ctx.closePath(); ctx.fill();

  // A-pillars (windshield frame)
  ctx.fillStyle = player.color; ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
  ctx.beginPath(); // left
  ctx.moveTo(canvas.width * 0.11, by - 4);
  ctx.lineTo(canvas.width * 0.16, HORIZON_Y + 12);
  ctx.lineTo(canvas.width * 0.20, HORIZON_Y + 12);
  ctx.lineTo(canvas.width * 0.14, by - 4);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); // right
  ctx.moveTo(canvas.width * 0.89, by - 4);
  ctx.lineTo(canvas.width * 0.84, HORIZON_Y + 12);
  ctx.lineTo(canvas.width * 0.80, HORIZON_Y + 12);
  ctx.lineTo(canvas.width * 0.86, by - 4);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // ── Hood ──
  ctx.fillStyle = player.color; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  ctx.lineTo(canvas.width * 0.08, by);
  ctx.lineTo(canvas.width * 0.37, by + 16);
  ctx.lineTo(canvas.width * 0.63, by + 16);
  ctx.lineTo(canvas.width * 0.92, by);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Hood centre accent stripe
  ctx.fillStyle = player.accent;
  ctx.beginPath();
  ctx.moveTo(cx - 30, by + 17); ctx.lineTo(cx + 30, by + 17);
  ctx.lineTo(cx + 22, canvas.height); ctx.lineTo(cx - 22, canvas.height);
  ctx.closePath(); ctx.fill();

  // Trim line
  ctx.fillStyle = player.trim;
  ctx.fillRect(0, by - 4, canvas.width, 6);
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1;
  ctx.strokeRect(0, by - 4, canvas.width, 6);

  // Mirrors
  ctx.fillStyle = player.accent; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(canvas.width * 0.05, by - 4, 32, 16, 5); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(canvas.width * 0.87, by - 4, 32, 16, 5); ctx.fill(); ctx.stroke();

  // Windshield bottom frame bar
  ctx.fillStyle = '#111';
  ctx.fillRect(canvas.width * 0.11, by - 6, canvas.width * 0.78, 7);

  // ── Steering wheel ──
  const steerY = canvas.height - 18;
  const steerR = 42;
  const steerAngle = -cameraRoll * 10 + (keys['ArrowLeft']||keys['a']||keys['A'] ? -0.25 : keys['ArrowRight']||keys['d']||keys['D'] ? 0.25 : 0);

  ctx.save();
  ctx.translate(cx, steerY);
  ctx.rotate(steerAngle);

  // Column
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(-6, 0, 12, 30);

  // Outer ring
  ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.arc(0, 0, steerR, 0, Math.PI*2); ctx.stroke();
  ctx.strokeStyle = '#444'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(0, 0, steerR, 0, Math.PI*2); ctx.stroke();

  // Grip texture on ring
  ctx.strokeStyle = '#555'; ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const a2 = a + 0.22;
    ctx.beginPath();
    ctx.arc(0, 0, steerR, a, a2);
    ctx.stroke();
  }

  // Spokes
  ctx.strokeStyle = '#333'; ctx.lineWidth = 6;
  [270, 30, 150].forEach(deg => {
    const a = deg * Math.PI / 180;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a)*steerR*0.92, Math.sin(a)*steerR*0.92); ctx.stroke();
  });

  // Center hub
  ctx.fillStyle = player.color;
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Brand dot
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();

  ctx.restore();
}

// ─── FINISH LINE ───────────────────────────────────────────────────────────

function drawFinishLine() {
  const lvl = LEVELS[currentLevel];
  const finishRelZ = lvl.targetDist - playerZ;
  if (finishRelZ < 0 || finishRelZ > SPAWN_DIST + 80) return;

  const proj = project(0, finishRelZ);
  if (!proj || proj.screenY < HORIZON_Y || proj.screenY > canvas.height - DASH_H) return;

  const y = proj.screenY;
  const hw = proj.roadHW;
  const cx = proj.roadCX;
  const sqW = hw * 2 / 12;
  const sqH = Math.max(3, 18 * proj.scale);

  // Checkered banner
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#fff' : '#000';
    ctx.fillRect(cx - hw + i * sqW, y - sqH, sqW + 0.5, sqH * 2);
  }
  // Border lines
  ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = Math.max(1, 2 * proj.scale);
  ctx.beginPath(); ctx.moveTo(cx - hw, y - sqH); ctx.lineTo(cx + hw, y - sqH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - hw, y + sqH); ctx.lineTo(cx + hw, y + sqH); ctx.stroke();

  // FINISH text when close
  if (finishRelZ < 120) {
    const fs = Math.max(12, 26 * proj.scale);
    ctx.font = `bold ${fs}px Arial`;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
    ctx.strokeText('🏁 FINISH! 🏁', cx, y - sqH - fs * 0.7);
    ctx.fillStyle = '#f1c40f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🏁 FINISH! 🏁', cx, y - sqH - fs * 0.7);
  }
}

// ─── PARTICLES ─────────────────────────────────────────────────────────────

function addParticles(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 3.5;
    particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: 1, color, size: 3+Math.random()*4 });
  }
}
function updateParticles() {
  particles.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.vy+=0.09; p.life-=0.033; });
  particles = particles.filter(p => p.life > 0);
}
function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ─── HUD ───────────────────────────────────────────────────────────────────

function drawHUD() {
  const lvl = LEVELS[currentLevel];
  ctx.fillStyle = 'rgba(0,0,0,0.52)'; ctx.fillRect(0, 0, canvas.width, 53);

  ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(`LVL ${lvl.num}/20  ${lvl.stage.toUpperCase()}`, 10, 7);

  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
  ctx.fillText(`Score: ${Math.floor(totalScore + playerZ * 0.5)}`, canvas.width / 2, 7);

  ctx.textAlign = 'right'; ctx.font = '18px Arial';
  for (let i = 0; i < player.maxHp; i++) {
    ctx.fillStyle = i < player.hp ? '#e74c3c' : 'rgba(255,255,255,0.18)';
    ctx.fillText('♥', canvas.width - 8 - i * Math.min(22, (canvas.width - 150) / player.maxHp), 5);
  }

  // Progress bar
  const prog = Math.min(playerZ / lvl.targetDist, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(10, 37, canvas.width - 20, 11);
  const bg = ctx.createLinearGradient(10, 0, canvas.width - 20, 0);
  bg.addColorStop(0, '#27ae60'); bg.addColorStop(1, '#f1c40f');
  ctx.fillStyle = bg; ctx.fillRect(10, 37, (canvas.width - 20) * prog, 11);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
  ctx.strokeRect(10, 37, canvas.width - 20, 11);

  if (doubleTimer > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(canvas.width/2-68, 56, 136, 28);
    ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('⚡ 2X SPEED', canvas.width/2, 59);
    ctx.fillStyle = '#f39c12'; ctx.fillRect(canvas.width/2-58, 74, 116*(doubleTimer/300), 6);
  }
  if (slowTimer > 0) {
    const sy = doubleTimer > 0 ? 88 : 56;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(canvas.width/2-68, sy, 136, 24);
    ctx.fillStyle = '#795548'; ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('STUCK IN MUD!', canvas.width/2, sy + 5);
  }

  // Boost meter (bottom left of HUD area)
  const boostY = canvas.height - DASH_H - 58;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(8, boostY, 70, 14);
  const boostCol = boostMeter > 50 ? '#2ecc71' : boostMeter > 20 ? '#f39c12' : '#e74c3c';
  ctx.fillStyle = boostCol; ctx.fillRect(8, boostY, 70 * (boostMeter / 100), 14);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(8, boostY, 70, 14);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('BOOST [SPACE]', 43, boostY + 7);

  // Jump indicator
  if (isJumping) {
    ctx.fillStyle = '#2ecc71'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('↑ JUMP', 10, boostY - 18);
  }

  // Speedometer (bottom right)
  const lvl2 = LEVELS[currentLevel];
  const spd = Math.round((doubleTimer>0?lvl2.baseSpeed*2:lvl2.baseSpeed)*(slowTimer>0?0.3:1)*60);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.arc(canvas.width - 42, canvas.height - DASH_H - 42, 36, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(canvas.width - 42, canvas.height - DASH_H - 42, 36, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(spd, canvas.width - 42, canvas.height - DASH_H - 44);
  ctx.fillStyle = '#aaa'; ctx.font = '9px Arial';
  ctx.fillText('KM/H', canvas.width - 42, canvas.height - DASH_H - 28);
}

// ─── UPDATE ────────────────────────────────────────────────────────────────

function update() {
  anim++;
  const lvl = LEVELS[currentLevel];
  let speed = doubleTimer > 0 ? lvl.baseSpeed * 2 : lvl.baseSpeed;

  // Space boost (hold)
  const boostHeld = keys[' '] && boostMeter > 0 && !isJumping;
  if (boostHeld) { speed *= 2; boostMeter = Math.max(0, boostMeter - 1.5); }
  else { boostMeter = Math.min(100, boostMeter + 0.5); }

  if (slowTimer > 0) speed *= 0.3;

  // Jump physics
  if (isJumping) {
    playerJumpH += jumpVY;
    jumpVY -= 0.9;
    if (playerJumpH <= 0) { playerJumpH = 0; jumpVY = 0; isJumping = false; addParticles(canvas.width/2, canvas.height - DASH_H - 10, '#aaa', 8); }
  }

  playerZ += speed;
  if (doubleTimer > 0) doubleTimer--;
  if (slowTimer  > 0) slowTimer--;
  if (invTimer   > 0) invTimer--;

  if (playerZ >= lvl.targetDist) {
    totalScore += Math.floor(playerZ * 0.5) + player.hp * 250;
    state = currentLevel < LEVELS.length - 1 ? S.LEVELWIN : S.GAMEOVER;
    wonGame = currentLevel >= LEVELS.length - 1;
    return;
  }

  // Steering
  const hnd = player.hnd * (slowTimer > 0 ? 0.5 : 1);
  if (keys['ArrowLeft']  || keys['a'] || keys['A']) { playerVX -= hnd; cameraRoll = Math.min(cameraRoll + 0.003, 0.045); }
  else if (keys['ArrowRight'] || keys['d'] || keys['D']) { playerVX += hnd; cameraRoll = Math.max(cameraRoll - 0.003, -0.045); }
  else { cameraRoll *= 0.88; }

  playerVX *= 0.83;
  playerX  += playerVX;
  playerX   = Math.max(-ROAD_HW_WLD * 0.94, Math.min(ROAD_HW_WLD * 0.94, playerX));

  // Spawn obstacles
  spawnTimer++;
  if (spawnTimer >= lvl.obstacleRate) {
    spawnTimer = 0;
    const mud = Math.random() > lvl.spikeChance;
    obstacles.push({
      worldX: (Math.random() * 2 - 1) * ROAD_HW_WLD * 0.72,
      worldZ: playerZ + SPAWN_DIST,
      worldW: mud ? 0.52 : 0.42,  // half-width in world units
      worldH: mud ? 0.28 : 0.38,
      type:   mud ? 'mud' : 'spike',
      hit: false,
    });
  }

  // Spawn powerups
  puTimer++;
  if (puTimer >= lvl.powerupRate) {
    puTimer = 0;
    powerups.push({ worldX: (Math.random()*2-1)*ROAD_HW_WLD*0.6, worldZ: playerZ+SPAWN_DIST, phase: Math.random()*Math.PI*2 });
  }

  obstacles = obstacles.filter(o => o.worldZ - playerZ > -15);
  powerups  = powerups.filter(p => p.worldZ - playerZ > -8);

  // Collisions
  if (invTimer <= 0) {
    for (const o of obstacles) {
      if (o.hit) continue;
      const relZ = o.worldZ - playerZ;
      if (relZ < 18 && relZ > -6 && Math.abs(playerX - o.worldX) < o.worldW + 0.08) {
        if (isJumping && playerJumpH > 20) { o.hit = true; continue; } // jump over
        o.hit = true;
        if (o.type === 'spike') {
          player.hp--; invTimer = 100;
          addParticles(canvas.width/2, canvas.height - DASH_H - 60, '#e74c3c', 16);
          if (player.hp <= 0) { state = S.GAMEOVER; wonGame = false; }
        } else {
          slowTimer = 160;
          addParticles(canvas.width/2, canvas.height - DASH_H - 60, '#795548', 12);
        }
      }
    }
  }
  powerups = powerups.filter(p => {
    const relZ = p.worldZ - playerZ;
    if (relZ < 16 && relZ > -6 && Math.abs(playerX - p.worldX) < 0.38) {
      doubleTimer = 300;
      addParticles(canvas.width/2, canvas.height - DASH_H - 80, '#f1c40f', 20);
      return false;
    }
    return true;
  });

  updateParticles();
}

// ─── CAR HELPER (used in SELECT screen) ────────────────────────────────────

function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

function drawCar(x, y, w, h, color, accent, trim, scale) {
  scale = scale || 1;
  const sw = w*scale, sh = h*scale;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(3,sh/2+4,sw/2,6,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=color; ctx.strokeStyle='#222'; ctx.lineWidth=2.5*scale;
  rr(-sw/2,-sh/2,sw,sh,8*scale); ctx.fill(); ctx.stroke();
  ctx.fillStyle=accent; rr(-sw/2+3*scale,-sh/2,sw-6*scale,sh*0.33,[8*scale,8*scale,0,0]); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(180,230,255,0.88)'; ctx.lineWidth=1.5*scale;
  rr(-sw/2+6*scale,-sh/2+8*scale,sw-12*scale,sh*0.2,4*scale); ctx.fill(); ctx.stroke();
  ctx.fillStyle=accent; ctx.lineWidth=2*scale;
  rr(-sw/2+5*scale,-sh/2+sh*0.28,sw-10*scale,sh*0.22,4*scale); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(180,230,255,0.6)'; ctx.lineWidth=1.2*scale;
  rr(-sw/2+7*scale,-sh/2+sh*0.5,sw-14*scale,sh*0.13,3*scale); ctx.fill(); ctx.stroke();
  ctx.fillStyle=trim; ctx.fillRect(-sw/2,-3*scale,sw,5*scale);
  ctx.strokeStyle='#222'; ctx.strokeRect(-sw/2,-3*scale,sw,5*scale);
  const wy=sh*0.28,wx=sw/2+4*scale;
  [[-wx,-wy],[wx,-wy],[-wx,wy],[wx,wy]].forEach(([dx,dy])=>{
    ctx.fillStyle='#111'; ctx.strokeStyle='#555'; ctx.lineWidth=1.5*scale;
    rr(dx-6*scale,dy-10*scale,12*scale,18*scale,3*scale); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#bbb'; ctx.beginPath(); ctx.arc(dx,dy+scale,4*scale,0,Math.PI*2); ctx.fill();
  });
  ctx.fillStyle='#ffe066'; ctx.strokeStyle='#cc9900'; ctx.lineWidth=1.5*scale;
  rr(-sw/2+4*scale,-sh/2,sw/2-8*scale,6*scale,2*scale); ctx.fill(); ctx.stroke();
  rr(4*scale,-sh/2,sw/2-8*scale,6*scale,2*scale); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#e74c3c'; ctx.strokeStyle='#900'; ctx.lineWidth=1.2*scale;
  rr(-sw/2+4*scale,sh/2-6*scale,sw/2-8*scale,6*scale,2*scale); ctx.fill(); ctx.stroke();
  rr(4*scale,sh/2-6*scale,sw/2-8*scale,6*scale,2*scale); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ─── SCREENS ───────────────────────────────────────────────────────────────

function drawCarSelect() {
  anim++;
  const bg = ctx.createLinearGradient(0,0,0,canvas.height);
  bg.addColorStop(0,'#1a3a2a'); bg.addColorStop(1,'#0a1a10');
  ctx.fillStyle=bg; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='rgba(46,204,113,0.12)'; ctx.lineWidth=1;
  for (let x=0;x<canvas.width;x+=28){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();}

  ctx.shadowColor='#f39c12'; ctx.shadowBlur=22;
  ctx.fillStyle='#f1c40f'; ctx.font='bold 40px Arial'; ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText('EXTREME DRIVE', canvas.width/2, 28); ctx.shadowBlur=0;
  ctx.fillStyle='#2ecc71'; ctx.font='15px Arial';
  ctx.fillText('20 LEVELS — FIRST PERSON VIEW', canvas.width/2, 80);
  ctx.fillStyle='#8bc8a0'; ctx.font='13px Arial';
  ctx.fillText('Choose your vehicle', canvas.width/2, 106);

  const stageNames=['Beginner','Intermediate','Advanced','Expert'];
  const stageC=['#2ecc71','#f39c12','#e74c3c','#9b59b6'];
  stageNames.forEach((st,i)=>{
    const bx=30+i*120;
    ctx.fillStyle=stageC[i]+'33'; ctx.strokeStyle=stageC[i]; ctx.lineWidth=1.5;
    rr(bx,126,110,20,10); ctx.fill(); ctx.stroke();
    ctx.fillStyle=stageC[i]; ctx.font='bold 10px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(`${st}  Lv.${i*5+1}-${i*5+5}`,bx+55,136);
  });

  const gap=155, sx=canvas.width/2-gap;
  CARS.forEach((car,i)=>{
    const cx=sx+i*gap, sel=i===selectedCar, cy=sel?280+Math.sin(anim*0.06)*5:288;
    ctx.fillStyle=sel?'rgba(46,204,113,0.14)':'rgba(255,255,255,0.04)';
    ctx.strokeStyle=sel?'#2ecc71':'#444'; ctx.lineWidth=sel?2.5:1.2;
    rr(cx-58,cy-75,116,205,14); ctx.fill(); ctx.stroke();
    drawCar(cx,cy,car.w,car.h,car.color,car.accent,car.trim,1.5);
    ctx.fillStyle=sel?'#f1c40f':'#ccc'; ctx.font=sel?'bold 13px Arial':'12px Arial';
    ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText(car.name,cx,cy+84);
    ctx.fillStyle='#777'; ctx.font='11px Arial'; ctx.fillText(car.desc,cx,cy+100);
    ctx.fillStyle='#2a2a2a'; ctx.fillRect(cx-44,cy+115,88,7);
    ctx.fillStyle='#e74c3c'; ctx.fillRect(cx-44,cy+115,88*(car.spd/1.3),7);
    ctx.fillStyle='#888'; ctx.font='10px Arial'; ctx.textBaseline='top'; ctx.fillText('SPEED',cx,cy+125);
    ctx.fillStyle='#2a2a2a'; ctx.fillRect(cx-44,cy+136,88,7);
    ctx.fillStyle='#2ecc71'; ctx.fillRect(cx-44,cy+136,88*(car.hp/6),7);
    ctx.fillText('HP',cx,cy+146);
  });

  ctx.fillStyle='#2ecc71'; ctx.font='bold 30px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('◀',sx-50,288); ctx.fillText('▶',sx+gap*2+50,288);
  ctx.fillStyle='#555'; ctx.font='12px Arial'; ctx.textBaseline='top';
  ctx.fillText('← → keys or click arrows to select',canvas.width/2,510);

  ctx.fillStyle='#27ae60'; ctx.strokeStyle='#1a5e38'; ctx.lineWidth=2.5;
  rr(canvas.width/2-95,540,190,50,25); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.font='bold 22px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('▶  START RACE',canvas.width/2,565);
  ctx.fillStyle='#444'; ctx.font='11px Arial'; ctx.textBaseline='top';
  ctx.fillText('← → steer  |  ▲ Spikes = damage  |  Mud = slow  |  ⚡ = 2x speed',canvas.width/2,608);
}

function drawLevelWin() {
  drawBackground3D(); drawRoad3D();
  ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.shadowColor='#f39c12'; ctx.shadowBlur=30;
  ctx.fillStyle='#f1c40f'; ctx.font='bold 50px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('LEVEL CLEAR!',canvas.width/2,canvas.height/2-90); ctx.shadowBlur=0;
  if (currentLevel+1<LEVELS.length) {
    const nl=LEVELS[currentLevel+1];
    ctx.fillStyle='#2ecc71'; ctx.font='bold 20px Arial';
    ctx.fillText(`Next: Level ${nl.num}  —  ${nl.stage}`,canvas.width/2,canvas.height/2-38);
  }
  ctx.fillStyle='#ecf0f1'; ctx.font='18px Arial';
  ctx.fillText(`Total Score: ${Math.floor(totalScore)}`,canvas.width/2,canvas.height/2+12);
  const btnY=canvas.height/2+80;
  ctx.fillStyle='#27ae60'; ctx.strokeStyle='#1a5e38'; ctx.lineWidth=2;
  rr(canvas.width/2-95,btnY-24,190,48,24); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.font='bold 20px Arial'; ctx.fillText('NEXT LEVEL →',canvas.width/2,btnY);
  ctx.fillStyle='#555'; ctx.font='13px Arial'; ctx.fillText('Press ENTER or click',canvas.width/2,btnY+40);
}

function drawGameOverScreen() {
  drawBackground3D(); drawRoad3D();
  ctx.fillStyle='rgba(0,0,0,0.68)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  if (wonGame) {
    ctx.shadowColor='#f39c12'; ctx.shadowBlur=28;
    ctx.fillStyle='#f1c40f'; ctx.font='bold 46px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('YOU WON! 🏆',canvas.width/2,canvas.height/2-95);
    ctx.font='bold 24px Arial'; ctx.fillText('ALL 20 LEVELS COMPLETE!',canvas.width/2,canvas.height/2-48);
    ctx.shadowBlur=0;
  } else {
    ctx.shadowColor='#c0392b'; ctx.shadowBlur=24;
    ctx.fillStyle='#e74c3c'; ctx.font='bold 52px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('GAME OVER',canvas.width/2,canvas.height/2-80); ctx.shadowBlur=0;
    ctx.fillStyle='#aaa'; ctx.font='18px Arial';
    ctx.fillText(`Reached Level ${currentLevel+1} / 20`,canvas.width/2,canvas.height/2-35);
  }
  ctx.fillStyle='#ecf0f1'; ctx.font='22px Arial';
  ctx.fillText(`Final Score: ${Math.floor(totalScore)}`,canvas.width/2,canvas.height/2+20);
  const btnY=canvas.height/2+88;
  ctx.fillStyle='#27ae60'; ctx.strokeStyle='#1a5e38'; ctx.lineWidth=2;
  rr(canvas.width/2-150,btnY-22,130,44,22); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.font='bold 18px Arial'; ctx.fillText('RETRY',canvas.width/2-85,btnY);
  ctx.fillStyle='#2980b9'; ctx.strokeStyle='#1a5276'; ctx.lineWidth=2;
  rr(canvas.width/2+20,btnY-22,130,44,22); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.fillText('MENU',canvas.width/2+85,btnY);
  ctx.fillStyle='#555'; ctx.font='12px Arial'; ctx.fillText('R = retry   M = menu',canvas.width/2,btnY+36);
}

// ─── INPUT ─────────────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (state===S.SELECT) {
    if (e.key==='ArrowLeft')  selectedCar=(selectedCar+2)%3;
    if (e.key==='ArrowRight') selectedCar=(selectedCar+1)%3;
    if (e.key==='Enter'||e.key===' ') startGame();
  }
  if (state===S.LEVELWIN  && (e.key==='Enter'||e.key===' ')) nextLevel();
  if (state===S.GAMEOVER) {
    if (e.key==='r'||e.key==='R'||e.key==='Enter') retryLevel();
    if (e.key==='m'||e.key==='M') goMenu();
  }
  // Space: double-tap = jump, hold = boost
  if (e.key === ' ' && state === S.PLAYING) {
    const now = Date.now();
    if (now - lastSpaceTime < 320 && !isJumping) {
      isJumping = true; jumpVY = 14; playerJumpH = 1;
      addParticles(canvas.width/2, canvas.height - DASH_H - 20, '#fff', 10);
    }
    lastSpaceTime = now;
  }
  if (['ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

canvas.addEventListener('click', e => {
  const rect=canvas.getBoundingClientRect();
  const mx=(e.clientX-rect.left)*(canvas.width/rect.width);
  const my=(e.clientY-rect.top)*(canvas.height/rect.height);
  if (state===S.SELECT) {
    const gap=155, sx=canvas.width/2-gap;
    if (mx<sx-20&&my>250&&my<330) selectedCar=(selectedCar+2)%3;
    if (mx>sx+gap*2+20&&my>250&&my<330) selectedCar=(selectedCar+1)%3;
    CARS.forEach((_,i)=>{ const cx=sx+i*gap; if(Math.abs(mx-cx)<58&&my>205&&my<490) selectedCar=i; });
    if (mx>canvas.width/2-95&&mx<canvas.width/2+95&&my>540&&my<590) startGame();
  }
  if (state===S.LEVELWIN) {
    const btnY=canvas.height/2+80;
    if (mx>canvas.width/2-95&&mx<canvas.width/2+95&&my>btnY-24&&my<btnY+24) nextLevel();
  }
  if (state===S.GAMEOVER) {
    const btnY=canvas.height/2+88;
    if (mx>canvas.width/2-150&&mx<canvas.width/2-20&&my>btnY-22&&my<btnY+22) retryLevel();
    if (mx>canvas.width/2+20&&mx<canvas.width/2+150&&my>btnY-22&&my<btnY+22) goMenu();
  }
});

function startGame()  { currentLevel=0; totalScore=0; initGame(); state=S.PLAYING; }
function nextLevel()  { currentLevel++; initGame(); state=S.PLAYING; }
function retryLevel() { initGame(); state=S.PLAYING; }
function goMenu()     { state=S.SELECT; }

// ─── MAIN LOOP ─────────────────────────────────────────────────────────────

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state===S.SELECT) {
    drawCarSelect();
  } else if (state===S.PLAYING) {
    update();
    // Camera roll when steering
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.rotate(cameraRoll);
    ctx.translate(-canvas.width/2, -canvas.height/2);
    drawBackground3D();
    drawRoad3D();
    drawFinishLine();
    drawObstacles3D();
    drawPowerups3D();
    ctx.restore();

    drawDashboard();
    drawParticles();
    drawHUD();

    // Hit flash
    if (invTimer>0 && Math.floor(Date.now()/80)%2===0) {
      ctx.fillStyle='rgba(255,0,0,0.14)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    // Mud tint
    if (slowTimer>0) {
      ctx.fillStyle=`rgba(121,85,72,${Math.min(0.18, slowTimer/160*0.18)})`;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
  } else if (state===S.LEVELWIN) {
    anim++; drawLevelWin();
  } else if (state===S.GAMEOVER) {
    drawGameOverScreen();
  }

  requestAnimationFrame(loop);
}

loop();
