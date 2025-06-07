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

let previewRotation = 0; // degrees, 0/90/180/270
let mouseWorldX = 0;
let mouseWorldY = 0;
let previewX = 0; // grid coordinates of preview top-left
let previewY = 0;

function getRotatedSize(w, h, rot) {
  rot = rot % 360;
  return rot === 0 || rot === 180 ? [w, h] : [h, w];
}

// Check if any cell in area (x,y,w,h) is occupied
function isOccupied(x, y, w, h) {
  for (let item of placedItems) {
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        for (let ix = 0; ix < item.width; ix++) {
          for (let iy = 0; iy < item.height; iy++) {
            if (x + dx === item.x + ix && y + dy === item.y + iy) return true;
          }
        }
      }
    }
  }
  return false;
}

function calculatePreviewPosition() {
  const [w, h] = getRotatedSize(currentItem.width, currentItem.height, previewRotation);
  previewX = Math.round(mouseWorldX / 50 - w / 2);
  previewY = Math.round(mouseWorldY / 50 - h / 2);
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(zoom, zoom);

  const gridSize = 50;
  const cols = canvas.width / zoom / gridSize + 2;
  const rows = canvas.height / zoom / gridSize + 2;
  const startX = -offsetX / zoom - 1;
  const startY = -offsetY / zoom - 1;

  ctx.strokeStyle = "#ccc";
  for (let x = Math.floor(startX / gridSize) * gridSize; x < startX + cols * gridSize; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, startY + rows * gridSize);
    ctx.stroke();
  }

  for (let y = Math.floor(startY / gridSize) * gridSize; y < startY + rows * gridSize; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + cols * gridSize, y);
    ctx.stroke();
  }

  for (let item of placedItems) {
    ctx.fillStyle = "orange";
    ctx.fillRect(item.x * gridSize, item.y * gridSize, item.width * gridSize, item.height * gridSize);
    ctx.fillStyle = "black";
    ctx.fillText(item.name, item.x * gridSize + 5, item.y * gridSize + 20);
  }

  if (currentMode === "build" && currentItem) {
    const [w, h] = getRotatedSize(currentItem.width, currentItem.height, previewRotation);
    ctx.fillStyle = "rgba(255, 165, 0, 0.5)";
    ctx.fillRect(previewX * gridSize, previewY * gridSize, w * gridSize, h * gridSize);
    ctx.strokeStyle = "black";
    ctx.strokeRect(previewX * gridSize, previewY * gridSize, w * gridSize, h * gridSize);
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
