'use client';

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { useEffect } from 'react';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}

export function AnimatedNumber({ value, decimals = 0, suffix = '', className }: AnimatedNumberProps) {
  const prefersReducedMotion = useReducedMotion();
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { stiffness: 220, damping: 26 });
  const display = useTransform(spring, (latest) => `${latest.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    if (prefersReducedMotion) {
      motionValue.jump(value);
    } else {
      motionValue.set(value);
    }
  }, [value, prefersReducedMotion, motionValue]);

  return <motion.span className={className}>{display}</motion.span>;
}
