const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

const mouse = { x: canvas.width / 2, y: canvas.height / 2 };
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// Fungsi bantu untuk memutar sudut secara mulus tanpa loncatan patah-patah
function lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return a + diff * t;
}

// ==========================================
// KELAS RANGKA TUBUH & TULANG BELAKANG
// ==========================================
class Vertebra {
    constructor(x, y, length) {
        this.x = x;
        this.y = y;
        this.length = length;
        this.angle = 0;
    }

    follow(targetX, targetY) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        this.angle = Math.atan2(dy, dx);
        this.x = targetX - Math.cos(this.angle) * this.length;
        this.y = targetY - Math.sin(this.angle) * this.length;
    }
}

// ==========================================
// KELAS KAKI ARTIKULASI REALISTIS (6 KAKI)
// ==========================================
class PredatorLeg {
    constructor(side, maxReach, upperLen, lowerLen) {
        this.side = side; // -1 = Kiri, 1 = Kanan
        this.maxReach = maxReach;
        this.upperLen = upperLen;
        this.lowerLen = lowerLen;

        this.hipX = 0; this.hipY = 0;
        this.kneeX = 0; this.kneeY = 0;
        this.footX = 0; this.footY = 0;

        this.targetFootX = 0; this.targetFootY = 0;
        this.isMoving = false;
        this.stepProgress = 1;
    }

    update(baseX, baseY, bodyAngle, currentSpeed) {
        this.hipX = baseX;
        this.hipY = baseY;

        let idealAngle = bodyAngle + (Math.PI / 2 + 0.2 * this.side);
        let totalLen = this.upperLen + this.lowerLen;
        let idealX = this.hipX + Math.cos(idealAngle) * totalLen * 0.9;
        let idealY = this.hipY + Math.sin(idealAngle) * totalLen * 0.9;

        let dist = Math.hypot(idealX - this.footX, idealY - this.footY);

        let dynamicReach = this.maxReach * 1.3;

        if (dist > dynamicReach && !this.isMoving) {
            this.isMoving = true;
            this.targetFootX = idealX + Math.cos(bodyAngle) * 35;
            this.targetFootY = idealY + Math.sin(bodyAngle) * 35;
            this.stepProgress = 0;
        }

        if (this.isMoving) {
            let stepSpeed = 0.35;
            this.stepProgress += stepSpeed; 
            
            if (this.stepProgress >= 1) {
                this.footX = this.targetFootX;
                this.footY = this.targetFootY;
                this.isMoving = false;
            } else {
                this.footX += (this.targetFootX - this.footX) * 0.35;
                this.footY += (this.targetFootY - this.footY) * 0.35;
            }
        }

        let dx = this.footX - this.hipX;
        let dy = this.footY - this.hipY;
        let d = Math.hypot(dx, dy);
        let maxD = this.upperLen + this.lowerLen - 2;
        if (d > maxD) d = maxD;

        let angleToFoot = Math.atan2(dy, dx);
        let cosAngle = (this.upperLen * this.upperLen + d * d - this.lowerLen * this.lowerLen) / (2 * this.upperLen * d);
        cosAngle = Math.max(-1, Math.min(1, cosAngle));
        let alpha = Math.acos(cosAngle);

        let kneeAngle = angleToFoot + alpha * this.side;
        this.kneeX = this.hipX + Math.cos(kneeAngle) * this.upperLen;
        this.kneeY = this.hipY + Math.sin(kneeAngle) * this.upperLen;
    }

