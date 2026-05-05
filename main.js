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
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    boost: 0
};

// =====================
// TRAILS
// =====================
let trails = [];

// =====================
// SETTINGS
// =====================
const ROAD_WIDTH = 200;

// =====================
// ROAD
// =====================
function roadY(x){
    return Math.sin(x*0.01)*200 + Math.sin(x*0.003)*400;
}

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

    // DRIFT
    let rightX = Math.cos(car.angle + Math.PI/2);
    let rightY = Math.sin(car.angle + Math.PI/2);

    let lateral = car.vx * rightX + car.vy * rightY;

    if(Math.abs(lateral) > 1){
        // drift trail
        trails.push({
            x: car.x,
            y: car.y,
            life: 1
        });

        // gain boost from drifting
        car.boost += 0.02;
    }

    car.vx -= lateral * rightX * (1 - driftFactor);
    car.vy -= lateral * rightY * (1 - driftFactor);

    // OFFROAD
    let dist = Math.abs(car.y - roadY(car.x));
    if(dist > ROAD_WIDTH/2){
        car.vx *= 0.93;
        car.vy *= 0.93;
    }

    car.vx *= friction;
    car.vy *= friction;

    car.x += car.vx;
    car.y += car.vy;
}

// =====================
// CAMERA
// =====================
function updateCamera(){
    cam.x += (car.x - cam.x)*0.08;
    cam.y += (car.y - cam.y)*0.08;
}

// =====================
// GLOW FUNCTION
// =====================
function glow(color, blur){
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
}

// =====================
// GRID
// =====================
function drawGrid(){

    const size = 80;
    ctx.strokeStyle = "#0ff2";

    let startX = Math.floor((cam.x - canvas.width/2)/size);
    let endX   = Math.floor((cam.x + canvas.width/2)/size);

    let startY = Math.floor((cam.y - canvas.height/2)/size);
    let endY   = Math.floor((cam.y + canvas.height/2)/size);

    for(let x=startX;x<=endX;x++){
        let sx = x*size - cam.x + canvas.width/2;

        ctx.beginPath();
        ctx.moveTo(sx,0);
        ctx.lineTo(sx,canvas.height);
        ctx.stroke();
    }

    for(let y=startY;y<=endY;y++){
        let sy = y*size - cam.y + canvas.height/2;

        ctx.beginPath();
        ctx.moveTo(0,sy);
        ctx.lineTo(canvas.width,sy);
        ctx.stroke();
    }
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
        ctx.fillStyle = "#00ffff";
        ctx.fillRect(x,y,3,3);

        t.life -= 0.02;
    });

    trails = trails.filter(t=>t.life > 0);

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
// MINIMAP
// =====================
function drawMinimap(){

    const size = 150;
    const scaleMini = 0.1;

    let x0 = canvas.width - size - 10;
    let y0 = 10;

    ctx.fillStyle = "#000a";
    ctx.fillRect(x0,y0,size,size);

    ctx.strokeStyle = "#0ff";
    ctx.strokeRect(x0,y0,size,size);

    ctx.beginPath();

    for(let i=0;i<size;i++){
        let worldX = car.x + (i - size/2)/scaleMini;
        let worldY = roadY(worldX);

        let mx = x0 + i;
        let my = y0 + size/2 - (worldY - car.y)*scaleMini;

        if(i===0) ctx.moveTo(mx,my);
        else ctx.lineTo(mx,my);
    }

    glow("#ff00ff",10);
    ctx.strokeStyle = "#ff00ff";
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.fillStyle = "#00ffff";
    ctx.beginPath();
    ctx.arc(x0+size/2,y0+size/2,4,0,Math.PI*2);
    ctx.fill();
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
    drawTrails();
    drawCar();
    drawMinimap();

    requestAnimationFrame(loop);
}

loop();
