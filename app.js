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
    // Load all fish from Firestore on page load
    const snapshot = await window.db.collection('fishes').get();
    snapshot.forEach(doc => {
        const data = doc.data();
        // Skip if image is missing or invalid
        if (!data.image || typeof data.image !== 'string' || !data.image.startsWith('data:image')) {
            return;
        }
        // Create an offscreen canvas for the fish
        const fishCanvas = document.createElement('canvas');
        fishCanvas.width = 80;
        fishCanvas.height = 48;
        const fishCtx = fishCanvas.getContext('2d');
        // Draw the base64 image onto the canvas
        const img = new window.Image();
        img.onload = function() {
            fishCtx.drawImage(img, 0, 0, 80, 48);
            fishes.push({
                fishCanvas,
                x: data.x,
                y: data.y,
                direction: data.direction,
                phase: data.phase,
                amplitude: data.amplitude,
                speed: data.speed,
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
    fishCanvas.width = 80;
    fishCanvas.height = 48;
    const fishCtx = fishCanvas.getContext('2d');
    // Enable high-quality image smoothing
    fishCtx.imageSmoothingEnabled = true;
    fishCtx.imageSmoothingQuality = 'high';
    // Scale the drawing canvas into the fish image
    fishCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 80, 48);
    // Randomize initial position and direction
    const y = Math.floor(Math.random() * (swimCanvas.height - 48));
    const direction = Math.random() > 0.5 ? 1 : -1;
    const fishObj = {
        fishCanvas,
        x: direction === 1 ? 0 : swimCanvas.width - 80,
        y,
        direction,
        phase: Math.random() * Math.PI * 2,
        amplitude: 20 + Math.random() * 10,
        speed: 1.5 + Math.random(),
        width: 80,
        height: 48
    };
    fishes.push(fishObj);
    // Save fish to Firestore
    const fishImgData = fishCanvas.toDataURL();
    await window.db.collection('fishes').add({
        image: fishImgData,
        x: fishObj.x,
        y: fishObj.y,
        direction: fishObj.direction,
        phase: fishObj.phase,
        amplitude: fishObj.amplitude,
        speed: fishObj.speed
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

// Animate all fish with sine wave swimming and tail wiggle
function animateFishes() {
    swimCtx.clearRect(0, 0, swimCanvas.width, swimCanvas.height);
    const time = Date.now() / 500;
    for (const fish of fishes) {
        fish.x += fish.speed * fish.direction;
        // Sine wave for y position
        const swimY = fish.y + Math.sin(time + fish.phase) * fish.amplitude;
        // Tail wiggle: warp the image horizontally
        drawWigglingFish(fish, fish.x, swimY, fish.direction, time, fish.phase);
        if (fish.x > swimCanvas.width - fish.width || fish.x < 0) {
            fish.direction *= -1;
        }
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
