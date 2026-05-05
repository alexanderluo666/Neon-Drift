const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;

// --------------------
// INPUT
// --------------------
let keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// --------------------
// CAR
// --------------------
let car = {
    x: 0,
    y: 0,
    angle: 0,
    speed: 0
};

// --------------------
// CAMERA
// --------------------
let cam = {
    x: 0,
    y: 0
};

// --------------------
// UPDATE CAR PHYSICS (DRIFT CORE)
// --------------------
function updateCar(){

    // acceleration
    if(keys["w"]) car.speed += 0.2;
    if(keys["s"]) car.speed -= 0.15;

    // steering depends on speed (important drift feel)
    let turn = 0;
    if(keys["a"]) turn = -0.05;
    if(keys["d"]) turn = 0.05;

    car.angle += turn * car.speed * 0.1;

    // friction
    car.speed *= 0.98;

    // clamp speed
    car.speed = Math.max(-5, Math.min(10, car.speed));

    // movement
    car.x += Math.cos(car.angle) * car.speed;
    car.y += Math.sin(car.angle) * car.speed;
}

// --------------------
// CAMERA FOLLOW
// --------------------
function updateCamera(){
    cam.x += (car.x - cam.x) * 0.08;
    cam.y += (car.y - cam.y) * 0.08;
}

// --------------------
// NEON GRID BACKGROUND
// --------------------
function drawGrid(){
    ctx.strokeStyle = "#0ff2";

    let size = 50;

    for(let x = -1000; x < 1000; x += size){
        let sx = x - cam.x + canvas.width/2;

        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, canvas.height);
        ctx.stroke();
    }

    for(let y = -1000; y < 1000; y += size){
        let sy = y - cam.y + canvas.height/2;

        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(canvas.width, sy);
        ctx.stroke();
    }
}

// --------------------
// DRAW CAR
// --------------------
function drawCar(){

    let x = car.x - cam.x + canvas.width/2;
    let y = car.y - cam.y + canvas.height/2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(car.angle);

    ctx.fillStyle = "#00ffff";
    ctx.fillRect(-10, -5, 20, 10);

    ctx.restore();
}

// --------------------
// LOOP
// --------------------
function loop(){

    ctx.fillStyle = "black";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    updateCar();
    updateCamera();

    drawGrid();
    drawCar();

    requestAnimationFrame(loop);
}

loop();
