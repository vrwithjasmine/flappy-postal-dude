const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 600;
const H = 600;

// Load POSTAL Dude sprite
const dudeImg = new Image();
dudeImg.src = 'img/postal-dude.png';
let dudeLoaded = false;
dudeImg.onload = () => { dudeLoaded = true; };

// Game state
let state = 'menu'; // menu, playing, dead
let score = 0;
let highScore = parseInt(localStorage.getItem('flappyPostalHigh') || '0');
let frameCount = 0;

// Bird (POSTAL Dude)
const bird = {
  x: 150,
  y: 300,
  w: 56,
  h: 56,
  vy: 0,
  gravity: 0.15,
  flapPower: -4.2,
  maxFall: 3,
  rotation: 0
};

// Pipes
let pipes = [];
const pipeWidth = 70;
const pipeGap = 240;
const pipeSpeed = 2.8;
const pipeSpawnInterval = 110;
let pipeTimer = 0;

// Particles (shell casings on death)
let particles = [];

// Speech bubble quotes
let currentQuote = '';
let lastQuoteTime = 0;
let quoteOpacity = 0;
const quotes = [
  'Sign my petition.',
  "I'm not here to cause trouble.",
  "What a day...",
  "I just need to get milk.",
  "I regret nothing.",
  "This can't be good.",
  "Now I'm mad.",
  "I knew I shoulda stayed home.",
  "Life is just beautiful.",
  "Is it Friday yet?",
  "Only my weapon understands me.",
  "I'm the Postal Dude!",
  "Paradise... what a dump.",
  "Wow, what a day.",
  "That wasn't very nice.",
  "Buttwipe.",
];

function updateQuote() {
  if (state !== 'playing') { quoteOpacity = 0; return; }
  const now = Date.now();
  const quoteInterval = 7000 + Math.random() * 3000;
  if (now - lastQuoteTime >= quoteInterval || lastQuoteTime === 0) {
    currentQuote = quotes[Math.floor(Math.random() * quotes.length)];
    lastQuoteTime = now;
    quoteOpacity = 1;
  }
  const elapsed = now - lastQuoteTime;
  if (elapsed < 500) {
    quoteOpacity = elapsed / 500;
  } else if (elapsed > 5500) {
    quoteOpacity = Math.max(0, 1 - (elapsed - 5500) / 1500);
  } else {
    quoteOpacity = 1;
  }
}

// Paradise, AZ skyline (low desert town buildings)
const buildings = [];
for (let i = 0; i < 20; i++) {
  const type = Math.random();
  let h, w;
  if (type < 0.3) {
    // Trailer / low building
    h = 30 + Math.random() * 40;
    w = 35 + Math.random() * 30;
  } else if (type < 0.7) {
    // Strip mall / store
    h = 50 + Math.random() * 60;
    w = 25 + Math.random() * 35;
  } else {
    // Taller building (church steeple, gas station sign)
    h = 80 + Math.random() * 100;
    w = 15 + Math.random() * 25;
  }
  buildings.push({
    x: i * 35,
    w, h, type,
    shade: 25 + Math.random() * 20,
    roofColor: Math.random() > 0.5 ? '#5a3a2a' : '#4a4a3a'
  });
}

// Cacti
const cacti = [];
for (let i = 0; i < 6; i++) {
  cacti.push({
    x: 30 + Math.random() * 570,
    h: 20 + Math.random() * 35,
    arms: Math.floor(Math.random() * 3)
  });
}

// Ground
const groundY = 560;
let groundScroll = 0;

function reset() {
  bird.y = 300;
  bird.vy = 0;
  bird.rotation = 0;
  pipes = [];
  particles = [];
  pipeTimer = 60;
  score = 0;
  frameCount = 0;
  lastQuoteTime = 0;
  currentQuote = '';
  quoteOpacity = 0;
}

function flap() {
  if (state === 'menu') {
    state = 'playing';
    reset();
    bird.vy = bird.flapPower;
  } else if (state === 'playing') {
    bird.vy = bird.flapPower;
  } else if (state === 'dead' && frameCount > 30) {
    state = 'menu';
  }
}

