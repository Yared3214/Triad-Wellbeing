"use client";

import React from 'react';

interface SynergyWheelProps {
  spiritualProgress?: number; // 0-100
  mentalProgress?: number;   // 0-100
  physicalProgress?: number; // 0-100
}

export function SynergyWheel({
  spiritualProgress = 0,
  mentalProgress = 0,
  physicalProgress = 0,
}: SynergyWheelProps) {
  const radius = 100;
  const circumference = 2 * Math.PI * radius;

  // Calculate stroke-dashoffset for each segment
  const spiritualOffset = circumference - (spiritualProgress / 100) * circumference;
  const mentalOffset = circumference - (mentalProgress / 100) * circumference;
  const physicalOffset = circumference - (physicalProgress / 100) * circumference;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 220 220" className="w-full h-full">
        {/* Background circle */}
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="20"
        />

        {/* Spiritual Segment (Green) */}
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="hsl(var(--chart-2))" // Greenish color
          strokeWidth="20"
          strokeDasharray={circumference}
          strokeDashoffset={spiritualOffset}
          transform="rotate(-90 110 110)" // Start from top
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />

        {/* Mental Segment (Blue) */}
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="hsl(var(--chart-3))" // Bluish color
          strokeWidth="20"
          strokeDasharray={circumference}
          strokeDashoffset={mentalOffset}
          transform={`rotate(${30 + (spiritualProgress / 100) * 120} 110 110)`} // Offset by spiritual progress
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />

        {/* Physical Segment (Purple) */}
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="hsl(var(--chart-4))" // Purplish color
          strokeWidth="20"
          strokeDasharray={circumference}
          strokeDashoffset={physicalOffset}
          transform={`rotate(${150 + (spiritualProgress / 100) * 120 + (mentalProgress / 100) * 120} 110 110)`} // Offset by spiritual and mental progress
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />

        {/* Center Glow (placeholder) */}
        <circle
          cx="110"
          cy="110"
          r="40"
          fill="hsl(var(--background))"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          className="opacity-75"
        />
        <text
          x="110"
          y="115"
          textAnchor="middle"
          fill="hsl(var(--foreground))"
          fontSize="16"
          fontWeight="bold"
        >
          Harmony
        </text>
      </svg>
    </div>
  );
}