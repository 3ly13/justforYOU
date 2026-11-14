
const canvas = document.getElementById("fireworks");
const ctx = canvas.getContext("2d", { alpha: false });

// ==========================================
// SETTINGS
// ==========================================

let width = 0;
let height = 0;
let dpr = 1;

let hearts = [];
let heartParticles = [];
let rockets = [];
let fireworks = [];

let animationStarted = false;
let formationComplete = false;
let formationStart = 0;

let lastRocket = 0;
let lastFirework = 0;

const COLORS = [
    "#ff1744",
    "#ff2d75",
    "#ff4081",
    "#ff69a6",
    "#ff80ab",
    "#ffb6d9",
    "#e91e63",
    "#ba68c8",
    "#ce93d8",
    "#ffd700",
    "#fff176"
];

const BACKGROUND = "#05030a";

const random = (min, max) =>
    Math.random() * (max - min) + min;


// ==========================================
// CANVAS RESIZING
// ==========================================

function resizeCanvas() {

    dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, width, height);

    if (animationStarted) {
        createHearts();
    }
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();


// ==========================================
// PERFECT HEART GEOMETRY
// ==========================================

function getHeartGeometry(cx, cy, size) {

    const bottom = {
        x: cx,
        y: cy + size * 0.82
    };

    const segments = [

        // Left side
        [
            { x: cx - size * 1.08, y: cy + size * 0.18 },
            { x: cx - size * 1.10, y: cy - size * 0.78 },
            { x: cx - size * 0.42, y: cy - size * 0.72 }
        ],

        // Left upper curve into center
        [
            { x: cx - size * 0.12, y: cy - size * 0.68 },
            { x: cx - size * 0.04, y: cy - size * 0.38 },
            { x: cx, y: cy - size * 0.30 }
        ],

        // Right upper curve
        [
            { x: cx + size * 0.04, y: cy - size * 0.38 },
            { x: cx + size * 0.12, y: cy - size * 0.68 },
            { x: cx + size * 0.42, y: cy - size * 0.72 }
        ],

        // Right side back to bottom
        [
            { x: cx + size * 1.10, y: cy - size * 0.78 },
            { x: cx + size * 1.08, y: cy + size * 0.18 },
            bottom
        ]

    ];

    const polygon = [bottom];

    let start = bottom;

    for (const segment of segments) {

        const [cp1, cp2, end] = segment;

        for (let i = 1; i <= 35; i++) {

            const t = i / 35;
            const mt = 1 - t;

            const x =
                mt ** 3 * start.x +
                3 * mt ** 2 * t * cp1.x +
                3 * mt * t ** 2 * cp2.x +
                t ** 3 * end.x;

            const y =
                mt ** 3 * start.y +
                3 * mt ** 2 * t * cp1.y +
                3 * mt * t ** 2 * cp2.y +
                t ** 3 * end.y;

            polygon.push({ x, y });
        }

        start = end;
    }

    return {
        cx,
        cy,
        size,
        bottom,
        segments,
        polygon
    };
}


// ==========================================
// POINT INSIDE HEART
// ==========================================

function pointInsidePolygon(x, y, polygon) {

    let inside = false;

    for (
        let i = 0, j = polygon.length - 1;
        i < polygon.length;
        j = i++
    ) {

        const a = polygon[i];
        const b = polygon[j];

        const intersects =
            ((a.y > y) !== (b.y > y)) &&
            (
                x <
                (b.x - a.x) *
                (y - a.y) /
                (b.y - a.y) +
                a.x
            );

        if (intersects) {
            inside = !inside;
        }
    }

    return inside;
}


// ==========================================
// DRAW HEART SHAPE
// ==========================================

function traceHeart(heart) {

    const { cx, cy, size, bottom, segments } = heart;

    ctx.beginPath();

    ctx.moveTo(bottom.x, bottom.y);

    for (const segment of segments) {

        const [cp1, cp2, end] = segment;

        ctx.bezierCurveTo(
            cp1.x,
            cp1.y,
            cp2.x,
            cp2.y,
            end.x,
            end.y
        );
    }

    ctx.closePath();
}


// ==========================================
// CREATE HEART PARTICLES
// ==========================================

function createHeart(cx, cy, size, spacing, delay = 0) {

    const heart = getHeartGeometry(cx, cy, size);

    hearts.push(heart);

    const minX = cx - size * 1.1;
    const maxX = cx + size * 1.1;

    const minY = cy - size * 0.8;
    const maxY = cy + size * 0.82;

    // Regular grid creates evenly distributed particles

    for (let y = minY; y <= maxY; y += spacing) {

        for (let x = minX; x <= maxX; x += spacing) {

            if (!pointInsidePolygon(x, y, heart.polygon)) {
                continue;
            }

            const startX = random(width * 0.05, width * 0.95);
            const startY = height + random(20, height * 0.35);

            heartParticles.push({

                x: startX,
                y: startY,

                startX,
                startY,

                targetX: x,
                targetY: y,

                centerX: cx,
                centerY: cy,

                color: COLORS[
                    Math.floor(Math.random() * COLORS.length)
                ],

                size: spacing * random(0.48, 0.65),

                delay: delay + random(0, 0.2),

                progress: 0,

                shimmer: random(0, Math.PI * 2),

                currentAlpha: 1

            });
        }
    }
}


