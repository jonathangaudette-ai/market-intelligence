'use client';

import * as React from 'react';

interface SliderProps {
  id?: string;
  min: number;
  max: number;
  step: number;
  value: number[];
  onValueChange: (value: number[]) => void;
  className?: string;
}

export function Slider({ id, min, max, step, value, onValueChange, className }: SliderProps) {
  const currentValue = value[0] || min;

  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={currentValue}
      onChange={(e) => onValueChange([parseFloat(e.target.value)])}
      className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${className || ''}`}
      style={{
        background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${((currentValue - min) / (max - min)) * 100}%, hsl(var(--muted)) ${((currentValue - min) / (max - min)) * 100}%, hsl(var(--muted)) 100%)`
      }}
    />
  );
}
