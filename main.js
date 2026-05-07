const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;

window.addEventListener("resize", resizeCanvas);

let audioContext = null;
let engineOscillator = null;
let engineGain = null;
let boostSoundCooldown = 0;

function resizeCanvas(){
    canvas.width = innerWidth;
    canvas.height = innerHeight;
}

// =====================
// INPUT
// =====================
let keys = {};
window.addEventListener("keydown", e => {
    if(!audioContext) initAudio();
    keys[e.key.toLowerCase()] = true;
    
    if(minimapZoomed){
        if(e.key === 'Escape' || e.key === 'm' || e.key === 'M'){
            minimapZoomed = false;
        }
        if(e.key === 'ArrowLeft'){
            minimapOffsetX -= 100;
        }
        if(e.key === 'ArrowRight'){
            minimapOffsetX += 100;
        }
        if(e.key === 'ArrowUp'){
            minimapOffsetY -= 100;
        }
        if(e.key === 'ArrowDown'){
            minimapOffsetY += 100;
        }
        return;
    }
    
    if(gameState === 'menu'){
        if(e.key === 'ArrowLeft'){
            menuPage = Math.max(0, menuPage - 1);
        }
        if(e.key === 'ArrowRight'){
            menuPage = Math.min(2, menuPage + 1);
        }
        if(e.key === 'ArrowUp'){
            if(menuPage === 0){
                selectedMode = Math.max(0, selectedMode - 1);
            } else if(menuPage === 1){
                selectedMap = Math.max(0, selectedMap - 1);
            } else {
                selectedCar = Math.max(0, selectedCar - 1);
            }
        }
        if(e.key === 'ArrowDown'){
            if(menuPage === 0){
                selectedMode = Math.min(modes.length - 1, selectedMode + 1);
            } else if(menuPage === 1){
                selectedMap = Math.min(maps.length - 1, selectedMap + 1);
            } else {
                selectedCar = Math.min(cars.length - 1, selectedCar + 1);
            }
        }
        if(e.key === 'Enter'){
            let car = cars[selectedCar];
            playerCar.color = car.color;
            playerCar.accel = car.accel;
            playerCar.turn = car.turn;
            playerCar.maxSpeed = car.maxSpeed;
            if(modes[selectedMode].multiplayer){
                playerCar2.color = '#ff55ff';
                playerCar2.accel = 0.28;
                playerCar2.turn = 0.045;
                playerCar2.maxSpeed = 9;
            }
            level = 1;
            currentMapIndex = selectedMap;
            resetPlayers();
            initMap(currentMapIndex);
            gameState = 'playing';
            spawnBots();
            if(engineOscillator) engineOscillator.frequency.value = 120;
            playTone(440, 0.12, 'triangle');
        }
    }
});
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// =====================
// MOUSE INPUT
// =====================
let minimapZoomed = false;
let lastMinimapClickTime = 0;

canvas.addEventListener("click", e => {
    if(gameState !== 'playing') return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const minimapSize = 160;
    const minimapX0 = canvas.width - minimapSize - 10;
    const minimapY0 = 10;
    
    const isClickOnMinimap = clickX >= minimapX0 && clickX <= minimapX0 + minimapSize &&
                             clickY >= minimapY0 && clickY <= minimapY0 + minimapSize;
    
    if(isClickOnMinimap){
        minimapZoomed = !minimapZoomed;
        lastMinimapClickTime = Date.now();
    }
});

// =====================
// CAMERA
// =====================
let cam = { x: 0, y: 0 };

// =====================
// GAME STATE
// =====================
let gameState = 'menu'; // 'menu', 'playing', 'minimapZoom'
let level = 1;
let score = 0;
let selectedMode = 1;
let selectedMap = 0;
let selectedCar = 0;
let menuPage = 0;
let currentMapIndex = 0;
let levelTarget = 8000;
let minimapOffsetX = 0;
let minimapOffsetY = 0;

// =====================
// GAME MODES
// =====================
const modes = [
    { name: 'Single Player', ai: false, multiplayer: false },
    { name: 'AI Race', ai: true, multiplayer: false },
    { name: 'Multiplayer', ai: false, multiplayer: true }
];

