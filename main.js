const canvas = document.getElementById("gridCanvas");
const ctx = canvas.getContext("2d");

window.addEventListener('load', () => {
  console.log('CSS computed size:', canvas.offsetWidth, 'x', canvas.offsetHeight);
  canvas.width = canvas.offsetWidth; 
  canvas.height = canvas.offsetHeight;
  drawGrid();
});

let offsetX = 0, offsetY = 0;
let zoom = 1;
let isDragging = false;
let lastX, lastY;

let placedItems = [];
let currentItem = null;
let currentMode = "build";
let totalCost = 0;

let previewRotation = 0;
let mouseWorldX = 0;
let mouseWorldY = 0;
let previewX = 0;
let previewY = 0;

let highlightedItem = null;

const GRID_SIZE = 50;

function getRotatedSize(w, h, rot) {
  rot = ((rot % 360) + 360) % 360;
  return (rot === 0 || rot === 180) ? [w, h] : [h, w];
}

function isOccupied(x, y, w, h) {
  for (const item of placedItems) {
    if (!(x + w <= item.x || item.x + item.width <= x || 
          y + h <= item.y || item.y + item.height <= y)) {
      return true;
    }
  }
  return false;
}

function getItemAt(worldX, worldY) {
  const gridX = Math.floor(worldX / GRID_SIZE);
  const gridY = Math.floor(worldY / GRID_SIZE);
  
  for (let i = placedItems.length - 1; i >= 0; i--) {
    const item = placedItems[i];
    if (gridX >= item.x && gridX < item.x + item.width &&
        gridY >= item.y && gridY < item.y + item.height) {
      return item;
    }
  }
  return null;
}

function calculatePreviewPosition() {
  if (!currentItem) return;

  const rot = ((previewRotation % 360) + 360) % 360;

  const anchorGridX = Math.floor(mouseWorldX / GRID_SIZE);
  const anchorGridY = Math.floor(mouseWorldY / GRID_SIZE);

  const w = currentItem.width;
  const h = currentItem.height;

  let dx = 0, dy = 0;

  if (w === 2 && h === 1) {
    if (rot === 0) [dx, dy] = [0, 0];
    if (rot === 90) [dx, dy] = [0, -1];
    if (rot === 180) [dx, dy] = [-1, -1];
    if (rot === 270) [dx, dy] = [-1, 0];
  } else if (w === 1 && h === 2) {
    if (rot === 0) [dx, dy] = [0, 0];
    if (rot === 90) [dx, dy] = [1, 0];
    if (rot === 180) [dx, dy] = [1, -1];
    if (rot === 270) [dx, dy] = [0, -1];
  } else {
    // fallback for other sizes (center-based)
    const [rw, rh] = getRotatedSize(w, h, rot);
    previewX = anchorGridX - Math.floor(rw / 2);
    previewY = anchorGridY - Math.floor(rh / 2);
    return;
  }

  previewX = anchorGridX + dx;
  previewY = anchorGridY + dy;
}


