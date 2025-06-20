// Drawing logic
const canvas = document.getElementById('draw-canvas');
const ctx = canvas.getContext('2d');
ctx.lineWidth = 6; // Make lines thicker for better visibility in the tank
let drawing = false;

// Mouse events
canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
});
canvas.addEventListener('mousemove', (e) => {
    if (drawing) {
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
    }
});
canvas.addEventListener('mouseup', () => {
    drawing = false;
});
canvas.addEventListener('mouseleave', () => {
    drawing = false;
});

// Touch events for mobile
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    drawing = true;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
});
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (drawing) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
        ctx.stroke();
    }
});
canvas.addEventListener('touchend', () => {
    drawing = false;
});
canvas.addEventListener('touchcancel', () => {
    drawing = false;
});

// Swim logic
const swimBtn = document.getElementById('swim-btn');
const swimCanvas = document.getElementById('swim-canvas');
const swimCtx = swimCanvas.getContext('2d');

// Store all fish objects
const fishes = [];

// Helper to fetch all fishes from Firestore with pagination using document ID
async function getAllFishes() {
    const allDocs = [];
    let lastDoc = null;
    const pageSize = 100;
    while (true) {
        let query = window.db.collection('fishes').limit(pageSize);
        if (lastDoc) query = query.startAfter(lastDoc.id);
        const snapshot = await query.get();
        snapshot.forEach(doc => allDocs.push(doc));
        if (snapshot.size < pageSize) break;
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }
    return allDocs;
}

// On page load, show drawing UI only if user hasn't submitted a fish
window.addEventListener('DOMContentLoaded', async () => {
    const hasSubmitted = localStorage.getItem('fishSubmitted');
    const drawUI = document.getElementById('draw-ui');
    // Use the already-declared swimCanvas variable
    if (hasSubmitted) {
        if (drawUI) drawUI.style.display = 'none';
        if (swimCanvas) swimCanvas.style.display = '';
    } else {
        if (drawUI) drawUI.style.display = '';
        if (swimCanvas) swimCanvas.style.display = 'none';
    }
    // Load all fish from Firestore on page load (fetch all pages)
    const allFishDocs = await getAllFishes();
    allFishDocs.forEach(doc => {
        const data = doc.data();
        // Log all fish data for debugging
        console.log('Fish doc:', doc.id, data);
        // Skip if image is missing or invalid
        if (!data.image || typeof data.image !== 'string' || !data.image.startsWith('data:image')) {
            console.warn('Skipping fish with invalid image:', doc.id, data);
            return;
        }
        // Create an offscreen canvas for the fish (always 80x48 for display)
        const fishCanvas = document.createElement('canvas');
        fishCanvas.width = 80;
        fishCanvas.height = 48;
        const fishCtx = fishCanvas.getContext('2d');
        // Draw the base64 image onto a temp canvas at its natural size
        const img = new window.Image();
        img.onload = function() {
            // Draw image to temp canvas at its natural size
            const temp = document.createElement('canvas');
            temp.width = img.width;
            temp.height = img.height;
            temp.getContext('2d').drawImage(img, 0, 0);
            const cropped = cropCanvasToContent(temp);
            // Draw cropped fish centered in 80x48, always scale up or down to fit
            fishCtx.clearRect(0, 0, 80, 48);
            const scale = Math.min(80 / cropped.width, 48 / cropped.height);
            const drawW = cropped.width * scale;
            const drawH = cropped.height * scale;
            const dx = (80 - drawW) / 2;
            const dy = (48 - drawH) / 2;
            fishCtx.drawImage(cropped, 0, 0, cropped.width, cropped.height, dx, dy, drawW, drawH);
            // Clamp x and y to ensure fish are always visible
            const maxX = Math.max(0, swimCanvas.width - 80);
            const maxY = Math.max(0, swimCanvas.height - 48);
            const x = Math.floor(Math.random() * maxX);
            const y = Math.floor(Math.random() * maxY);
            fishes.push({
                fishCanvas,
                x,
                y,
                direction: data.direction,
                phase: data.phase,
                amplitude: data.amplitude,
                speed: data.speed,
                vx: 0,
                vy: 0,
                width: 80,
                height: 48
            });
        };
        img.src = data.image;
    });
});

