"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, Filter, MoreHorizontal, AlertTriangle, CheckCircle, FileText, Send, User, Clock, Calendar, Tag } from "lucide-react"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "@/hooks/use-toast"
import { apiService, Case, CreateCaseData, CreateCaseResponseData, UpdateCaseData, Contact } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

interface CaseFilters {
  status: string;
  priority: string;
  category: string;
  search: string;
}

export default function CaseManagement() {
  const { user, isAuthenticated } = useAuth()
  const [cases, setCases] = useState<Case[]>([])
  const [selectedCase, setSelectedCase] = useState<Case | null>(null)
  const [newCaseOpen, setNewCaseOpen] = useState(false)
  const [responseText, setResponseText] = useState("")
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creatingCase, setCreatingCase] = useState(false)
  const [addingResponse, setAddingResponse] = useState(false)
  const [filters, setFilters] = useState<CaseFilters>({
    status: "all",
    priority: "all",
    category: "all",
    search: "",
  })

  const [newCase, setNewCase] = useState<CreateCaseData>({
    title: "",
    description: "",
    priority: "medium",
    category: "general",
    source: "web_form",
    customer: 1,
  })

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)

  // Priority choices matching backend
  const priorityChoices = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" },
  ]

  // Status choices matching backend
  const statusChoices = [
    { value: "new", label: "New" },
    { value: "assigned", label: "Assigned" },
    { value: "in_progress", label: "In Progress" },
    { value: "waiting_customer", label: "Waiting for Customer" },
    { value: "waiting_third_party", label: "Waiting for Third Party" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" },
    { value: "escalated", label: "Escalated" },
  ]

  // Category choices matching backend
  const categoryChoices = [
    { value: "technical", label: "Technical" },
    { value: "billing", label: "Billing" },
    { value: "general", label: "General" },
    { value: "feature_request", label: "Feature Request" },
    { value: "bug_report", label: "Bug Report" },
    { value: "account", label: "Account" },
    { value: "security", label: "Security" },
  ]

  const loadCases = useCallback(async () => {
    if (!isAuthenticated) return
    
    try {
      setLoading(true)
      const params: any = {}
      if (filters.status && filters.status !== "all") params.status = filters.status
      if (filters.priority && filters.priority !== "all") params.priority = filters.priority
      if (filters.category && filters.category !== "all") params.category = filters.category
      if (filters.search) params.search = filters.search

      console.log("Search params:", params) // Debug log
      const response = await apiService.getCases(params)
      setCases(response.results || [])
    } catch (error: any) {
      console.error("Error loading cases:", error)
      if (error.message?.includes('401')) {
        window.location.href = '/login'
        return
      }
      toast({
        title: "Error",
        description: "Failed to load cases. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, filters.status, filters.priority, filters.category, filters.search])

  // Debounced search function
  const debouncedLoadCases = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout
      return () => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          if (isAuthenticated) {
            loadCases()
          }
        }, 500) // 500ms delay
      }
    })(),
    [isAuthenticated, loadCases]
  )

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }
    
    loadCases()
  }, [isAuthenticated, loadCases])

  // Load cases when filters change (with debouncing for search)
  useEffect(() => {
    if (isAuthenticated) {
      loadCases()
    }
  }, [filters.status, filters.priority, filters.category, isAuthenticated, loadCases])

  // Separate effect for search to handle debouncing
  useEffect(() => {
    if (isAuthenticated && filters.search) {
      debouncedLoadCases()
    } else if (isAuthenticated && !filters.search) {
      // If search is cleared, load immediately
      loadCases()
    }
  }, [filters.search, isAuthenticated, debouncedLoadCases, loadCases])

  // Load contacts when creating new case
  useEffect(() => {
    if (newCaseOpen && isAuthenticated) {
      loadContacts()
    }
  }, [newCaseOpen, isAuthenticated])

  // Set default customer when contacts are loaded
  useEffect(() => {
    if (newCaseOpen && contacts.length > 0 && !newCase.customer) {
      setNewCase((prev) => ({ ...prev, customer: contacts[0].id }))
    }
  }, [contacts, newCaseOpen])

  const loadContacts = async () => {
    if (!isAuthenticated) return
    
    try {
      setLoadingContacts(true)
      const response = await apiService.getContacts({ is_customer: true })
      setContacts(response.results || [])
    } catch (error: any) {
      console.error("Error loading contacts:", error)
      if (error.message?.includes('401')) {
        window.location.href = '/login'
        return
      }
      toast({
        title: "Error",
        description: "Failed to load contacts. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingContacts(false)
    }
  }

  const handleCreateCase = async () => {
    if (!isAuthenticated) return

    // Validate required fields
    if (!newCase.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Case title is required.",
        variant: "destructive",
      })
      return
    }

    if (!newCase.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Case description is required.",
        variant: "destructive",
      })
      return
    }

    if (!newCase.customer) {
      toast({
        title: "Validation Error",
        description: "Please enter a customer (ID or email).",
        variant: "destructive",
      })
      return
    }

    let customerId = newCase.customer;
    // If the input is not a number, try to resolve it as an email
    if (isNaN(Number(customerId))) {
      const match = contacts.find(
        (c) => c.email.toLowerCase() === String(customerId).toLowerCase()
      );
      if (!match) {
        toast({
          title: "Validation Error",
          description: "No contact found with that email.",
          variant: "destructive",
        });
        return;
      }
      customerId = match.id;
    } else {
      customerId = Number(customerId);
    }

    try {
      setCreatingCase(true)
      
      // Prepare case data
      const caseData = {
        title: newCase.title.trim(),
        description: newCase.description.trim(),
        priority: newCase.priority,
        category: newCase.category,
        source: newCase.source,
        customer: customerId,
        company: newCase.company || undefined,
        assigned_to: newCase.assigned_to || undefined,
      }
      
      console.log('Creating case with data:', caseData)
      
      const createdCase = await apiService.createCase(caseData)
      
      // Add the new case to the list
      setCases(prev => [createdCase, ...prev])
      
      // Close modal and reset form
    setNewCaseOpen(false)
    setNewCase({
      title: "",
      description: "",
        priority: "medium",
        category: "general",
        source: "web_form",
        customer: contacts.length > 0 ? contacts[0].id : 1,
    })
      
    toast({
      title: "Case Created",
        description: `Case "${createdCase.title}" has been registered successfully.`,
      })
      
      // Refresh the cases list to get updated data
      loadCases()
      
    } catch (error: any) {
      console.error("Error creating case:", error)
      
      if (error.message?.includes('401')) {
        window.location.href = '/login'
        return
      }
      
      // Show specific error message
      const errorMessage = error.message || "Failed to create case. Please try again."
      toast({
        title: "Error Creating Case",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setCreatingCase(false)
    }
  }

  const handleAssignCase = async (caseId: number, userId: number) => {
    if (!isAuthenticated) return
    
    try {
      console.log(`Assigning case ${caseId} to user ${userId}`)
      
      const updatedCase = await apiService.assignCase(caseId, userId, "Assigned by user")
      
      // Update cases list
      setCases(prev => prev.map(c => c.id === caseId ? updatedCase : c))
      
      // Update selected case if it's the one being assigned
      if (selectedCase?.id === caseId) {
        setSelectedCase(updatedCase)
      }
      
    toast({
        title: "Case Assigned",
        description: `Case ${updatedCase.case_number} has been assigned successfully.`,
      })
      
      // Refresh cases to get updated data
      loadCases()
      
    } catch (error: any) {
      console.error("Error assigning case:", error)
      
      if (error.message?.includes('401')) {
        window.location.href = '/login'
        return
      }
      
      const errorMessage = error.message || "Failed to assign case. Please try again."
      toast({
        title: "Error Assigning Case",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleEscalateCase = async (caseId: number) => {
    if (!isAuthenticated) return
    
    try {
      console.log(`Escalating case ${caseId}`)
      
      const updatedCase = await apiService.escalateCase(caseId)
      
      // Update cases list
      setCases(prev => prev.map(c => c.id === caseId ? updatedCase : c))
      
      // Update selected case if it's the one being escalated
      if (selectedCase?.id === caseId) {
        setSelectedCase(updatedCase)
      }
      
    toast({
      title: "Case Escalated",
        description: `Case ${updatedCase.case_number} has been escalated to management.`,
      })
      
      // Refresh cases to get updated data
      loadCases()
      
    } catch (error: any) {
      console.error("Error escalating case:", error)
      
      if (error.message?.includes('401')) {
        window.location.href = '/login'
        return
      }
      
      const errorMessage = error.message || "Failed to escalate case. Please try again."
      toast({
        title: "Error Escalating Case",
        description: errorMessage,
      variant: "destructive",
    })
    }
  }

  const handleAddResponse = async (caseId: number) => {
    if (!isAuthenticated || !responseText.trim()) return

    try {
      setAddingResponse(true)
      const responseData: CreateCaseResponseData = {
        case: caseId,
        response_type: isInternalNote ? "internal" : "customer",
        content: responseText,
        is_internal: isInternalNote,
      }

      const newResponse = await apiService.createCaseResponse(responseData)
      
      // Update the selected case with new response
      if (selectedCase?.id === caseId) {
        setSelectedCase(prev => prev ? {
          ...prev,
          responses: [...(prev.responses || []), newResponse]
        } : null)
      }

    setResponseText("")
      setIsInternalNote(false)
    toast({
      title: "Response Added",
      description: `Response added to case ${caseId}.`,
    })
    } catch (error: any) {
      console.error("Error adding response:", error)
      if (error.message?.includes('401')) {
        window.location.href = '/login'
        return
      }
      toast({
        title: "Error",
        description: "Failed to add response. Please try again.",
        variant: "destructive",
      })
    } finally {
      setAddingResponse(false)
    }
  }

  const handleCloseCase = async (caseId: number) => {
    if (!isAuthenticated) return
    
    try {
      console.log(`Closing case ${caseId}`)
      
      const updatedCase = await apiService.updateCaseStatus(caseId, "closed", "Case closed by user")
      
      // Update cases list
      setCases(prev => prev.map(c => c.id === caseId ? updatedCase : c))
      
      // Update selected case if it's the one being closed
      if (selectedCase?.id === caseId) {
        setSelectedCase(updatedCase)
      }
      
    toast({
      title: "Case Closed",
        description: `Case ${updatedCase.case_number} has been closed successfully.`,
      })
      
      // Refresh cases to get updated data
      loadCases()
      
    } catch (error: any) {
      console.error("Error closing case:", error)
      
      if (error.message?.includes('401')) {
        window.location.href = '/login'
        return
      }
      
      const errorMessage = error.message || "Failed to close case. Please try again."
      toast({
        title: "Error Closing Case",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleUpdatePriority = async (caseId: number, priority: string) => {
    if (!isAuthenticated) return
    
    try {
      console.log(`Updating case ${caseId} priority to ${priority}`)
      
      const updatedCase = await apiService.updateCasePriority(caseId, priority, `Priority updated to ${priority}`)
      
      // Update cases list
      setCases(prev => prev.map(c => c.id === caseId ? updatedCase : c))
      
      // Update selected case if it's the one being updated
      if (selectedCase?.id === caseId) {
        setSelectedCase(updatedCase)
      }
      
      toast({
        title: "Priority Updated",
        description: `Case priority has been updated to ${priority}.`,
      })
      
      // Refresh cases to get updated data
      loadCases()
      
    } catch (error: any) {
      console.error("Error updating priority:", error)
      
      if (error.message?.includes('401')) {
        window.location.href = '/login'
        return
      }
      
      const errorMessage = error.message || "Failed to update priority. Please try again."
      toast({
        title: "Error Updating Priority",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    if (!priority) return "outline"
    switch (priority) {
      case "urgent":
      case "high":
        return "destructive"
      case "medium":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "outline"
    }
  }

  const getStatusColor = (status: string) => {
    if (!status) return "outline"
    switch (status) {
      case "resolved":
      case "closed":
        return "default"
      case "in_progress":
        return "secondary"
      case "assigned":
        return "outline"
      case "escalated":
        return "destructive"
      default:
        return "outline"
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown Date'
    try {
      const date = new Date(dateString)
      return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString()
    } catch {
      return 'Invalid Date'
    }
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Unknown Date'
    try {
      const date = new Date(dateString)
      return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString()
    } catch {
      return 'Invalid Date'
    }
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Case Management</h1>
          <p className="text-muted-foreground">Register, assign, and manage customer support cases</p>
        </div>

        <Dialog open={newCaseOpen} onOpenChange={setNewCaseOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Case
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Case</DialogTitle>
              <DialogDescription>Register a new customer support case</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Case Title</Label>
                  <Input
                    id="title"
                    value={newCase.title}
                    onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                    placeholder="Brief description of the issue"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer</Label>
                  <Input
                    id="customer"
                    value={newCase.customer || ""}
                    onChange={(e) => setNewCase({ ...newCase, customer: e.target.value })}
                    placeholder="Enter customer ID or email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newCase.description}
                  onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                  placeholder="Detailed description of the issue..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={newCase.priority}
                    onValueChange={(value) => setNewCase({ ...newCase, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityChoices.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newCase.category}
                    onValueChange={(value) => setNewCase({ ...newCase, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryChoices.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Select
                    value={newCase.source}
                    onValueChange={(value) => setNewCase({ ...newCase, source: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web_form">Web Form</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="chat">Chat</SelectItem>
                      <SelectItem value="portal">Customer Portal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setNewCaseOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCase} disabled={creatingCase}>
                  {creatingCase ? "Creating..." : "Create Case"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search cases..."
                  className="pl-10"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusChoices.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={filters.priority}
                onValueChange={(value) => setFilters({ ...filters, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {priorityChoices.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={filters.category}
                onValueChange={(value) => setFilters({ ...filters, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoryChoices.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cases List and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cases List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Active Cases ({cases.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={loadCases}>
                  Refresh
                  </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading cases...</p>
                </div>
              ) : cases.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No cases found</p>
                </div>
              ) : (
              <div className="space-y-4">
                  {cases.filter(case_ => case_ && case_.id).map((case_, index) => (
                  <div
                      key={case_.id || `case-${index}`}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedCase?.id === case_.id ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedCase(case_)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{case_.title || 'Untitled Case'}</h3>
                            <Badge variant={getPriorityColor(case_.priority)}>
                              {case_.priority ? case_.priority.charAt(0).toUpperCase() + case_.priority.slice(1) : 'Unknown'}
                            </Badge>
                            <Badge variant={getStatusColor(case_.status)}>
                              {case_.status ? case_.status.replace('_', ' ').split(' ').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ') : 'Unknown Status'}
                            </Badge>
                            {case_.is_overdue && (
                              <Badge variant="destructive">Overdue</Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {case_.case_number || 'No Case Number'} • {case_.customer || 'Unknown Customer'}
                        </p>
                          <p className="text-sm text-gray-600 line-clamp-2">{case_.description || 'No description available'}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>Created: {formatDate(case_.created_at)}</span>
                            <span>Responses: {case_.response_count || 0}</span>
                            {case_.assigned_to && (
                              <span>Assigned: {case_.assigned_to.first_name} {case_.assigned_to.last_name}</span>
                            )}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleAssignCase(case_.id, user?.id || 1)}>
                            <User className="h-4 w-4 mr-2" />
                              Assign to Me
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEscalateCase(case_.id)}>
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Escalate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCloseCase(case_.id)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Close Case
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Case Details */}
        <div className="space-y-4">
          {selectedCase ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Case Details
                    <Badge variant={getStatusColor(selectedCase.status)}>
                      {selectedCase.status ? selectedCase.status.replace('_', ' ').split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ') : 'Unknown Status'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold">{selectedCase.title}</h3>
                    <p className="text-sm text-muted-foreground">{selectedCase.case_number}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <p className="text-sm">{selectedCase.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label>Priority</Label>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getPriorityColor(selectedCase.priority)}>
                          {selectedCase.priority ? selectedCase.priority.charAt(0).toUpperCase() + selectedCase.priority.slice(1) : 'Unknown'}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {priorityChoices.map((priority) => (
                              <DropdownMenuItem
                                key={priority.value}
                                onClick={() => handleUpdatePriority(selectedCase.id, priority.value)}
                              >
                                {priority.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div>
                      <Label>Category</Label>
                      <p>{selectedCase.category ? selectedCase.category.replace('_', ' ').split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ') : 'Unknown Category'}</p>
                    </div>
                    <div>
                      <Label>Customer</Label>
                      <p>{selectedCase.customer}</p>
                    </div>
                    <div>
                      <Label>Assignee</Label>
                      <p>{selectedCase.assigned_to ? 
                        `${selectedCase.assigned_to.first_name} ${selectedCase.assigned_to.last_name}` : 
                        "Unassigned"
                      }</p>
                    </div>
                    <div>
                      <Label>Created</Label>
                      <p>{formatDateTime(selectedCase.created_at)}</p>
                    </div>
                    <div>
                      <Label>Updated</Label>
                      <p>{formatDateTime(selectedCase.updated_at)}</p>
                    </div>
                  </div>

                  {selectedCase.tags && selectedCase.tags.length > 0 && (
                    <div>
                      <Label>Tags</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedCase.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Case Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(selectedCase.responses || []).map((response, index) => (
                      <div key={response.id || `response-${index}`} className="flex space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {response.author?.first_name?.charAt(0) || 'U'}{response.author?.last_name?.charAt(0) || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium">
                              {response.author?.first_name} {response.author?.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(response.created_at)}
                            </p>
                            {response.is_internal && (
                              <Badge variant="outline" className="text-xs">Internal</Badge>
                            )}
                          </div>
                          <p className="text-sm">{response.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="internal-note"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="internal-note" className="text-sm">Internal Note</Label>
                    </div>
                    <Textarea
                      placeholder="Add a response..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleAddResponse(selectedCase.id)}
                        disabled={addingResponse || !responseText.trim()}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {addingResponse ? "Sending..." : "Send Response"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Select a case to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