// =====================
// MAPS
// =====================
const maps = [
    {
        name: 'Neon City',
        roadFunc: x => Math.sin(x*0.01)*220 + Math.sin(x*0.003)*320,
        finish: 8000,
        aiSpeed: 0.25,
        aiCount: 2,
        roadColor: '#111122',
        edgeColor: '#00ffff',
        centerColor: '#ffffff',
        poleColor: '#ff00ff'
    },
    {
        name: 'Cyber Canyon',
        roadFunc: x => Math.sin(x*0.008)*260 + Math.cos(x*0.004)*380,
        finish: 9000,
        aiSpeed: 0.3,
        aiCount: 3,
        roadColor: '#120018',
        edgeColor: '#66ffcc',
        centerColor: '#ff0088',
        poleColor: '#88ccff'
    },
    {
        name: 'Voltage Ridge',
        roadFunc: x => Math.sin(x*0.02)*140 + Math.sin(x*0.01)*260 + Math.cos(x*0.0015)*120,
        finish: 10000,
        aiSpeed: 0.35,
        aiCount: 4,
        roadColor: '#101014',
        edgeColor: '#ffdd00',
        centerColor: '#ffffff',
        poleColor: '#44ff88'
    }
];

// =====================
// CARS
// =====================
const cars = [
    { name: 'Neon', color: '#00ffff', accel: 0.3, turn: 0.04, maxSpeed: 10 },
    { name: 'Fire', color: '#ff6600', accel: 0.35, turn: 0.03, maxSpeed: 12 },
    { name: 'Ghost', color: '#ffffff', accel: 0.25, turn: 0.05, maxSpeed: 8 },
    { name: 'Shadow', color: '#6600ff', accel: 0.28, turn: 0.045, maxSpeed: 9 }
];

// =====================
// PLAYER CARS
// =====================
const playerCar = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    boost: 100,
    color: "#00ffff",
    accel: 0.3,
    turn: 0.04,
    maxSpeed: 10
};

const playerCar2 = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    boost: 100,
    color: "#ff00ff",
    accel: 0.28,
    turn: 0.045,
    maxSpeed: 9
};

// =====================
// AI CARS
// =====================
let bots = [];

// =====================
// PARTICLES
// =====================
let particles = [];

// =====================
// STARS
// =====================
let stars = [];
for(let i=0;i<200;i++){
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        brightness: Math.random()
    });
}

function randomAIColor(){
    // ensures NOT same as player color
    let hue = Math.floor(Math.random() * 360);
    return `hsl(${hue},100%,60%)`;
}

function initMap(index){
    currentMapIndex = index % maps.length;
    let map = maps[currentMapIndex];
    levelTarget = playerCar.x + map.finish;
}

function resetPlayers(){
    playerCar.x = 0;
    playerCar.y = roadY(0);
    playerCar.vx = 0;
    playerCar.vy = 0;
    playerCar.angle = 0;
    playerCar.boost = 100;

    playerCar2.x = -40;
    playerCar2.y = roadY(playerCar2.x);
    playerCar2.vx = 0;
    playerCar2.vy = 0;
    playerCar2.angle = 0;
    playerCar2.boost = 100;
}

function spawnBots(){
    bots = [];
    let map = maps[currentMapIndex];
    let mode = modes[selectedMode];
    let aiCount = mode.ai ? map.aiCount : 0;

    for(let i=0;i<aiCount;i++){
        bots.push({
            x: playerCar.x - 300 - i*100,
            y: playerCar.y,
            vx: 0,
            vy: 0,
            angle: 0,
            color: randomAIColor()
        });
    }
}

// =====================
// ROAD
// =====================
const ROAD_WIDTH = 220;

function roadY(x){
    return maps[currentMapIndex % maps.length].roadFunc(x);
}

// =====================
// EFFECT SETTINGS
// =====================
const FX = {
    roadGlow: "#ff00ff",
    playerGlow: "#00ffff",
    penalty: 0.88
};