    draw() {
        ctx.strokeStyle = 'rgba(235, 235, 240, 0.85)';
        ctx.fillStyle = 'rgba(235, 235, 240, 0.85)';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(this.hipX, this.hipY);
        ctx.lineTo(this.kneeX, this.kneeY);
        ctx.lineTo(this.footX, this.footY);
        ctx.stroke();

        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.kneeX, this.kneeY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        let footAngle = Math.atan2(this.footY - this.kneeY, this.footX - this.kneeX);
        let claws = 5;
        let spread = 0.9;
        let cLen = 14;

        ctx.lineWidth = 1.2;
        for (let i = 0; i < claws; i++) {
            let cAngle = footAngle - (spread / 2) + (spread / (claws - 1)) * i;
            ctx.beginPath();
            ctx.moveTo(this.footX, this.footY);
            ctx.lineTo(this.footX + Math.cos(cAngle) * cLen, this.footY + Math.sin(cAngle) * cLen);
            ctx.stroke();
        }
    }
}

// ==========================================
// INISIALISASI ANATOMI KADAL
// ==========================================
const totalVertebrae = 65;
const vertebrae = [];
const segLen = 9;

const startX = canvas.width / 2;
const startY = canvas.height / 2;

for (let i = 0; i < totalVertebrae; i++) {
    vertebrae.push(new Vertebra(startX - i * segLen, startY, segLen));
}

const legs = [
    { leg: new PredatorLeg(-1, 50, 45, 45), index: 14, side: -1 }, 
    { leg: new PredatorLeg(1, 50, 45, 45), index: 14, side: 1 },  
    { leg: new PredatorLeg(-1, 55, 50, 50), index: 28, side: -1 }, 
    { leg: new PredatorLeg(1, 55, 50, 50), index: 28, side: 1 },  
    { leg: new PredatorLeg(-1, 45, 45, 45), index: 40, side: -1 }, 
    { leg: new PredatorLeg(1, 45, 45, 45), index: 40, side: 1 }   
];

legs.forEach(item => {
    item.leg.footX = startX;
    item.leg.footY = startY + (70 * item.side);
});

