const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 540;
canvas.height = 700;

// Road bounds
const RL = 145, RR = 395, RW = RR - RL;

// States
const S = { SELECT: 0, PLAYING: 1, LEVELWIN: 2, GAMEOVER: 3 };
let state = S.SELECT;

// 20 levels
const LEVELS = Array.from({ length: 20 }, (_, i) => {
  const t = i / 19;
  const stage = i < 5 ? 'Beginner' : i < 10 ? 'Intermediate' : i < 15 ? 'Advanced' : 'Expert';
  return {
    num: i + 1, stage,
    targetDist: 2500 + i * 700,
    baseSpeed: 3.2 + t * 7,
    obstacleRate: Math.max(22, 85 - i * 3.2),
    powerupRate: Math.max(180, 380 - i * 10),
    spikeChance: 0.28 + t * 0.42,
  };
});

// Cars
const CARS = [
  { name: 'Sports Car',    desc: 'Fast & Furious',   color: '#e74c3c', accent: '#c0392b', trim: '#ff8a80', spd: 1.3, hnd: 0.21, w: 34, h: 58, hp: 3 },
  { name: 'Muscle Car',    desc: 'Balanced Beast',   color: '#f39c12', accent: '#d68910', trim: '#ffd166', spd: 1.0, hnd: 0.16, w: 40, h: 65, hp: 4 },
  { name: 'Monster Truck', desc: 'Tough & Steady',   color: '#27ae60', accent: '#1a7a44', trim: '#55efc4', spd: 0.7, hnd: 0.12, w: 50, h: 72, hp: 6 },
];

let selectedCar = 0;
let currentLevel = 0;
let totalScore = 0;

let player, obstacles, powerups, particles;
let roadOffset, levelDist, gameSpeed;
let doubleTimer, slowTimer, invTimer;
let spawnTimer, puTimer;
let keys = {};
let anim = 0;
let wonGame = false;

// Pre-generate crowd for tribunes
const CROWD_CLR = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#ecf0f1','#e91e63','#00bcd4'];
const crowd = [];
for (let row = 0; row < 7; row++) {
  for (let col = 0; col < 8; col++) {
    const c = CROWD_CLR[Math.floor(Math.random() * CROWD_CLR.length)];
    crowd.push({ lx: 6 + col * 16,  rx: RR + 10 + col * 16, y: 65 + row * 22, c, phase: Math.random() * Math.PI * 2 });
  }
}

// Roadside trees/bushes (static)
const trees = [];
for (let i = 0; i < 12; i++) {
  trees.push({ x: 10 + Math.random() * (RL - 30), y: 200 + i * 55, r: 14 + Math.random() * 10 });
  trees.push({ x: RR + 20 + Math.random() * (canvas.width - RR - 30), y: 200 + i * 55, r: 14 + Math.random() * 10 });
}

// ─── INIT ──────────────────────────────────────────────────────────────────

function initGame() {
  const car = CARS[selectedCar];
  const lvl = LEVELS[currentLevel];
  player = {
    x: canvas.width / 2, y: canvas.height - 130,
    vx: 0,
    w: car.w, h: car.h,
    color: car.color, accent: car.accent, trim: car.trim,
    spd: lvl.baseSpeed * car.spd,
    hnd: car.hnd,
    hp: car.hp, maxHp: car.hp,
  };
  obstacles = []; powerups = []; particles = [];
  roadOffset = 0; levelDist = 0;
  doubleTimer = 0; slowTimer = 0; invTimer = 0;
  spawnTimer = 0; puTimer = 0;
}

// ─── HELPERS ───────────────────────────────────────────────────────────────

function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax - aw * 0.38 < bx + bw / 2 && ax + aw * 0.38 > bx - bw / 2 &&
         ay - ah * 0.38 < by + bh / 2 && ay + ah * 0.38 > by - bh / 2;
}

function addParticles(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.5 + Math.random() * 3.5;
    particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: 1, color, size: 3 + Math.random() * 4 });
  }
}

// ─── DRAW BACKGROUND ───────────────────────────────────────────────────────

