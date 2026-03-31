document.addEventListener('DOMContentLoaded', () => {
    // We have 10 images t1 to t10
    const images = Array.from({length: 10}, (_, i) => `assets/t${i + 1}.jpeg`);
    
    // --- Web Audio API Synth Engine ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    function playTone(freq, type, duration, vol=0.1) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }

    function playSpinTick() {
        playTone(400 + Math.random() * 200, 'square', 0.05, 0.02);
    }

    function playWinFanfare() {
        // A playful 8-bit style party melody!
        const melody = [
            523.25, 659.25, 783.99, 1046.50, 0,
            1046.50, 783.99, 659.25, 0,
            523.25, 659.25, 783.99, 1046.50, 
            1046.50, 1046.50, 1046.50
        ];
        melody.forEach((freq, idx) => {
            if (freq > 0) {
                setTimeout(() => {
                    playTone(freq, 'square', 0.2, 0.1);
                    playTone(freq/2, 'triangle', 0.2, 0.1); // bass
                }, idx * 150);
            }
        });
    }
    // ----------------------------------
    
    const reelInners = [
        document.getElementById('reel-inner-1'),
        document.getElementById('reel-inner-2'),
        document.getElementById('reel-inner-3')
    ];
    const lever = document.getElementById('lever');
    const slotMachine = document.getElementById('slotMachine');
    const statusMsg = document.getElementById('status-message');
    const modal = document.getElementById('celebration-modal');
    const closeBtn = document.getElementById('close-celebration');
    const canvas = document.getElementById('confetti-canvas');
    let ctx;
    if (canvas) ctx = canvas.getContext('2d');
    
    let isSpinning = false;
    let confettiParticles = [];
    let confettiAnimationId;

    function initConfetti() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        confettiParticles = [];
        for (let i = 0; i < 150; i++) {
            confettiParticles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                w: Math.random() * 10 + 5,
                h: Math.random() * 10 + 5,
                dx: Math.random() * 4 - 2,
                dy: Math.random() * 5 + 2,
                color: `hsl(${Math.random() * 360}, 100%, 50%)`,
                tilt: Math.floor(Math.random() * 10) - 10,
                tiltAngle: 0,
                tiltAngleInc: (Math.random() * 0.07) + 0.05
            });
        }
        if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
        updateConfetti();
    }

    function updateConfetti() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        confettiParticles.forEach((p) => {
            p.tiltAngle += p.tiltAngleInc;
            p.y += p.dy;
            p.x += Math.sin(p.tiltAngle) * 2 + p.dx;

            ctx.beginPath();
            ctx.lineWidth = p.w;
            ctx.strokeStyle = p.color;
            ctx.moveTo(p.x + p.tilt + p.w / 2, p.y);
            ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.w / 2);
            ctx.stroke();

            if (p.y > canvas.height) {
                p.y = -10;
                p.x = Math.random() * canvas.width;
            }
        });
        confettiAnimationId = requestAnimationFrame(updateConfetti);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('celebration-hidden');
            if (confettiAnimationId) {
                cancelAnimationFrame(confettiAnimationId);
            }
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
    }
    
    const ITEMS_PER_REEL = 40; // Total items to scroll through for a long spin
    const REEL_HEIGHT = 300;
    
    function initReels() {
        reelInners.forEach((reelInner) => {
            reelInner.innerHTML = '';
            
            // Populate reel with 40 random items
            for (let i = 0; i < ITEMS_PER_REEL; i++) {
                const randomImg = images[Math.floor(Math.random() * images.length)];
                const div = document.createElement('div');
                div.className = 'reel-item';
                
                const img = document.createElement('img');
                img.src = randomImg;
                
                div.appendChild(img);
                reelInner.appendChild(div);
            }
            
            // Position at the start (meaning showing index 0)
            reelInner.style.transition = 'none';
            // Start at top, since we spin by sliding up visually (meaning translating downwards/negative Y)
            // But realistically slot wheels spin downwards, meaning items move from top to bottom.
            // So we start at a HIGH NEGATIVE translation (bottom of the list) and translate UP to near 0.
            const startDist = -(ITEMS_PER_REEL - 1) * REEL_HEIGHT;
            reelInner.style.transform = `translateY(${startDist}px)`;
            
            // Save starting offset constraint
            reelInner.dataset.startDist = startDist;
        });
    }
    
    // Initial Setup
    initReels();
    
    function spin() {
        if (isSpinning) return;
        isSpinning = true;
        
        // Start the mechanical ticking sound
        if (audioCtx.state === 'suspended') audioCtx.resume();
        let tickInterval = setInterval(playSpinTick, 100);
        
        // Change state
        statusMsg.innerText = "SPINNING...";
        statusMsg.style.color = "#FFD700"; // gold
        statusMsg.style.textShadow = "0 0 10px #FFD700";
        lever.classList.add('pulled');
        
        setTimeout(() => {
            lever.classList.remove('pulled');
        }, 400);

        // Reset the transform to the bottom quickly.
        reelInners.forEach((reel) => {
            reel.style.transition = 'none';
            reel.style.transform = `translateY(${reel.dataset.startDist}px)`;
            // Force reflow
            void reel.offsetHeight;
        });

        let completed = 0;
        let finalImages = [];
        
        // 25% chance to force a win so it's not too rare!
        const forceWin = Math.random() < 0.25;
        const winImageSrc = images[Math.floor(Math.random() * images.length)];

        reelInners.forEach((reel, index) => {
            // Pick a random stopping index near the beginning of our list (1, 2, or 3)
            const stopIndex = 1 + Math.floor(Math.random() * 3);
            const stopPosition = -stopIndex * REEL_HEIGHT;
            
            if (forceWin) {
                reel.children[stopIndex].querySelector('img').src = winImageSrc;
                finalImages.push(winImageSrc);
            } else {
                finalImages.push(reel.children[stopIndex].querySelector('img').src);
            }
            
            // Duration between 2.5s to 4.1s (each reel takes longer)
            const duration = 2500 + (index * 800);
            
            // Animate
            reel.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.85, 0.2, 1)`;
            reel.style.transform = `translateY(${stopPosition}px)`;
            
            setTimeout(() => {
                completed++;
                if (completed === reelInners.length) {
                    clearInterval(tickInterval);
                    isSpinning = false;
                    statusMsg.innerText = "PLAY AGAIN!";
                    statusMsg.style.color = "#FFF";
                    statusMsg.style.textShadow = "0 0 10px #FFF";

                    // Check if they won!
                    if (finalImages[0] === finalImages[1] && finalImages[1] === finalImages[2]) {
                        setTimeout(() => {
                            playWinFanfare(); // Fire custom 8-bit party music!
                            initConfetti();
                            modal.classList.remove('celebration-hidden');
                        }, 500); // Slight delay for dramatic effect
                    }
                }
            }, duration);
        });
    }

    lever.addEventListener('click', spin);
    slotMachine.addEventListener('click', () => {
        if (!isSpinning) spin();
    });
});