// ==========================================
// CREATE ALL HEARTS
// ==========================================

function createHearts() {

    hearts = [];
    heartParticles = [];

    rockets = [];
    fireworks = [];

    formationComplete = false;
    formationStart = performance.now();

    const min = Math.min(width, height);

    const mainSize = min * 0.16;
    const smallSize = min * 0.047;
    const tinySize = min * 0.037;

    // MAIN HEART

    createHeart(
        width * 0.5,
        height * 0.37,
        mainSize,
        4,
        0
    );

    // TOP LEFT

    createHeart(
        width * 0.15,
        height * 0.16,
        smallSize,
        3.5,
        0.15
    );

    // TOP RIGHT

    createHeart(
        width * 0.85,
        height * 0.16,
        smallSize,
        3.5,
        0.25
    );

    // MIDDLE LEFT

    createHeart(
        width * 0.105,
        height * 0.48,
        smallSize,
        3.5,
        0.35
    );

    // MIDDLE RIGHT

    createHeart(
        width * 0.895,
        height * 0.48,
        smallSize,
        3.5,
        0.45
    );

    // BOTTOM LEFT

    createHeart(
        width * 0.29,
        height * 0.72,
        tinySize,
        3.2,
        0.55
    );

    // BOTTOM RIGHT

    createHeart(
        width * 0.71,
        height * 0.72,
        tinySize,
        3.2,
        0.65
    );

}


// ==========================================
// HEART FORMATION
// ==========================================

function updateHearts(time) {

    const elapsed = (time - formationStart) / 1000;

    let allFormed = true;

    for (const p of heartParticles) {

        const localTime = elapsed - p.delay;

        if (localTime <= 0) {

            allFormed = false;
            continue;
        }

        const duration = 1.35;

        p.progress = Math.min(1, localTime / duration);

        // Smooth easing

        const eased =
            1 - Math.pow(1 - p.progress, 3);

        p.x =
            p.startX +
            (p.targetX - p.startX) * eased;

        p.y =
            p.startY +
            (p.targetY - p.startY) * eased;

        if (p.progress < 1) {
            allFormed = false;
        }

        p.shimmer += 0.025;

        p.currentAlpha =
            0.85 + Math.sin(p.shimmer) * 0.15;

    }

    // Reveal message

    if (allFormed && !formationComplete) {

        formationComplete = true;

        const message =
            document.getElementById("loveMessage");

        if (message) {

            setTimeout(() => {
                message.style.opacity = "1";
            }, 350);

        }
    }
}


// ==========================================
// DRAW HEART SILHOUETTES
// ==========================================

function drawHeartSilhouettes(time) {

    for (const heart of hearts) {

        ctx.save();

        const gradient = ctx.createLinearGradient(
            heart.cx - heart.size,
            heart.cy - heart.size,
            heart.cx + heart.size,
            heart.cy + heart.size
        );

        gradient.addColorStop(0, "#ff1744");
        gradient.addColorStop(0.5, "#ff69a6");
        gradient.addColorStop(1, "#ba68c8");

        traceHeart(heart);

        ctx.globalAlpha = formationComplete ? 0.22 : 0.09;

        ctx.fillStyle = gradient;

        ctx.fill();

        ctx.globalAlpha = formationComplete ? 0.65 : 0.28;

        ctx.strokeStyle = "#ff80ab";
        ctx.lineWidth = 1.2;

        ctx.stroke();

        ctx.restore();
    }
}


// ==========================================
// DRAW HEART PARTICLES
// ==========================================