// Input
canvas.addEventListener('click', flap);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); flap(); });
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); flap(); }
});

function spawnPipe() {
  const minTop = 60;
  const maxTop = groundY - pipeGap - 60;
  const topH = minTop + Math.random() * (maxTop - minTop);
  pipes.push({
    x: W + 10,
    topH: topH,
    scored: false
  });
}

function spawnParticles(x, y) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.8) * 6,
      life: 40 + Math.random() * 20,
      size: 2 + Math.random() * 3,
      color: Math.random() > 0.5 ? '#FFD700' : '#FF6B35'
    });
  }
}

function update() {
  frameCount++;

  if (state === 'playing') {
    // Bird physics - gentle gravity, capped fall speed
    bird.vy += bird.gravity;
    if (bird.vy > bird.maxFall) bird.vy = bird.maxFall;
    bird.y += bird.vy;

    // Gentle rotation - less dramatic tilt
    bird.rotation = Math.min(bird.vy * 2, 35);

    // Ground scroll
    groundScroll = (groundScroll + pipeSpeed) % 40;

    // Pipe spawning
    pipeTimer++;
    if (pipeTimer >= pipeSpawnInterval) {
      spawnPipe();
      pipeTimer = 0;
    }

    // Pipe movement
    for (let i = pipes.length - 1; i >= 0; i--) {
      pipes[i].x -= pipeSpeed;

      // Score
      if (!pipes[i].scored && pipes[i].x + pipeWidth < bird.x) {
        pipes[i].scored = true;
        score++;
      }

      // Remove offscreen
      if (pipes[i].x + pipeWidth < -10) {
        pipes.splice(i, 1);
      }
    }

    // Collision detection
    const bx = bird.x - bird.w / 2;
    const by = bird.y - bird.h / 2;
    const bw = bird.w - 8;
    const bh = bird.h - 8;

    // Ground/ceiling
    if (bird.y + bird.h / 2 > groundY || bird.y - bird.h / 2 < 0) {
      die();
      return;
    }

    // Pipe collision
    for (const p of pipes) {
      if (bx + bw > p.x && bx < p.x + pipeWidth) {
        if (by < p.topH || by + bh > p.topH + pipeGap) {
          die();
          return;
        }
      }
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }

  updateQuote();

  // Menu bob
  if (state === 'menu') {
    bird.y = 300 + Math.sin(frameCount * 0.05) * 15;
    bird.rotation = 0;
  }
}

function die() {
  state = 'dead';
  frameCount = 0;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('flappyPostalHigh', highScore.toString());
  }
  spawnParticles(bird.x, bird.y);
}

