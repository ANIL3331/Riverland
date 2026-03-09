const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const overlayEyebrow = document.getElementById("overlayEyebrow");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startButton = document.getElementById("startButton");
const distanceLabel = document.getElementById("distanceLabel");
const gapLabel = document.getElementById("gapLabel");
const statusLabel = document.getElementById("statusLabel");

const keys = new Set();
const world = {
  width: 1280,
  height: 720,
  distance: 0,
  progressTarget: 1600,
  runSpeed: 145,
  flowOffset: 0,
  running: false,
  state: "intro",
  time: 0,
  chaseLine: -420,
  rocks: [],
  splashes: [],
  reeds: [],
};

const raft = {
  x: world.width / 2,
  y: world.height * 0.72,
  width: 220,
  height: 118,
  vx: 0,
  sway: 0,
  bob: 0,
  heading: 0,
};

const man = {
  x: 0,
  y: 12,
  speed: 150,
};

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  world.width = rect.width;
  world.height = rect.height;
  raft.x = Math.min(Math.max(raft.x, 220), world.width - 220);
  raft.y = world.height * 0.72;
}

function resetGame() {
  world.distance = 0;
  world.flowOffset = 0;
  world.time = 0;
  world.running = false;
  world.state = "intro";
  world.chaseLine = -world.height * 0.35;
  world.rocks = [];
  world.splashes = [];
  world.reeds = [];

  raft.x = world.width / 2;
  raft.vx = 0;
  raft.sway = 0;
  raft.bob = 0;
  raft.heading = 0;

  man.x = 0;
  man.y = 12;

  for (let i = 0; i < 18; i += 1) {
    spawnRock(true);
  }

  for (let i = 0; i < 30; i += 1) {
    world.reeds.push({
      side: Math.random() > 0.5 ? 1 : -1,
      y: Math.random() * world.height,
      height: 18 + Math.random() * 60,
      drift: 0.2 + Math.random() * 0.45,
    });
  }

  updateHud();
}

function startGame() {
  resetGame();
  world.running = true;
  world.state = "running";
  overlay.classList.add("hidden");
  updateHud();
}

function finishGame(title, text, eyebrow = "Journey Ended") {
  world.running = false;
  world.state = title === "You Escaped" ? "won" : "lost";
  overlayEyebrow.textContent = eyebrow;
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startButton.textContent = title === "You Escaped" ? "Sail Again" : "Try Again";
  overlay.classList.remove("hidden");
  updateHud();
}

function updateHud() {
  distanceLabel.textContent = `${Math.min(Math.round(world.distance), world.progressTarget)} m`;
  const gap = raft.y - world.chaseLine;
  gapLabel.textContent = gap > 240 ? "Safe" : gap > 160 ? "Close" : "Danger";
  gapLabel.style.color = gap > 240 ? "var(--safe)" : gap > 160 ? "var(--accent)" : "var(--danger)";

  if (world.state === "intro") {
    statusLabel.textContent = "Ready";
    return;
  }

  if (world.state === "won") {
    statusLabel.textContent = "Escaped";
    return;
  }

  if (world.state === "lost") {
    statusLabel.textContent = "Caught";
    return;
  }

  statusLabel.textContent = "Running";
}

function spawnRock(initial = false) {
  const riverCenter = world.width / 2 + Math.sin(world.time * 0.00045 + Math.random()) * 100;
  const riverWidth = world.width * 0.4;
  world.rocks.push({
    x: riverCenter + (Math.random() - 0.5) * riverWidth * 0.72,
    y: initial ? Math.random() * world.height : -80 - Math.random() * 240,
    size: 24 + Math.random() * 36,
    spin: Math.random() * Math.PI * 2,
    shade: 0.8 + Math.random() * 0.45,
  });
}

