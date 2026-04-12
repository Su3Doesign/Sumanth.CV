function triggerSlice(sx, sy, ex, ey) {
    paperContainer.style.pointerEvents = "none";

    // 1. Calculate the exact angle and center of the mouse swipe
    const angle = Math.atan2(ey - sy, ex - sx); 
    const angleDeg = angle * (180 / Math.PI);
    const midX = (sx + ex) / 2;
    const midY = (sy + ey) / 2;

    // 2. Position the Fire Flash to match the swipe exactly
    const sliceWidth = Math.max(window.innerWidth, window.innerHeight) * 1.5; // Make it extra long
    gsap.set(sliceFlash, { 
        x: midX - (sliceWidth / 2), // Center the beam on the swipe midpoint
        y: midY - 15, // Offset by half the height of the fire div
        rotation: angleDeg, 
        width: sliceWidth,
        opacity: 1
    });

    createEmbers(midX, midY);

    // --- 3. GEOMETRIC CLIP-PATH MATH ---
    // We draw a line 3000px long along the cut, then project a massive rectangle 
    // to the left of the cut for the top paper, and to the right for the bottom paper.
    const dist = 3000;

    // The Cut Line Points
    const lineX1 = midX + Math.cos(angle) * dist;
    const lineY1 = midY + Math.sin(angle) * dist;
    const lineX2 = midX - Math.cos(angle) * dist;
    const lineY2 = midY - Math.sin(angle) * dist;

    // Perpendicular angle for Top Half
    const pAngleTop = angle - (Math.PI / 2);
    const tX3 = lineX2 + Math.cos(pAngleTop) * dist;
    const tY3 = lineY2 + Math.sin(pAngleTop) * dist;
    const tX4 = lineX1 + Math.cos(pAngleTop) * dist;
    const tY4 = lineY1 + Math.sin(pAngleTop) * dist;

    // Perpendicular angle for Bottom Half
    const pAngleBot = angle + (Math.PI / 2);
    const bX3 = lineX2 + Math.cos(pAngleBot) * dist;
    const bY3 = lineY2 + Math.sin(pAngleBot) * dist;
    const bX4 = lineX1 + Math.cos(pAngleBot) * dist;
    const bY4 = lineY1 + Math.sin(pAngleBot) * dist;

    // Apply the surgical cuts!
    const pTop = document.getElementById('paper-top');
    const pBot = document.getElementById('paper-bottom');
    pTop.style.clipPath = `polygon(${lineX1}px ${lineY1}px, ${lineX2}px ${lineY2}px, ${tX3}px ${tY3}px, ${tX4}px ${tY4}px)`;
    pBot.style.clipPath = `polygon(${lineX1}px ${lineY1}px, ${lineX2}px ${lineY2}px, ${bX3}px ${bY3}px, ${bX4}px ${bY4}px)`;

    // Calculate how far and in what direction the halves should slide apart
    const slideDist = 600; 
    const slideTopX = Math.cos(pAngleTop) * slideDist;
    const slideTopY = Math.sin(pAngleTop) * slideDist;
    const slideBotX = Math.cos(pAngleBot) * slideDist;
    const slideBotY = Math.sin(pAngleBot) * slideDist;

    // --- 4. THE ANIMATION TIMELINE ---
    const tl = gsap.timeline();
    
    // Fire roar
    tl.fromTo(sliceFlash, { scaleX: 0 }, { scaleX: 1, duration: 0.2, ease: "power4.inOut" })
      .to(sliceFlash, { opacity: 0, duration: 0.4, ease: "power2.out" }, "+=0.1")
      
    // The halves slide apart dynamically based on swipe angle
    tl.to(pTop, { 
        x: slideTopX, 
        y: slideTopY, 
        rotateX: Math.cos(angle) * 15, // Slight 3D curling effect
        rotateY: Math.sin(angle) * 15,
        duration: 1.5, 
        ease: "power3.inOut" 
    }, "-=0.3")
    .to(pBot, { 
        x: slideBotX, 
        y: slideBotY, 
        rotateX: -Math.cos(angle) * 15, 
        rotateY: -Math.sin(angle) * 15,
        duration: 1.5, 
        ease: "power3.inOut" 
    }, "<")

    // Reveal the Void
    tl.to("#void-content", { opacity: 1, duration: 1 }, "-=0.5");
}
