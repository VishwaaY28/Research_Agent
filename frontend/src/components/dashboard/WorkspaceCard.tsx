"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn, formatRelativeTime } from "@/lib/utils"
import {
  FolderOpen,
  MoreVertical,
  Edit,
  Trash2,
  Share,
  Clock,
  FileText,
} from "lucide-react"

interface WorkspaceCardProps {
  workspace: {
    id: string
    name: string
    client: string
    tags: string[]
    lastUsed?: string
    sectionsCount?: number
  }
  className?: string
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onShare?: (id: string) => void
}

export function WorkspaceCard({
  workspace,
  className,
  onEdit,
  onDelete,
  onShare,
}: WorkspaceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5 }}
      className={cn("group", className)}
    >
      <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
        {/* Gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-600" />
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <FolderOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold group-hover:text-blue-600 transition-colors">
                  {workspace.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Client: {workspace.client}
                </p>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(workspace.id)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onShare?.(workspace.id)}>
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete?.(workspace.id)}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Tags */}
          {workspace.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {workspace.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {workspace.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{workspace.tags.length - 3} more
                </Badge>
              )}
            </div>
          )}
          
          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <FileText className="w-4 h-4" />
              <span>{workspace.sectionsCount || 0} sections</span>
            </div>
            
            {workspace.lastUsed && (
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{formatRelativeTime(workspace.lastUsed)}</span>
              </div>
            )}
          </div>
          
          {/* Action Button */}
          <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
            Open Workspace
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}