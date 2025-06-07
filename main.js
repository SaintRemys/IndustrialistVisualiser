const canvas = document.getElementById("gridCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth - 200;
canvas.height = window.innerHeight;

let offsetX = 0, offsetY = 0;
let zoom = 1;
let isDragging = false;
let lastX, lastY;

let placedItems = [];
let currentItem = null;
let currentMode = "build";
let totalCost = 0;

let previewRotation = 0; // 0,90,180,270
let mouseWorldX = 0;
let mouseWorldY = 0;
let previewX = 0; // grid coords (top-left of preview)
let previewY = 0;

const GRID_SIZE = 50;

function getRotatedSize(w, h, rot) {
  rot = rot % 360;
  return (rot === 0 || rot === 180) ? [w, h] : [h, w];
}

function isOccupied(x, y, w, h) {
  for (const item of placedItems) {
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        if (
          x + dx >= item.x &&
          x + dx < item.x + item.width &&
          y + dy >= item.y &&
          y + dy < item.y + item.height
        ) return true;
      }
    }
  }
  return false;
}

function calculatePreviewPosition() {
  previewX = Math.floor(mouseWorldX / 50);
  previewY = Math.floor(mouseWorldY / 50);
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(zoom, zoom);

  // Draw grid lines
  const cols = Math.ceil(canvas.width / zoom / GRID_SIZE) + 2;
  const rows = Math.ceil(canvas.height / zoom / GRID_SIZE) + 2;
  const startX = -offsetX / zoom - GRID_SIZE;
  const startY = -offsetY / zoom - GRID_SIZE;

  ctx.strokeStyle = "#ccc";
  for (let x = Math.floor(startX / GRID_SIZE) * GRID_SIZE; x < startX + cols * GRID_SIZE; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, startY + rows * GRID_SIZE);
    ctx.stroke();
  }
  for (let y = Math.floor(startY / GRID_SIZE) * GRID_SIZE; y < startY + rows * GRID_SIZE; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + cols * GRID_SIZE, y);
    ctx.stroke();
  }

  // Draw placed items
  for (const item of placedItems) {
    ctx.fillStyle = "orange";
    ctx.fillRect(item.x * GRID_SIZE, item.y * GRID_SIZE, item.width * GRID_SIZE, item.height * GRID_SIZE);
    ctx.fillStyle = "black";
    ctx.fillText(item.name, item.x * GRID_SIZE + 5, item.y * GRID_SIZE + 20);
  }

  // Draw preview with rotation about its center
  if (currentMode === "build" && currentItem) {
    const [w, h] = getRotatedSize(currentItem.width, currentItem.height, previewRotation);
    const px = previewX * GRID_SIZE;
    const py = previewY * GRID_SIZE;

    ctx.save();
    ctx.translate(px + (w * GRID_SIZE) / 2, py + (h * GRID_SIZE) / 2);
    ctx.rotate(previewRotation * Math.PI / 180);
    ctx.fillStyle = isOccupied(previewX, previewY, w, h) ? "rgba(255,0,0,0.5)" : "rgba(255,165,0,0.5)";
    ctx.fillRect(- (w * GRID_SIZE) / 2, - (h * GRID_SIZE) / 2, w * GRID_SIZE, h * GRID_SIZE);
    ctx.strokeStyle = "black";
    ctx.strokeRect(- (w * GRID_SIZE) / 2, - (h * GRID_SIZE) / 2, w * GRID_SIZE, h * GRID_SIZE);
    ctx.restore();
  }

  ctx.restore();
}

canvas.addEventListener("mousedown", e => {
  isDragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
});
canvas.addEventListener("mouseup", () => isDragging = false);
canvas.addEventListener("mouseleave", () => isDragging = false);

canvas.addEventListener("mousemove", e => {
  if (isDragging) {
    offsetX += e.clientX - lastX;
    offsetY += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
  }

  const rect = canvas.getBoundingClientRect();
  mouseWorldX = (e.clientX - rect.left - offsetX) / zoom;
  mouseWorldY = (e.clientY - rect.top - offsetY) / zoom;

  if (currentItem) {
    calculatePreviewPosition();
  }

  drawGrid();
});

canvas.addEventListener("click", e => {
  if (currentMode !== "build" || !currentItem) return;

  const [w, h] = getRotatedSize(currentItem.width, currentItem.height, previewRotation);
  if (isOccupied(previewX, previewY, w, h)) return;

  placedItems.push({
    x: previewX,
    y: previewY,
    name: currentItem.name,
    price: currentItem.price,
    width: w,
    height: h
  });

  totalCost += currentItem.price;
  document.getElementById("totalCost").textContent = `Total: $${totalCost}`;
  drawGrid();
});

document.querySelectorAll(".item").forEach(item => {
  item.addEventListener("click", () => {
    currentItem = {
      name: item.dataset.name,
      price: parseInt(item.dataset.price),
      width: parseInt(item.dataset.width),
      height: parseInt(item.dataset.height)
    };
    previewRotation = 0;
    calculatePreviewPosition();
    drawGrid();
  });
});

document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentMode = btn.dataset.mode;
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    drawGrid();
  });
});

document.addEventListener("keydown", e => {
  if (e.key >= "1" && e.key <= "4") {
    const modes = ["build", "wire", "pipe", "delete"];
    currentMode = modes[parseInt(e.key) - 1];
    document.querySelectorAll(".mode-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.mode === currentMode);
    });
    drawGrid();
  }
  if (e.key.toLowerCase() === "r" && currentItem) {
    previewRotation = (previewRotation + 90) % 360;
    calculatePreviewPosition();
    drawGrid();
  }
});

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth - 200;
  canvas.height = window.innerHeight;
  drawGrid();
});

drawGrid();