function spawnSplash(x, y, count = 6) {
  for (let i = 0; i < count; i += 1) {
    world.splashes.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 80,
      vy: -40 - Math.random() * 70,
      life: 0.5 + Math.random() * 0.45,
      size: 2 + Math.random() * 4,
    });
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function update(dt) {
  if (!world.running) {
    world.time += dt * 1000;
    return;
  }

  world.time += dt * 1000;
  world.distance += world.runSpeed * dt;
  world.flowOffset += world.runSpeed * dt;

  const moveX = (keys.has("arrowleft") || keys.has("a") ? -1 : 0) + (keys.has("arrowright") || keys.has("d") ? 1 : 0);
  const moveY = (keys.has("arrowup") || keys.has("w") ? -1 : 0) + (keys.has("arrowdown") || keys.has("s") ? 1 : 0);

  man.x = clamp(man.x + moveX * man.speed * dt, -raft.width * 0.28, raft.width * 0.28);
  man.y = clamp(man.y + moveY * man.speed * dt, -raft.height * 0.2, raft.height * 0.24);

  const balanceX = man.x / (raft.width * 0.32);
  const balanceY = man.y / (raft.height * 0.28);
  const driftForce = balanceX * 210;
  const current = Math.sin(world.time * 0.0013) * 28 + Math.sin(world.time * 0.0007 + 1.2) * 18;

  raft.vx += (driftForce + current - raft.vx * 3.4) * dt;
  raft.x += raft.vx * dt;
  raft.x = clamp(raft.x, 160, world.width - 160);
  raft.sway += ((balanceX * 0.24) - raft.sway) * dt * 3.5;
  raft.heading += (((balanceX * 0.32) + raft.vx * 0.002) - raft.heading) * dt * 2.6;
  raft.bob = Math.sin(world.time * 0.0038) * 8 + balanceY * 4;

  const riverCenter = world.width / 2 + Math.sin(world.time * 0.00042) * 120 + Math.sin(world.time * 0.00015 + 1.8) * 80;
  const riverHalf = world.width * 0.21;
  const leftBound = riverCenter - riverHalf + 86;
  const rightBound = riverCenter + riverHalf - 86;

  if (raft.x < leftBound || raft.x > rightBound) {
    finishGame("Raft Splintered", "The raft scraped against the cliff wall. Keep the man centered and steer with smaller corrections.");
  }

  for (const rock of world.rocks) {
    rock.y += world.runSpeed * dt * 1.1;
    rock.spin += dt;

    if (rock.y - rock.size > world.height + 100) {
      Object.assign(rock, {
        x: riverCenter + (Math.random() - 0.5) * world.width * 0.26,
        y: -120 - Math.random() * 220,
        size: 24 + Math.random() * 36,
        spin: Math.random() * Math.PI * 2,
        shade: 0.8 + Math.random() * 0.45,
      });
    }

    const dx = rock.x - raft.x;
    const dy = rock.y - raft.y;
    const hitDistance = rock.size + 70;
    if ((dx * dx) + (dy * dy) < hitDistance * hitDistance) {
      spawnSplash(raft.x + dx * 0.35, raft.y + dy * 0.35, 14);
      finishGame("Thrown Off Course", "A river rock slammed the raft. Guide the man around the deck to line up cleaner paths.");
    }
  }

  world.chaseLine += (26 + balanceY * 10 + Math.sin(world.time * 0.0014) * 8) * dt;
  if (world.chaseLine + 20 > raft.y - 52) {
    finishGame("Cliff Caught You", "The collapsing cliff reached the raft. Keep moving and avoid losing momentum to hazards.");
  }

  if (world.distance >= world.progressTarget) {
    finishGame("You Escaped", "The raft broke free into open water. The river widens ahead and the cliff finally disappears behind you.", "Safe Water");
  }

  for (const splash of world.splashes) {
    splash.x += splash.vx * dt;
    splash.y += splash.vy * dt;
    splash.vy += 150 * dt;
    splash.life -= dt;
  }
  world.splashes = world.splashes.filter((splash) => splash.life > 0);

  for (const reed of world.reeds) {
    reed.y += world.runSpeed * dt * reed.drift;
    if (reed.y > world.height + 80) {
      reed.y = -60;
      reed.side = Math.random() > 0.5 ? 1 : -1;
      reed.height = 18 + Math.random() * 60;
    }
  }

  updateHud();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, world.height);
  sky.addColorStop(0, "#6ec6d7");
  sky.addColorStop(0.25, "#3f7ea2");
  sky.addColorStop(0.58, "#184569");
  sky.addColorStop(1, "#0a2035");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, world.width, world.height);

  const sunGlow = ctx.createRadialGradient(world.width * 0.78, world.height * 0.14, 20, world.width * 0.78, world.height * 0.14, 220);
  sunGlow.addColorStop(0, "rgba(255, 220, 157, 0.9)");
  sunGlow.addColorStop(0.35, "rgba(255, 198, 120, 0.24)");
  sunGlow.addColorStop(1, "rgba(255, 198, 120, 0)");
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, world.width, world.height);
}

