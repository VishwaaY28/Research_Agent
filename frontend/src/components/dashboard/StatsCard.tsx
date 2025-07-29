"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon: LucideIcon
  className?: string
  gradient?: string
}

export function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  className,
  gradient = "from-blue-500 to-purple-600"
}: StatsCardProps) {
  const changeColors = {
    positive: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    negative: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    neutral: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -5 }}
      className={cn("group", className)}
    >
      <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
        {/* Gradient background */}
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity", gradient)} />
        
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={cn("p-2 rounded-lg bg-gradient-to-br", gradient)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{value}</div>
              {change && (
                <Badge variant="secondary" className={cn("mt-1", changeColors[changeType])}>
                  {change}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}