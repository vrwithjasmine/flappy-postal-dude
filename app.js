const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 600;
const H = 600;

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
  gravity: 0.45,
  flapPower: -7.5,
  rotation: 0
};

// Pipes
let pipes = [];
const pipeWidth = 70;
const pipeGap = 160;
const pipeSpeed = 3;
const pipeSpawnInterval = 100;
let pipeTimer = 0;

// Particles (shell casings on death)
let particles = [];

// City skyline (background)
const buildings = [];
for (let i = 0; i < 15; i++) {
  buildings.push({
    x: i * 45,
    w: 30 + Math.random() * 25,
    h: 60 + Math.random() * 120,
    shade: 20 + Math.random() * 30
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
  const minTop = 80;
  const maxTop = groundY - pipeGap - 80;
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
    // Bird physics
    bird.vy += bird.gravity;
    bird.y += bird.vy;
    bird.rotation = Math.min(bird.vy * 3, 70);

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
  // Dark sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a0a1a');
  grad.addColorStop(0.6, '#1a1a2e');
  grad.addColorStop(1, '#16213e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Skyline
  for (const b of buildings) {
    ctx.fillStyle = `rgb(${b.shade}, ${b.shade}, ${b.shade + 10})`;
    ctx.fillRect(b.x, groundY - b.h, b.w, b.h);
    // Windows
    ctx.fillStyle = `rgba(255, 200, 50, ${0.2 + Math.random() * 0.15})`;
    for (let wy = groundY - b.h + 8; wy < groundY - 10; wy += 16) {
      for (let wx = b.x + 5; wx < b.x + b.w - 8; wx += 12) {
        if (Math.random() > 0.3) {
          ctx.fillRect(wx, wy, 6, 8);
        }
      }
    }
  }
}

function drawGround() {
  ctx.fillStyle = '#2d5a27';
  ctx.fillRect(0, groundY, W, H - groundY);

  ctx.fillStyle = '#3d7a37';
  ctx.fillRect(0, groundY, W, 4);

  // Ground pattern
  ctx.strokeStyle = '#1d4a17';
  ctx.lineWidth = 1;
  for (let i = -40; i < W + 40; i += 40) {
    const x = i - groundScroll;
    ctx.beginPath();
    ctx.moveTo(x, groundY + 8);
    ctx.lineTo(x + 20, groundY + H - groundY);
    ctx.stroke();
  }
}

function drawPipes(p) {
  // Pipe body gradient
  const pGrad = ctx.createLinearGradient(p.x, 0, p.x + pipeWidth, 0);
  pGrad.addColorStop(0, '#3a7a3a');
  pGrad.addColorStop(0.3, '#4a9a4a');
  pGrad.addColorStop(0.7, '#4a9a4a');
  pGrad.addColorStop(1, '#2a6a2a');

  ctx.fillStyle = pGrad;

  // Top pipe
  ctx.fillRect(p.x, 0, pipeWidth, p.topH);

  // Bottom pipe
  const bottomY = p.topH + pipeGap;
  ctx.fillRect(p.x, bottomY, pipeWidth, groundY - bottomY);

  // Pipe caps
  const capW = pipeWidth + 10;
  const capH = 20;
  const capX = p.x - 5;

  ctx.fillStyle = '#5aba5a';
  ctx.fillRect(capX, p.topH - capH, capW, capH);
  ctx.fillRect(capX, bottomY, capW, capH);

  // Cap borders
  ctx.strokeStyle = '#2a6a2a';
  ctx.lineWidth = 2;
  ctx.strokeRect(capX, p.topH - capH, capW, capH);
  ctx.strokeRect(capX, bottomY, capW, capH);
}

function drawPostalDude() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation * Math.PI / 180);
  ctx.scale(1.4, 1.4);

  // Trench coat body
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(-14, -4, 28, 22);

  // Head
  ctx.fillStyle = '#e8c090';
  ctx.beginPath();
  ctx.arc(0, -10, 12, 0, Math.PI * 2);
  ctx.fill();

  // Sunglasses
  ctx.fillStyle = '#111';
  ctx.fillRect(-10, -14, 8, 5);
  ctx.fillRect(2, -14, 8, 5);
  ctx.fillRect(-2, -13, 4, 3);

  // Goatee
  ctx.fillStyle = '#4a3520';
  ctx.beginPath();
  ctx.moveTo(-3, -3);
  ctx.lineTo(3, -3);
  ctx.lineTo(1, 2);
  ctx.lineTo(-1, 2);
  ctx.fill();

  // Hair (long, brown)
  ctx.fillStyle = '#5a3a1a';
  ctx.beginPath();
  ctx.ellipse(-12, -8, 4, 14, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(12, -8, 4, 14, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -20, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Arms flapping
  const flapAngle = state === 'playing' ? Math.sin(frameCount * 0.3) * 0.4 : Math.sin(frameCount * 0.08) * 0.15;

  ctx.save();
  ctx.translate(-14, 2);
  ctx.rotate(-0.8 + flapAngle);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(-2, -2, 20, 6);
  ctx.fillStyle = '#e8c090';
  ctx.fillRect(16, -2, 6, 6);
  ctx.restore();

  ctx.save();
  ctx.translate(14, 2);
  ctx.rotate(0.8 - flapAngle);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(-18, -2, 20, 6);
  ctx.fillStyle = '#e8c090';
  ctx.fillRect(-24, -2, 6, 6);
  ctx.restore();

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
  drawParticles();
  drawScore();

  if (state === 'menu') drawMenu();
  if (state === 'dead') drawDead();

  requestAnimationFrame(gameLoop);
}

reset();
gameLoop();