function drawBackground() {
  // Desert sunset sky
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a0a1a');
  grad.addColorStop(0.3, '#2a1520');
  grad.addColorStop(0.5, '#4a2020');
  grad.addColorStop(0.7, '#6a3520');
  grad.addColorStop(1, '#3a2515');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Desert mountains in background
  ctx.fillStyle = '#2a1a15';
  ctx.beginPath();
  ctx.moveTo(0, groundY - 60);
  ctx.lineTo(80, groundY - 130);
  ctx.lineTo(150, groundY - 90);
  ctx.lineTo(220, groundY - 150);
  ctx.lineTo(300, groundY - 100);
  ctx.lineTo(380, groundY - 160);
  ctx.lineTo(450, groundY - 110);
  ctx.lineTo(530, groundY - 140);
  ctx.lineTo(600, groundY - 80);
  ctx.lineTo(600, groundY);
  ctx.lineTo(0, groundY);
  ctx.fill();

  // Paradise AZ skyline
  for (const b of buildings) {
    // Building body - dusty desert colors
    const r = b.shade + 15;
    const g = b.shade + 5;
    const bl = b.shade;
    ctx.fillStyle = `rgb(${r}, ${g}, ${bl})`;
    ctx.fillRect(b.x, groundY - b.h, b.w, b.h);

    // Flat roof top
    ctx.fillStyle = b.roofColor;
    ctx.fillRect(b.x - 2, groundY - b.h, b.w + 4, 5);

    // Windows / doors
    if (b.type < 0.3) {
      // Trailer - small windows
      ctx.fillStyle = 'rgba(255, 180, 60, 0.25)';
      for (let wx = b.x + 6; wx < b.x + b.w - 8; wx += 14) {
        ctx.fillRect(wx, groundY - b.h + 10, 6, 5);
      }
    } else {
      // Storefronts
      ctx.fillStyle = 'rgba(255, 180, 60, 0.2)';
      for (let wy = groundY - b.h + 10; wy < groundY - 10; wy += 18) {
        for (let wx = b.x + 4; wx < b.x + b.w - 8; wx += 12) {
          if (Math.random() > 0.4) {
            ctx.fillRect(wx, wy, 7, 9);
          }
        }
      }
    }
  }

  // Cacti silhouettes
  ctx.fillStyle = '#1a1210';
  for (const c of cacti) {
    // Trunk
    ctx.fillRect(c.x - 3, groundY - c.h, 6, c.h);
    // Arms
    if (c.arms >= 1) {
      ctx.fillRect(c.x - 12, groundY - c.h * 0.7, 12, 4);
      ctx.fillRect(c.x - 12, groundY - c.h * 0.7 - 10, 4, 14);
    }
    if (c.arms >= 2) {
      ctx.fillRect(c.x + 3, groundY - c.h * 0.5, 10, 4);
      ctx.fillRect(c.x + 9, groundY - c.h * 0.5 - 8, 4, 12);
    }
  }
}

function drawGround() {
  // Sandy desert ground
  ctx.fillStyle = '#5a4530';
  ctx.fillRect(0, groundY, W, H - groundY);

  // Sidewalk / road edge
  ctx.fillStyle = '#6a5540';
  ctx.fillRect(0, groundY, W, 4);

  // Dirt/gravel texture
  ctx.fillStyle = '#4a3520';
  for (let i = -40; i < W + 40; i += 20) {
    const x = i - groundScroll;
    ctx.fillRect(x, groundY + 6 + Math.sin(i) * 2, 8, 2);
    ctx.fillRect(x + 10, groundY + 14 + Math.cos(i) * 3, 5, 2);
  }
}

function drawPipes(p) {
  // Rusty metal pipes
  const pGrad = ctx.createLinearGradient(p.x, 0, p.x + pipeWidth, 0);
  pGrad.addColorStop(0, '#4a3020');
  pGrad.addColorStop(0.2, '#6a4530');
  pGrad.addColorStop(0.5, '#7a5035');
  pGrad.addColorStop(0.8, '#6a4530');
  pGrad.addColorStop(1, '#3a2515');

  ctx.fillStyle = pGrad;

  // Top pipe
  ctx.fillRect(p.x, 0, pipeWidth, p.topH);

  // Bottom pipe
  const bottomY = p.topH + pipeGap;
  ctx.fillRect(p.x, bottomY, pipeWidth, groundY - bottomY);

  // Hazard stripe caps
  const capW = pipeWidth + 10;
  const capH = 20;
  const capX = p.x - 5;

  ctx.fillStyle = '#8a5a30';
  ctx.fillRect(capX, p.topH - capH, capW, capH);
  ctx.fillRect(capX, bottomY, capW, capH);

  // Yellow/black hazard stripes on caps
  ctx.fillStyle = '#cc8800';
  for (let sx = capX; sx < capX + capW; sx += 12) {
    ctx.fillRect(sx, p.topH - capH + 2, 6, capH - 4);
    ctx.fillRect(sx, bottomY + 2, 6, capH - 4);
  }

  // Cap borders
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = 2;
  ctx.strokeRect(capX, p.topH - capH, capW, capH);
  ctx.strokeRect(capX, bottomY, capW, capH);

  // Rust spots
  ctx.fillStyle = 'rgba(120, 50, 20, 0.3)';
  ctx.fillRect(p.x + 8, p.topH - 40, 12, 8);
  ctx.fillRect(p.x + 30, bottomY + 30, 15, 6);
}

