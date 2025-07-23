"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Calendar, CheckSquare, Clock, AlertCircle, User, Trash2, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast" // Import toast
import { apiService, User as ApiUser } from "@/lib/api"

export default function TaskManagement() {
  const [tasks, setTasks] = useState<any[]>([])
  const [users, setUsers] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "Medium",
    assignee: "",
    dueDate: "",
    category: "General",
    estimatedHours: "",
    caseId: "",
  })
  const [editTaskOpen, setEditTaskOpen] = useState(false)
  const [editTask, setEditTask] = useState<any | null>(null)
  const [deleteTaskOpen, setDeleteTaskOpen] = useState(false)
  const [deleteTask, setDeleteTask] = useState<any | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [assigneeFilter, setAssigneeFilter] = useState("")

  const loadTasks = async () => {
    setLoading(true)
    setError(null)
    try {
      let params: any = {}
      if (search) params.search = search
      if (statusFilter !== "all" && statusFilter) params.status = statusFilter
      if (priorityFilter !== "all" && priorityFilter) params.priority = priorityFilter
      if (assigneeFilter !== "all" && assigneeFilter) params.assigned_to = assigneeFilter
      const response = await apiService.getTasks(params)
      setTasks(response.results)
    } catch (err: any) {
      setError(err.message || "Failed to load tasks.")
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await apiService.getUsers()
      setUsers(response.results)
    } catch {
      setUsers([])
    }
  }

  useEffect(() => {
    loadTasks()
    loadUsers()
  }, [search, statusFilter, priorityFilter, assigneeFilter])

  const handleCreateTask = async () => {
    try {
      setLoading(true)
      await apiService.request("/tasks/", {
        method: "POST",
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          priority: newTask.priority.toLowerCase(),
          assigned_to: newTask.assignee,
          due_date: newTask.dueDate,
          category: newTask.category,
          estimated_hours: newTask.estimatedHours,
          case: newTask.caseId || null,
        }),
      })
      loadTasks()
    setNewTaskOpen(false)
    setNewTask({
      title: "",
      description: "",
      priority: "Medium",
      assignee: "",
      dueDate: "",
      category: "General",
      estimatedHours: "",
      caseId: "",
    })
    toast({
      title: "Task Created",
      description: `Task "${newTask.title}" has been created.`,
    })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create task.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    const task = tasks?.find((t: any) => t.id === taskId)
    if (!task) return
    try {
      setLoading(true)
      await apiService.request(`/tasks/${taskId}/`, {
        method: "PATCH",
        body: JSON.stringify({
          status: completed ? 'pending' : 'completed',
        }),
      })
      loadTasks()
      const newStatus = completed ? "Pending" : "Completed"
      toast({
        title: "Task Status Updated",
        description: `Task "${task.title}" marked as ${newStatus}.`,
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update task status.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditTask = (task: any) => {
    setEditTask({ ...task })
    setEditTaskOpen(true)
  }

  const handleUpdateTask = async () => {
    if (!editTask) return
    try {
      setLoading(true)
      await apiService.updateTask(editTask.id, {
        title: editTask.title,
        description: editTask.description,
        priority: editTask.priority,
        assigned_to: editTask.assigned_to,
        due_date: editTask.due_date,
        category: editTask.category,
        estimated_hours: editTask.estimated_hours,
        case: editTask.case || null,
      })
      setEditTaskOpen(false)
      setEditTask(null)
      loadTasks()
      toast({
        title: "Task Updated",
        description: `Task "${editTask.title}" has been updated.`,
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update task.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Delete Task
  const handleDeleteTask = (task: any) => {
    setDeleteTask(task)
    setDeleteTaskOpen(true)
  }

  const confirmDeleteTask = async () => {
    if (!deleteTask) return
    try {
      setLoading(true)
      await apiService.updateTask(deleteTask.id, { status: "cancelled" }) // Or use a deleteTask API if available
      setDeleteTaskOpen(false)
      setDeleteTask(null)
      loadTasks()
      toast({
        title: "Task Deleted",
        description: `Task "${deleteTask.title}" has been deleted.`,
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete task.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "destructive"
      case "Medium":
        return "secondary"
      case "Low":
        return "outline"
      default:
        return "outline"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckSquare className="h-4 w-4 text-green-500" />
      case "In Progress":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "Pending":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  // Filtered and searched tasks
  const filteredTasks = tasks?.filter((task: any) => {
    let matches = true
    if (search && !task.title.toLowerCase().includes(search.toLowerCase()) && !task.description?.toLowerCase().includes(search.toLowerCase())) {
      matches = false
    }
    if (statusFilter !== "all" && statusFilter && task.status !== statusFilter) matches = false
    if (priorityFilter !== "all" && priorityFilter && task.priority !== priorityFilter) matches = false
    if (assigneeFilter !== "all" && assigneeFilter && String(task.assigned_to) !== String(assigneeFilter)) matches = false
    return matches
  })

  // Status options for backend values and user-friendly labels
  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ]

  // Compute dynamic counts for summary cards
  const inProgressCount = tasks?.filter((t: any) => t.status === "in_progress").length || 0
  const pendingCount = tasks?.filter((t: any) => t.status === "pending").length || 0
  const completedCount = tasks?.filter((t: any) => t.status === "completed").length || 0
  const overdueCount = tasks?.filter((t: any) => {
    if (!t.due_date || t.status === "completed" || t.status === "cancelled") return false
    return new Date(t.due_date) < new Date()
  }).length || 0

  if (loading) return <div className="p-6">Loading...</div>
  if (error) return <div className="p-6 text-red-500">{error}</div>

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Task Management</h1>
          <p className="text-muted-foreground">Create, assign, and track task progress</p>
        </div>
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search tasks..."
              className="pl-10 w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* Remove filter dropdowns and filter logic */}
        </div>
        {/* In the header area, restore the Add Task button and dialog */}
        <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>Create and assign a new task</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Brief description of the task"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Detailed task description..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assignee">Assign To</Label>
                  <Select
                    value={newTask.assignee}
                    onValueChange={(value) => setNewTask({ ...newTask, assignee: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.first_name} {user.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newTask.category}
                    onValueChange={(value) => setNewTask({ ...newTask, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technical">Technical</SelectItem>
                      <SelectItem value="Documentation">Documentation</SelectItem>
                      <SelectItem value="Testing">Testing</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedHours">Est. Hours</Label>
                  <Input
                    id="estimatedHours"
                    type="number"
                    value={newTask.estimatedHours}
                    onChange={(e) => setNewTask({ ...newTask, estimatedHours: e.target.value })}
                    placeholder="4"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="caseId">Related Case (Optional)</Label>
                <Input
                  id="caseId"
                  value={newTask.caseId}
                  onChange={(e) => setNewTask({ ...newTask, caseId: e.target.value })}
                  placeholder="CASE-001"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setNewTaskOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTask}>Create Task</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {/* Loading/Error States */}
      {loading && <div className="p-6 text-center">Loading...</div>}
      {error && <div className="p-6 text-red-500">{error}</div>}
      {/* Task Summary Cards and List */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{inProgressCount}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{overdueCount}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Tasks</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTasks?.filter((task: any) => task.status !== "cancelled").map((task: any) => (
              <div key={task.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                <Checkbox checked={task.completed} onCheckedChange={() => handleToggleTask(task.id, !task.completed)} className="mt-1" />

                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className={`font-semibold ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </h3>
                        <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      {getStatusIcon(task.status)}
                      <Badge variant="outline">{task.status}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{users?.find((u: any) => u.id === task.assigned_to)?.first_name || "N/A"}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Due: {task.due_date}</span>
                      </div>
                      {task.case && (
                        <div className="flex items-center space-x-1">
                          <span>Case: {task.case}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-muted-foreground">
                        {task.actual_hours}h / {task.estimated_hours}h
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {task.category}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <Select
                    value={task.status}
                    onValueChange={async (value) => {
                      try {
                        setLoading(true)
                        await apiService.updateTask(task.id, { status: value })
                        loadTasks()
                        toast({
                          title: "Status Updated",
                          description: `Task status changed to ${statusOptions.find(opt => opt.value === value)?.label || value}.`,
                        })
                      } catch (err: any) {
                        toast({
                          title: "Error",
                          description: err.message || "Failed to update status.",
                          variant: "destructive",
                        })
                      } finally {
                        setLoading(false)
                      }
                    }}
                  >
                    <SelectTrigger className="w-32"><SelectValue>{statusOptions.find(opt => opt.value === task.status)?.label || task.status}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => handleEditTask(task)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteTask(task)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Edit Task Dialog */}
      <Dialog open={editTaskOpen} onOpenChange={setEditTaskOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update the task details and save changes</DialogDescription>
          </DialogHeader>
          {editTask && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Task Title</Label>
                <Input
                  id="edit-title"
                  value={editTask.title}
                  onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                  placeholder="Brief description of the task"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editTask.description}
                  onChange={(e) => setEditTask({ ...editTask, description: e.target.value })}
                  placeholder="Detailed task description..."
                  rows={3}
                />
              </div>
              {/* Add other fields as needed (priority, assignee, due date, etc.) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-assignee">Assign To</Label>
                  <Select
                    value={editTask.assigned_to}
                    onValueChange={(value) => setEditTask({ ...editTask, assigned_to: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.first_name} {user.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-dueDate">Due Date</Label>
                  <Input
                    id="edit-dueDate"
                    type="date"
                    value={editTask.due_date}
                    onChange={(e) => setEditTask({ ...editTask, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select
                    value={editTask.priority}
                    onValueChange={(value) => setEditTask({ ...editTask, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <Select
                    value={editTask.category}
                    onValueChange={(value) => setEditTask({ ...editTask, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technical">Technical</SelectItem>
                      <SelectItem value="Documentation">Documentation</SelectItem>
                      <SelectItem value="Testing">Testing</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-estimatedHours">Est. Hours</Label>
                  <Input
                    id="edit-estimatedHours"
                    type="number"
                    value={editTask.estimated_hours}
                    onChange={(e) => setEditTask({ ...editTask, estimated_hours: e.target.value })}
                    placeholder="4"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-caseId">Related Case (Optional)</Label>
                <Input
                  id="edit-caseId"
                  value={editTask.case || ""}
                  onChange={(e) => setEditTask({ ...editTask, case: e.target.value || null })}
                  placeholder="CASE-001"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditTaskOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateTask}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Delete Task Dialog */}
      <Dialog open={deleteTaskOpen} onOpenChange={setDeleteTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>Are you sure you want to delete this task? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setDeleteTaskOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteTask}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
