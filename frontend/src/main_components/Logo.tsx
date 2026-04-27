import React, { useState } from 'react'
import {motion} from 'motion/react';

const Logo = () => {
    const [isHovered, setIsHovered] = useState(false);
  return (
    //   <motion.div
    //       className="relative w-64 h-80 flex flex-col items-center justify-center bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer overflow-visible border border-slate-100"
    //       onMouseEnter={() => setIsHovered(true)}
    //       onMouseLeave={() => setIsHovered(false)}
    //       whileHover={{ y: -5 }}
    //       transition={{ type: "spring", stiffness: 400, damping: 25 }}
    //   >
    <>
          <svg
              viewBox="0 0 200 240"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-44 h-auto overflow-visible"
              id="pdf-document-icon"
          >
              <defs>
                  {/* Default Blue Gradients */}
                  <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F0F7FF" />
                      <stop offset="100%" stopColor="#F9FBFF" />
                  </linearGradient>

                  <linearGradient id="cornerGradientBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#2563EB" />
                  </linearGradient>

                  {/* Gemini Hover Gradients */}
                  <linearGradient id="geminiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#A855F7" />
                      <stop offset="100%" stopColor="#6366F1" />
                  </linearGradient>

                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
              </defs>

              {/* Main Document Body */}
              <motion.path
                  d="M30 20C30 8.95431 38.9543 0 50 0H140L175 35V220C175 231.046 166.046 240 155 240H50C38.9543 240 30 231.046 30 220V20Z"
                  fill="url(#bodyGradient)"
                  stroke={isHovered ? "#E9D5FF" : "#E2E8F0"}
                  strokeWidth="1.5"
                  animate={{
                      stroke: isHovered ? "#C084FC" : "#E2E8F0",
                      scale: isHovered ? 1.02 : 1
                  }}
              />

              {/* Folded Corner */}
              <motion.path
                  d="M140 0V25C140 30.5228 144.477 35 150 35H175L140 0Z"
                  animate={{
                      fill: isHovered ? "url(#geminiGradient)" : "url(#cornerGradientBlue)"
                  }}
                  transition={{ duration: 0.3 }}
              />

              {/* Stylized Logo (The "o" loop) */}
              <motion.g
                  transform="translate(102.5, 125)"
                  animate={{
                      scale: isHovered ? 1.1 : 1,
                  }}
              >
                  <motion.path
                      d="M-35 -20 C-35 -45 35 -45 35 -20 C35 0 10 10 0 25 L-25 50 M0 25 L25 50 M0 25 C-15 15 -35 0 -35 -20"
                      fill="none"
                      stroke={isHovered ? "url(#geminiGradient)" : "#2563EB"}
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      animate={{
                          stroke: isHovered ? "url(#geminiGradient)" : "#2563EB"
                      }}
                  />
                  {/* Inner Loop Shadow/Detail for "o" style */}
                  <motion.path
                      d="M-15 -18 C-15 -30 15 -30 15 -18 C15 -10 0 -5 0 0 C0 -5 -15 -10 -15 -18"
                      fill="none"
                      stroke={isHovered ? "#A855F7" : "#60A5FA"}
                      strokeWidth="3"
                      strokeLinecap="round"
                      opacity={0.3}
                  />
              </motion.g>

              {/* Gemini Stars (The Sparkles) */}
              <g transform="translate(130, 180)">
                  {/* Large Star */}
                  <motion.path
                      d="M20 0C20 0 21 15 35 20C21 21 20 35 20 35C20 35 19 21 5 20C19 15 20 0 20 0Z"
                      fill="url(#geminiGradient)"
                      initial={{ opacity: 0, scale: 0, x: 20, y: 20 }}
                      animate={isHovered ? {
                          opacity: 1,
                          scale: [1, 1.2, 1],
                          x: 0,
                          y: 0,
                          filter: "drop-shadow(0 0 8px rgba(168, 85, 247, 0.4))"
                      } : { opacity: 0, scale: 0 }}
                      transition={{
                          opacity: { duration: 0.2 },
                          scale: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                          x: { type: "spring", damping: 12 },
                          y: { type: "spring", damping: 12 }
                      }}
                  />

                  {/* Medium Star */}
                  <motion.path
                      d="M-20 20C-20 20 -19 32 -10 35C-19 36 -20 45 -20 45C-20 45 -21 36 -30 35C-21 32 -20 20 -20 20Z"
                      fill="#818CF8"
                      initial={{ opacity: 0, scale: 0, rotate: -20 }}
                      animate={isHovered ? { opacity: 0.8, scale: 1, rotate: 0 } : { opacity: 0, scale: 0 }}
                      transition={{ delay: 0.1 }}
                  />

                  {/* Small Background Star */}
                  <motion.path
                      d="M10 50C10 50 10.5 56 15 58C10.5 59 10 65 10 65C10 65 9.5 59 5 58C9.5 56 10 50 10 50Z"
                      fill="#C084FC"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={isHovered ? { opacity: 0.6, scale: 0.8 } : { opacity: 0, scale: 0 }}
                      transition={{ delay: 0.2 }}
                  />
              </g>
          </svg>

          {/* Hover Label */}
          <motion.div
              className="mt-6 font-medium text-slate-400"
              animate={{
                  color: isHovered ? "#9333ea" : "#94a3b8",
                  opacity: isHovered ? 1 : 0.6
              }}
          >
              {isHovered ? "Magic Enhanced" : "Acrobat PDF"}
          </motion.div>
          </>
    //   </motion.div>
  )
}

export default Logo