function drawHearts(time) {

    for (const p of heartParticles) {

        if (p.progress <= 0) continue;

        let x = p.x;
        let y = p.y;

        // Gentle pulsing

        if (formationComplete) {

            const pulse =
                1 + Math.sin(time * 0.0018) * 0.012;

            x = p.centerX +
                (p.x - p.centerX) * pulse;

            y = p.centerY +
                (p.y - p.centerY) * pulse;
        }

        ctx.globalAlpha = p.currentAlpha;

        ctx.fillStyle = p.color;

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            p.size,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.globalAlpha = 1;
}


// ==========================================
// ROCKET CREATION
// ==========================================

function launchRocket() {

    if (rockets.length >= 4) return;

    const x = random(width * 0.12, width * 0.88);

    const color = COLORS[
        Math.floor(Math.random() * COLORS.length)
    ];

    rockets.push({

        x,
        y: height + 10,

        vx: random(-0.5, 0.5),
        vy: random(-9, -7),

        targetY: random(height * 0.12, height * 0.48),

        color,

        dead: false

    });
}


// ==========================================
// FIREWORK EXPLOSION
// ==========================================

function explodeRocket(rocket) {

    const count = Math.floor(random(45, 65));

    for (let i = 0; i < count; i++) {

        const angle = random(0, Math.PI * 2);

        const speed = random(1, 4.2);

        fireworks.push({

            x: rocket.x,
            y: rocket.y,

            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,

            gravity: 0.035,

            friction: 0.985,

            life: 1,

            decay: random(0.012, 0.022),

            color: rocket.color,

            size: random(1.2, 2.6)

        });
    }

    // Secondary small sparkle burst

    for (let i = 0; i < 12; i++) {

        const angle = random(0, Math.PI * 2);

        const speed = random(0.5, 2);

        fireworks.push({

            x: rocket.x,
            y: rocket.y,

            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,

            gravity: 0.02,

            friction: 0.98,

            life: 1,

            decay: 0.025,

            color: "#ffffff",

            size: random(1, 1.8)

        });
    }

    // Keep the animation lightweight

    if (fireworks.length > 650) {

        fireworks.splice(
            0,
            fireworks.length - 650
        );
    }
}


// ==========================================
// UPDATE ROCKETS
// ==========================================

function updateRockets() {

    for (let i = rockets.length - 1; i >= 0; i--) {

        const r = rockets[i];

        r.x += r.vx;
        r.y += r.vy;

        r.vy += 0.055;

        // Rocket trail

        if (Math.random() < 0.7) {

            fireworks.push({

                x: r.x,
                y: r.y,

                vx: random(-0.6, 0.6),
                vy: random(0.5, 1.8),

                gravity: 0.015,

                friction: 0.96,

                life: 0.5,

                decay: 0.045,

                color: r.color,

                size: random(1, 2)

            });
        }

        // Explode at target

        if (r.y <= r.targetY || r.vy >= 0) {

            explodeRocket(r);

            rockets.splice(i, 1);
        }
    }
}


// ==========================================
// UPDATE FIREWORK PARTICLES
// ==========================================

function updateFireworks() {

    for (let i = fireworks.length - 1; i >= 0; i--) {

        const p = fireworks[i];

        p.x += p.vx;
        p.y += p.vy;

        p.vy += p.gravity;

        p.vx *= p.friction;
        p.vy *= p.friction;

        p.life -= p.decay;

        if (p.life <= 0) {

            fireworks.splice(i, 1);
        }
    }
}


// ==========================================
// DRAW ROCKETS
// ==========================================

function drawRockets() {

    for (const r of rockets) {

        ctx.save();

        ctx.globalAlpha = 1;

        ctx.fillStyle = r.color;

        ctx.shadowColor = r.color;
        ctx.shadowBlur = 12;

        ctx.beginPath();

        ctx.arc(
            r.x,
            r.y,
            3,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }
}


// ==========================================
// DRAW FIREWORKS
// ==========================================

function drawFireworks() {

    ctx.save();

    ctx.globalCompositeOperation = "lighter";

    for (const p of fireworks) {

        ctx.globalAlpha = Math.max(0, p.life);

        ctx.fillStyle = p.color;

        ctx.beginPath();

        ctx.arc(
            p.x,
            p.y,
            p.size,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.globalAlpha = 1;

    ctx.globalCompositeOperation = "source-over";

    ctx.restore();
}


// ==========================================
// MAIN ANIMATION LOOP
// ==========================================

function animate(time) {

    requestAnimationFrame(animate);

    // Background

    ctx.globalAlpha = 1;

    ctx.globalCompositeOperation = "source-over";

    ctx.fillStyle = BACKGROUND;

    ctx.fillRect(0, 0, width, height);

    if (!animationStarted) return;

    // Hearts

    updateHearts(time);

    drawHeartSilhouettes(time);

    drawHearts(time);

    // Launch fireworks periodically

    if (time - lastRocket > 1100) {

        launchRocket();

        lastRocket = time;
    }

    // Occasional extra background sparkle

    if (time - lastFirework > 2400) {

        if (Math.random() < 0.7) {

            launchRocket();
        }

        lastFirework = time;
    }

    // Fireworks

    updateRockets();

    updateFireworks();

    drawFireworks();

    drawRockets();
}

requestAnimationFrame(animate);


// ==========================================
// START BUTTON
// ==========================================

function startLove() {

    if (animationStarted) return;

    const questionScreen =
        document.getElementById("questionScreen");

    const loveScreen =
        document.getElementById("loveScreen");

    const message =
        document.getElementById("loveMessage");

    if (message) {
        message.style.opacity = "0";
    }

    if (questionScreen) {

        questionScreen.style.transition =
            "opacity 0.6s ease";

        questionScreen.style.opacity = "0";
    }

    setTimeout(() => {

        if (questionScreen) {
            questionScreen.style.display = "none";
        }

        if (loveScreen) {

            loveScreen.style.display = "block";
            loveScreen.style.opacity = "1";
        }

        animationStarted = true;

        resizeCanvas();

        createHearts();

        lastRocket = performance.now();
        lastFirework = performance.now();

    }, 600);
}

window.startLove = startLove;
