const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;

// =====================
// INPUT
// =====================
let keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// =====================
// CAMERA
// =====================
let cam = { x: 0, y: 0 };

// =====================
// CAR
// =====================
let car = {
    x: 0, y: 0,
    vx: 0, vy: 0,
    angle: 0,
    boost: 0
};

// =====================
// GAME STATE
// =====================
let score = 0;
let combo = 1;
let driftTimer = 0;
let drifting = false;

// =====================
// TRAILS
// =====================
let trails = [];

// =====================
// ROAD
// =====================
const ROAD_WIDTH = 200;

function roadY(x){
    return Math.sin(x*0.01)*200 + Math.sin(x*0.003)*400;
}

// =====================
// AUDIO SYSTEM
// =====================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

let engineOsc = audioCtx.createOscillator();
let engineGain = audioCtx.createGain();

engineOsc.type = "sawtooth";
engineOsc.connect(engineGain);
engineGain.connect(audioCtx.destination);

engineGain.gain.value = 0.05;
engineOsc.start();

// drift noise
let noise = audioCtx.createBufferSource();
let noiseBuffer = audioCtx.createBuffer(1, 44100, 44100);
let data = noiseBuffer.getChannelData(0);

for(let i=0;i<data.length;i++){
    data[i] = Math.random()*2-1;
}

noise.buffer = noiseBuffer;

let noiseGain = audioCtx.createGain();
noise.connect(noiseGain);
noiseGain.connect(audioCtx.destination);
noise.loop = true;
noiseGain.gain.value = 0;
noise.start();

// =====================
// PHYSICS
// =====================
function updateCar(){

    const accel = 0.3;
    const turnSpeed = 0.04;
    const friction = 0.98;
    const driftFactor = 0.9;

    let fx = Math.cos(car.angle);
    let fy = Math.sin(car.angle);

    if(keys["w"]){
        car.vx += fx * accel;
        car.vy += fy * accel;
    }

    if(keys["s"]){
        car.vx -= fx * accel * 0.5;
        car.vy -= fy * accel * 0.5;
    }

    // BOOST
    if(keys[" "] && car.boost > 0){
        car.vx += fx * 0.6;
        car.vy += fy * 0.6;
        car.boost -= 0.5;
    }

    let speed = Math.hypot(car.vx, car.vy);

    if(keys["a"]) car.angle -= turnSpeed * speed * 0.1;
    if(keys["d"]) car.angle += turnSpeed * speed * 0.1;

    let rightX = Math.cos(car.angle + Math.PI/2);
    let rightY = Math.sin(car.angle + Math.PI/2);

    let lateral = car.vx * rightX + car.vy * rightY;

    drifting = Math.abs(lateral) > 1.2;

    if(drifting){
        driftTimer++;
        combo += 0.01;
        score += Math.abs(lateral) * combo * 0.1;

        trails.push({x:car.x,y:car.y,life:1});
        car.boost += 0.02;
    } else {
        if(driftTimer > 10) combo = 1;
        driftTimer = 0;
    }

    car.vx -= lateral * rightX * (1 - driftFactor);
    car.vy -= lateral * rightY * (1 - driftFactor);

    let dist = Math.abs(car.y - roadY(car.x));
    if(dist > ROAD_WIDTH/2){
        car.vx *= 0.93;
        car.vy *= 0.93;
    }

    car.vx *= friction;
    car.vy *= friction;

    car.x += car.vx;
    car.y += car.vy;

    // =====================
    // SOUND UPDATE
    // =====================
    engineOsc.frequency.value = 100 + speed * 10;
    noiseGain.gain.value = drifting ? 0.05 : 0;
}

// =====================
// CAMERA
// =====================
function updateCamera(){
    cam.x += (car.x - cam.x)*0.08;
    cam.y += (car.y - cam.y)*0.08;
}

// =====================
// CITY GENERATION
// =====================
function buildingHeight(x){
    return (Math.sin(x*0.002)+1)*200 + 100;
}

// =====================
// DRAW CITY
// =====================
function drawCity(){

    let baseY = canvas.height/2 - (cam.y + 400);

    for(let i=-20;i<20;i++){

        let worldX = Math.floor((cam.x/200)+i)*200;
        let screenX = worldX - cam.x + canvas.width/2;

        let h = buildingHeight(worldX);

        ctx.fillStyle = "#050505";
        ctx.fillRect(screenX, baseY - h, 180, h);

        // neon edges
        ctx.strokeStyle = "#0ff";
        ctx.strokeRect(screenX, baseY - h, 180, h);
    }
}

// =====================
// GLOW
// =====================
function glow(color, blur){
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
}

// =====================
// ROAD
// =====================
function drawRoad(){

    ctx.beginPath();

    for(let px=0;px<canvas.width;px++){
        let worldX = cam.x + (px - canvas.width/2);
        let center = roadY(worldX);

        let top = center - ROAD_WIDTH/2;
        let screenTop = top - cam.y + canvas.height/2;

        if(px===0) ctx.moveTo(px,screenTop);
        else ctx.lineTo(px,screenTop);
    }

    for(let px=canvas.width-1;px>=0;px--){
        let worldX = cam.x + (px - canvas.width/2);
        let center = roadY(worldX);

        let bottom = center + ROAD_WIDTH/2;
        let screenBottom = bottom - cam.y + canvas.height/2;

        ctx.lineTo(px,screenBottom);
    }

    ctx.closePath();

    ctx.fillStyle = "#111";
    ctx.fill();

    glow("#ff00ff",15);
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.shadowBlur = 0;
}

// =====================
// TRAILS
// =====================
function drawTrails(){
    trails.forEach(t=>{
        let x = t.x - cam.x + canvas.width/2;
        let y = t.y - cam.y + canvas.height/2;

        glow("#00ffff",10);
        ctx.fillRect(x,y,3,3);

        t.life -= 0.02;
    });

    trails = trails.filter(t=>t.life>0);
    ctx.shadowBlur = 0;
}

// =====================
// CAR
// =====================
function drawCar(){

    let x = car.x - cam.x + canvas.width/2;
    let y = car.y - cam.y + canvas.height/2;

    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(car.angle);

    glow("#00ffff",20);
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(-10,-5,20,10);

    ctx.restore();
    ctx.shadowBlur = 0;
}

// =====================
// UI
// =====================
function drawUI(){

    ctx.fillStyle = "#00ffff";
    ctx.font = "18px monospace";
    ctx.fillText(`Score: ${Math.floor(score)}`, 20, 30);

    if(combo > 1){
        ctx.fillStyle = "#ff00ff";
        ctx.fillText(`Combo x${combo.toFixed(2)}`, 20, 55);
    }

    ctx.fillStyle = "#0ff";
    ctx.fillRect(20, 70, car.boost * 5, 10);
    ctx.strokeStyle = "#0ff";
    ctx.strokeRect(20, 70, 200, 10);
}

// =====================
// LOOP
// =====================
function loop(){

    ctx.fillStyle = "black";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    updateCar();
    updateCamera();

    drawCity();   // NEW
    drawRoad();
    drawTrails();
    drawCar();
    drawUI();

    requestAnimationFrame(loop);
}

loop();