function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(offsetX, offsetY);
  const uniformZoom = Math.min(zoom, zoom);
  ctx.scale(uniformZoom, uniformZoom);

  const cols = Math.ceil(canvas.width / zoom / GRID_SIZE) + 2;
  const rows = Math.ceil(canvas.height / zoom / GRID_SIZE) + 2;
  const startX = -offsetX / zoom - GRID_SIZE;
  const startY = -offsetY / zoom - GRID_SIZE;

  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 1 / zoom;

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

  for (const item of placedItems) {
    const isHighlighted = highlightedItem === item;
    
    ctx.fillStyle = isHighlighted ? "#ff4444" : "#2d2d2d";
    ctx.fillRect(item.x * GRID_SIZE, item.y * GRID_SIZE, item.width * GRID_SIZE, item.height * GRID_SIZE);
    
    ctx.strokeStyle = isHighlighted ? "#ff0000" : "#FFFFFF";
    ctx.lineWidth = isHighlighted ? 3 / zoom : 2 / zoom;
    ctx.strokeRect(item.x * GRID_SIZE, item.y * GRID_SIZE, item.width * GRID_SIZE, item.height * GRID_SIZE);
    
    ctx.fillStyle = "white";
    ctx.font = `12px Merriweather`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const centerX = item.x * GRID_SIZE + (item.width * GRID_SIZE) / 2;
    const centerY = item.y * GRID_SIZE + (item.height * GRID_SIZE) / 2;
    
    ctx.fillText(item.name, centerX, centerY);
    
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  if (currentMode === "build" && currentItem) {
    const [w, h] = getRotatedSize(currentItem.width, currentItem.height, previewRotation);
    const px = previewX * GRID_SIZE;
    const py = previewY * GRID_SIZE;

    const isValid = !isOccupied(previewX, previewY, w, h);

    ctx.save();

    ctx.fillStyle = isValid ? "rgba(0,255,0,0.3)" : "rgba(255,0,0,0.3)";
    ctx.fillRect(px, py, w * GRID_SIZE, h * GRID_SIZE);

    ctx.strokeStyle = isValid ? "green" : "red";
    ctx.lineWidth = 2 / zoom;
    ctx.strokeRect(px, py, w * GRID_SIZE, h * GRID_SIZE);

    ctx.fillStyle = "black";
    ctx.font = "12px Merriweather";
    const textX = px + 5;
    const textY = py + 15/zoom;
    ctx.fillText(currentItem.name, textX, textY);

    const centerX = px + (w * GRID_SIZE) / 2;
    const centerY = py + (h * GRID_SIZE) / 2;
    const arrowSize = 10 / zoom;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(previewRotation * Math.PI / 180);
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2 / zoom;
    ctx.beginPath();
    ctx.moveTo(-arrowSize, 0);
    ctx.lineTo(arrowSize, 0);
    ctx.moveTo(arrowSize - 3/zoom, -3/zoom);
    ctx.lineTo(arrowSize, 0);
    ctx.lineTo(arrowSize - 3/zoom, 3/zoom);
    ctx.stroke();
    ctx.restore();

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
  if (currentMode === "build") {
    if (!currentItem) return;

    const [w, h] = getRotatedSize(currentItem.width, currentItem.height, previewRotation);
    if (isOccupied(previewX, previewY, w, h)) return;
    
    placedItems.push({
      x: previewX,
      y: previewY,
      name: currentItem.name,
      price: currentItem.price,
      width: w,
      height: h,
      rotation: previewRotation,
      originalWidth: currentItem.width,
      originalHeight: currentItem.height
    });

    totalCost += currentItem.price;
    document.getElementById("totalCost").textContent = `Total: $${totalCost}`;
    drawGrid();
  } else if (currentMode === "delete") {
    const clickedItem = getItemAt(mouseWorldX, mouseWorldY);
    
    if (highlightedItem === clickedItem && clickedItem !== null) {
      const itemIndex = placedItems.indexOf(clickedItem);
      if (itemIndex > -1) {
        totalCost -= clickedItem.price;
        placedItems.splice(itemIndex, 1);
        document.getElementById("totalCost").textContent = `Total: $${totalCost}`;
      }
      highlightedItem = null;
    } else {
      highlightedItem = clickedItem;
    }
    
    drawGrid();
  }
});

canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const wheel = e.deltaY < 0 ? 1 : -1;
  const zoomIntensity = 0.1;
  const newZoom = zoom + wheel * zoomIntensity;

  if (newZoom > 0.1 && newZoom < 5) {
    const zoomChange = newZoom / zoom;
    offsetX = mouseX - (mouseX - offsetX) * zoomChange;
    offsetY = mouseY - (mouseY - offsetY) * zoomChange;
    zoom = newZoom;

    mouseWorldX = (mouseX - offsetX) / zoom;
    mouseWorldY = (mouseY - offsetY) / zoom;

    if (currentItem) {
      calculatePreviewPosition();
    }

    drawGrid();
  }
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
    
    highlightedItem = null;
    
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
    
    highlightedItem = null;
    
    drawGrid();
  }
  if (e.key.toLowerCase() === "r" && currentItem) {
    previewRotation = (previewRotation + 90) % 360;
    calculatePreviewPosition();
    drawGrid();
  }

  if (e.key === "Escape" && currentMode === "delete") {
    highlightedItem = null;
    drawGrid();
  }
});

window.addEventListener("resize", () => {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  drawGrid();
});