// =====================
// DRAW BACKGROUND
// =====================
function drawBackground(){
    let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#00101f');
    gradient.addColorStop(0.5, '#000011');
    gradient.addColorStop(1, '#02020a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle = '#ffffff';
    stars.forEach(s => {
        ctx.globalAlpha = s.brightness * 0.8;
        ctx.fillRect(s.x, s.y, 1, 1);
    });
    ctx.globalAlpha = 1;
}

function drawMapObjects(){
    let map = maps[currentMapIndex % maps.length];
    ctx.fillStyle = map.poleColor;
    for(let worldX = Math.floor((cam.x - canvas.width) / 180) * 180; worldX < cam.x + canvas.width; worldX += 180){
        let y = roadY(worldX);
        let sx = worldX - cam.x + canvas.width/2;
        let sy = y - cam.y + canvas.height/2;

        ctx.fillRect(sx - ROAD_WIDTH/2 - 18, sy - 18, 8, 36);
        ctx.fillRect(sx + ROAD_WIDTH/2 + 10, sy - 18, 8, 36);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - ROAD_WIDTH/2 - 22, sy - 4, 16, 8);
        ctx.fillRect(sx + ROAD_WIDTH/2 + 6, sy - 4, 16, 8);
        ctx.fillStyle = map.poleColor;
    }
}

function updateStars(){
    stars.forEach(s => {
        s.y += 0.25 + Math.abs(playerCar.vx) * 0.01;
        if(s.y > canvas.height) s.y = 0;
    });
}

function initAudio(){
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    engineGain = audioContext.createGain();
    engineGain.gain.value = 0.02;
    engineGain.connect(audioContext.destination);
    engineOscillator = audioContext.createOscillator();
    engineOscillator.type = 'sawtooth';
    engineOscillator.frequency.value = 80;
    engineOscillator.connect(engineGain);
    engineOscillator.start();
}

function playTone(freq, duration, type = 'sine'){
    if(!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.1;
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + duration);
}

function updateEngineSound(){
    if(!engineOscillator) return;
    let speed = Math.hypot(playerCar.vx, playerCar.vy);
    engineOscillator.frequency.value = 80 + speed * 12;
    engineGain.gain.value = 0.02 + Math.min(0.08, speed * 0.003);
}

// =====================
// UPDATE PLAYER
// =====================
function updatePlayer(){

    const friction = 0.98;

    let fx = Math.cos(playerCar.angle);
    let fy = Math.sin(playerCar.angle);

    if(keys["w"]){
        playerCar.vx += fx * playerCar.accel;
        playerCar.vy += fy * playerCar.accel;
    }

    if(keys["s"]){
        playerCar.vx -= fx * playerCar.accel * 0.5;
        playerCar.vy -= fy * playerCar.accel * 0.5;
    }

    let speed = Math.hypot(playerCar.vx, playerCar.vy);

    if(keys["a"]) playerCar.angle -= playerCar.turn * speed * 0.1;
    if(keys["d"]) playerCar.angle += playerCar.turn * speed * 0.1;

    // BOOST
    if(keys["shift"] && playerCar.boost > 0){
        playerCar.vx *= 1.05;
        playerCar.vy *= 1.05;
        playerCar.boost -= 0.5;
        // add particle
        particles.push({
            x: playerCar.x - fx*15,
            y: playerCar.y - fy*15,
            vx: -fx * 2 + (Math.random()-0.5)*0.5,
            vy: -fy * 2 + (Math.random()-0.5)*0.5,
            life: 30,
            color: playerCar.color
        });
    } else {
        playerCar.boost = Math.min(100, playerCar.boost + 0.2);
    }

    // SPEED LIMIT
    if(speed > playerCar.maxSpeed){
        playerCar.vx *= 0.95;
        playerCar.vy *= 0.95;
    }

    // OFFROAD PENALTY
    let dist = Math.abs(playerCar.y - roadY(playerCar.x));
    if(dist > ROAD_WIDTH/2){
        playerCar.vx *= FX.penalty;
        playerCar.vy *= FX.penalty;
    }

    playerCar.vx *= friction;
    playerCar.vy *= friction;

    playerCar.x += playerCar.vx;
    playerCar.y += playerCar.vy;

    score += Math.max(0, speed * 0.05);

    // LEVEL UP
    if(playerCar.x > levelTarget){
        level++;
        currentMapIndex++;
        initMap(currentMapIndex);
        spawnBots();
    }
}

