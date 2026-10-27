const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const healthBar = document.getElementById('healthBar');
const enemyStatus = document.getElementById('enemyStatus');
const messageBox = document.getElementById('messageBox');

const map = [
  '##########',
  '#........#',
  '#..#.....#',
  '#........#',
  '#....#...#',
  '#........#',
  '#..#..#..#',
  '#........#',
  '#....#...#',
  '##########'
];

const FOV = Math.PI / 3;
const MOVE_SPEED = 2.4;
const TURN_SPEED = 2.4;
const MAX_DISTANCE = 18;
const keys = {};
const mouse = { down: false };

let gameState = 'playing';
let lastTime = 0;

const player = {
  x: 2.3,
  y: 2.3,
  angle: 0,
  health: 100,
  shotCooldown: 0,
  flash: 0
};

const bananas = [];
const enemies = [
  { x: 5.9, y: 7.5, health: 100, alive: true },
  { x: 7.7, y: 4.9, health: 100, alive: true },
  { x: 3.8, y: 7.1, health: 100, alive: true },
  { x: 8.1, y: 1.7, health: 100, alive: true },
  { x: 2.5, y: 5.8, health: 100, alive: true }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isWall(x, y) {
  const mx = Math.floor(x);
  const my = Math.floor(y);

  if (mx < 0 || my < 0 || mx >= map[0].length || my >= map.length) {
    return true;
  }

  return map[my][mx] === '#';
}

function castRay(angle, stopAtHitOnly = false) {
  const step = 0.02;
  let distance = 0;
  let x = player.x;
  let y = player.y;

  while (distance < MAX_DISTANCE) {
    x = player.x + Math.cos(angle) * distance;
    y = player.y + Math.sin(angle) * distance;

    if (isWall(x, y)) {
      return { distance, x, y };
    }

    if (stopAtHitOnly) {
      distance += step;
      continue;
    }

    distance += step;
  }

  return { distance: MAX_DISTANCE, x, y };
}

function updateHud() {
  healthBar.style.width = `${clamp(player.health, 0, 100)}%`;
  const count = enemies.filter((enemy) => enemy.alive).length;
  enemyStatus.textContent = `Banana Bandits: ${count}`;

  if (gameState === 'won') {
    messageBox.textContent = 'Banana Run cleared! Press R for a fresh jungle run.';
  } else if (gameState === 'lost') {
    messageBox.textContent = 'The jungle got the better of you. Press R to retry.';
  }
}

function shootBanana() {
  if (gameState !== 'playing') return;
  if (player.shotCooldown > 0) return;

  player.shotCooldown = 0.18;
  player.flash = 0.18;

  const banana = {
    x: player.x + Math.cos(player.angle) * 0.8,
    y: player.y + Math.sin(player.angle) * 0.8,
    angle: player.angle,
    speed: 7.8,
    life: 1.1
  };

  bananas.push(banana);

  let bestTarget = null;
  let bestScore = Infinity;

  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 6) continue;

    let relAngle = Math.atan2(dy, dx) - player.angle;
    while (relAngle > Math.PI) relAngle -= Math.PI * 2;
    while (relAngle < -Math.PI) relAngle += Math.PI * 2;

    if (Math.abs(relAngle) > 0.25) continue;

    const wallCheck = castRay(Math.atan2(dy, dx));
    if (wallCheck.distance < dist - 0.2) continue;

    const score = dist + Math.abs(relAngle) * 6;
    if (score < bestScore) {
      bestScore = score;
      bestTarget = enemy;
    }
  }

  if (bestTarget) {
    bestTarget.health -= 34;
    if (bestTarget.health <= 0) {
      bestTarget.alive = false;
    }
  }

  if (enemies.every((enemy) => !enemy.alive)) {
    gameState = 'won';
    updateHud();
  }
}

function movePlayer(dx, dy) {
  const nextX = player.x + dx;
  const nextY = player.y + dy;

  if (!isWall(nextX, player.y)) {
    player.x = nextX;
  }
  if (!isWall(player.x, nextY)) {
    player.y = nextY;
  }
}