function drawBackground() {
  // Sky gradient (upper) → green field
  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, '#87ceeb');
  bg.addColorStop(0.18, '#b5e8b5');
  bg.addColorStop(0.4, '#4caf50');
  bg.addColorStop(1, '#2e7d32');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Cartoon clouds
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  [[60, 30], [200, 20], [380, 35], [480, 18]].forEach(([cx, cy]) => {
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 18, cy + 4, 14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - 14, cy + 4, 12, 0, Math.PI * 2); ctx.fill();
  });

  // Grass stripes
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  for (let y = 60; y < canvas.height; y += 50) {
    ctx.fillRect(0, y, canvas.width, 25);
  }
}

function drawTribunes() {
  // Left tribune
  ctx.fillStyle = '#a5c8a0';
  ctx.fillRect(0, 55, RL - 5, 170);
  // Row stripes
  for (let r = 0; r < 7; r++) {
    ctx.fillStyle = r % 2 === 0 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, 55 + r * 22, RL - 5, 22);
  }

  // Right tribune
  ctx.fillStyle = '#a5c8a0';
  ctx.fillRect(RR + 5, 55, canvas.width - RR - 5, 170);
  for (let r = 0; r < 7; r++) {
    ctx.fillStyle = r % 2 === 0 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
    ctx.fillRect(RR + 5, 55 + r * 22, canvas.width - RR - 5, 22);
  }

  // Tribune top roof/visor
  ctx.fillStyle = '#6aaf6a';
  ctx.beginPath(); ctx.roundRect(0, 48, RL - 5, 12, [0,4,4,0]); ctx.fill();
  ctx.fillStyle = '#6aaf6a';
  ctx.beginPath(); ctx.roundRect(RR + 5, 48, canvas.width - RR - 5, 12, [4,0,0,4]); ctx.fill();

  // Draw crowd
  const wobble = state === S.LEVELWIN ? 9 : 2.5;
  crowd.forEach(p => {
    const dy = Math.sin(anim * 0.09 + p.phase) * wobble;
    // Left side
    ctx.fillStyle = p.c;
    ctx.fillRect(p.lx - 5, p.y + dy + 4, 10, 11);
    ctx.fillStyle = '#fce8c8';
    ctx.beginPath(); ctx.arc(p.lx, p.y + dy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c49a6c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(p.lx, p.y + dy, 6, 0, Math.PI * 2); ctx.stroke();
    // Right side
    ctx.fillStyle = p.c;
    ctx.fillRect(p.rx - 5, p.y + dy + 4, 10, 11);
    ctx.fillStyle = '#fce8c8';
    ctx.beginPath(); ctx.arc(p.rx, p.y + dy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c49a6c';
    ctx.beginPath(); ctx.arc(p.rx, p.y + dy, 6, 0, Math.PI * 2); ctx.stroke();
  });

  // Railing
  ctx.strokeStyle = '#5a8a5a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 55 + 7 * 22); ctx.lineTo(RL - 5, 55 + 7 * 22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(RR + 5, 55 + 7 * 22); ctx.lineTo(canvas.width, 55 + 7 * 22); ctx.stroke();

  // Flag poles
  ctx.fillStyle = '#555';
  ctx.fillRect(12, 20, 4, 32);
  ctx.fillRect(canvas.width - 16, 20, 4, 32);

  // Waving flags
  const fw = Math.sin(anim * 0.1) * 4;
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath(); ctx.moveTo(16, 20); ctx.lineTo(38, 26 + fw); ctx.lineTo(16, 32); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3498db';
  ctx.beginPath(); ctx.moveTo(canvas.width - 12, 20); ctx.lineTo(canvas.width - 34, 26 + fw); ctx.lineTo(canvas.width - 12, 32); ctx.closePath(); ctx.fill();

  // Trees below tribunes
  const treeOffset = roadOffset * 0.3 % 55;
  trees.forEach(t => {
    const ty = ((t.y + treeOffset) % (canvas.height + 50)) - 25;
    if (ty < 230) return;
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath(); ctx.arc(t.x, ty, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#388e3c';
    ctx.beginPath(); ctx.arc(t.x - t.r*0.2, ty - t.r*0.2, t.r * 0.65, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(t.x - 3, ty + t.r - 2, 6, 12);
  });
}

function drawRoad() {
  // Road surface
  ctx.fillStyle = '#888';
  ctx.fillRect(RL, 0, RW, canvas.height);

  // Subtle horizontal texture lines
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let y = (-roadOffset % 55); y < canvas.height; y += 55) {
    ctx.fillRect(RL, y, RW, 3);
  }

  // Lane divider (dashed)
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.setLineDash([45, 28]);
  ctx.lineDashOffset = -(roadOffset % 73);
  ctx.lineWidth = 3;
  const mid = RL + RW / 2;
  ctx.beginPath(); ctx.moveTo(mid, 0); ctx.lineTo(mid, canvas.height); ctx.stroke();
  ctx.setLineDash([]);

  // Edge lines
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(RL, 0); ctx.lineTo(RL, canvas.height); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(RR, 0); ctx.lineTo(RR, canvas.height); ctx.stroke();

  // Curb stripes (animated)
  const sh = 22;
  for (let i = 0; i < Math.ceil(canvas.height / sh) + 2; i++) {
    const y = i * sh * 2 - (roadOffset % (sh * 2));
    ctx.fillStyle = i % 2 === 0 ? '#e74c3c' : '#fff';
    ctx.fillRect(RL - 9, y, 9, sh);
    ctx.fillRect(RR, y, 9, sh);
  }
}

// ─── DRAW CAR ──────────────────────────────────────────────────────────────

function drawCar(x, y, w, h, color, accent, trim, scale) {
  scale = scale || 1;
  const sw = w * scale, sh = h * scale;
  ctx.save();
  ctx.translate(x, y);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(3, sh/2 + 5, sw/2, 7, 0, 0, Math.PI*2); ctx.fill();

  // Body
  ctx.fillStyle = color; ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5 * scale;
  rr(-sw/2, -sh/2, sw, sh, 8*scale); ctx.fill(); ctx.stroke();

  // Hood
  ctx.fillStyle = accent;
  rr(-sw/2+3*scale, -sh/2, sw-6*scale, sh*0.33, [8*scale,8*scale,0,0]); ctx.fill(); ctx.stroke();

  // Windshield
  ctx.fillStyle = 'rgba(180,230,255,0.88)'; ctx.lineWidth = 1.5*scale;
  rr(-sw/2+6*scale, -sh/2+8*scale, sw-12*scale, sh*0.2, 4*scale); ctx.fill(); ctx.stroke();

  // Roof cabin
  ctx.fillStyle = accent; ctx.lineWidth = 2*scale;
  rr(-sw/2+5*scale, -sh/2+sh*0.28, sw-10*scale, sh*0.22, 4*scale); ctx.fill(); ctx.stroke();

  // Rear window
  ctx.fillStyle = 'rgba(180,230,255,0.6)'; ctx.lineWidth = 1.2*scale;
  rr(-sw/2+7*scale, -sh/2+sh*0.5, sw-14*scale, sh*0.13, 3*scale); ctx.fill(); ctx.stroke();

  // Trim stripe
  ctx.fillStyle = trim; ctx.lineWidth = 1*scale;
  ctx.fillRect(-sw/2, -3*scale, sw, 5*scale);
  ctx.strokeStyle = '#222'; ctx.strokeRect(-sw/2, -3*scale, sw, 5*scale);

  // Wheels
  const wy = sh*0.28, wx = sw/2+4*scale;
  [[-wx,-wy],[wx,-wy],[-wx,wy],[wx,wy]].forEach(([dx,dy]) => {
    ctx.fillStyle = '#111'; ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5*scale;
    rr(dx-6*scale, dy-10*scale, 12*scale, 18*scale, 3*scale); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#bbb';
    ctx.beginPath(); ctx.arc(dx, dy+1*scale, 4*scale, 0, Math.PI*2); ctx.fill();
  });

  // Headlights
  ctx.fillStyle = '#ffe066'; ctx.strokeStyle = '#cc9900'; ctx.lineWidth = 1.5*scale;
  rr(-sw/2+4*scale, -sh/2, sw/2-8*scale, 6*scale, 2*scale); ctx.fill(); ctx.stroke();
  rr(4*scale, -sh/2, sw/2-8*scale, 6*scale, 2*scale); ctx.fill(); ctx.stroke();

  // Taillights
  ctx.fillStyle = '#e74c3c'; ctx.strokeStyle = '#900'; ctx.lineWidth = 1.2*scale;
  rr(-sw/2+4*scale, sh/2-6*scale, sw/2-8*scale, 6*scale, 2*scale); ctx.fill(); ctx.stroke();
  rr(4*scale, sh/2-6*scale, sw/2-8*scale, 6*scale, 2*scale); ctx.fill(); ctx.stroke();

  ctx.restore();
}

// ─── DRAW OBSTACLES ────────────────────────────────────────────────────────

function drawSpike(o) {
  ctx.save(); ctx.translate(o.x, o.y);

  // Base strip with warning stripes
  const bx = -o.w/2, by = o.h/2-7, bw = o.w, bh = 7;
  ctx.save();
  ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
  const strW = 10;
  for (let i = 0; i <= Math.ceil(bw/strW)+1; i++) {
    ctx.fillStyle = i%2===0 ? '#f1c40f' : '#333';
    ctx.fillRect(bx + i*strW, by, strW, bh);
  }
  ctx.restore();
  ctx.strokeStyle = '#444'; ctx.lineWidth = 1.5;
  ctx.strokeRect(bx, by, bw, bh);

  // Spikes
  const count = Math.floor(o.w / 13);
  for (let i = 0; i < count; i++) {
    const sx = -o.w/2 + 7 + i * (o.w/count);
    ctx.fillStyle = '#c0392b'; ctx.strokeStyle = '#7b241c'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx-5, o.h/2-7);
    ctx.lineTo(sx-1, -o.h/2-4);
    ctx.lineTo(sx+1, -o.h/2-8);
    ctx.lineTo(sx+3, -o.h/2-4);
    ctx.lineTo(sx+5, o.h/2-7);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Metallic shine
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.moveTo(sx-1,o.h/2-7); ctx.lineTo(sx-2,-o.h/2); ctx.lineTo(sx,o.h/2-7); ctx.fill();
  }
  ctx.restore();
}

function drawMud(o) {
  ctx.save(); ctx.translate(o.x, o.y);

  ctx.fillStyle = '#5d4037';
  ctx.beginPath(); ctx.ellipse(0, 0, o.w/2+6, o.h/2+4, 0, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = '#795548';
  ctx.beginPath(); ctx.ellipse(0, 0, o.w/2, o.h/2, 0, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = '#8d6e63';
  ctx.beginPath(); ctx.ellipse(-o.w*0.1, -o.h*0.1, o.w*0.28, o.h*0.22, 0.4, 0, Math.PI*2); ctx.fill();

  // Splatter
  ctx.fillStyle = '#4e342e';
  [[-o.w*.45,-o.h*.25],[o.w*.4,o.h*.3],[-o.w*.3,o.h*.38],[o.w*.48,-o.h*.3]].forEach(([dx,dy]) => {
    ctx.beginPath(); ctx.ellipse(dx, dy, 8, 5, Math.random(), 0, Math.PI*2); ctx.fill();
  });

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `bold ${Math.max(10, o.w/6)}px Arial`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('MUD', 0, 0);
  ctx.restore();
}

function drawPowerup(p) {
  const bob = Math.sin(anim * 0.12 + p.phase) * 5;
  ctx.save(); ctx.translate(p.x, p.y + bob);

  // Glow
  const grd = ctx.createRadialGradient(0,0,2,0,0,24);
  grd.addColorStop(0,'rgba(255,220,0,0.85)'); grd.addColorStop(1,'rgba(255,220,0,0)');
  ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(0,0,24,0,Math.PI*2); ctx.fill();

  ctx.fillStyle = '#f39c12'; ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0,0,16,0,Math.PI*2); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(4,-13); ctx.lineTo(-2,0); ctx.lineTo(2,0); ctx.lineTo(-4,13);
  ctx.lineTo(7,-1); ctx.lineTo(3,-1); ctx.lineTo(9,-13);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ─── PARTICLES ─────────────────────────────────────────────────────────────

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function updateParticles() {
  particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.09; p.life -= 0.034; });
  particles = particles.filter(p => p.life > 0);
}

// ─── HUD ───────────────────────────────────────────────────────────────────

function drawHUD() {
  const lvl = LEVELS[currentLevel];

  // Top bar
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, canvas.width, 54);

  // Level + stage
  ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(`LVL ${lvl.num}/20  ${lvl.stage.toUpperCase()}`, 10, 7);

  // Score
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Score: ${Math.floor(totalScore + levelDist * 0.5)}`, canvas.width/2, 7);

  // HP
  ctx.textAlign = 'right'; ctx.font = '18px Arial';
  for (let i = 0; i < player.maxHp; i++) {
    ctx.fillStyle = i < player.hp ? '#e74c3c' : 'rgba(255,255,255,0.18)';
    const hx = canvas.width - 8 - i * Math.min(22, (canvas.width - 150) / player.maxHp);
    ctx.fillText('♥', hx, 5);
  }

  // Progress bar
  const prog = Math.min(levelDist / lvl.targetDist, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(10, 37, canvas.width - 20, 11);
  const barG = ctx.createLinearGradient(10, 0, canvas.width-20, 0);
  barG.addColorStop(0,'#27ae60'); barG.addColorStop(1,'#f1c40f');
  ctx.fillStyle = barG;
  ctx.fillRect(10, 37, (canvas.width-20)*prog, 11);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
  ctx.strokeRect(10, 37, canvas.width-20, 11);

  ctx.font = '11px Arial'; ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillText('🏁', canvas.width - 8, 36);

  // Double speed bar
  if (doubleTimer > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(canvas.width/2 - 68, 56, 136, 28);
    ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('⚡ 2X SPEED', canvas.width/2, 59);
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(canvas.width/2 - 58, 74, 116*(doubleTimer/300), 6);
  }

  // Mud slow bar
  if (slowTimer > 0) {
    const sy = doubleTimer > 0 ? 88 : 56;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(canvas.width/2 - 68, sy, 136, 24);
    ctx.fillStyle = '#795548'; ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('STUCK IN MUD!', canvas.width/2, sy + 5);
  }
}

// ─── UPDATE ────────────────────────────────────────────────────────────────

function update() {
  anim++;
  const lvl = LEVELS[currentLevel];
  let speed = doubleTimer > 0 ? lvl.baseSpeed * 2 : lvl.baseSpeed;
  if (slowTimer > 0) speed *= 0.32;

  roadOffset += speed;
  levelDist += speed;

  if (doubleTimer > 0) doubleTimer--;
  if (slowTimer > 0) slowTimer--;
  if (invTimer > 0) invTimer--;

  // Level complete
  if (levelDist >= lvl.targetDist) {
    totalScore += Math.floor(levelDist * 0.5) + player.hp * 250;
    state = currentLevel < LEVELS.length - 1 ? S.LEVELWIN : S.GAMEOVER;
    wonGame = currentLevel >= LEVELS.length - 1;
    return;
  }

  // Player movement
  const h = player.hnd * (slowTimer > 0 ? 0.5 : 1);
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) player.vx -= h;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) player.vx += h;
  player.vx *= 0.82;
  player.x += player.vx;
  player.x = Math.max(RL + player.w/2 + 3, Math.min(RR - player.w/2 - 3, player.x));

  // Spawn obstacles
  spawnTimer++;
  if (spawnTimer >= lvl.obstacleRate) {
    spawnTimer = 0;
    const x = RL + 25 + Math.random() * (RW - 50);
    const mud = Math.random() > lvl.spikeChance;
    obstacles.push({ x, y: -55, w: mud ? 72 : 52, h: mud ? 28 : 40, type: mud ? 'mud' : 'spike', hit: false });
  }

  // Spawn powerups
  puTimer++;
  if (puTimer >= lvl.powerupRate) {
    puTimer = 0;
    powerups.push({ x: RL+35+Math.random()*(RW-70), y: -35, w: 32, h: 32, phase: Math.random()*Math.PI*2 });
  }

  obstacles.forEach(o => o.y += speed);
  powerups.forEach(p => p.y += speed);
  obstacles = obstacles.filter(o => o.y < canvas.height + 90);
  powerups = powerups.filter(p => p.y < canvas.height + 50);

  // Collisions
  if (invTimer <= 0) {
    for (const o of obstacles) {
      if (o.hit) continue;
      if (overlap(player.x, player.y, player.w, player.h, o.x, o.y, o.w, o.h)) {
        o.hit = true;
        if (o.type === 'spike') {
          player.hp--;
          invTimer = 100;
          addParticles(player.x, player.y, '#e74c3c', 14);
          if (player.hp <= 0) { state = S.GAMEOVER; wonGame = false; }
        } else {
          slowTimer = 160;
          addParticles(player.x, player.y, '#795548', 10);
        }
      }
    }
  }
  powerups = powerups.filter(p => {
    if (overlap(player.x, player.y, player.w, player.h, p.x, p.y, p.w, p.h)) {
      doubleTimer = 300;
      addParticles(p.x, p.y, '#f1c40f', 18);
      return false;
    }
    return true;
  });

  updateParticles();
}

// ─── SCREENS ───────────────────────────────────────────────────────────────

function drawCarSelect() {
  anim++;

  // Dark green gradient bg
  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0,'#1a3a2a'); bg.addColorStop(1,'#0a1a10');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid lines
  ctx.strokeStyle = 'rgba(46,204,113,0.12)'; ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 28) {
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
  }

  // Title
  ctx.shadowColor = '#f39c12'; ctx.shadowBlur = 22;
  ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 40px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('EXTREME DRIVE', canvas.width/2, 28);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#2ecc71'; ctx.font = '15px Arial';
  ctx.fillText('20 LEVELS OF HIGH-SPEED CHAOS!', canvas.width/2, 80);

  ctx.fillStyle = '#8bc8a0'; ctx.font = '13px Arial';
  ctx.fillText('Choose your vehicle', canvas.width/2, 105);

  // Difficulty badges
  const stages = ['Beginner','Intermediate','Advanced','Expert'];
  const stageC = ['#2ecc71','#f39c12','#e74c3c','#9b59b6'];
  stages.forEach((st, i) => {
    const bx = 30 + i * 120;
    ctx.fillStyle = stageC[i]+'33';
    ctx.strokeStyle = stageC[i]; ctx.lineWidth = 1.5;
    rr(bx, 125, 110, 20, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = stageC[i]; ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${st}  Lv.${i*5+1}-${i*5+5}`, bx+55, 135);
  });

  // Car cards
  const gap = 155, sx = canvas.width/2 - gap;
  CARS.forEach((car, i) => {
    const cx = sx + i*gap;
    const sel = i === selectedCar;
    const cy = sel ? 280 + Math.sin(anim*0.06)*5 : 288;

    ctx.fillStyle = sel ? 'rgba(46,204,113,0.14)' : 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = sel ? '#2ecc71' : '#444'; ctx.lineWidth = sel ? 2.5 : 1.2;
    rr(cx-58, cy-75, 116, 205, 14); ctx.fill(); ctx.stroke();

    drawCar(cx, cy, car.w, car.h, car.color, car.accent, car.trim, 1.5);

    ctx.fillStyle = sel ? '#f1c40f' : '#ccc';
    ctx.font = sel ? 'bold 13px Arial' : '12px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(car.name, cx, cy + 84);

    ctx.fillStyle = '#777'; ctx.font = '11px Arial';
    ctx.fillText(car.desc, cx, cy + 100);

    // Speed bar
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(cx-44, cy+115, 88, 7);
    ctx.fillStyle = '#e74c3c'; ctx.fillRect(cx-44, cy+115, 88*(car.spd/1.3), 7);
    ctx.fillStyle = '#888'; ctx.font = '10px Arial'; ctx.textBaseline = 'top';
    ctx.fillText('SPEED', cx, cy+125);

    // HP bar
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(cx-44, cy+136, 88, 7);
    ctx.fillStyle = '#2ecc71'; ctx.fillRect(cx-44, cy+136, 88*(car.hp/6), 7);
    ctx.fillText('HP', cx, cy+146);
  });

  // Nav arrows
  ctx.fillStyle = '#2ecc71'; ctx.font = 'bold 30px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('◀', sx - 50, 288);
  ctx.fillText('▶', sx + gap*2 + 50, 288);

  ctx.fillStyle = '#555'; ctx.font = '12px Arial';
  ctx.fillText('← → keys or click arrows to select car', canvas.width/2, 510);

  // Start button
  const btnY = 540;
  ctx.fillStyle = '#27ae60'; ctx.strokeStyle = '#1a5e38'; ctx.lineWidth = 2.5;
  rr(canvas.width/2-95, btnY, 190, 50, 25); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('▶  START RACE', canvas.width/2, btnY+25);

  ctx.fillStyle = '#444'; ctx.font = '11px Arial';
  ctx.textBaseline = 'top';
  ctx.fillText('STEER: ← → keys   |   ▲ Spikes = damage   |   ☁ Mud = slow   |   ⚡ = 2x speed', canvas.width/2, 608);
}

