/**
 * NAUGHTY TUNTII - Game Logic
 * Handles HTML canvas confetti, Web Audio API sounds, reel animations,
 * and the randomized slot machine mechanics.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Array of 10 available images used for the slot machine reels (assets/t1.jpeg to t10.jpeg)
    const images = Array.from({length: 10}, (_, i) => `assets/t${i + 1}.jpeg`);
    
    // Funny Win Messages Array
    const FUNNY_WIN_MESSAGES = [
        "CONGRATS, YOU PEAKED IN LIFE! 😂",
        "ABSOLUTE GIRLBOSS ENERGY! 💅✨",
        "THE MACHINE IS BROKEN, RUN! 🏃‍♀️💨",
        "YOU'VE BEEN TUNTIFIED!",
        "TUNTII DEMANDS A SACRIFICE!",
        "UNLIMITED POWER!!! ⚡️"
    ];
    
    // --- Web Audio API Synth Engine ---
    // Sets up a base audio context for synthesizing 8-bit sounds natively
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Core function to play a synthesized oscillator tone for a specific duration
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

    // Synthesized MLG Airhorn sound using layered dissonant sawtooth waves
    function playAirhorn() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const bursts = [0, 0.25, 0.45];
        bursts.forEach(delay => {
            setTimeout(() => {
                const freqs = [300, 310, 320];
                freqs.forEach(f => playTone(f, 'sawtooth', 0.25, 0.15));
            }, delay * 1000);
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
    const EMOJIS = ['🌸', '😂', '💸', '🤪', '💃', '💅', '🔥', '🍆'];

    // Initializes the confetti particles and canvas dimensions for the celebration screen
    function initConfetti() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        confettiParticles = [];
        // Only rendering 15 emojis to heavily reduce lag on phones!
        // We reuse these exactly same 15 objects over and over in a loop.
        for (let i = 0; i < 15; i++) {
            confettiParticles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                w: Math.random() * 30 + 30, // Much larger size for emojis
                dx: Math.random() * 4 - 2,
                dy: Math.random() * 5 + 4,
                emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
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
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        confettiParticles.forEach((p) => {
            p.tiltAngle += p.tiltAngleInc;
            p.y += p.dy;
            p.x += Math.sin(p.tiltAngle) * 2 + p.dx;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.tiltAngle);
            ctx.font = `${p.w}px Arial`;
            ctx.fillText(p.emoji, 0, 0);
            ctx.restore();

            if (p.y > canvas.height + 50) {
                p.y = -50;
                p.x = Math.random() * canvas.width;
            }
        });
        confettiAnimationId = requestAnimationFrame(updateConfetti);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('celebration-hidden');
            if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
    }
    
    const ITEMS_PER_REEL = 40; // Total items to scroll through for a long spin
    const REEL_HEIGHT = 300;
    
    // Populates the DOM with reel items and sets their initial off-screen positions
    function initReels() {
        reelInners.forEach((reelInner) => {
            reelInner.innerHTML = ''; // Clear existing items
            
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
    
    // Main spin logic: triggers audio, handles lever animation, and calculates reel stops
    function spin() {
        if (isSpinning) return; // Prevent multiple spins at once
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
        
        // Win Logic Setup: 25% chance to force a guaranteed win for a better user experience
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
                        
                        // Pick random hilarious win message for the subtitle below the image
                        document.querySelector('.funny-subtitle').innerText = FUNNY_WIN_MESSAGES[Math.floor(Math.random() * FUNNY_WIN_MESSAGES.length)];
                        
                        // Enforce main text
                        document.querySelector('.tuntified-text').innerText = "YOU'VE BEEN TUNTIFIED!";
                        
                        // Violently shake the slot machine
                        const wrapper = document.querySelector('.slot-machine-wrapper');
                        wrapper.classList.add('shake-violent');
                        
                        setTimeout(() => {
                            wrapper.classList.remove('shake-violent');
                            
                            // Unleash chaos!
                            playAirhorn();
                            playWinFanfare(); 
                            initConfetti();
                            modal.classList.remove('celebration-hidden');
                        }, 500); // Wait for shake to end
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
