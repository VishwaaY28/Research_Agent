"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Home,
  FolderOpen,
  Upload,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Zap,
  BarChart3,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

interface SidebarProps {
  className?: string
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home, badge: null },
  { name: "Workspaces", href: "/workspaces", icon: FolderOpen, badge: "3" },
  { name: "Content Upload", href: "/upload", icon: Upload, badge: null },
  { name: "AI Generator", href: "/generate", icon: Zap, badge: "New" },
  { name: "Templates", href: "/templates", icon: FileText, badge: null },
  { name: "Analytics", href: "/analytics", icon: BarChart3, badge: null },
]

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()

  return (
    <motion.div
      initial={{ width: collapsed ? 80 : 280 }}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "relative flex flex-col h-full bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border-r border-slate-200 dark:border-slate-700",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg gradient-text">ProposalCraft</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="p-2"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => (
          <motion.a
            key={item.name}
            href={item.href}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
              "hover:bg-slate-100 dark:hover:bg-slate-800",
              "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-between flex-1"
                >
                  <span className="font-medium">{item.name}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.a>
        ))}
      </nav>

      <Separator />

      {/* User Profile */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {!collapsed && user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="w-full justify-start text-slate-600 dark:text-slate-400"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        
        {collapsed && user && (
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full p-2"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.div>
  )
}