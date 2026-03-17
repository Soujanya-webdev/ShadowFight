const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let W, H, groundY, gameRunning = false, gameOver = false;
 
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  groundY = H * 0.72;
}
resize();
window.addEventListener('resize', () => { resize(); if (!gameRunning) drawMenu(); });
 
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (['a','d','w','j','k','l',' '].includes(e.key.toLowerCase())) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
 
function announce(text, color = '#f5e0c0', duration = 1200) {
  const el = document.getElementById('announce');
  el.style.color = color;
  el.textContent = text;
  el.style.opacity = '1';
  setTimeout(() => el.style.opacity = '0', duration);
}
function showCombo(text) {
  const el = document.getElementById('combo-text');
  el.textContent = text;
  el.style.opacity = '1';
  setTimeout(() => el.style.opacity = '0', 900);
}
 
class Fighter {
  constructor(x, facingRight, isPlayer, name, color) {
    this.x = x; this.y = groundY; this.vy = 0;
    this.w = 52; this.h = 88;
    this.hp = 100; this.maxHp = 100;
    this.special = 0; this.maxSpecial = 3;
    this.facingRight = facingRight;
    this.isPlayer = isPlayer;
    this.name = name; this.color = color;
    this.state = 'idle'; this.stateTimer = 0;
    this.attacking = false; this.attackType = null;
    this.blocking = false; this.onGround = true;
    this.hitStun = 0; this.attackCooldown = 0;
    this.hitbox = null;
    this.animFrame = 0; this.animTimer = 0;
    this.comboCount = 0; this.comboTimer = 0;
    this.specialActive = false; this.specialTimer = 0;
    this.aiTimer = 0; this.flashTimer = 0;
    this.slashTrail = [];
  }
 