function drawPostalDude() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation * Math.PI / 180);

  const spriteSize = 90;

  if (dudeLoaded) {
    ctx.drawImage(dudeImg, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
  } else {
    ctx.fillStyle = '#e8c090';
    ctx.beginPath();
    ctx.arc(0, 0, spriteSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.fillRect(-12, -6, 10, 5);
    ctx.fillRect(2, -6, 10, 5);
  }

  ctx.restore();
}

function drawSpeechBubble() {
  if (state !== 'playing' || quoteOpacity <= 0 || !currentQuote) return;

  ctx.save();
  ctx.globalAlpha = quoteOpacity;

  const bx = bird.x + 30;
  const by = bird.y - 55;
  const padding = 8;
  ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
  const textWidth = ctx.measureText(currentQuote).width;
  const bubbleW = textWidth + padding * 2;
  const bubbleH = 24;

  // Keep bubble on screen
  const drawX = Math.min(Math.max(bx, bubbleW / 2 + 5), W - bubbleW / 2 - 5);
  const drawY = Math.max(by, 20);

  // Bubble background
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  const r = 8;
  const x0 = drawX - bubbleW / 2;
  const y0 = drawY - bubbleH / 2;
  ctx.moveTo(x0 + r, y0);
  ctx.lineTo(x0 + bubbleW - r, y0);
  ctx.quadraticCurveTo(x0 + bubbleW, y0, x0 + bubbleW, y0 + r);
  ctx.lineTo(x0 + bubbleW, y0 + bubbleH - r);
  ctx.quadraticCurveTo(x0 + bubbleW, y0 + bubbleH, x0 + bubbleW - r, y0 + bubbleH);
  ctx.lineTo(x0 + r, y0 + bubbleH);
  ctx.quadraticCurveTo(x0, y0 + bubbleH, x0, y0 + bubbleH - r);
  ctx.lineTo(x0, y0 + r);
  ctx.quadraticCurveTo(x0, y0, x0 + r, y0);
  ctx.fill();

  // Tail pointing to dude
  ctx.beginPath();
  ctx.moveTo(drawX - 8, drawY + bubbleH / 2);
  ctx.lineTo(bird.x + 10, bird.y - 25);
  ctx.lineTo(drawX + 2, drawY + bubbleH / 2);
  ctx.fill();

  // Text
  ctx.fillStyle = '#1a1a1a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(currentQuote, drawX, drawY);

  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.life / 60;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawScore() {
  if (state === 'playing' || state === 'dead') {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 56px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 4;
    ctx.strokeText(score, W / 2, 70);
    ctx.fillText(score, W / 2, 70);
  }
}

function drawMenu() {
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 42px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FLAPPY', W / 2, 160);

  ctx.fillStyle = '#FF6B35';
  ctx.font = 'bold 52px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('POSTAL DUDE', W / 2, 220);

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '22px "Segoe UI", system-ui, sans-serif';

  const blink = Math.sin(frameCount * 0.06) > 0;
  if (blink) {
    ctx.fillText('PINCH TO FLAP', W / 2, 460);
  }

  if (highScore > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '18px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`BEST: ${highScore}`, W / 2, 500);
  }
}

function drawDead() {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#FF4444';
  ctx.font = 'bold 48px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', W / 2, 240);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`SCORE: ${score}`, W / 2, 310);

  if (score >= highScore && score > 0) {
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('NEW BEST!', W / 2, 350);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`BEST: ${highScore}`, W / 2, 350);
  }

  if (frameCount > 30) {
    const blink = Math.sin(frameCount * 0.06) > 0;
    if (blink) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '20px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('PINCH TO RETRY', W / 2, 440);
    }
  }
}

function gameLoop() {
  update();

  drawBackground();
  drawGround();

  for (const p of pipes) {
    drawPipes(p);
  }

  drawPostalDude();
  drawSpeechBubble();
  drawParticles();
  drawScore();

  if (state === 'menu') drawMenu();
  if (state === 'dead') drawDead();

  requestAnimationFrame(gameLoop);
}

reset();
gameLoop();