function riverGeometry() {
  const center = world.width / 2 + Math.sin(world.time * 0.00042) * 120 + Math.sin(world.time * 0.00015 + 1.8) * 80;
  const half = world.width * 0.21 + Math.sin(world.time * 0.00025 + 0.7) * 18;
  return {
    left: center - half,
    right: center + half,
    center,
  };
}

function drawCliffs(river) {
  const leftGradient = ctx.createLinearGradient(0, 0, river.left, 0);
  leftGradient.addColorStop(0, "#231c17");
  leftGradient.addColorStop(0.65, "#553926");
  leftGradient.addColorStop(1, "#7a5334");
  ctx.fillStyle = leftGradient;
  ctx.fillRect(0, 0, river.left, world.height);

  const rightGradient = ctx.createLinearGradient(river.right, 0, world.width, 0);
  rightGradient.addColorStop(0, "#7a5334");
  rightGradient.addColorStop(0.45, "#553926");
  rightGradient.addColorStop(1, "#231c17");
  ctx.fillStyle = rightGradient;
  ctx.fillRect(river.right, 0, world.width - river.right, world.height);

  for (let side = 0; side < 2; side += 1) {
    const startX = side === 0 ? 0 : river.right;
    const endX = side === 0 ? river.left : world.width;
    for (let i = 0; i < 12; i += 1) {
      const y = ((i * 92) + (world.flowOffset * 0.45)) % (world.height + 120) - 60;
      const ridge = side === 0 ? endX - 36 - Math.sin(i * 1.2 + world.time * 0.0008) * 12 : startX + 36 + Math.sin(i * 1.15 + world.time * 0.0008) * 12;
      ctx.fillStyle = `rgba(255, 218, 168, ${0.05 + (i % 3) * 0.02})`;
      ctx.beginPath();
      if (side === 0) {
        ctx.moveTo(startX, y - 40);
        ctx.lineTo(ridge, y);
        ctx.lineTo(startX, y + 54);
      } else {
        ctx.moveTo(endX, y - 40);
        ctx.lineTo(ridge, y);
        ctx.lineTo(endX, y + 54);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawRiver(river) {
  const water = ctx.createLinearGradient(0, 0, 0, world.height);
  water.addColorStop(0, "#3bc1cf");
  water.addColorStop(0.3, "#1a96b0");
  water.addColorStop(0.62, "#0f5b84");
  water.addColorStop(1, "#093657");

  ctx.fillStyle = water;
  ctx.beginPath();
  ctx.moveTo(river.left, 0);
  ctx.quadraticCurveTo(river.center, world.height * 0.45, river.left + 40, world.height);
  ctx.lineTo(river.right - 40, world.height);
  ctx.quadraticCurveTo(river.center, world.height * 0.45, river.right, 0);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < 16; i += 1) {
    const y = ((i * 68) + world.flowOffset * 1.6) % (world.height + 90) - 45;
    const alpha = 0.06 + (i % 4) * 0.018;
    ctx.strokeStyle = `rgba(201, 250, 255, ${alpha})`;
    ctx.lineWidth = 3 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(river.left + 30, y + Math.sin(i + world.time * 0.0018) * 8);
    ctx.bezierCurveTo(
      river.center - 140,
      y + 22 + Math.cos(i * 0.5 + world.time * 0.0015) * 8,
      river.center + 110,
      y - 16,
      river.right - 30,
      y + Math.sin(i + 1) * 8
    );
    ctx.stroke();
  }

  for (let i = 0; i < 40; i += 1) {
    const x = river.left + 28 + (i / 39) * (river.right - river.left - 56);
    const y = ((i * 53) + world.flowOffset * 1.2) % (world.height + 50) - 25;
    ctx.fillStyle = "rgba(245, 252, 255, 0.11)";
    ctx.beginPath();
    ctx.ellipse(x, y, 11, 2, Math.sin(i) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawChaseLine(river) {
  const gradient = ctx.createLinearGradient(0, world.chaseLine - 80, 0, world.chaseLine + 50);
  gradient.addColorStop(0, "rgba(255, 145, 94, 0)");
  gradient.addColorStop(0.45, "rgba(255, 145, 94, 0.18)");
  gradient.addColorStop(1, "rgba(47, 18, 9, 0.92)");
  ctx.fillStyle = gradient;
  ctx.fillRect(river.left, world.chaseLine - 80, river.right - river.left, 130);

  ctx.strokeStyle = "rgba(255, 197, 138, 0.7)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(river.left + 24, world.chaseLine);
  for (let x = river.left + 24; x <= river.right - 24; x += 40) {
    ctx.lineTo(x, world.chaseLine + Math.sin(x * 0.05 + world.time * 0.006) * 10);
  }
  ctx.stroke();
}

function drawReeds(river) {
  for (const reed of world.reeds) {
    const x = reed.side === -1 ? river.left - 18 + Math.sin(reed.y * 0.02) * 8 : river.right + 18 + Math.sin(reed.y * 0.018) * 8;
    ctx.strokeStyle = "rgba(72, 110, 48, 0.72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, reed.y);
    ctx.quadraticCurveTo(x + reed.side * 10, reed.y - reed.height * 0.45, x + reed.side * 4, reed.y - reed.height);
    ctx.stroke();
  }
}

function drawRock(rock) {
  ctx.save();
  ctx.translate(rock.x, rock.y);
  ctx.rotate(rock.spin);

  const rockGradient = ctx.createRadialGradient(-8, -10, 6, 0, 0, rock.size);
  rockGradient.addColorStop(0, `rgba(175, 195, 204, ${0.7 * rock.shade})`);
  rockGradient.addColorStop(0.35, `rgba(81, 102, 112, ${0.95 * rock.shade})`);
  rockGradient.addColorStop(1, `rgba(19, 30, 36, ${0.95 * rock.shade})`);

  ctx.fillStyle = rockGradient;
  ctx.beginPath();
  ctx.moveTo(-rock.size * 0.85, -rock.size * 0.15);
  ctx.lineTo(-rock.size * 0.25, -rock.size * 0.9);
  ctx.lineTo(rock.size * 0.68, -rock.size * 0.52);
  ctx.lineTo(rock.size * 0.92, rock.size * 0.18);
  ctx.lineTo(rock.size * 0.22, rock.size * 0.84);
  ctx.lineTo(-rock.size * 0.78, rock.size * 0.46);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.ellipse(-rock.size * 0.16, -rock.size * 0.24, rock.size * 0.24, rock.size * 0.12, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRaft() {
  ctx.save();
  ctx.translate(raft.x, raft.y + raft.bob);
  ctx.rotate(raft.heading);

  ctx.fillStyle = "rgba(3, 14, 22, 0.32)";
  ctx.beginPath();
  ctx.ellipse(0, 62, raft.width * 0.5, raft.height * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  const raftGradient = ctx.createLinearGradient(-raft.width / 2, 0, raft.width / 2, 0);
  raftGradient.addColorStop(0, "#74492a");
  raftGradient.addColorStop(0.45, "#a46738");
  raftGradient.addColorStop(1, "#5d3a22");

  ctx.fillStyle = raftGradient;
  ctx.strokeStyle = "#402615";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-raft.width * 0.46, -raft.height * 0.18);
  ctx.quadraticCurveTo(0, -raft.height * 0.44, raft.width * 0.46, -raft.height * 0.18);
  ctx.lineTo(raft.width * 0.43, raft.height * 0.26);
  ctx.quadraticCurveTo(0, raft.height * 0.46, -raft.width * 0.43, raft.height * 0.26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  for (let i = -3; i <= 3; i += 1) {
    const x = i * 28;
    ctx.fillStyle = i % 2 === 0 ? "#b97d47" : "#9c673d";
    ctx.fillRect(x - 14, -40, 24, 86);
    ctx.strokeStyle = "rgba(60, 34, 20, 0.45)";
    ctx.strokeRect(x - 14, -40, 24, 86);
    ctx.strokeStyle = "rgba(255, 230, 177, 0.08)";
    ctx.beginPath();
    ctx.moveTo(x - 8, -32);
    ctx.lineTo(x + 4, 38);
    ctx.stroke();
  }

  ctx.strokeStyle = "#d9b480";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-raft.width * 0.35, -20);
  ctx.lineTo(raft.width * 0.35, -20);
  ctx.moveTo(-raft.width * 0.35, 20);
  ctx.lineTo(raft.width * 0.35, 20);
  ctx.stroke();

  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = "rgba(231, 202, 142, 0.72)";
  ctx.lineWidth = 2;
  ctx.strokeRect(-raft.width * 0.34, -30, raft.width * 0.68, 60);
  ctx.setLineDash([]);

  drawMan();
  ctx.restore();
}

function drawMan() {
  ctx.save();
  ctx.translate(man.x, man.y - 2);

  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 34, 19, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#2c1f16";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-6, 10);
  ctx.lineTo(-10, 32);
  ctx.moveTo(6, 10);
  ctx.lineTo(10, 32);
  ctx.moveTo(-2, -4);
  ctx.lineTo(-16, 12);
  ctx.moveTo(2, -4);
  ctx.lineTo(16, 12);
  ctx.stroke();

  const coat = ctx.createLinearGradient(0, -18, 0, 26);
  coat.addColorStop(0, "#c75d37");
  coat.addColorStop(1, "#722616");
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(-15, -4);
  ctx.quadraticCurveTo(0, -18, 15, -4);
  ctx.lineTo(12, 22);
  ctx.quadraticCurveTo(0, 30, -12, 22);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#efc19d";
  ctx.beginPath();
  ctx.arc(0, -26, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2b1c16";
  ctx.beginPath();
  ctx.moveTo(-12, -28);
  ctx.quadraticCurveTo(0, -44, 12, -28);
  ctx.lineTo(12, -22);
  ctx.quadraticCurveTo(0, -14, -12, -22);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#d7e0e8";
  ctx.beginPath();
  ctx.moveTo(12, -6);
  ctx.quadraticCurveTo(24, 6, 21, 20);
  ctx.quadraticCurveTo(10, 14, 8, 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSplashes() {
  for (const splash of world.splashes) {
    ctx.fillStyle = `rgba(230, 249, 255, ${Math.max(splash.life, 0)})`;
    ctx.beginPath();
    ctx.arc(splash.x, splash.y, splash.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawVignette() {
  const vignette = ctx.createRadialGradient(world.width / 2, world.height / 2, world.height * 0.15, world.width / 2, world.height / 2, world.width * 0.6);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, world.width, world.height);
}

function render() {
  ctx.clearRect(0, 0, world.width, world.height);
  drawBackground();
  const river = riverGeometry();
  drawCliffs(river);
  drawRiver(river);
  drawReeds(river);
  drawChaseLine(river);

  for (const rock of world.rocks) {
    drawRock(rock);
  }

  drawRaft();
  drawSplashes();
  drawVignette();
}

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());

  if (event.code === "Space" && !world.running) {
    startGame();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

window.addEventListener("resize", resizeCanvas);

startButton.addEventListener("click", startGame);

resetGame();
resizeCanvas();
requestAnimationFrame(frame);