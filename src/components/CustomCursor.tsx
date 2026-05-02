import React, { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

const CustomCursor = () => {
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

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
      if (!target) return;

      // Efficiently check for interactive elements without forcing a reflow
      const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
      const textTags = ['P', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'LABEL'];
      
      const isInteractive = interactiveTags.includes(target.tagName) || 
                           target.closest('button') || 
                           target.closest('a') ||
                           target.hasAttribute('data-cursor-hover') ||
                           target.classList.contains('cursor-pointer');
      
      const isText = textTags.includes(target.tagName);
      
      if (isInteractive || isText) {
        setIsHovering(true);
      }
    };

    const handleOut = (e: MouseEvent) => {
      const target = e.relatedTarget as HTMLElement;
      if (!target) {
        setIsHovering(false);
      }
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
    <div className="fixed inset-0 pointer-events-none z-[99999] hidden lg:block">
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
        className="fixed rounded-full border border-white/40 shadow-[0_15px_35px_rgba(0,0,0,0.15)]"
        animate={{
          width: isHovering ? 70 : 30,
          height: isHovering ? 70 : 30,
          backgroundColor: isHovering ? 'rgba(255, 255, 255, 0.01)' : 'rgba(255, 255, 255, 0.005)',
          boxShadow: isHovering 
            ? 'inset 0 0 15px rgba(255,255,255,0.1), 0 8px 20px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.2)' 
            : 'inset 0 0 5px rgba(255,255,255,0.05), 0 4px 10px rgba(0,0,0,0.03)',
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
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* High-Definition Shine Reflection */}
        <motion.div 
          className="absolute top-2 left-4 w-1/3 h-1/3 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-[1px]"
          animate={{ opacity: isHovering ? 0.6 : 0 }}
        />
      </motion.div>

      {/* Outer Peripheral Ring */}
      <motion.div
        className="fixed w-10 h-10 border border-blue-500/5 rounded-full"
        animate={{
          scale: isHovering ? 2 : 1,
          opacity: isHovering ? 0.1 : 0.3
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
