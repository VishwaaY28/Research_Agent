"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedBackgroundProps {
  children: React.ReactNode
  className?: string
}

export function AnimatedBackground({ children, className }: AnimatedBackgroundProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Animated background elements */}
      <div className="absolute inset-0 -z-10">
        <motion.div
          className="absolute top-0 left-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute top-1/2 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute bottom-0 left-1/3 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, -50, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
      {children}
    </div>
  )
}