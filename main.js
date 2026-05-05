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
// CAR (REAL PHYSICS)
// =====================
let car = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0
};

// =====================
// PHYSICS UPDATE (DRIFT)
// =====================
function updateCar(){

    const accel = 0.3;
    const turnSpeed = 0.04;
    const friction = 0.98;
    const driftFactor = 0.92;

    // forward vector
    let fx = Math.cos(car.angle);
    let fy = Math.sin(car.angle);

    // acceleration
    if(keys["w"]){
        car.vx += fx * accel;
        car.vy += fy * accel;
    }

    if(keys["s"]){
        car.vx -= fx * accel * 0.5;
        car.vy -= fy * accel * 0.5;
    }

    // steering depends on speed
    let speed = Math.hypot(car.vx, car.vy);

    if(keys["a"]) car.angle -= turnSpeed * (speed * 0.1);
    if(keys["d"]) car.angle += turnSpeed * (speed * 0.1);

    // DRIFT PHYSICS (KEY PART)
    let rightX = Math.cos(car.angle + Math.PI/2);
    let rightY = Math.sin(car.angle + Math.PI/2);

    let lateral = car.vx * rightX + car.vy * rightY;

    // reduce sideways sliding (drift tuning)
    car.vx -= lateral * rightX * (1 - driftFactor);
    car.vy -= lateral * rightY * (1 - driftFactor);

    // friction
    car.vx *= friction;
    car.vy *= friction;

    // move
    car.x += car.vx;
    car.y += car.vy;
}

// =====================
// CAMERA FOLLOW
// =====================
function updateCamera(){
    cam.x += (car.x - cam.x) * 0.08;
    cam.y += (car.y - cam.y) * 0.08;
}

// =====================
// INFINITE NEON GRID
// =====================
function drawGrid(){

    const size = 80;
    ctx.strokeStyle = "#0ff2";

    let startX = Math.floor((cam.x - canvas.width/2) / size);
    let endX   = Math.floor((cam.x + canvas.width/2) / size);

    let startY = Math.floor((cam.y - canvas.height/2) / size);
    let endY   = Math.floor((cam.y + canvas.height/2) / size);

    for(let x=startX; x<=endX; x++){
        let sx = x*size - cam.x + canvas.width/2;

        ctx.beginPath();
        ctx.moveTo(sx,0);
        ctx.lineTo(sx,canvas.height);
        ctx.stroke();
    }

    for(let y=startY; y<=endY; y++){
        let sy = y*size - cam.y + canvas.height/2;

        ctx.beginPath();
        ctx.moveTo(0,sy);
        ctx.lineTo(canvas.width,sy);
        ctx.stroke();
    }
}

// =====================
// PROCEDURAL ROAD (INFINITE)
// =====================
function roadY(x){
    // smooth continuous road
    return Math.sin(x * 0.01) * 200 +
           Math.sin(x * 0.003) * 400;
}

// =====================
// DRAW ROAD
// =====================
function drawRoad(){

    ctx.beginPath();

    for(let px=0; px<canvas.width; px++){

        let worldX = cam.x + (px - canvas.width/2);

        let y = roadY(worldX);

        let screenY = y - cam.y + canvas.height/2;

        if(px === 0){
            ctx.moveTo(px, screenY);
        } else {
            ctx.lineTo(px, screenY);
        }
    }

    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 4;
    ctx.stroke();
}

// =====================
// DRAW CAR
// =====================
function drawCar(){

    let x = car.x - cam.x + canvas.width/2;
    let y = car.y - cam.y + canvas.height/2;

    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(car.angle);

    ctx.fillStyle = "#00ffff";
    ctx.fillRect(-10,-5,20,10);

    ctx.restore();
}

// =====================
// LOOP
// =====================
function loop(){

    ctx.fillStyle = "black";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    updateCar();
    updateCamera();

    drawGrid();
    drawRoad();
    drawCar();

    requestAnimationFrame(loop);
}

loop();