function updatePlayer2(){
    const friction = 0.98;

    let fx = Math.cos(playerCar2.angle);
    let fy = Math.sin(playerCar2.angle);

    if(keys["arrowup"]){
        playerCar2.vx += fx * playerCar2.accel;
        playerCar2.vy += fy * playerCar2.accel;
    }

    if(keys["arrowdown"]){
        playerCar2.vx -= fx * playerCar2.accel * 0.5;
        playerCar2.vy -= fy * playerCar2.accel * 0.5;
    }

    let speed = Math.hypot(playerCar2.vx, playerCar2.vy);

    if(keys["arrowleft"]) playerCar2.angle -= playerCar2.turn * speed * 0.1;
    if(keys["arrowright"]) playerCar2.angle += playerCar2.turn * speed * 0.1;

    // SPEED LIMIT
    if(speed > playerCar2.maxSpeed){
        playerCar2.vx *= 0.95;
        playerCar2.vy *= 0.95;
    }

    let dist = Math.abs(playerCar2.y - roadY(playerCar2.x));
    if(dist > ROAD_WIDTH/2){
        playerCar2.vx *= FX.penalty;
        playerCar2.vy *= FX.penalty;
    }

    playerCar2.vx *= friction;
    playerCar2.vy *= friction;

    playerCar2.x += playerCar2.vx;
    playerCar2.y += playerCar2.vy;
}

// =====================
// AI UPDATE (FIXED COLOR + SIMPLE FOLLOW ROAD)
// =====================
function updateBots(){

    let map = maps[currentMapIndex % maps.length];
    let aiSpeed = map.aiSpeed;

    bots.forEach(b => {

        let tx = b.x + 200;
        let ty = roadY(tx);

        let dx = tx - b.x;
        let dy = ty - b.y;

        let targetAngle = Math.atan2(dy, dx);

        b.angle += (targetAngle - b.angle) * 0.05;

        b.vx += Math.cos(b.angle) * aiSpeed;
        b.vy += Math.sin(b.angle) * aiSpeed;

        b.vx *= 0.97;
        b.vy *= 0.97;

        b.x += b.vx;
        b.y += b.vy;
    });
}

// =====================
// CAMERA
// =====================
function updateCamera(){
    cam.x += (playerCar.x - cam.x) * 0.08;
    cam.y += (playerCar.y - cam.y) * 0.08;
}

// =====================
// ROAD DRAW
// =====================
function drawRoad(){
    let map = maps[currentMapIndex % maps.length];

    ctx.beginPath();

    for(let x=0;x<canvas.width;x++){
        let wx = cam.x + (x - canvas.width/2);
        let y = roadY(wx);

        let top = y - ROAD_WIDTH/2;
        let sy = top - cam.y + canvas.height/2;

        if(x===0) ctx.moveTo(x,sy);
        else ctx.lineTo(x,sy);
    }

    for(let x=canvas.width-1;x>=0;x--){
        let wx = cam.x + (x - canvas.width/2);
        let y = roadY(wx);

        let bottom = y + ROAD_WIDTH/2;
        let sy = bottom - cam.y + canvas.height/2;

        ctx.lineTo(x,sy);
    }

    ctx.closePath();
    ctx.fillStyle = map.roadColor;
    ctx.fill();

    ctx.shadowColor = map.edgeColor;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = map.edgeColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.strokeStyle = map.centerColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    for(let x=0;x<canvas.width;x++){
        let wx = cam.x + (x - canvas.width/2);
        let y = roadY(wx);
        let sy = y - cam.y + canvas.height/2;
        if(x===0) ctx.moveTo(x,sy);
        else ctx.lineTo(x,sy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.shadowBlur = 0;
}

// =====================
// DRAW CAR (GLOW FIXED)
// =====================
function drawCar(obj, color){

    let x = obj.x - cam.x + canvas.width/2;
    let y = obj.y - cam.y + canvas.height/2;

    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(obj.angle);

    ctx.shadowColor = color;
    ctx.shadowBlur = 18;

    ctx.fillStyle = color;
    // body
    ctx.fillRect(-12,-6,24,12);
    // front
    ctx.fillRect(10,-4,6,8);
    // wheels
    ctx.fillRect(-10,-8,4,4);
    ctx.fillRect(6,-8,4,4);
    ctx.fillRect(-10,4,4,4);
    ctx.fillRect(6,4,4,4);

    ctx.restore();

    ctx.shadowBlur = 0;
}

// =====================
// DRAW PARTICLES
// =====================
function drawParticles(){
    particles.forEach(p => {
        let x = p.x - cam.x + canvas.width/2;
        let y = p.y - cam.y + canvas.height/2;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.fillRect(x - 1, y - 1, 2, 2);
    });
    ctx.globalAlpha = 1;
}

// =====================
// UPDATE PARTICLES
// =====================
function updateParticles(){
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        return p.life > 0;
    });
}

