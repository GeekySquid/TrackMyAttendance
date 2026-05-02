import React, { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

const CustomCursor = () => {
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Motion values for smooth tracking
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Spring physics for "relax and touch" feel
  const springConfig = { damping: 25, stiffness: 200, mass: 0.5 };
  const trailX = useSpring(mouseX, springConfig);
  const trailY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const moveMouse = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Determine if the target is something we should "magnify"
      const isTextOrInteractive = 
        target.tagName === 'P' || 
        target.tagName === 'SPAN' || 
        target.tagName === 'H1' || 
        target.tagName === 'H2' || 
        target.tagName === 'H3' || 
        target.tagName === 'BUTTON' || 
        target.tagName === 'A' || 
        target.closest('button') || 
        target.closest('a') ||
        window.getComputedStyle(target).cursor === 'pointer';
      
      if (isTextOrInteractive) {
        setIsHovering(true);
        // Apply a high-definition zoom with hardware acceleration
        target.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), z-index 0s';
        target.style.transform = 'scale(1.08)';
        target.style.position = 'relative';
        target.style.zIndex = '50';
        target.style.willChange = 'transform';
      }
    };

    const handleOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.style) {
        target.style.transform = '';
        target.style.zIndex = '';
      }
      setIsHovering(false);
    };

    const handleLeave = () => setIsVisible(false);
    const handleEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', moveMouse);
    window.addEventListener('mouseover', handleOver);
    window.addEventListener('mouseout', handleOut);
    document.addEventListener('mouseleave', handleLeave);
    document.addEventListener('mouseenter', handleEnter);

    return () => {
      window.removeEventListener('mousemove', moveMouse);
      window.removeEventListener('mouseover', handleOver);
      window.removeEventListener('mouseout', handleOut);
      document.removeEventListener('mouseleave', handleLeave);
      document.removeEventListener('mouseenter', handleEnter);
    };
  }, [mouseX, mouseY, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] hidden lg:block">
      {/* Precision Lens Center */}
      <motion.div
        className="fixed w-1.5 h-1.5 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.8)]"
        style={{
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      />

      {/* Crystal Clear Magnifying Glass Lens */}
      <motion.div
        className="fixed rounded-full border border-white/60 shadow-[0_25px_60px_rgba(0,0,0,0.25)]"
        animate={{
          width: isHovering ? 130 : 40,
          height: isHovering ? 130 : 40,
          backgroundColor: isHovering ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
          boxShadow: isHovering 
            ? 'inset 0 0 40px rgba(255,255,255,0.4), 0 20px 50px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.5)' 
            : 'inset 0 0 5px rgba(255,255,255,0.1), 0 4px 10px rgba(0,0,0,0.05)',
        }}
        transition={{
          type: 'spring',
          damping: 30,
          stiffness: 150,
          mass: 0.7
        }}
        style={{
          x: trailX,
          y: trailY,
          translateX: '-50%',
          translateY: '-50%',
          // Trigger hardware acceleration for sharpness
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* High-Definition Shine Reflection */}
        <motion.div 
          className="absolute top-3 left-6 w-1/3 h-1/3 bg-gradient-to-br from-white/30 to-transparent rounded-full blur-[1px]"
          animate={{ opacity: isHovering ? 0.8 : 0 }}
        />
        
        {/* Subtle Lens Glare */}
        <motion.div 
          className="absolute bottom-4 right-8 w-1/5 h-1/5 bg-white/10 rounded-full blur-sm"
          animate={{ opacity: isHovering ? 0.5 : 0 }}
        />
      </motion.div>

      {/* Outer Peripheral Ring */}
      <motion.div
        className="fixed w-12 h-12 border border-blue-500/10 rounded-full"
        animate={{
          scale: isHovering ? 2.5 : 1,
          opacity: isHovering ? 0.2 : 0.5
        }}
        style={{
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      />
    </div>
  );
};

export default CustomCursor;