function drawLevelWin() {
  drawBackground(); drawTribunes(); drawRoad();
  ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.shadowColor = '#f39c12'; ctx.shadowBlur = 30;
  ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 50px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('LEVEL CLEAR!', canvas.width/2, canvas.height/2 - 90);
  ctx.shadowBlur = 0;

  if (currentLevel + 1 < LEVELS.length) {
    const nl = LEVELS[currentLevel+1];
    ctx.fillStyle = '#2ecc71'; ctx.font = 'bold 20px Arial';
    ctx.fillText(`Next: Level ${nl.num}  —  ${nl.stage}`, canvas.width/2, canvas.height/2 - 38);
  }

  ctx.fillStyle = '#ecf0f1'; ctx.font = '18px Arial';
  ctx.fillText(`Total Score: ${Math.floor(totalScore)}`, canvas.width/2, canvas.height/2 + 12);

  const btnY = canvas.height/2 + 80;
  ctx.fillStyle = '#27ae60'; ctx.strokeStyle = '#1a5e38'; ctx.lineWidth = 2;
  rr(canvas.width/2-95, btnY-24, 190, 48, 24); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Arial';
  ctx.fillText('NEXT LEVEL →', canvas.width/2, btnY);

  ctx.fillStyle = '#555'; ctx.font = '13px Arial';
  ctx.fillText('Press ENTER or click to continue', canvas.width/2, btnY + 40);
}

