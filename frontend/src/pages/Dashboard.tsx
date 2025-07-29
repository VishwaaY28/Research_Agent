"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { StatsCard } from "@/components/dashboard/StatsCard"
import { WorkspaceCard } from "@/components/dashboard/WorkspaceCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useApi } from "@/hooks/useApi"
import {
  FolderOpen,
  FileText,
  Zap,
  BarChart3,
  Plus,
  TrendingUp,
  Clock,
  Users,
} from "lucide-react"

interface DashboardStats {
  total_workspaces: number
  total_sections: number
  total_prompts: number
  total_generated_content: number
}

interface RecentWorkspace {
  id: string
  name: string
  client: string
  last_used_at: string | null
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentWorkspaces, setRecentWorkspaces] = useState<RecentWorkspace[]>([])
  const { request, loading } = useApi()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await request({
        url: '/data/dashboard',
        method: 'GET',
      })
      
      if (response.success) {
        setStats(response.data.stats)
        setRecentWorkspaces(response.data.recent_workspaces)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    }
  }

  const statsCards = [
    {
      title: "Total Workspaces",
      value: stats?.total_workspaces || 0,
      change: "+12%",
      changeType: "positive" as const,
      icon: FolderOpen,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      title: "Content Sections",
      value: stats?.total_sections || 0,
      change: "+8%",
      changeType: "positive" as const,
      icon: FileText,
      gradient: "from-green-500 to-emerald-500",
    },
    {
      title: "AI Generations",
      value: stats?.total_generated_content || 0,
      change: "+23%",
      changeType: "positive" as const,
      icon: Zap,
      gradient: "from-purple-500 to-pink-500",
    },
    {
      title: "Saved Prompts",
      value: stats?.total_prompts || 0,
      change: "+5%",
      changeType: "positive" as const,
      icon: BarChart3,
      gradient: "from-orange-500 to-red-500",
    },
  ]

  const recentActivity = [
    {
      action: "Created new workspace",
      workspace: "Acme Corp Proposal",
      time: "2 minutes ago",
      type: "create",
    },
    {
      action: "Generated content",
      workspace: "Tech Solutions RFP",
      time: "15 minutes ago",
      type: "generate",
    },
    {
      action: "Updated sections",
      workspace: "Healthcare Initiative",
      time: "1 hour ago",
      type: "update",
    },
    {
      action: "Shared workspace",
      workspace: "Financial Services",
      time: "2 hours ago",
      type: "share",
    },
  ]

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-blue-900 dark:to-purple-900">
      <Header 
        title="Dashboard" 
        subtitle="Welcome back! Here's what's happening with your proposals."
      />
      
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {statsCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <StatsCard {...stat} />
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Workspaces */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold">Recent Workspaces</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Your most recently accessed workspaces
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  New Workspace
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentWorkspaces.length > 0 ? (
                  recentWorkspaces.map((workspace, index) => (
                    <motion.div
                      key={workspace.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <FolderOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium">{workspace.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Client: {workspace.client}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">
                          {workspace.last_used_at ? "Recently used" : "New"}
                        </Badge>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No workspaces yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first workspace to get started
                    </p>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Workspace
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-6"
          >
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Recent Activity</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Latest actions across your workspaces
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      {activity.type === "create" && <Plus className="w-4 h-4 text-white" />}
                      {activity.type === "generate" && <Zap className="w-4 h-4 text-white" />}
                      {activity.type === "update" && <FileText className="w-4 h-4 text-white" />}
                      {activity.type === "share" && <Users className="w-4 h-4 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {activity.workspace}
                      </p>
                      <div className="flex items-center space-x-1 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {activity.time}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Workspace
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Zap className="w-4 h-4 mr-2" />
                  AI Generate Content
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Upload Documents
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  )
}