  update(opponent, dt) {
    this.animTimer++;
    if (this.animTimer % 8 === 0) this.animFrame = (this.animFrame + 1) % 4;
    if (this.hitStun > 0) this.hitStun -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.stateTimer > 0) this.stateTimer -= dt;
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.comboTimer > 0) { this.comboTimer -= dt; } else { this.comboCount = 0; }
    if (this.specialTimer > 0) { this.specialTimer -= dt; this.specialActive = true; } else { this.specialActive = false; }
 
    if (this.stateTimer <= 0 && !['idle','walk','jump'].includes(this.state)) {
      this.state = 'idle'; this.attacking = false; this.hitbox = null;
    }
 
    if (!this.onGround) {
      this.vy += 1400 * dt;
      this.y += this.vy * dt;
      if (this.y >= groundY) {
        this.y = groundY; this.vy = 0; this.onGround = true;
        if (this.state === 'jump') this.state = 'idle';
      }
    }
 
    const dx = opponent.x - this.x;
    this.facingRight = dx > 0;
 
    if (!this.isPlayer) { this.updateAI(opponent, dt); return; }
    this.handleInput(opponent, dt);
  }
 
  handleInput(opponent, dt) {
    if (this.hitStun > 0) return;
    if (keys['l'] && this.onGround && !this.attacking) {
      this.blocking = true; this.state = 'block'; return;
    } else { this.blocking = false; }
 
    const specialReady = this.special >= this.maxSpecial;
    if (keys['j'] && keys['k'] && specialReady && this.attackCooldown <= 0 && this.onGround) {
      this.doSpecial(); return;
    }
    if (keys['k'] && this.attackCooldown <= 0 && this.onGround) { this.attack('heavy'); return; }
    if (keys['j'] && this.attackCooldown <= 0) { this.attack('light'); return; }
    if (keys['w'] && this.onGround && this.state !== 'jump') { this.jump(); }
    if (keys['a']) { this.x -= 280 * dt; this.state = 'walk'; }
    else if (keys['d']) { this.x += 280 * dt; this.state = 'walk'; }
    else if (this.onGround && this.state === 'walk') { this.state = 'idle'; }
    this.x = Math.max(40, Math.min(W - 40, this.x));
  }
 
  updateAI(opponent, dt) {
    this.aiTimer -= dt;
    const dist = Math.abs(opponent.x - this.x);
    const myHpPct = this.hp / this.maxHp;
 
    if (this.hitStun > 0 || this.attacking) return;
 
    if (this.aiTimer <= 0) {
      this.aiTimer = 0.07 + Math.random() * 0.13;
      const aggression = 0.38 + (1 - myHpPct) * 0.45;
      const r = Math.random();
 
      if (dist < 95 && r < aggression) {
        if (this.special >= this.maxSpecial && Math.random() < 0.28) { this.doSpecial(); }
        else if (Math.random() < 0.55) { this.attack('light'); }
        else { this.attack('heavy'); }
      } else if (dist < 200 && Math.random() < 0.55) {
        this.x += (opponent.x > this.x ? 1 : -1) * 240 * 0.1;
        this.state = 'walk';
      } else if (dist < 130 && Math.random() < 0.22) {
        this.blocking = true; this.state = 'block';
        setTimeout(() => { this.blocking = false; this.state = 'idle'; }, 250 + Math.random()*200);
      } else if (dist > 190) {
        this.x += (opponent.x > this.x ? 1 : -1) * 200 * 0.1;
        this.state = 'walk';
      }
      if (Math.random() < 0.1 && this.onGround && dist < 160) { this.jump(); }
    }
    this.x = Math.max(40, Math.min(W - 40, this.x));
  }
 
  jump() {
    if (!this.onGround) return;
    this.vy = -700; this.onGround = false; this.state = 'jump';
  }
 
  attack(type) {
    if (this.attackCooldown > 0 || this.hitStun > 0) return;
    this.attacking = true; this.attackType = type;
    this.state = type === 'light' ? 'attack_light' : 'attack_heavy';
    const dur = type === 'light' ? 0.25 : 0.42;
    this.stateTimer = dur; this.attackCooldown = dur + 0.08;
    const dir = this.facingRight ? 1 : -1;
    const reach = type === 'light' ? 82 : 108;
    this.hitbox = { x: this.x + dir * 20, y: this.y - this.h * 0.62, w: reach, h: this.h * 0.72, type, dir };
    this.slashTrail = [];
    for (let i = 0; i < 7; i++) {
      this.slashTrail.push({
        x: this.x + dir * (18 + i*13),
        y: this.y - this.h * 0.52 + (Math.random()-0.5)*32,
        a: 1 - i*0.13
      });
    }
    setTimeout(() => { this.hitbox = null; this.attacking = false; }, dur * 800);
    if (this.special < this.maxSpecial) {
      this.special = Math.min(this.maxSpecial, this.special + (type === 'heavy' ? 0.5 : 0.25));
      this.updatePips();
    }
  }
 
  doSpecial() {
    if (this.special < this.maxSpecial) return;
    this.special = 0; this.updatePips();
    this.specialActive = true; this.specialTimer = 0.65;
    this.state = 'special'; this.stateTimer = 0.65;
    this.attacking = true; this.attackType = 'special';
    const dir = this.facingRight ? 1 : -1;
    this.hitbox = { x: this.x + dir * 10, y: this.y - this.h * 0.85, w: 165, h: this.h * 0.92, type: 'special', dir };
    this.slashTrail = [];
    for (let i = 0; i < 14; i++) {
      this.slashTrail.push({
        x: this.x + dir * (8 + i*12),
        y: this.y - this.h * 0.6 + (Math.random()-0.5)*55,
        a: 1 - i*0.065
      });
    }
    announce(this.isPlayer ? '⚡  ISSEN  ⚡' : '☯  SHADOW CUT  ☯', this.isPlayer ? '#f5c050' : '#80c0f0', 1500);
    setTimeout(() => { this.hitbox = null; this.attacking = false; }, 520);
  }
 
  checkHit(opponent) {
    if (!this.hitbox) return;
    if (opponent.hitStun > 0) return;
    const hb = this.hitbox;
    const ox = opponent.x - opponent.w / 2;
    const oy = opponent.y - opponent.h;
    const hbX = hb.dir > 0 ? hb.x : hb.x - hb.w;
    const hit = hbX < ox + opponent.w && hbX + hb.w > ox && hb.y < oy + opponent.h && hb.y + hb.h > oy;
    if (hit) {
      let dmg = hb.type === 'light' ? 8 : hb.type === 'heavy' ? 15 : 30;
      if (opponent.blocking) dmg = Math.floor(dmg * 0.12);
      opponent.hp = Math.max(0, opponent.hp - dmg);
      opponent.hitStun = hb.type === 'special' ? 0.72 : (hb.type === 'heavy' ? 0.4 : 0.22);
      opponent.flashTimer = 0.16;
      if (this.isPlayer) {
        this.comboCount++;
        this.comboTimer = 1.2;
        if (this.comboCount >= 3) showCombo(this.comboCount + ' HIT COMBO!');
      }
      spawnHitParticles(hbX + hb.w * 0.5, hb.y + hb.h * 0.5, hb.type);
      addInkSplatter((this.x + opponent.x) / 2 + (Math.random()-0.5)*60);
      this.hitbox = null;
      updateHPBars();
    }
  }
 
  updatePips() {
    const id = this.isPlayer ? 'p1-pips' : 'p2-pips';
    const el = document.getElementById(id);
    el.innerHTML = '';
    for (let i = 0; i < this.maxSpecial; i++) {
      const pip = document.createElement('div');
      pip.className = 'pip' + (i < Math.floor(this.special) ? ' filled' : (i < this.special ? ' filled' : ''));
      el.appendChild(pip);
    }
  }
 
  draw() {
    const px = this.x, py = this.y;
    const dir = this.facingRight ? 1 : -1;
    const flash = this.flashTimer > 0;
    const isHurt = this.hitStun > 0;
    const bodyColor = this.isPlayer ? '#18100a' : '#090e18';
    const accentColor = this.isPlayer ? '#c05820' : '#2068b8';
 
    ctx.save();
    if (flash) { ctx.globalAlpha = 0.35 + Math.random() * 0.4; }
 
    // Shadow on ground
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(px, py + 3, 28, 7, 0, 0, Math.PI * 2);
    ctx.fill();
 
    ctx.translate(px, py);
    if (isHurt) ctx.translate((Math.random() - 0.5) * 5, 0);
 
    // Hakama (lower robe)
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-15, -44); ctx.lineTo(15, -44);
    ctx.lineTo(20, 0); ctx.lineTo(-20, 0);
    ctx.closePath(); ctx.fill();
 
    // Center split in hakama
    ctx.strokeStyle = '#0a0806'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -44); ctx.lineTo(0, 0); ctx.stroke();
 
    // Gi (upper robe)
    ctx.fillStyle = isHurt ? '#2a1208' : bodyColor;
    ctx.beginPath();
    ctx.moveTo(-14, -44); ctx.lineTo(14, -44);
    ctx.lineTo(17, -74); ctx.lineTo(-17, -74);
    ctx.closePath(); ctx.fill();
 
    // Accent stripe on gi
    ctx.fillStyle = accentColor + '99';
    ctx.fillRect(dir > 0 ? -3 : -9, -74, 7, 30);
 
    // Obi (belt)
    ctx.fillStyle = accentColor;
    ctx.fillRect(-16, -47, 32, 5);
 
    // Head
    ctx.fillStyle = isHurt ? '#2a1a12' : bodyColor;
    ctx.beginPath();
    ctx.arc(0, -83, 13, 0, Math.PI * 2);
    ctx.fill();
 
    // Neck
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(-5, -74, 10, 8);
 
    // Topknot
    ctx.fillStyle = '#0c0a08';
    ctx.beginPath();
    ctx.ellipse(dir * 2, -95, 4, 9, dir * 0.25, 0, Math.PI * 2);
    ctx.fill();
 
    // Eyes glow
    ctx.fillStyle = accentColor;
    ctx.fillRect(dir * 2, -87, 6, 3);
    if (this.specialActive) {
      ctx.shadowColor = accentColor; ctx.shadowBlur = 8;
      ctx.fillRect(dir * 2, -87, 6, 3);
      ctx.shadowBlur = 0;
    }
 
    // Sword
    const swordAng =
      this.state === 'attack_light' ? dir * -0.95 :
      this.state === 'attack_heavy' ? dir * -1.35 :
      this.state === 'special' ? dir * -1.65 : dir * 0.18;
 
    ctx.save();
    ctx.translate(dir * 9, -52);
    ctx.rotate(swordAng);
    // Tsuka (handle)
    ctx.fillStyle = '#3a2012';
    ctx.beginPath();
    ctx.roundRect(-4, 0, 8, 22, 2);
    ctx.fill();
    // Handle wrap lines
    ctx.strokeStyle = '#5a3820'; ctx.lineWidth = 1;
    for (let i = 4; i < 22; i += 5) {
      ctx.beginPath(); ctx.moveTo(-4, i); ctx.lineTo(4, i); ctx.stroke();
    }
    // Tsuba (guard)
    ctx.fillStyle = '#887050';
    ctx.beginPath();
    ctx.ellipse(0, 20, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Blade
    const bladeGlow = this.specialActive;
    ctx.fillStyle = bladeGlow ? '#d8eeff' : '#d0cac0';
    ctx.beginPath();
    ctx.moveTo(-3, 22); ctx.lineTo(3, 22);
    ctx.lineTo(0.8, 80); ctx.lineTo(-0.8, 80);
    ctx.closePath(); ctx.fill();
    // Blade shine
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(-0.5, 22); ctx.lineTo(1.5, 22);
    ctx.lineTo(0.5, 75); ctx.closePath(); ctx.fill();
    if (bladeGlow) {
      ctx.shadowColor = '#60aaff'; ctx.shadowBlur = 16;
      ctx.strokeStyle = '#80c0ff'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-3, 22); ctx.lineTo(3, 22);
      ctx.lineTo(0.8, 80); ctx.lineTo(-0.8, 80);
      ctx.closePath(); ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
 
    // Arm
    const armEndX = this.state.includes('attack') || this.state === 'special'
      ? dir * 26 : dir * 16;
    const armEndY = this.state.includes('attack') || this.state === 'special'
      ? -50 : -58;
    ctx.strokeStyle = isHurt ? '#2a1208' : bodyColor;
    ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(dir * -10, -70);
    ctx.quadraticCurveTo(dir * 18, -62, armEndX, armEndY);
    ctx.stroke();
 
    // Back arm
    ctx.lineWidth = 7;
    ctx.strokeStyle = isHurt ? '#1e0e06' : (this.isPlayer ? '#120c06' : '#060c12');
    ctx.beginPath();
    ctx.moveTo(dir * 10, -68);
    ctx.lineTo(dir * -14, -52);
    ctx.stroke();
 
    // Blocking sword guard visual
    if (this.blocking) {
      ctx.strokeStyle = '#f0d080'; ctx.lineWidth = 2.5;
      ctx.shadowColor = '#f0d080'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(dir * -22, -80); ctx.lineTo(dir * -22, -18); ctx.stroke();
      ctx.shadowBlur = 0;
    }
 
    // Slash trail
    if (this.slashTrail.length > 0 && this.attacking) {
      ctx.lineCap = 'round';
      this.slashTrail.forEach(s => {
        const c = this.attackType === 'special' ? `rgba(140,200,255,${s.a * 0.65})` : `rgba(255,215,170,${s.a * 0.45})`;
        ctx.strokeStyle = c;
        ctx.lineWidth = this.attackType === 'special' ? 3 : 1.8;
        ctx.beginPath();
        ctx.moveTo(s.x - px + (Math.random()-0.5)*10, s.y - py);
        ctx.lineTo(s.x - px + dir * 22 + (Math.random()-0.5)*10, s.y - py - 12);
        ctx.stroke();
        s.a *= 0.82;
      });
    }
 
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
 
let p1, p2, particles = [], bgParticles = [], inkSplatters = [];
let gameTimer = 60, timerInterval;
 
function spawnHitParticles(x, y, type) {
  const count = type === 'special' ? 22 : type === 'heavy' ? 13 : 7;
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 90 + Math.random() * 230;
    particles.push({
      x, y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd - 110,
      life: 1,
      maxLife: 0.35 + Math.random() * 0.4,
      color: type === 'special' ? '#a0d0ff' : (Math.random() < 0.5 ? '#f5c050' : '#e85020'),
      size: 2 + Math.random() * (type === 'special' ? 5 : 3.5),
      static: false
    });
  }
  for (let i = 0; i < 5; i++) {
    particles.push({
      x: x + (Math.random()-0.5)*70, y: y + (Math.random()-0.5)*45,
      vx: 0, vy: 0, life: 1, maxLife: 2.5 + Math.random(),
      color: 'rgba(12,6,3,0.55)', size: 3 + Math.random() * 7, static: true
    });
  }
}
 