// ==========================================
// LOOP UTAMA ANIMASI
// ==========================================
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 2, 0, Math.PI * 2);
    ctx.fill();

    // =========================================================================
    // PERGERAKAN DENGAN RADIUS PUTAR HALUS (SMOOTH TURNING MOMENTUM)
    // =========================================================================
    const head = vertebrae[0];
    const dx = mouse.x - head.x;
    const dy = mouse.y - head.y;
    const distToMouse = Math.hypot(dx, dy);

    const moveSpeed = 5.5; 

    if (distToMouse > 2) {
        let targetAngle = Math.atan2(dy, dx);
        
        // Kepala memutar secara perlahan/halus menuju target (menambahkan jeda putar realistis)
        head.angle = lerpAngle(head.angle, targetAngle, 0.12); // Angka 0.12 mengatur kecepatan radius putar

        // Maju ke depan sesuai sudut kepala yang sedang berbelok
        head.x += Math.cos(head.angle) * moveSpeed;
        head.y += Math.sin(head.angle) * moveSpeed;
    }
    // =========================================================================

    // Rantai tubuh mengikuti lengkungan kepala secara alami (mencegah tabrakan tulang rusuk)
    for (let i = 1; i < vertebrae.length; i++) {
        vertebrae[i].follow(vertebrae[i - 1].x, vertebrae[i - 1].y);
    }

    // Update Pijakan Kaki
    legs.forEach(item => {
        let v = vertebrae[item.index];
        item.leg.update(v.x, v.y, v.angle, moveSpeed);
    });

    // --- RENDER RANGKA: EKOR ---
    for (let i = 45; i < vertebrae.length; i++) {
        let v = vertebrae[i];
        ctx.strokeStyle = 'rgba(220, 220, 230, 0.9)';
        ctx.lineWidth = 1.8;
        
        let nextV = vertebrae[i - 1];
        ctx.beginPath();
        ctx.moveTo(nextV.x, nextV.y);
        ctx.lineTo(v.x, v.y);
        ctx.stroke();

        let tailProgress = (i - 45) / (vertebrae.length - 45);
        let spikeW = (1 - tailProgress) * 12;
        if (spikeW > 1) {
            let aL = v.angle - Math.PI / 2;
            let aR = v.angle + Math.PI / 2;
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(v.x, v.y);
            ctx.lineTo(v.x + Math.cos(aL) * spikeW, v.y + Math.sin(aL) * spikeW);
            ctx.moveTo(v.x, v.y);
            ctx.lineTo(v.x + Math.cos(aR) * spikeW, v.y + Math.sin(aR) * spikeW);
            ctx.stroke();
        }
    }

    // --- RENDER RANGKA: BADAN & RUSUK ---
    for (let i = 10; i < 45; i++) {
        let v = vertebrae[i];
        
        ctx.strokeStyle = 'rgba(240, 240, 250, 0.95)';
        ctx.lineWidth = 2.5;
        if (i > 10) {
            let prev = vertebrae[i - 1];
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(v.x, v.y);
            ctx.stroke();
        }

        let ribSpan = 0;
        if (i >= 12 && i < 26) {
            let t = (i - 12) / 14;
            ribSpan = Math.sin(t * Math.PI) * 60 + 20;
        } else if (i >= 26 && i < 35) {
            ribSpan = 25;
        } else if (i >= 35 && i < 45) {
            let t = (i - 35) / 10;
            ribSpan = 45 * (1 - t);
        }

        if (ribSpan > 5) {
            ctx.lineWidth = 1.5;
            let aL = v.angle - Math.PI / 2;
            let aR = v.angle + Math.PI / 2;
            let ctrl = ribSpan * 0.75;

            ctx.beginPath();
            ctx.moveTo(v.x, v.y);
            ctx.bezierCurveTo(
                v.x + Math.cos(aL) * ctrl, v.y + Math.sin(aL) * ctrl,
                v.x + Math.cos(aL) * ribSpan - Math.cos(v.angle) * 10, v.y + Math.sin(aL) * ribSpan - Math.sin(v.angle) * 10,
                v.x + Math.cos(aL) * (ribSpan * 0.8), v.y + Math.sin(aL) * (ribSpan * 0.8)
            );
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(v.x, v.y);
            ctx.bezierCurveTo(
                v.x + Math.cos(aR) * ctrl, v.y + Math.sin(aR) * ctrl,
                v.x + Math.cos(aR) * ribSpan - Math.cos(v.angle) * 10, v.y + Math.sin(aR) * ribSpan - Math.sin(v.angle) * 10,
                v.x + Math.cos(aR) * (ribSpan * 0.8), v.y + Math.sin(aR) * (ribSpan * 0.8)
            );
            ctx.stroke();
        }

        if (i % 2 === 0) {
            let spikeA = v.angle - Math.PI / 2;
            let sLen = 8 + Math.sin(i * 0.5) * 4;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(v.x, v.y);
            ctx.lineTo(v.x + Math.cos(spikeA) * sLen, v.y + Math.sin(spikeA) * sLen);
            ctx.stroke();
        }
    }

    // --- RENDER RANGKA: LEHER (TANPA KEPALA) ---
    for (let i = 0; i < 10; i++) {
        let v = vertebrae[i];
        ctx.strokeStyle = 'rgba(240, 240, 250, 0.95)';
        ctx.lineWidth = i === 0 ? 2.0 : 3.0;
        
        if (i > 0) {
            let prev = vertebrae[i - 1];
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(v.x, v.y);
            ctx.stroke();
        }

        let wingW = 8 + Math.sin(i) * 3;
        let aL = v.angle - Math.PI / 2;
        let aR = v.angle + Math.PI / 2;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(v.x + Math.cos(aL) * wingW, v.y + Math.sin(aL) * wingW);
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(v.x + Math.cos(aR) * wingW, v.y + Math.sin(aR) * wingW);
        ctx.stroke();
    }

    // --- RENDER SEMUA KAKI ---
    legs.forEach(item => {
        item.leg.draw();
    });

    requestAnimationFrame(animate);
}

animate();