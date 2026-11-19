
const game = document.getElementById("game");
const ctx = game.getContext("2d");

const effects = document.getElementById("effects");
const gl = effects.getContext("webgl", {
    alpha: false,
    antialias: false
});

game.width = innerWidth;
game.height = innerHeight;

effects.width = game.width;
effects.height = game.height;

// ================================
// WEBGL : CORRECTION DES COULEURS
// ================================

let webglReady = false;
let shaderProgram;
let texture;
let buffer;

if (gl) {

    const vertexShaderSource = `
        attribute vec2 position;
        attribute vec2 uv;
        varying vec2 vUV;

        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
            vUV = uv;
        }
    `;

    const fragmentShaderSource = `
        precision mediump float;

        uniform sampler2D uTexture;
        varying vec2 vUV;

        void main() {
            vec4 color = texture2D(uTexture, vUV);

            // Correction des couleurs
            color.rgb *= vec3(1.2, 0.8, 0.6);

            gl_FragColor = vec4(color.rgb, 1.0);
        }
    `;

    function createShader(type, source) {
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }

    const vertexShader = createShader(
        gl.VERTEX_SHADER,
        vertexShaderSource
    );

    const fragmentShader = createShader(
        gl.FRAGMENT_SHADER,
        fragmentShaderSource
    );

    if (vertexShader && fragmentShader) {

        shaderProgram = gl.createProgram();

        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);

        gl.linkProgram(shaderProgram);

        if (gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {

            gl.useProgram(shaderProgram);

            const vertices = new Float32Array([
                -1, -1, 0, 0,
                 1, -1, 1, 0,
                -1,  1, 0, 1,

                -1,  1, 0, 1,
                 1, -1, 1, 0,
                 1,  1, 1, 1
            ]);

            buffer = gl.createBuffer();

            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(
                gl.ARRAY_BUFFER,
                vertices,
                gl.STATIC_DRAW
            );

            const positionLocation = gl.getAttribLocation(
                shaderProgram,
                "position"
            );

            const uvLocation = gl.getAttribLocation(
                shaderProgram,
                "uv"
            );

            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(
                positionLocation,
                2,
                gl.FLOAT,
                false,
                16,
                0
            );

            gl.enableVertexAttribArray(uvLocation);
            gl.vertexAttribPointer(
                uvLocation,
                2,
                gl.FLOAT,
                false,
                16,
                8
            );

            texture = gl.createTexture();

            gl.bindTexture(gl.TEXTURE_2D, texture);

            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_MIN_FILTER,
                gl.NEAREST
            );

            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_MAG_FILTER,
                gl.NEAREST
            );

            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_WRAP_S,
                gl.CLAMP_TO_EDGE
            );

            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_WRAP_T,
                gl.CLAMP_TO_EDGE
            );

            gl.pixelStorei(
                gl.UNPACK_FLIP_Y_WEBGL,
                true
            );

            gl.uniform1i(
                gl.getUniformLocation(shaderProgram, "uTexture"),
                0
            );

            webglReady = true;

        } else {
            console.error(gl.getProgramInfoLog(shaderProgram));
        }

    }
} else {
    console.error("WebGL n'est pas disponible.");
}

function resizeEffects() {

    effects.width = game.width;
    effects.height = game.height;

    if (webglReady) {
        gl.viewport(
            0,
            0,
            effects.width,
            effects.height
        );

        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            game.width,
            game.height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null
        );
    }
}

