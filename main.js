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


function translatePath(path) {
  return ("https://raw.githubusercontent.com/SaintRemys/IndustrialistVisualiser/refs/heads/main/" + path)
}

function loadItems() {
  fetch("items.json")
    .then(res => res.json())
    .then(itemsData => {
      console.log("Successfully Loaded");

      for (let i = 1; i <= 4; i++) {
        const items = itemsData[`t${i}-items`];
        if (!Array.isArray(items)) {
          console.warn(`No items found for t${i}-items`);
          continue;
        }

        const container = document.getElementById(`tier${i}items`);
        items.forEach(item => {
          const itemDiv = document.createElement("div");
          itemDiv.className = "item";
          itemDiv.dataset.name = item.name;
          itemDiv.dataset.price = item.price;
          itemDiv.dataset.width = item.width;
          itemDiv.dataset.height = item.height;
          itemDiv.dataset.color = item.color;
          itemDiv.textContent = `${item.name} - $${item.price}`;

          const img = document.createElement("img");
          img.className = "icon";
          img.src = item.image || "https://i.postimg.cc/dV7QpGLC/output-onlinepngtools-1.png";
          img.alt = item.name;

          const label_top = document.createElement("div");
          label_top.className = "label-top";
          label_top.textContent = item.name;

          const label_bottom = document.createElement("div");
          label_bottom.className = "label-bottom";
          label_bottom.textContent = `$${item.price}`;

          itemDiv.appendChild(img);
          itemDiv.appendChild(label_top);
          itemDiv.appendChild(label_bottom);
          container.appendChild(itemDiv);
        });
      }

      // Now that all .item elements are created, attach click handlers:
      document.querySelectorAll(".item").forEach(item => {
        item.addEventListener("click", () => {
          currentItem = {
            name: item.dataset.name,
            price: parseInt(item.dataset.price),
            width: parseInt(item.dataset.width),
            height: parseInt(item.dataset.height),
            color: item.dataset.color,
          };
          previewRotation = 0;
          calculatePreviewPosition();
          drawGrid();
        });
      });
    })
    .catch(err => console.error("Failed to load items.json:", err));
}

loadItems();


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

let lastNotificationText = null;
let lastNotificationBox = null;
let lastNotificationCount = 1;

const activeNotifications = [];

function showNotification(message, duration = 3000) {
  const existing = activeNotifications.find(n => n.message === message);
  
  if (existing) {
    existing.count++;
    existing.box.textContent = `${message} (x${existing.count})`;
    clearTimeout(existing.timeout);
    existing.box.style.opacity = "1";
    existing.timeout = setTimeout(() => {
      fadeOutNotification(existing);
    }, duration);
    return;
  }

  const box = document.createElement("div");
  box.textContent = message;
  box.style.background = "linear-gradient(#d91012, #710809)";
  box.style.backgroundClip = "text";
  box.style.webkitTextFillColor = "transparent";
  box.style.fontFamily = "Merriweather";
  box.style.fontSize = "20px";
  box.style.transition = "opacity 0.3s";
  box.style.opacity = "1";
  box.style.textAlign = "right";
  box.style.webkitTextStroke = "1px rgba(0, 0, 0, 0.5)";
  box.style.marginBottom = "4px";

  const container = document.getElementById("notifications");
  container.appendChild(box);

  const entry = {
    message,
    box,
    count: 1,
    timeout: setTimeout(() => fadeOutNotification(entry), duration)
  };

  activeNotifications.push(entry);
}