function addInkSplatter(x) {
  if (inkSplatters.length > 30) inkSplatters.shift();
  inkSplatters.push({
    x, y: groundY + 5 + Math.random() * 10,
    rx: 7 + Math.random() * 22, ry: 3 + Math.random() * 6,
    rot: Math.random() * Math.PI,
    color: Math.random() < 0.3 ? 'rgba(200,60,10,0.18)' : 'rgba(10,5,2,0.5)'
  });
}
 
function initBgParticles() {
  bgParticles = [];
  for (let i = 0; i < 45; i++) {
    bgParticles.push({
      x: Math.random() * W, y: Math.random() * H * 0.78,
      size: 0.5 + Math.random() * 1.8,
      speed: 0.2 + Math.random() * 0.55,
      opacity: 0.08 + Math.random() * 0.28
    });
  }
}
 
function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.74);
  sky.addColorStop(0, '#08040a');
  sky.addColorStop(0.38, '#100810');
  sky.addColorStop(0.75, '#180e06');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
 
  // Stars
  ctx.fillStyle = 'rgba(240,230,200,0.6)';
  const starPositions = [[0.08,0.06],[0.18,0.03],[0.33,0.08],[0.55,0.04],[0.68,0.09],[0.82,0.05],[0.91,0.07],[0.12,0.12],[0.46,0.12],[0.77,0.14],[0.25,0.16],[0.6,0.17]];
  starPositions.forEach(([sx,sy]) => {
    ctx.beginPath();
    ctx.arc(W*sx, H*sy, 0.8 + Math.random()*0.5, 0, Math.PI*2);
    ctx.fill();
  });
 
  // Moon
  ctx.fillStyle = '#f0e8d0';
  ctx.shadowColor = 'rgba(240,230,200,0.4)'; ctx.shadowBlur = 50;
  ctx.beginPath(); ctx.arc(W * 0.76, H * 0.17, 40, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#0c060e';
  ctx.beginPath(); ctx.arc(W * 0.76 + 14, H * 0.17 - 7, 36, 0, Math.PI * 2); ctx.fill();
 
  // Far mountains
  ctx.fillStyle = '#0c0610';
  ctx.beginPath(); ctx.moveTo(0, H*0.62); ctx.lineTo(W*0.16, H*0.26); ctx.lineTo(W*0.34, H*0.62); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W*0.22, H*0.62); ctx.lineTo(W*0.44, H*0.2); ctx.lineTo(W*0.63, H*0.62); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W*0.56, H*0.62); ctx.lineTo(W*0.73, H*0.28); ctx.lineTo(W*0.92, H*0.62); ctx.fill();
 
  // Near treeline left
  ctx.fillStyle = '#07050a';
  const drawPine = (x, h, w) => {
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x - w*0.5, groundY - h*0.28);
    ctx.lineTo(x - w*0.3, groundY - h*0.28);
    ctx.lineTo(x - w*0.36, groundY - h*0.54);
    ctx.lineTo(x - w*0.18, groundY - h*0.54);
    ctx.lineTo(x, groundY - h);
    ctx.lineTo(x + w*0.18, groundY - h*0.54);
    ctx.lineTo(x + w*0.36, groundY - h*0.54);
    ctx.lineTo(x + w*0.3, groundY - h*0.28);
    ctx.lineTo(x + w*0.5, groundY - h*0.28);
    ctx.closePath(); ctx.fill();
  };
  for (let i = 0; i < 6; i++) drawPine(W*0.04 + i*W*0.042, 75+Math.sin(i*1.3)*18, 30+i*2);
  for (let i = 0; i < 5; i++) drawPine(W*0.71 + i*W*0.058, 68+Math.cos(i*1.1)*16, 27);
 
  // Ground
  const grd = ctx.createLinearGradient(0, groundY, 0, H);
  grd.addColorStop(0, '#1a1008'); grd.addColorStop(0.5, '#0e0a05'); grd.addColorStop(1, '#06040202');
  ctx.fillStyle = grd; ctx.fillRect(0, groundY, W, H - groundY);
 
  // Ground edge line
  ctx.strokeStyle = '#352010'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
 
  // Ink splatters on ground
  inkSplatters.forEach(s => {
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.rx, s.ry, s.rot, 0, Math.PI * 2);
    ctx.fill();
  });
 
  // Dust particles
  bgParticles.forEach(p => {
    p.x -= p.speed;
    if (p.x < 0) p.x = W;
    ctx.fillStyle = `rgba(200,180,150,${p.opacity})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  });
}
 
function updateHPBars() {
  document.getElementById('p1-hp-bar').style.width = (p1.hp / p1.maxHp * 100) + '%';
  document.getElementById('p2-hp-bar').style.width = (p2.hp / p2.maxHp * 100) + '%';
}
 
let lastTime = 0;
function gameLoop(ts) {
  if (!gameRunning) return;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
 
  ctx.clearRect(0, 0, W, H);
  drawBackground();
 
  // Update & draw particles
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    if (!p.static) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 380 * dt;
    }
    p.life -= dt / p.maxLife;
    ctx.globalAlpha = Math.max(0, p.life * 0.9);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (p.static ? 1 : Math.max(0.1, p.life)), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
 
  if (!gameOver) {
    p1.update(p2, dt);
    p2.update(p1, dt);
    p1.checkHit(p2);
    p2.checkHit(p1);
  }
 
  p2.draw();
  p1.draw();
 
  // Check win condition
  if (!gameOver && (p1.hp <= 0 || p2.hp <= 0)) {
    gameOver = true;
    clearInterval(timerInterval);
    const winner = p1.hp <= 0 ? 'Ronin — AI' : 'Kensei';
    setTimeout(() => showEndScreen(winner), 700);
  }
 
  requestAnimationFrame(gameLoop);
}
 
function showEndScreen(winner) {
  const isPlayerWin = winner === 'Kensei';
  document.getElementById('overlay').style.display = 'flex';
  document.getElementById('overlay').innerHTML = `
    <h1 style="font-size:48px;margin-bottom:8px">${isPlayerWin ? '勝利' : '敗北'}</h1>
    <h2 style="margin-bottom:16px">${winner} wins the duel</h2>
    <p style="color:#605040;font-size:11px;letter-spacing:2px;margin-bottom:32px">${isPlayerWin ? 'Your blade is unmatched.' : 'The shadow overcomes you.'}</p>
    <button class="btn" onclick="startGame()">Fight Again</button>
    <button class="btn" onclick="showMainMenu()" style="margin-top:4px">Main Menu</button>
  `;
}
 
function showMainMenu() {
  gameRunning = false;
  document.getElementById('overlay').style.display = 'flex';
  document.getElementById('overlay').innerHTML = `
    <h1>影の剣</h1>
    <h2>Shadow Blade</h2>
    <button class="btn" onclick="startGame()">Begin Duel</button>
    <div class="controls-hint">
      <div><span>A / D</span><br>Move Left / Right</div>
      <div><span>W</span><br>Jump</div>
      <div><span>J</span><br>Light Attack</div>
      <div><span>K</span><br>Heavy Attack</div>
      <div><span>L</span><br>Block</div>
      <div><span>J + K</span><br>Special Move (3 pips)</div>
    </div>`;
}
 
function startGame() {
  document.getElementById('overlay').style.display = 'none';
  gameOver = false; gameRunning = true;
  particles = []; inkSplatters = [];
  p1 = new Fighter(W * 0.3, true, true, 'Kensei', '#c05820');
  p2 = new Fighter(W * 0.7, false, false, 'Ronin', '#2060b0');
  p1.updatePips(); p2.updatePips();
  updateHPBars();
  initBgParticles();
  gameTimer = 60;
  document.getElementById('timer').textContent = '60';
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!gameRunning || gameOver) return;
    gameTimer--;
    document.getElementById('timer').textContent = gameTimer;
    if (gameTimer <= 10) document.getElementById('timer').style.color = '#e85020';
    else document.getElementById('timer').style.color = '#f0e8d8';
    if (gameTimer <= 0) {
      clearInterval(timerInterval);
      gameOver = true;
      const winner = p1.hp >= p2.hp ? 'Kensei' : 'Ronin — AI';
      setTimeout(() => showEndScreen(winner), 400);
    }
  }, 1000);
 
  setTimeout(() => announce('FIGHT!', '#f5e0c0', 1200), 900);
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}
 
// Draw initial menu background
function drawMenu() {
  ctx.clearRect(0, 0, W, H);
  initBgParticles();
  drawBackground();
}
drawMenu();