function drawGameOverScreen() {
  drawBackground(); drawTribunes(); drawRoad();
  ctx.fillStyle = 'rgba(0,0,0,0.68)'; ctx.fillRect(0,0,canvas.width,canvas.height);

  if (wonGame) {
    ctx.shadowColor = '#f39c12'; ctx.shadowBlur = 28;
    ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 46px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('YOU WON! 🏆', canvas.width/2, canvas.height/2 - 95);
    ctx.font = 'bold 24px Arial';
    ctx.fillText('ALL 20 LEVELS COMPLETE!', canvas.width/2, canvas.height/2 - 48);
    ctx.shadowBlur = 0;
  } else {
    ctx.shadowColor = '#c0392b'; ctx.shadowBlur = 24;
    ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 52px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 80);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#aaa'; ctx.font = '18px Arial';
    ctx.fillText(`Reached Level ${currentLevel + 1} / 20`, canvas.width/2, canvas.height/2 - 35);
  }

  ctx.fillStyle = '#ecf0f1'; ctx.font = '22px Arial';
  ctx.fillText(`Final Score: ${Math.floor(totalScore)}`, canvas.width/2, canvas.height/2 + 20);

  const btnY = canvas.height/2 + 88;
  ctx.fillStyle = '#27ae60'; ctx.strokeStyle = '#1a5e38'; ctx.lineWidth = 2;
  rr(canvas.width/2-150, btnY-22, 130, 44, 22); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 18px Arial';
  ctx.fillText('RETRY', canvas.width/2-85, btnY);

  ctx.fillStyle = '#2980b9'; ctx.strokeStyle = '#1a5276'; ctx.lineWidth = 2;
  rr(canvas.width/2+20, btnY-22, 130, 44, 22); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.fillText('MENU', canvas.width/2+85, btnY);

  ctx.fillStyle = '#555'; ctx.font = '12px Arial';
  ctx.fillText('R = retry   M = menu', canvas.width/2, btnY+36);
}