function fadeOutNotification(entry) {
  entry.box.style.opacity = "0";
  setTimeout(() => {
    entry.box.remove();
    const index = activeNotifications.indexOf(entry);
    if (index !== -1) activeNotifications.splice(index, 1);
  }, 300);
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

  let originX = 0;
  let originY = 0;

  if (rot === 0) {
    originX = anchorGridX;
    originY = anchorGridY;
  } else if (rot === 90) {
    originX = anchorGridX - (h - 1);
    originY = anchorGridY;
  } else if (rot === 180) {
    originX = anchorGridX - (w - 1);
    originY = anchorGridY - (h - 1);
  } else if (rot === 270) {
    originX = anchorGridX;
    originY = anchorGridY - (w - 1);
  }

  previewX = originX;
  previewY = originY;
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
  ctx.lineWidth = 1;

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
    
    ctx.fillStyle = isHighlighted ? "#ff4444" : item.color;
    ctx.fillRect(item.x * GRID_SIZE, item.y * GRID_SIZE, item.width * GRID_SIZE, item.height * GRID_SIZE);

    function getContrastColor(hex) {
      if (!hex) return "#fff";
      hex = hex.replace(/^#/, "");

      if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
      }

      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);

      const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
      
      return luminance > 150 ? "#000" : "#fff";
    }
	function fitFontSize(ctx, text, maxWidth, maxHeight, fontFamily = "Merriweather", startSize = 12, minSize = 1) {
		let fontSize = startSize;
		ctx.font = `${fontSize}px ${fontFamily}`;
		let lineHeight = fontSize * 1.2;

		const words = text.split(" ");
		let lines;

		while (fontSize >= minSize) {
			ctx.font = `${fontSize}px ${fontFamily}`;
			lineHeight = fontSize * 1.2;

			let line = "";
			lines = [];
			for (let i = 0; i < words.length; i++) {
			const testLine = line + words[i] + " ";
			if (ctx.measureText(testLine).width > maxWidth && i > 0) {
				lines.push(line);
				line = words[i] + " ";
			} else {
				line = testLine;
			}
			}
			lines.push(line);

			const totalHeight = lines.length * lineHeight;
			if (totalHeight <= maxHeight) break;
			fontSize--;
		}

	return { font: `${fontSize}px ${fontFamily}`, lineHeight, lines };
	}

	
    ctx.fillStyle = getContrastColor(item.color);
    ctx.font = `12px Merriweather`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const centerX = item.x * GRID_SIZE + (item.width * GRID_SIZE) / 2;
    const centerY = item.y * GRID_SIZE + (item.height * GRID_SIZE) / 2;
    
    function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let lines = [];
    
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        lines.push(line);
        line = words[n] + " ";
      } else {
        line = testLine;
      }
    }
    lines.push(line);
  
    const totalHeight = lines.length * lineHeight;
    let startY = y - totalHeight / 2 + lineHeight / 2;
  
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i].trim(), x, startY + i * lineHeight);
    }
  }
    const maxTextWidth = item.width * GRID_SIZE - 6;
	const maxTextHeight = item.height * GRID_SIZE - 6;
	const { font, lineHeight, lines } = fitFontSize(ctx, item.name, maxTextWidth, maxTextHeight);
	ctx.font = font;

let startY = centerY - (lines.length * lineHeight) / 2 + lineHeight / 2;
for (let i = 0; i < lines.length; i++) {
  ctx.fillText(lines[i].trim(), centerX, startY + i * lineHeight);
}
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
      originalHeight: currentItem.height,
      color: currentItem.color,
    });

    totalCost += Number(currentItem.price) || 0;
    showNotification(`+$${Number(currentItem.price) || 0}`, 5000);
    document.getElementById("totalCost").innerHTML = `<i>Total: $${totalCost}</i>`;
    drawGrid();
  } else if (currentMode === "delete") {
    const clickedItem = getItemAt(mouseWorldX, mouseWorldY);
    
    if (highlightedItem === clickedItem && clickedItem !== null) {
      const itemIndex = placedItems.indexOf(clickedItem);
      if (itemIndex > -1) {
        totalCost -= clickedItem.price;
        placedItems.splice(itemIndex, 1);
        showNotification(`-$${currentItem.price}`, 5000);
        document.getElementById("totalCost").innerHTML = `<i>Total: $${totalCost}<i>`;
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
      height: parseInt(item.dataset.height),
      color: item.dataset.color,
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

const tierButtons = [
  { btn: document.getElementById('tier1'), container: document.getElementById('tier1items') },
  { btn: document.getElementById('tier2'), container: document.getElementById('tier2items') },
  { btn: document.getElementById('tier3'), container: document.getElementById('tier3items') },
  { btn: document.getElementById('tier4'), container: document.getElementById('tier4items') },
];

const sidebar = document.getElementById('sidebar');

tierButtons.forEach(({ btn, container }) => {
  btn.addEventListener('click', () => {
    tierButtons.forEach(({ btn }) => btn.classList.remove('selected'));
    btn.classList.add('selected');

    tierButtons.forEach(({ container }) => container.style.display = 'none');
    container.style.display = 'block';

    sidebar.scrollTop = 0;
    sidebar.scrollLeft = 0;
  });
});


const tiers = [
  { element: document.getElementById('tier1'), selectedClass: 'selected1' },
  { element: document.getElementById('tier2'), selectedClass: 'selected2' },
  { element: document.getElementById('tier3'), selectedClass: 'selected3' },
  { element: document.getElementById('tier4'), selectedClass: 'selected4' },
];

tiers.forEach(({ element, selectedClass }) => {
  element.addEventListener('click', () => {
    tiers.forEach(({ element, selectedClass }) => {
      element.classList.remove(selectedClass);
    });

    element.classList.add(selectedClass);
  });
});
tiers[0].element.classList.add(tiers[0].selectedClass);