// =====================
// DRAW MENU
// =====================
function drawMenu(){
    ctx.fillStyle = "#000011";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle = "#00ffff";
    ctx.font = "48px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Neon Drift", canvas.width/2, 100);

    ctx.font = "22px monospace";
    ctx.fillText("Use Left/Right to switch screen, Up/Down to change selection", canvas.width/2, 150);
    ctx.fillText("Press Enter to start after selecting car", canvas.width/2, 180);

    const pageTitles = ["Mode Select", "Track Select", "Car Select"];
    const pageInstructions = [
        "Choose how you want to play",
        "Choose the track for the race",
        "Choose your vehicle"
    ];

    ctx.font = "32px monospace";
    ctx.fillText(pageTitles[menuPage], canvas.width/2, 240);

    ctx.font = "18px monospace";
    ctx.fillText(pageInstructions[menuPage], canvas.width/2, 270);

    if(menuPage === 0){
        modes.forEach((mode, i) => {
            let y = 340 + i * 50;
            ctx.fillStyle = selectedMode === i ? "#ffff00" : "#ffffff";
            ctx.fillText(mode.name, canvas.width/2, y);
        });
    } else if(menuPage === 1){
        maps.forEach((map, i) => {
            let y = 340 + i * 50;
            ctx.fillStyle = selectedMap === i ? "#ffff00" : "#ffffff";
            ctx.fillText(map.name + " — " + map.finish + "m", canvas.width/2, y);
        });
    } else {
        cars.forEach((car, i) => {
            let y = 340 + i * 50;
            ctx.fillStyle = selectedCar === i ? "#ffff00" : "#ffffff";
            ctx.fillText(car.name + " (A:" + car.accel.toFixed(2) + ", T:" + car.turn.toFixed(2) + ", S:" + car.maxSpeed + ")", canvas.width/2, y);
        });
    }

    ctx.font = "16px monospace";
    ctx.fillStyle = "#00ffff";
    let summary = "Mode: " + modes[selectedMode].name + " | Track: " + maps[selectedMap].name + " | Car: " + cars[selectedCar].name;
    ctx.fillText(summary, canvas.width/2, canvas.height - 50);
    ctx.textAlign = "left";
}

// =====================
// MINIMAP (PLAYER + AI + FINISH)
// =====================
function drawMinimap(){
    const size = 160;
    let x0 = canvas.width - size - 10;
    let y0 = 10;

    ctx.save();
    ctx.fillStyle = "#000a";
    ctx.fillRect(x0, y0, size, size);

    // Draw road path
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let i = playerCar.x - 400; i < playerCar.x + 1200; i += 40){
        let roadY_val = roadY(i);
        let mmx = x0 + size/2 + (i - playerCar.x) * 0.01;
        let mmy = y0 + size/2 + (roadY_val - playerCar.y) * 0.01;
        if(i === playerCar.x - 400) ctx.moveTo(mmx, mmy);
        else ctx.lineTo(mmx, mmy);
    }
    ctx.stroke();

    // Finish line
    let finishX = x0 + (levelTarget - playerCar.x) * 0.01;
    ctx.fillStyle = "#ff00ff";
    ctx.fillRect(finishX, y0, 3, size);

    // Player
    ctx.fillStyle = playerCar.color;
    ctx.fillRect(x0 + size/2 - 2, y0 + size/2 - 2, 4, 4);

    // Player 2
    if(modes[selectedMode].multiplayer){
        ctx.fillStyle = playerCar2.color;
        let p2x = x0 + size/2 + (playerCar2.x - playerCar.x) * 0.01;
        let p2y = y0 + size/2 + (playerCar2.y - playerCar.y) * 0.01;
        ctx.fillRect(p2x - 2, p2y - 2, 4, 4);
    }

    // AI
    bots.forEach(b => {
        let bx = x0 + size/2 + (b.x - playerCar.x) * 0.01;
        let by = y0 + size/2 + (b.y - playerCar.y) * 0.01;
        ctx.fillStyle = b.color;
        ctx.fillRect(bx - 1.5, by - 1.5, 3, 3);
    });

    // Border
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, y0, size, size);

    ctx.restore();
}