function applyShader() {

    if (!webglReady) return;

    gl.useProgram(shaderProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        game
    );

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// ================================
// VARIABLES DU JEU
// ================================

let x = 50;
let y = 20;
let vy = 0;
let vx = 0;

const coinSize = 20;
const keys = {};
const gravity = 0.5;

let onGround = false;

const platforms = [
    { x: 0, y: 400, w: 2400, h: 300 },
    { x: 300, y: 250, w: 200, h: 50 },
    { x: 850, y: 250, w: 200, h: 50 }
];

const coins = [
    { x: 300, y: 230 - coinSize },
    { x: 330, y: 230 - coinSize },
    { x: 360, y: 230 - coinSize },
    { x: 390, y: 230 - coinSize },
    { x: 420, y: 230 - coinSize },
    { x: 450, y: 230 - coinSize },
    { x: 480, y: 230 - coinSize },
    { x: 550, y: 380 - coinSize },
    { x: 580, y: 380 - coinSize }
];

const flag = {
    x: 2000,
    y: 160 - 60,
    w: 50,
    h: 300
};

let cameraX = 0;
let cameraY = 0;

let worldWidth = 2400;
const worldHeight = 600;

let score = 0;
const accel = 0.2;
const maxSpeed = 8.5;
const friction = 0.95;

let gameWon = false;

let scale = game.height / worldHeight;

const levelTop = -600;
const levelBottom = 600;

let charging = false;
let charge = 0;

const maxCharge = 100;
const chargeSpeed = 1.5;

const minAttackSize = 15;
const maxAttackSize = 60;

let facing = 1;
let attacks = [];

// ================================
// IMAGES
// ================================

const basiqueSky = new Image();
basiqueSky.src = "assets/background-sky.jpg";

const groundImage = new Image();
groundImage.src = "assets/sol.png";

// ================================
// REDIMENSIONNEMENT
// ================================

window.addEventListener("resize", function() {

    game.width = innerWidth;
    game.height = innerHeight;

    scale = game.height / worldHeight;

    resizeEffects();
});

resizeEffects();

// ================================
// DESSIN
// ================================

function draw() {

    ctx.clearRect(0, 0, game.width, game.height);

    ctx.fillStyle = "#050";
    ctx.fillRect(0, 0, game.width, game.height);

    if (basiqueSky.complete && basiqueSky.naturalWidth > 0) {
        ctx.drawImage(
            basiqueSky,
            0,
            0,
            game.width,
            game.height
        );
    }

    ctx.save();

    ctx.scale(scale, scale);
    ctx.translate(-cameraX, -cameraY);

    // JOUEUR

    ctx.fillStyle = "#000";
    ctx.fillRect(x, y, 40, 40);

    // PLATEFORMES

    ctx.fillStyle = "#215";

    for (let i = 0; i < platforms.length; i++) {

        if (i === 0) {

            if (groundImage.complete && groundImage.naturalWidth > 0) {

                let tileWidth = 1100;
                let tileHeight = 250;
                let offset = -10;

                for (
                    let px = platforms[i].x;
                    px < platforms[i].x + platforms[i].w;
                    px += tileWidth
                ) {

                    ctx.imageSmoothingEnabled = false;

                    ctx.drawImage(
                        groundImage,
                        px,
                        platforms[i].y + offset,
                        tileWidth,
                        tileHeight
                    );
                }

            } else {

                ctx.fillStyle = "#215";

                ctx.fillRect(
                    platforms[i].x,
                    platforms[i].y,
                    platforms[i].w,
                    platforms[i].h
                );
            }

        } else {

            ctx.fillStyle = "#215";

            ctx.fillRect(
                platforms[i].x,
                platforms[i].y,
                platforms[i].w,
                platforms[i].h
            );
        }
    }

    // PIÈCES

    for (let i = 0; i < coins.length; i++) {

        ctx.fillStyle = "rgb(242, 210, 0)";

        ctx.fillRect(
            coins[i].x,
            coins[i].y,
            coinSize,
            coinSize
        );
    }

    // DRAPEAU

    ctx.fillStyle = "#500";

    ctx.fillRect(
        flag.x,
        flag.y,
        flag.w,
        flag.h
    );

    // ATTAQUES

    ctx.fillStyle = "#db0000";

    for (let i = 0; i < attacks.length; i++) {

        ctx.fillRect(
            attacks[i].x,
            attacks[i].y,
            attacks[i].size,
            attacks[i].size
        );
    }

    // BARRE DE CHARGE

    if (charging === true) {

        ctx.fillStyle = "#000000cd";

        ctx.fillRect(
            x - 5,
            y - 15,
            50,
            8
        );

        ctx.fillStyle = "#7f9500";

        ctx.fillRect(
            x - 5,
            y - 15,
            50 * charge / maxCharge,
            8
        );
    }

    ctx.restore();

    // SCORE

    ctx.fillStyle = "#000";
    ctx.font = "bold 30px system-ui";

    ctx.fillText(
        "Piece " + score,
        20,
        30
    );

    // VICTOIRE

    if (gameWon === true) {

        ctx.fillStyle = "#000";
        ctx.textAlign = "center";

        ctx.fillText(
            "Win",
            game.width / 2,
            game.height / 2
        );

        ctx.textAlign = "left";
    }
}

// ================================
// CLAVIER
// ================================

document.addEventListener("keydown", function(e) {

    keys[e.code] = true;

});

document.addEventListener("keyup", function(e) {

    keys[e.code] = false;

});

// ================================
// ATTAQUE
// ================================

document.addEventListener("mousedown", function(e) {

    if (e.button === 0) {
        charging = true;
    }

});

window.addEventListener("mouseup", function(e) {

    let startX;

    charging = false;

    if (e.button === 0) {

        if (charge > maxCharge * 0.05) {

            const ratio = charge / maxCharge;

            let size = minAttackSize +
                ratio * (maxAttackSize - minAttackSize);

            if (facing === 1) {
                startX = x + 40;
            } else {
                startX = x - size;
            }

            attacks.push({
                x: startX,
                y: y + 20 - size / 2,
                size: size,
                vx: 10 * facing,
                life: 60
            });
        }

        charge = 0;
    }

});

// ================================
// MISE À JOUR DU JEU
// ================================

function update() {

    // DÉPLACEMENT HORIZONTAL

    if (keys["ArrowRight"] || keys["KeyD"]) {

        vx += accel;

    } else if (keys["ArrowLeft"] || keys["KeyA"]) {

        vx -= accel;

    } else {

        vx *= friction;

        if (Math.abs(vx) < 0.1) {
            vx = 0;
        }
    }

    vx = Math.min(
        maxSpeed,
        Math.max(-maxSpeed, vx)
    );

    if (vx !== 0) {
        facing = Math.sign(vx);
    }

    x += vx;

    // COLLISIONS HORIZONTALES

    for (let i = 0; i < platforms.length; i++) {

        if (
            x < platforms[i].x + platforms[i].w &&
            x + 40 > platforms[i].x &&
            y < platforms[i].y + platforms[i].h &&
            y + 40 > platforms[i].y
        ) {

            if (vx > 0) {

                vx = 0;
                x = platforms[i].x - 40;

            }

            if (vx < 0) {

                vx = 0;
                x = platforms[i].x + platforms[i].w;

            }
        }
    }

    // GRAVITÉ

    onGround = false;

    vy += gravity;
    y += vy;

    // COLLISIONS VERTICALES

    for (let i = 0; i < platforms.length; i++) {

        if (
            y + 40 >= platforms[i].y &&
            x < platforms[i].x + platforms[i].w &&
            x + 40 > platforms[i].x &&
            y + 40 - vy <= platforms[i].y
        ) {

            y = platforms[i].y - 40;
            vy = 0;
            onGround = true;
        }

        if (
            y < platforms[i].y + platforms[i].h &&
            x < platforms[i].x + platforms[i].w &&
            x + 40 > platforms[i].x &&
            y - vy >= platforms[i].y + platforms[i].h
        ) {

            y = platforms[i].y + platforms[i].h;
            vy = 0;
        }
    }

    // SAUT

    if (
        onGround === true &&
        (keys["ArrowUp"] || keys["Space"] || keys["KeyW"])
    ) {

        vy = -15;
    }

    // LIMITES DU MONDE

    x = Math.min(
        worldWidth - 40,
        Math.max(x, 0)
    );

    // CAMÉRA HORIZONTALE

    cameraX = x - game.width / scale / 2 + 20;

    cameraX = Math.min(
        worldWidth - game.width / scale,
        Math.max(0, cameraX)
    );

    // RAMASSER LES PIÈCES

    for (let i = coins.length - 1; i >= 0; i--) {

        if (
            x < coins[i].x + coinSize &&
            x + 40 > coins[i].x &&
            y < coins[i].y + coinSize &&
            y + 40 > coins[i].y
        ) {

            score += 1;

            coins.splice(i, 1);
        }
    }

    // ARRIVÉE

    if (
        y + 40 > flag.y &&
        y < flag.y + flag.h &&
        x + 40 > flag.x &&
        x < flag.x + flag.w
    ) {

        gameWon = true;
    }

    // CAMÉRA VERTICALE

    cameraY = y - game.height / scale / 2 + 20;

    cameraY = Math.min(
        levelBottom - game.height / scale,
        Math.max(levelTop, cameraY)
    );

    // CHARGEMENT DE L'ATTAQUE

    if (charging === true) {

        charge += chargeSpeed;

        charge = Math.min(
            maxCharge,
            charge
        );
    }

    // DÉPLACEMENT DES ATTAQUES

    for (let i = attacks.length - 1; i >= 0; i--) {

        attacks[i].x += attacks[i].vx;
        attacks[i].life -= 1;

        if (attacks[i].life <= 0) {

            attacks.splice(i, 1);
        }
    }
}

// ================================
// BOUCLE PRINCIPALE
// ================================

function loop() {

    update();

    draw();

    applyShader();

    requestAnimationFrame(loop);
}

loop();
function startFpsCounter() {
  let frames = 0;
  let lastTime = performance.now();

  function loop(now) {
    frames++;
    const elapsed = now - lastTime;

    if (elapsed >= 1000) {
      const fps = Math.round((frames * 1000) / elapsed);
      console.log(`FPS : ${fps}`);
      frames = 0;
      lastTime = now;
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

startFpsCounter();