// ─── INPUT ─────────────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (state === S.SELECT) {
    if (e.key === 'ArrowLeft') selectedCar = (selectedCar + 2) % 3;
    if (e.key === 'ArrowRight') selectedCar = (selectedCar + 1) % 3;
    if (e.key === 'Enter' || e.key === ' ') startGame();
  }
  if (state === S.LEVELWIN) {
    if (e.key === 'Enter' || e.key === ' ') nextLevel();
  }
  if (state === S.GAMEOVER) {
    if (e.key === 'r' || e.key === 'R' || e.key === 'Enter') retryLevel();
    if (e.key === 'm' || e.key === 'M') goMenu();
  }
  if (['ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (state === S.SELECT) {
    const gap = 155, sx = canvas.width/2 - gap;
    if (mx < sx-20 && my>250 && my<330) selectedCar = (selectedCar+2)%3;
    if (mx > sx+gap*2+20 && my>250 && my<330) selectedCar = (selectedCar+1)%3;
    CARS.forEach((_, i) => {
      const cx = sx + i*gap;
      if (Math.abs(mx-cx)<58 && my>205 && my<490) selectedCar = i;
    });
    if (mx>canvas.width/2-95 && mx<canvas.width/2+95 && my>540 && my<590) startGame();
  }
  if (state === S.LEVELWIN) {
    const btnY = canvas.height/2+80;
    if (mx>canvas.width/2-95 && mx<canvas.width/2+95 && my>btnY-24 && my<btnY+24) nextLevel();
  }
  if (state === S.GAMEOVER) {
    const btnY = canvas.height/2+88;
    if (mx>canvas.width/2-150 && mx<canvas.width/2-20 && my>btnY-22 && my<btnY+22) retryLevel();
    if (mx>canvas.width/2+20 && mx<canvas.width/2+150 && my>btnY-22 && my<btnY+22) goMenu();
  }
});

function startGame()  { currentLevel = 0; totalScore = 0; initGame(); state = S.PLAYING; }
function nextLevel()  { currentLevel++; initGame(); state = S.PLAYING; }
function retryLevel() { initGame(); state = S.PLAYING; }
function goMenu()     { state = S.SELECT; }

// ─── MAIN LOOP ─────────────────────────────────────────────────────────────

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state === S.SELECT) {
    drawCarSelect();
  } else if (state === S.PLAYING) {
    update();
    drawBackground();
    drawTribunes();
    drawRoad();
    obstacles.forEach(o => o.type === 'spike' ? drawSpike(o) : drawMud(o));
    powerups.forEach(p => drawPowerup(p));
    if (invTimer <= 0 || Math.floor(Date.now()/80)%2===0) {
      drawCar(player.x, player.y, player.w, player.h, player.color, player.accent, player.trim, 1);
    }
    drawParticles();
    drawHUD();
  } else if (state === S.LEVELWIN) {
    anim++;
    drawLevelWin();
  } else if (state === S.GAMEOVER) {
    drawGameOverScreen();
  }

  requestAnimationFrame(loop);
}

loop();