swimBtn.addEventListener('click', async () => {
    // Create an offscreen canvas for the fish
    const fishCanvas = document.createElement('canvas');
    fishCanvas.width = canvas.width; // Save at full drawing resolution
    fishCanvas.height = canvas.height;
    const fishCtx = fishCanvas.getContext('2d');
    // Enable high-quality image smoothing
    fishCtx.imageSmoothingEnabled = true;
    fishCtx.imageSmoothingQuality = 'high';
    // Copy the drawing canvas into the fish image at full resolution
    fishCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    // Randomize initial position and direction
    const direction = Math.random() > 0.5 ? 1 : -1;
    const x = Math.floor(Math.random() * (swimCanvas.width - 80));
    const y = Math.floor(Math.random() * (swimCanvas.height - 48));
    const fishObj = {
        fishCanvas,
        x,
        y,
        direction,
        phase: Math.random() * Math.PI * 2,
        amplitude: 20 + Math.random() * 10,
        speed: 1.5 + Math.random(),
        vx: 0,
        vy: 0,
        width: 80,
        height: 48
    };
    fishes.push(fishObj);
    // Save fish to Firestore at full resolution
    const fishImgData = fishCanvas.toDataURL();
    await window.db.collection('fishes').add({
        image: fishImgData,
        x: fishObj.x,
        y: fishObj.y,
        direction: fishObj.direction,
        phase: fishObj.phase,
        amplitude: fishObj.amplitude,
        speed: fishObj.speed,
        vx: 0,
        vy: 0
    });
    // Mark as submitted and switch UI
    localStorage.setItem('fishSubmitted', 'true');
    const drawUI = document.getElementById('draw-ui');
    // Use the already-declared swimCanvas variable
    if (drawUI) drawUI.style.display = 'none';
    if (swimCanvas) swimCanvas.style.display = '';
    // Clear the drawing canvas after adding the fish
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Paint options UI
const colors = ['#000000', '#ff0000', '#00cc00', '#0000ff', '#ffff00', '#ff8800', '#ffffff'];
let currentColor = colors[0];
let currentLineWidth = 6;
let undoStack = [];

function createPaintOptions() {
    let paintBar = document.getElementById('paint-bar');
    if (!paintBar) {
        paintBar = document.createElement('div');
        paintBar.id = 'paint-bar';
        paintBar.style.display = 'flex';
        paintBar.style.gap = '8px';
        paintBar.style.margin = '8px 0';
        paintBar.style.alignItems = 'center';
        paintBar.style.background = '#f8f8f8';
        paintBar.style.border = '1px solid #ccc';
        paintBar.style.padding = '6px 10px';
        paintBar.style.borderRadius = '8px';
        paintBar.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
        // Insert at the top of draw-ui
        const drawUI = document.getElementById('draw-ui');
        if (drawUI) drawUI.insertBefore(paintBar, drawUI.firstChild);
    } else {
        paintBar.innerHTML = '';
    }
    // Color buttons
    colors.forEach(color => {
        const btn = document.createElement('button');
        btn.style.background = color;
        btn.style.width = '28px';
        btn.style.height = '28px';
        btn.style.border = color === '#ffffff' ? '1px solid #888' : 'none';
        btn.style.borderRadius = '50%';
        btn.style.cursor = 'pointer';
        btn.title = color;
        btn.onclick = () => {
            currentColor = color;
        };
        paintBar.appendChild(btn);
    });
    // Line width
    const widthLabel = document.createElement('span');
    widthLabel.textContent = 'Line:';
    widthLabel.style.marginLeft = '12px';
    paintBar.appendChild(widthLabel);
    [4, 6, 10, 16].forEach(w => {
        const btn = document.createElement('button');
        btn.textContent = w;
        btn.style.width = '28px';
        btn.style.height = '28px';
        btn.style.borderRadius = '50%';
        btn.style.marginLeft = '2px';
        btn.style.cursor = 'pointer';
        btn.onclick = () => {
            currentLineWidth = w;
        };
        paintBar.appendChild(btn);
    });
}
createPaintOptions();

function pushUndo() {
    // Save current canvas state as image data
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    // Limit stack size
    if (undoStack.length > 30) undoStack.shift();
}

function undo() {
    if (undoStack.length > 0) {
        const imgData = undoStack.pop();
        ctx.putImageData(imgData, 0, 0);
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function createUndoButton() {
    let paintBar = document.getElementById('paint-bar');
    if (paintBar) {
        const undoBtn = document.createElement('button');
        undoBtn.textContent = 'Undo';
        undoBtn.style.marginLeft = '16px';
        undoBtn.style.padding = '0 12px';
        undoBtn.style.height = '28px';
        undoBtn.style.borderRadius = '6px';
        undoBtn.style.cursor = 'pointer';
        undoBtn.onclick = undo;
        paintBar.appendChild(undoBtn);
    }
}

// Push to undo stack before every new stroke
canvas.addEventListener('mousedown', pushUndo);
canvas.addEventListener('touchstart', pushUndo);

// Add undo button to paint bar
createUndoButton();

// Update drawing color and line width
canvas.addEventListener('mousedown', () => {
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentLineWidth;
});
canvas.addEventListener('touchstart', () => {
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentLineWidth;
});

// Add flying-away behavior on tap/click in the tank
function handleTankTap(e) {
    let rect = swimCanvas.getBoundingClientRect();
    let tapX, tapY;
    if (e.touches && e.touches.length > 0) {
        tapX = e.touches[0].clientX - rect.left;
        tapY = e.touches[0].clientY - rect.top;
    } else {
        tapX = e.clientX - rect.left;
        tapY = e.clientY - rect.top;
    }
    const radius = 120; // Distance for effect
    fishes.forEach(fish => {
        // Center of fish
        const fx = fish.x + fish.width / 2;
        const fy = fish.y + fish.height / 2;
        const dx = fx - tapX;
        const dy = fy - tapY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < radius) {
            // Add velocity away from tap
            const force = 16 * (1 - dist / radius); // Stronger if closer
            const norm = Math.sqrt(dx*dx + dy*dy) || 1;
            fish.vx = (dx / norm) * force;
            fish.vy = (dy / norm) * force;
            // Optionally, make fish face away
            fish.direction = dx > 0 ? 1 : -1;
        }
    });
}
swimCanvas.addEventListener('touchstart', handleTankTap);
swimCanvas.addEventListener('mousedown', handleTankTap);

// Animate all fish with sine wave swimming and tail wiggle
function animateFishes() {
    swimCtx.clearRect(0, 0, swimCanvas.width, swimCanvas.height);
    const time = Date.now() / 500;
    for (const fish of fishes) {
        // If fish has velocity from a tap, move it and apply friction
        if (fish.vx || fish.vy) {
            fish.x += fish.vx;
            fish.y += fish.vy;
            fish.vx *= 0.92; // Friction
            fish.vy *= 0.92;
            if (Math.abs(fish.vx) < 0.5) fish.vx = 0;
            if (Math.abs(fish.vy) < 0.5) fish.vy = 0;
        } else {
            fish.x += fish.speed * fish.direction;
        }
        // Sine wave for y position
        const swimY = fish.y + Math.sin(time + fish.phase) * fish.amplitude;
        // Tail wiggle: warp the image horizontally
        drawWigglingFish(fish, fish.x, swimY, fish.direction, time, fish.phase);
        if (fish.x > swimCanvas.width - fish.width || fish.x < 0) {
            fish.direction *= -1;
        }
        // Clamp fish inside the tank
        fish.x = Math.max(0, Math.min(swimCanvas.width - fish.width, fish.x));
        fish.y = Math.max(0, Math.min(swimCanvas.height - fish.height, fish.y));
    }
    requestAnimationFrame(animateFishes);
}

// Draw a fish with a tail wiggle effect
function drawWigglingFish(fish, x, y, direction, time, phase) {
    const src = fish.fishCanvas;
    const w = fish.width;
    const h = fish.height;
    const tailEnd = Math.floor(w * 0.4); // 40% is tail, 60% is head/body
    for (let i = 0; i < w; i++) {
        let isTail, t, wiggle, drawCol, drawX;
        if (direction === 1) {
            // Right-facing: tail is left, head is right
            isTail = i < tailEnd;
            t = isTail ? (tailEnd - i - 1) / (tailEnd - 1) : 0;
            wiggle = isTail ? Math.sin(time * 3 + phase + t * 2) * t * 12 : 0;
            drawCol = i;
            drawX = x + i + wiggle;
        } else {
            // Left-facing: tail is rightmost 40%, head is left
            isTail = i >= w - tailEnd;
            t = isTail ? (i - (w - tailEnd)) / (tailEnd - 1) : 0;
            wiggle = isTail ? Math.sin(time * 3 + phase + t * 2) * t * 12 : 0;
            drawCol = w - i - 1;
            drawX = x + i - wiggle;
        }
        swimCtx.save();
        swimCtx.translate(drawX, y);
        swimCtx.drawImage(src, drawCol, 0, 1, h, 0, 0, 1, h);
        swimCtx.restore();
    }
}
animateFishes();

// Responsive canvas and UI for mobile
function resizeForMobile() {
    // Make the swimCanvas fill the whole viewport
    swimCanvas.width = window.innerWidth;
    swimCanvas.height = window.innerHeight;
    swimCanvas.style.width = '100vw';
    swimCanvas.style.height = '100vh';
    swimCanvas.style.maxWidth = '100vw';
    swimCanvas.style.maxHeight = '100vh';
}

window.addEventListener('resize', resizeForMobile);
resizeForMobile();

// Make paint bar and buttons touch friendly
function enhancePaintBarTouch() {
    const paintBar = document.getElementById('paint-bar');
    if (paintBar) {
        paintBar.style.touchAction = 'manipulation';
        paintBar.style.fontSize = '1.1em';
        Array.from(paintBar.querySelectorAll('button')).forEach(btn => {
            btn.style.minWidth = '36px';
            btn.style.minHeight = '36px';
            btn.style.fontSize = '1em';
        });
    }
}
window.addEventListener('DOMContentLoaded', enhancePaintBarTouch);

// Prevent scrolling when drawing on mobile
canvas.addEventListener('touchmove', (e) => {
    if (drawing) e.preventDefault();
}, { passive: false });

// Helper to crop whitespace (transparent or white) from a canvas
function cropCanvasToContent(srcCanvas) {
    const ctx = srcCanvas.getContext('2d');
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    let minX = w, minY = h, maxX = 0, maxY = 0;
    let found = false;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const r = imgData.data[i];
            const g = imgData.data[i+1];
            const b = imgData.data[i+2];
            const a = imgData.data[i+3];
            // Consider non-transparent and not white as content
            if (a > 16 && !(r > 240 && g > 240 && b > 240)) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                found = true;
            }
        }
    }
    if (!found) return srcCanvas; // No content found
    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const cropped = document.createElement('canvas');
    cropped.width = cropW;
    cropped.height = cropH;
    cropped.getContext('2d').drawImage(srcCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
    return cropped;
}
