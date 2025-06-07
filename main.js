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
  rot = ((rot % 360) + 360) % 360; // Normalize to 0-359
  return (rot === 0 || rot === 180) ? [w, h] : [h, w];
}

function isOccupied(x, y, w, h) {
  for (const item of placedItems) {
    // Check if rectangles overlap
    if (!(x + w <= item.x || item.x + item.width <= x || 
          y + h <= item.y || item.y + item.height <= y)) {
      return true;
    }
  }
  return false;
}

function calculatePreviewPosition() {
  if (!currentItem) return;
  
  // Get rotated dimensions
  const [w, h] = getRotatedSize(currentItem.width, currentItem.height, previewRotation);
  
  // Calculate grid position based on mouse position
  // We want the preview to be centered on the mouse cursor
  const gridMouseX = mouseWorldX / GRID_SIZE;
  const gridMouseY = mouseWorldY / GRID_SIZE;
  
  // Center the preview on the mouse
  previewX = Math.floor(gridMouseX - w / 2);
  previewY = Math.floor(gridMouseY - h / 2);
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Fill background with dark color
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(zoom, zoom);

  // Calculate grid bounds
  const cols = Math.ceil(canvas.width / zoom / GRID_SIZE) + 2;
  const rows = Math.ceil(canvas.height / zoom / GRID_SIZE) + 2;
  const startX = -offsetX / zoom - GRID_SIZE;
  const startY = -offsetY / zoom - GRID_SIZE;
  
  // Draw alternating grid cells (like the image)
  const gridStartX = Math.floor(startX / GRID_SIZE);
  const gridStartY = Math.floor(startY / GRID_SIZE);
  
  for (let gx = gridStartX; gx < gridStartX + cols; gx++) {
    for (let gy = gridStartY; gy < gridStartY + rows; gy++) {
      const x = gx * GRID_SIZE;
      const y = gy * GRID_SIZE;
      
      // Create checkerboard pattern with subtle color variations
      const isEven = (gx + gy) % 2 === 0;
      ctx.fillStyle = isEven ? "#333333" : "#2d2d2d";
      ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
      
      // Add subtle border to each cell
      ctx.strokeStyle = "#404040";
      ctx.lineWidth = 0.5 / zoom;
      ctx.strokeRect(x, y, GRID_SIZE, GRID_SIZE);
    }
  }
  
  // Draw major grid lines every 5 cells (optional - for better navigation)
  ctx.strokeStyle = "#555555";
  ctx.lineWidth = 1.5 / zoom;
  
  for (let x = Math.floor(startX / (GRID_SIZE * 5)) * (GRID_SIZE * 5); 
       x < startX + cols * GRID_SIZE; 
       x += GRID_SIZE * 5) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, startY + rows * GRID_SIZE);
    ctx.stroke();
  }
  
  for (let y = Math.floor(startY / (GRID_SIZE * 5)) * (GRID_SIZE * 5); 
       y < startY + rows * GRID_SIZE; 
       y += GRID_SIZE * 5) {
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + cols * GRID_SIZE, y);
    ctx.stroke();
  }

  // Draw placed items
  for (const item of placedItems) {
    ctx.fillStyle = "orange";
    ctx.fillRect(item.x * GRID_SIZE, item.y * GRID_SIZE, item.width * GRID_SIZE, item.height * GRID_SIZE);
    ctx.strokeStyle = "#ff8c00";
    ctx.lineWidth = 2 / zoom;
    ctx.strokeRect(item.x * GRID_SIZE, item.y * GRID_SIZE, item.width * GRID_SIZE, item.height * GRID_SIZE);
    
    ctx.fillStyle = "white";
    ctx.font = `${14/zoom}px Arial`;
    ctx.fillText(item.name, item.x * GRID_SIZE + 5, item.y * GRID_SIZE + 20/zoom);
  }

  // Draw preview
  if (currentMode === "build" && currentItem) {
    const [w, h] = getRotatedSize(currentItem.width, currentItem.height, previewRotation);
    const px = previewX * GRID_SIZE;
    const py = previewY * GRID_SIZE;
    
    // Check if placement is valid
    const isValid = !isOccupied(previewX, previewY, w, h);
    
    ctx.save();
    
    // Draw the preview rectangle
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = isValid ? "rgba(0,255,100,0.4)" : "rgba(255,50,50,0.4)";
    ctx.fillRect(px, py, w * GRID_SIZE, h * GRID_SIZE);
    
    ctx.globalAlpha = 1;
    ctx.strokeStyle = isValid ? "#00ff64" : "#ff3232";
    ctx.lineWidth = 2 / zoom;
    ctx.strokeRect(px, py, w * GRID_SIZE, h * GRID_SIZE);
    
    // Draw item name
    ctx.fillStyle = "white";
    ctx.font = `${12/zoom}px Arial`;
    ctx.shadowColor = "black";
    ctx.shadowBlur = 2;
    const textX = px + 5;
    const textY = py + 15/zoom;
    ctx.fillText(currentItem.name, textX, textY);
    ctx.shadowBlur = 0;
    
    // Draw rotation indicator (small arrow)
    if (previewRotation !== 0) {
      const centerX = px + (w * GRID_SIZE) / 2;
      const centerY = py + (h * GRID_SIZE) / 2;
      const arrowSize = 10 / zoom;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(previewRotation * Math.PI / 180);
      ctx.strokeStyle = "#00ccff";
      ctx.lineWidth = 2 / zoom;
      ctx.beginPath();
      ctx.moveTo(-arrowSize, 0);
      ctx.lineTo(arrowSize, 0);
      ctx.moveTo(arrowSize - 3/zoom, -3/zoom);
      ctx.lineTo(arrowSize, 0);
      ctx.lineTo(arrowSize - 3/zoom, 3/zoom);
      ctx.stroke();
      ctx.restore();
    }
    
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

  // Calculate mouse world coordinates
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

  // Store the item with its original rotation information
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
});

// Zoom functionality
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
    
    // Recalculate mouse world position
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