function drawMinimapZoomed(){
    const circleRadius = Math.min(canvas.width, canvas.height) / 2.5;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Background
    ctx.fillStyle = "#000011";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw circular minimap
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#000a";
    ctx.fill();

    // Draw road path in circle
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for(let i = playerCar.x - 800; i < playerCar.x + 1600; i += 40){
        let roadY_val = roadY(i);
        let mmx = centerX + (i - playerCar.x) * 0.02;
        let mmy = centerY + (roadY_val - playerCar.y) * 0.02;
        if(i === playerCar.x - 800) ctx.moveTo(mmx, mmy);
        else ctx.lineTo(mmx, mmy);
    }
    ctx.stroke();

    // Finish line (circle around it)
    let finishX_val = centerX + (levelTarget - playerCar.x) * 0.02;
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(finishX_val, centerY, 15, 0, Math.PI * 2);
    ctx.stroke();

    // Player (large)
    ctx.fillStyle = playerCar.color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Player 2
    if(modes[selectedMode].multiplayer){
        ctx.fillStyle = playerCar2.color;
        let p2x = centerX + (playerCar2.x - playerCar.x) * 0.02;
        let p2y = centerY + (playerCar2.y - playerCar.y) * 0.02;
        ctx.beginPath();
        ctx.arc(p2x, p2y, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    // AI
    bots.forEach(b => {
        let bx = centerX + (b.x - playerCar.x) * 0.02;
        let by = centerY + (b.y - playerCar.y) * 0.02;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(bx, by, 6, 0, Math.PI * 2);
        ctx.fill();
    });

    // Outer circle border
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // Instructions
    ctx.fillStyle = "#00ffff";
    ctx.font = "18px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Minimap View - Press ESC or M to close", canvas.width / 2, 40);
    ctx.fillText("Press Left/Right to scroll, or click minimap to close", canvas.width / 2, canvas.height - 40);
    ctx.textAlign = "left";
}


// =====================
// UI
// =====================
function drawUI(){

    ctx.fillStyle = "#00ffff";
    ctx.font = "16px monospace";

    let mapName = maps[currentMapIndex % maps.length].name;
    ctx.fillText("Mode: " + modes[selectedMode].name, 20, 25);
    ctx.fillText("Track: " + mapName, 20, 45);
    ctx.fillText("Score: " + Math.floor(score), 20, 65);
    ctx.fillText("Distance: " + Math.floor(playerCar.x), 20, 85);

    // Boost bar
    ctx.fillStyle = "#333";
    ctx.fillRect(20, 95, 100, 10);
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(20, 95, playerCar.boost, 10);
    ctx.fillStyle = "#00ffff";
    ctx.fillText("Boost", 130, 105);

    if(modes[selectedMode].multiplayer){
        ctx.fillStyle = playerCar2.color;
        ctx.fillText("Player 2 x: " + Math.floor(playerCar2.x), 20, 125);
    }
}

// =====================
// LOOP
// =====================
function loop(){

    if(gameState === 'menu'){
        drawMenu();
    } else if(gameState === 'playing'){
        drawBackground();
        drawMapObjects();

        updatePlayer();
        if(modes[selectedMode].multiplayer) updatePlayer2();
        updateBots();
        updateParticles();
        updateStars();
        updateEngineSound();
        updateCamera();

        drawRoad();
        drawParticles();

        bots.forEach(b => drawCar(b, b.color));
        drawCar(playerCar, playerCar.color);
        if(modes[selectedMode].multiplayer) drawCar(playerCar2, playerCar2.color);

        drawUI();
        
        if(minimapZoomed){
            drawMinimapZoomed();
        } else {
            drawMinimap();
        }
    }

    requestAnimationFrame(loop);
}

spawnBots();
loop();
