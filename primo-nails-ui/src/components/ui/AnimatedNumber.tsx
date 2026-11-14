import React from 'react';
import { motion, useMotionValue, useSpring, useTransform, animate } from 'motion/react';

interface AnimatedNumberProps {
  value: string;
  suffix?: string;
}

export const AnimatedNumber = ({ value, suffix = '' }: AnimatedNumberProps) => {
  const numericValue = parseInt(value.replace(/\D/g, ''));
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 80,
    damping: 30,
    restDelta: 0.001,
  });
  const displayValue = useTransform(springValue, (current) => {
    const formatted = Math.floor(current).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${formatted}${suffix}`;
  });

  React.useEffect(() => {
    const controls = animate(motionValue, numericValue, {
      duration: 3,
      ease: [0.32, 0.23, 0.4, 0.9],
      delay: 0.8,
    });
    return controls.stop;
  }, [numericValue, motionValue]);

  return <motion.span>{displayValue}</motion.span>;
};