function updatePlayer(dt) {
  if (gameState !== 'playing') return;

  let moveX = 0;
  let moveY = 0;

  if (keys['KeyW']) {
    moveX += Math.cos(player.angle) * MOVE_SPEED * dt;
    moveY += Math.sin(player.angle) * MOVE_SPEED * dt;
  }
  if (keys['KeyS']) {
    moveX -= Math.cos(player.angle) * MOVE_SPEED * dt;
    moveY -= Math.sin(player.angle) * MOVE_SPEED * dt;
  }
  if (keys['KeyA']) {
    moveX += Math.cos(player.angle - Math.PI / 2) * MOVE_SPEED * dt;
    moveY += Math.sin(player.angle - Math.PI / 2) * MOVE_SPEED * dt;
  }
  if (keys['KeyD']) {
    moveX += Math.cos(player.angle + Math.PI / 2) * MOVE_SPEED * dt;
    moveY += Math.sin(player.angle + Math.PI / 2) * MOVE_SPEED * dt;
  }

  if (moveX || moveY) {
    movePlayer(moveX, moveY);
  }

  if (keys['ArrowLeft']) {
    player.angle -= TURN_SPEED * dt * 0.7;
  }
  if (keys['ArrowRight']) {
    player.angle += TURN_SPEED * dt * 0.7;
  }

  if (player.shotCooldown > 0) {
    player.shotCooldown -= dt;
  }
  if (player.flash > 0) {
    player.flash -= dt;
  }

  if (mouse.down && player.shotCooldown <= 0) {
    shootBanana();
  }
}

function updateBananas(dt) {
  for (let i = bananas.length - 1; i >= 0; i -= 1) {
    const banana = bananas[i];
    banana.x += Math.cos(banana.angle) * banana.speed * dt;
    banana.y += Math.sin(banana.angle) * banana.speed * dt;
    banana.life -= dt;

    if (banana.life <= 0 || isWall(banana.x, banana.y)) {
      bananas.splice(i, 1);
      continue;
    }

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dist = Math.hypot(banana.x - enemy.x, banana.y - enemy.y);
      if (dist < 0.55) {
        enemy.health -= 34;
        if (enemy.health <= 0) {
          enemy.alive = false;
        }
        bananas.splice(i, 1);
        break;
      }
    }
  }

  if (enemies.some((enemy) => enemy.alive) && enemies.filter((enemy) => enemy.alive).length > 0) {
    // no-op; enemies handled elsewhere
  }
}

function updateEnemies(dt) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.5) {
      player.health -= 28 * dt;
      if (player.health <= 0) {
        player.health = 0;
        gameState = 'lost';
        updateHud();
      }
      continue;
    }

    if (dist < 6) {
      const angle = Math.atan2(dy, dx);
      const stepX = Math.cos(angle) * 0.9 * dt;
      const stepY = Math.sin(angle) * 0.9 * dt;

      if (!isWall(enemy.x + stepX, enemy.y)) {
        enemy.x += stepX;
      }
      if (!isWall(enemy.x, enemy.y + stepY)) {
        enemy.y += stepY;
      }
    }
  }
}

function renderSkyAndGround() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height / 2);
  sky.addColorStop(0, '#c68a2d');
  sky.addColorStop(1, '#f5d576');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

  const ground = ctx.createLinearGradient(0, canvas.height / 2, 0, canvas.height);
  ground.addColorStop(0, '#4d2d0f');
  ground.addColorStop(1, '#170b06');
  ctx.fillStyle = ground;
  ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
}

function renderWalls() {
  const rays = 220;
  const stripWidth = canvas.width / rays;

  for (let i = 0; i < rays; i += 1) {
    const angle = player.angle - FOV / 2 + (i / rays) * FOV;
    const ray = castRay(angle);
    const correctedDistance = ray.distance * Math.cos(angle - player.angle);
    const wallHeight = clamp((canvas.height / Math.max(correctedDistance, 0.0001)) * 0.9, 0, canvas.height * 1.2);
    const brightness = clamp(1 - correctedDistance / 12, 0.2, 1);
    const shade = Math.round(70 + brightness * 120);

    ctx.fillStyle = `rgba(${shade}, ${shade - 18}, ${shade - 30}, 1)`;
    const x = i * stripWidth;
    const y = canvas.height / 2 - wallHeight / 2;
    ctx.fillRect(x, y, stripWidth + 2, wallHeight);
  }
}

function renderBananas() {
  for (const banana of bananas) {
    const dx = banana.x - player.x;
    const dy = banana.y - player.y;
    const dist = Math.hypot(dx, dy);
    const relAngle = Math.atan2(dy, dx) - player.angle;

    if (Math.abs(relAngle) > FOV * 0.9) continue;
    const wallHit = castRay(Math.atan2(dy, dx));
    if (wallHit.distance < dist - 0.1) continue;

    const screenX = canvas.width / 2 + (relAngle / FOV) * canvas.width;
    const size = clamp((canvas.height / Math.max(dist, 0.1)) * 0.22, 8, 48);
    const centerY = canvas.height / 2;

    ctx.save();
    ctx.translate(screenX, centerY);
    ctx.rotate(Math.atan2(Math.sin(banana.angle - player.angle), Math.cos(banana.angle - player.angle)));
    ctx.fillStyle = '#f2d12a';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.9, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d8f2a';
    ctx.fillRect(-size * 0.18, -size * 0.08, size * 0.36, size * 0.16);
    ctx.restore();
  }
}

function renderEnemies() {
  const visible = [];

  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.hypot(dx, dy);
    const relAngle = Math.atan2(dy, dx) - player.angle;

    if (Math.abs(relAngle) > FOV * 0.7) continue;

    const wallHit = castRay(Math.atan2(dy, dx));
    if (wallHit.distance < dist - 0.2) continue;

    visible.push({ enemy, dist, relAngle });
  }

  visible.sort((a, b) => b.dist - a.dist);

  for (const { enemy, dist, relAngle } of visible) {
    const screenX = canvas.width / 2 + (relAngle / FOV) * canvas.width;
    const size = clamp((canvas.height / Math.max(dist, 0.1)) * 0.7, 20, 180);
    const baseY = canvas.height / 2 + size * 0.08;

    ctx.fillStyle = '#8a4d2b';
    ctx.fillRect(screenX - size * 0.24, baseY - size * 0.42, size * 0.48, size * 0.95);
    ctx.fillStyle = '#2d1a0d';
    ctx.fillRect(screenX - size * 0.32, baseY - size * 0.30, size * 0.16, size * 0.45);
    ctx.fillRect(screenX + size * 0.16, baseY - size * 0.30, size * 0.16, size * 0.45);
    ctx.fillStyle = '#f4d47a';
    ctx.fillRect(screenX - size * 0.22, baseY - size * 0.28, size * 0.44, size * 0.26);
    ctx.fillStyle = '#f6b825';
    ctx.fillRect(screenX - size * 0.14, baseY - size * 0.7, size * 0.28, size * 0.18);
    ctx.fillStyle = '#000';
    ctx.fillRect(screenX - size * 0.22, baseY - size * 0.8, size * 0.46, 4);
    ctx.fillStyle = '#a7ff8c';
    ctx.fillRect(screenX - size * 0.22, baseY - size * 0.8, (size * 0.46) * (enemy.health / 100), 4);
  }
}

function drawCrosshair() {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const size = 12;

  ctx.strokeStyle = 'rgba(255, 246, 190, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - size, cy);
  ctx.lineTo(cx - 3, cy);
  ctx.moveTo(cx + 3, cy);
  ctx.lineTo(cx + size, cy);
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx, cy - 3);
  ctx.moveTo(cx, cy + 3);
  ctx.lineTo(cx, cy + size);
  ctx.stroke();

  if (player.flash > 0) {
    ctx.fillStyle = `rgba(255, 230, 120, ${player.flash * 2})`;
    ctx.fillRect(cx + 18, cy - 6, 18, 12);
  }
}

function resetGame() {
  player.x = 2.3;
  player.y = 2.3;
  player.angle = 0;
  player.health = 100;
  player.shotCooldown = 0;
  player.flash = 0;
  gameState = 'playing';
  bananas.length = 0;

  const spawns = [
    { x: 5.8, y: 7.5 },
    { x: 7.7, y: 4.9 },
    { x: 3.8, y: 7.1 },
    { x: 8.1, y: 1.7 },
    { x: 2.5, y: 5.8 }
  ];

  enemies.forEach((enemy, index) => {
    const spawn = spawns[index];
    enemy.x = spawn.x;
    enemy.y = spawn.y;
    enemy.health = 100;
    enemy.alive = true;
  });

  updateHud();
}

function render() {
  renderSkyAndGround();
  renderWalls();
  renderBananas();
  renderEnemies();
  drawCrosshair();
}

function tick(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000 || 0.016, 0.033);
  lastTime = timestamp;

  updatePlayer(dt);
  updateBananas(dt);
  updateEnemies(dt);
  render();
  updateHud();

  requestAnimationFrame(tick);
}

window.addEventListener('keydown', (event) => {
  keys[event.code] = true;

  if (event.code === 'Space') {
    event.preventDefault();
    shootBanana();
  }

  if (event.code === 'KeyR') {
    resetGame();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

canvas.addEventListener('mousedown', () => {
  mouse.down = true;
  if (document.pointerLockElement !== canvas) {
    canvas.requestPointerLock();
  }
  shootBanana();
});

window.addEventListener('mouseup', () => {
  mouse.down = false;
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    messageBox.textContent = 'Monkey mode: banana blaster armed.';
  } else {
    messageBox.textContent = 'Click to lock mouse. Move with WASD. Banana blaster is ready. Press R to restart.';
  }
});

document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement === canvas) {
    player.angle += event.movementX * 0.0027;
  }
});

resetGame();
requestAnimationFrame(tick);
