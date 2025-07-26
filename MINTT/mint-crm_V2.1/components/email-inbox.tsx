"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Plus, Reply, Forward, Archive, Trash2, Star, Paperclip, Send, Mail, Inbox, Send as SendIcon, FileText, RefreshCw, Settings, MessageSquare } from "lucide-react"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { apiService, Email, Contact, Company } from "@/lib/api"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Dialog as ConfirmDialog, DialogContent as ConfirmDialogContent, DialogHeader as ConfirmDialogHeader, DialogTitle as ConfirmDialogTitle, DialogDescription as ConfirmDialogDescription, DialogTrigger as ConfirmDialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"

interface EmailWithSender extends Email {
  sender_name?: string;
  sender_email?: string;
}

export default function EmailInbox() {
  const [emails, setEmails] = useState<EmailWithSender[]>([])
  const [selectedEmail, setSelectedEmail] = useState<EmailWithSender | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [forwardOpen, setForwardOpen] = useState(false)
  const [createCaseOpen, setCreateCaseOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("inbox")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [emailConfigOk, setEmailConfigOk] = useState<boolean | null>(null)
  const [emailConfigLoading, setEmailConfigLoading] = useState(true)
  
  const [newEmail, setNewEmail] = useState({
    to: "",
    subject: "",
    body: "",
    priority: "Medium",
  })
  
  const [replyData, setReplyData] = useState({
    subject: "",
    content: "",
    cc_emails: "",
    bcc_emails: "",
  })
  
  const [forwardData, setForwardData] = useState({
    to_email: "",
    subject: "",
    message: "",
    cc_emails: "",
    bcc_emails: "",
  })
  
  const [caseData, setCaseData] = useState({
    title: "",
    description: "",
    category: "Email",
    priority: "Medium",
    customer: "",
    company: "",
    assigned_to: "",
  })

  const [editingDraft, setEditingDraft] = useState<EmailWithSender | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [emailToDelete, setEmailToDelete] = useState<EmailWithSender | null>(null)
  const [attachments, setAttachments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { toast } = useToast()
  const { user } = useAuth()

  // Load emails based on active tab and page
  const loadEmails = async () => {
    try {
      setLoading(true)
      let response
      const params = { search: searchQuery || undefined, ordering: "-created_at" }
      switch (activeTab) {
        case "inbox":
          response = await apiService.getInboxEmails(params)
          break
        case "sent":
          response = await apiService.getSentEmails(params)
          break
        case "drafts":
          response = await apiService.getDraftEmails(params)
          break
        default:
          response = await apiService.getInboxEmails(params)
      }
      const emailsWithSender = response.results.map((email: Email) => ({
        ...email,
        sender_name: email.from_email.split('@')[0],
        sender_email: email.from_email
      }))
      setEmails(emailsWithSender)
      // setTotalCount(response.count || 0) // Remove totalCount
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to load emails", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Load supporting data
  const loadSupportingData = async () => {
    try {
      const [contactsRes, companiesRes] = await Promise.all([
        apiService.getContacts({ is_customer: true }),
        apiService.getCompanies({ is_customer: true })
      ])
      
      setContacts(contactsRes.results)
      setCompanies(companiesRes.results)
    } catch (error) {
      console.error("Error loading supporting data:", error)
    }
  }

  // Helper to load attachments for a draft email
  const loadAttachments = async (emailId: number) => {
    try {
      const res = await apiService.getEmailAttachments(emailId)
      setAttachments(res.results)
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to load attachments.", variant: "destructive" })
    }
  }

  useEffect(() => {
    loadEmails()
    loadSupportingData()
    setEmailConfigLoading(true)
    apiService.getUserEmailConfigs().then(res => {
      const hasVerified = res.results.some(cfg => cfg.is_active && cfg.is_verified)
      setEmailConfigOk(hasVerified)
    }).catch(() => setEmailConfigOk(false)).finally(() => setEmailConfigLoading(false))
  }, [activeTab, searchQuery, filter])

  // Modified openCompose to load attachments if editing a draft
  const openCompose = async (draft?: EmailWithSender) => {
    if (draft) {
      setEditingDraft(draft)
      setNewEmail({
        to: draft.to_email,
        subject: draft.subject,
        body: draft.text_content || draft.html_content || "",
        priority: draft.priority || "Medium",
      })
      setComposeOpen(true)
      await loadAttachments(draft.id)
    } else {
      setEditingDraft(null)
      setNewEmail({ to: "", subject: "", body: "", priority: "Medium" })
      setAttachments([])
      setComposeOpen(true)
    }
  }

  // Save as draft
  const handleSaveDraft = async () => {
    try {
      if (!newEmail.to && !newEmail.subject && !newEmail.body) {
        toast({ title: "Validation Error", description: "Draft must have at least one field filled.", variant: "destructive" })
        return
      }
      if (editingDraft) {
        // Update existing draft
        await apiService.updateEmail(editingDraft.id, {
          subject: newEmail.subject,
          to_email: newEmail.to,
          text_content: newEmail.body,
          from_email: user?.email || "",
        })
      } else {
        // Create new draft
        await apiService.createEmail({
          subject: newEmail.subject,
          to_email: newEmail.to,
          text_content: newEmail.body,
          from_email: user?.email || "",
        })
      }
      toast({ title: "Success", description: "Draft saved successfully." })
      setComposeOpen(false)
      setEditingDraft(null)
      setNewEmail({ to: "", subject: "", body: "", priority: "Medium" })
      loadEmails()
    } catch (error) {
      toast({ title: "Error", description: "Failed to save draft.", variant: "destructive" })
    }
  }

  // Send email (from new or draft)
  const handleSendEmail = async () => {
    try {
      if (!newEmail.to || !newEmail.subject || !newEmail.body) {
        toast({ title: "Validation Error", description: "Please fill in all required fields", variant: "destructive" })
        return
      }
      if (editingDraft) {
        // Send draft (delete draft, then send as new email)
        await apiService.deleteEmail(editingDraft.id)
      }
      await apiService.sendEmail({
        to_email: newEmail.to,
        subject: newEmail.subject,
        text_content: newEmail.body,
      })
      toast({ title: "Success", description: "Email sent successfully" })
      setComposeOpen(false)
      setEditingDraft(null)
      setNewEmail({ to: "", subject: "", body: "", priority: "Medium" })
      loadEmails()
    } catch (error) {
      toast({ title: "Error", description: "Failed to send email", variant: "destructive" })
    }
  }

  const handleReply = async () => {
    if (!selectedEmail) return
    
    try {
      await apiService.replyToEmail(selectedEmail.id, {
        subject: replyData.subject,
        content: replyData.content,
        cc_emails: replyData.cc_emails,
        bcc_emails: replyData.bcc_emails,
      })

      toast({
        title: "Success",
        description: "Reply sent successfully",
      })

      setReplyOpen(false)
      setReplyData({
        subject: "",
        content: "",
        cc_emails: "",
        bcc_emails: "",
      })
      
      loadEmails()
    } catch (error) {
      console.error("Error sending reply:", error)
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      })
    }
  }

  const handleForward = async () => {
    if (!selectedEmail) return
    
    try {
      await apiService.forwardEmail(selectedEmail.id, {
        to_email: forwardData.to_email,
        subject: forwardData.subject,
        message: forwardData.message,
        cc_emails: forwardData.cc_emails,
        bcc_emails: forwardData.bcc_emails,
      })

      toast({
        title: "Success",
        description: "Email forwarded successfully",
      })

      setForwardOpen(false)
      setForwardData({
        to_email: "",
        subject: "",
        message: "",
        cc_emails: "",
        bcc_emails: "",
      })
      
      loadEmails()
    } catch (error) {
      console.error("Error forwarding email:", error)
      toast({
        title: "Error",
        description: "Failed to forward email",
        variant: "destructive",
      })
    }
  }

  const handleCreateCase = async () => {
    if (!selectedEmail) return
    
    try {
      await apiService.createCaseFromEmail(selectedEmail.id, {
        title: caseData.title,
        description: caseData.description,
        category: caseData.category,
        priority: caseData.priority,
        customer: parseInt(caseData.customer),
        company: caseData.company ? parseInt(caseData.company) : undefined,
        assigned_to: caseData.assigned_to ? parseInt(caseData.assigned_to) : undefined,
      })

      toast({
        title: "Success",
        description: "Case created successfully",
      })

      setCreateCaseOpen(false)
      setCaseData({
        title: "",
        description: "",
        category: "Email",
        priority: "Medium",
        customer: "",
        company: "",
        assigned_to: "",
      })
      
      loadEmails()
    } catch (error) {
      console.error("Error creating case:", error)
      toast({
        title: "Error",
        description: "Failed to create case",
        variant: "destructive",
      })
    }
  }

  const handleEmailAction = async (emailId: number, action: string) => {
    try {
      switch (action) {
        case 'star':
          await apiService.starEmail(emailId)
          break
        case 'unstar':
          await apiService.unstarEmail(emailId)
          break
        case 'archive':
          await apiService.archiveEmail(emailId)
          break
        case 'delete':
          await apiService.deleteEmail(emailId)
          break
        case 'read':
          await apiService.markEmailAsRead(emailId)
          break
        case 'unread':
          await apiService.markEmailAsUnread(emailId)
          break
      }
      
      loadEmails()
      toast({
        title: "Success",
        description: `Email ${action}ed successfully`,
      })
    } catch (error) {
      console.error(`Error ${action}ing email:`, error)
      toast({
        title: "Error",
        description: `Failed to ${action} email`,
        variant: "destructive",
      })
    }
  }

  const handleDeleteEmail = async (email: EmailWithSender) => {
    setEmailToDelete(email)
    setDeleteConfirmOpen(true)
  }
  const confirmDeleteEmail = async () => {
    if (!emailToDelete) return
    try {
      await apiService.deleteEmail(emailToDelete.id)
      toast({ title: "Deleted", description: "Email deleted successfully." })
      setDeleteConfirmOpen(false)
      setEmailToDelete(null)
      loadEmails()
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete email.", variant: "destructive" })
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    try {
      let draftId = editingDraft?.id
      // If no draft exists, create one first
      if (!draftId) {
        if (!user?.email) throw new Error("Cannot determine sender email. Please log in again.")
        const draft = await apiService.createEmail({
          subject: newEmail.subject || "(no subject)",
          to_email: newEmail.to || "draft@placeholder.com",
          text_content: newEmail.body || "",
          from_email: user.email,
        })
        setEditingDraft(draft)
        draftId = draft.id
      }
      for (const file of files) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("email", draftId!.toString())
        await apiService.uploadEmailAttachment(formData)
      }
      await loadAttachments(draftId!)
      toast({ title: "Upload Complete", description: "Attachment(s) uploaded successfully." })
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to upload attachment.", variant: "destructive" })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleRemoveAttachment = async (attachmentId: number) => {
    try {
      await apiService.deleteEmailAttachment(attachmentId)
      if (editingDraft) await loadAttachments(editingDraft.id)
      toast({ title: "Removed", description: "Attachment removed." })
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to remove attachment.", variant: "destructive" })
    }
  }

  const getPriorityColor = (priority?: string) => {
    if (!priority) return "outline"
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString()
    }
  }

  // Pagination controls
  // const totalPages = Math.ceil(totalCount / pageSize)
  // const handlePrevPage = () => setPage((p) => Math.max(1, p - 1))
  // const handleNextPage = () => setPage((p) => Math.min(totalPages, p + 1))

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Email Management</h1>
          <p className="text-muted-foreground">Manage customer communications and support emails</p>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadEmails} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Email Settings
          </Button>
          
          <Button variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            SMS Management
          </Button>
          
          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Compose
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingDraft ? "Edit Draft" : "Compose Email"}</DialogTitle>
                <DialogDescription>{editingDraft ? "Edit and send or save your draft email." : "Send a new email message"}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="to">To *</Label>
                  <Input
                    id="to"
                    value={newEmail.to}
                    onChange={(e) => setNewEmail({ ...newEmail, to: e.target.value })}
                    placeholder="recipient@company.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={newEmail.subject}
                    onChange={(e) => setNewEmail({ ...newEmail, subject: e.target.value })}
                    placeholder="Email subject"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body">Message *</Label>
                  <Textarea
                    id="body"
                    value={newEmail.body}
                    onChange={(e) => setNewEmail({ ...newEmail, body: e.target.value })}
                    placeholder="Type your message here..."
                    rows={8}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Attachments</Label>
                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="block w-full border rounded p-2"
                  />
                  {uploading && <div className="text-xs text-blue-600">Uploading...</div>}
                  {attachments.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {attachments.map(att => (
                        <li key={att.id} className="flex items-center space-x-2 text-sm">
                          <a href={att.file} target="_blank" rel="noopener noreferrer" className="underline">{att.filename}</a>
                          <span className="text-muted-foreground">({Math.round(att.file_size / 1024)} KB)</span>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveAttachment(att.id)} title="Remove Attachment">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setComposeOpen(false)}>
                    Cancel
                  </Button>
                 <Button variant="secondary" onClick={handleSaveDraft}>
                   Save as Draft
                 </Button>
                  <Button onClick={handleSendEmail}>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inbox" className="flex items-center space-x-2">
              <Inbox className="h-4 w-4" />
              <span>Inbox</span>
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center space-x-2">
              <SendIcon className="h-4 w-4" />
              <span>Sent</span>
            </TabsTrigger>
            <TabsTrigger value="drafts" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Drafts</span>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Email List */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Inbox</CardTitle>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input 
                          placeholder="Search emails..." 
                          className="pl-10 w-64"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="unread">Unread</SelectItem>
                          <SelectItem value="starred">Starred</SelectItem>
                          <SelectItem value="high">High Priority</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                  ) : emails.filter(email => email.email_type === 'inbound' && email.status !== 'draft').length === 0 ? (
                    <div className="text-center py-8">
                      <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-muted-foreground">No emails found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {emails.filter(email => email.email_type === 'inbound' && email.status !== 'draft').map((email) => (
                        <div
                          key={email.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedEmail?.id === email.id ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                          } ${!email.read ? "bg-blue-50/30 border-blue-200" : ""}`}
                          onClick={() => setSelectedEmail(email)}
                        >
                          <div className="flex items-start space-x-3">
                            <Checkbox />
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {email.sender_name?.split(" ").map((n) => n[0]).join("") || email.from_email[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                                              <span className={`font-medium ${!email.read ? "font-bold" : ""}`}>
                              {email.sender_name || email.from_email}
                            </span>
                            {email.priority && (
                              <Badge variant={getPriorityColor(email.priority)} className="text-xs">
                                {email.priority}
                              </Badge>
                            )}
                                  {email.case && (
                                    <Badge variant="outline" className="text-xs">
                                      {email.case}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1">
                                  {email.starred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                                  {email.attachments.length > 0 && <Paperclip className="h-4 w-4 text-gray-500" />}
                                  <span className="text-xs text-muted-foreground">{formatDate(email.created_at)}</span>
                                </div>
                              </div>

                              <h3 className={`text-sm ${!email.read ? "font-semibold" : ""}`}>{email.subject}</h3>

                              <p className="text-sm text-muted-foreground line-clamp-2">{email.text_content}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); handleDeleteEmail(email) }} title="Delete Email">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Email Details */}
            <div className="space-y-4">
              {selectedEmail ? (
                <>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Email Details</CardTitle>
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEmailAction(selectedEmail.id, selectedEmail.starred ? 'unstar' : 'star')}
                          >
                            <Star className={`h-4 w-4 ${selectedEmail.starred ? 'text-yellow-500 fill-current' : ''}`} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEmailAction(selectedEmail.id, 'archive')}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEmailAction(selectedEmail.id, 'delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {selectedEmail.sender_name?.split(" ").map((n) => n[0]).join("") || selectedEmail.from_email[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{selectedEmail.sender_name || selectedEmail.from_email}</p>
                            <p className="text-sm text-muted-foreground">{selectedEmail.from_email}</p>
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          <p>To: {selectedEmail.to_email}</p>
                          <p>Date: {formatDate(selectedEmail.created_at)}</p>
                          {selectedEmail.cc_emails && <p>CC: {selectedEmail.cc_emails}</p>}
                        </div>
                      </div>

                      <div className="space-y-2">
                                              <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{selectedEmail.subject}</h3>
                        {selectedEmail.priority && (
                          <Badge variant={getPriorityColor(selectedEmail.priority)}>{selectedEmail.priority}</Badge>
                        )}
                      </div>
                        <div className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">
                          {selectedEmail.html_content || selectedEmail.text_content}
                        </div>
                      </div>

                      {selectedEmail.attachments.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium">Attachments</h4>
                          <div className="space-y-1">
                            {selectedEmail.attachments.map((attachment) => (
                              <div key={attachment.id} className="flex items-center space-x-2 text-sm">
                                <Paperclip className="h-4 w-4" />
                                <span>{attachment.filename}</span>
                                <span className="text-muted-foreground">({Math.round(attachment.file_size / 1024)}KB)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => setReplyOpen(true)}>
                          <Reply className="h-4 w-4 mr-2" />
                          Reply
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setForwardOpen(true)}>
                          <Forward className="h-4 w-4 mr-2" />
                          Forward
                        </Button>
                        {!selectedEmail.case && (
                          <Button variant="outline" size="sm" onClick={() => setCreateCaseOpen(true)}>
                            Create Case
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <div className="text-muted-foreground">Select an email to view details</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          {/* {emails.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <span>Page {page} of {totalPages} ({totalCount} emails)</span>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={page === 1}>Prev</Button>
                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={page === totalPages}>Next</Button>
              </div>
            </div>
          )} */}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Sent Emails</CardTitle>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input 
                        placeholder="Search sent emails..." 
                        className="pl-10 w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                  ) : emails.filter(email => email.status === 'sent').length === 0 ? (
                    <div className="text-center py-8">
                      <SendIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-muted-foreground">No sent emails found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {emails.filter(email => email.status === 'sent').map((email) => (
                        <div
                          key={email.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedEmail?.id === email.id ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                          }`}
                          onClick={() => setSelectedEmail(email)}
                        >
                          <div className="flex items-start space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {email.to_email[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">{email.to_email}</span>
                                  <Badge variant="outline" className="text-xs">Sent</Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">{formatDate(email.created_at)}</span>
                              </div>

                              <h3 className="text-sm font-medium">{email.subject}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-2">{email.text_content}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); handleDeleteEmail(email) }} title="Delete Email">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {selectedEmail ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Email Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {selectedEmail.to_email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">To: {selectedEmail.to_email}</p>
                          <p className="text-sm text-muted-foreground">Sent: {formatDate(selectedEmail.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{selectedEmail.subject}</h3>
                        <Badge variant={getPriorityColor(selectedEmail.priority)}>{selectedEmail.priority}</Badge>
                        <Badge variant={selectedEmail.status === 'sent' ? 'default' : 'secondary'}>
                          {selectedEmail.status}
                        </Badge>
                      </div>
                      <div className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">
                        {selectedEmail.html_content || selectedEmail.text_content}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <SendIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <div className="text-muted-foreground">Select an email to view details</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          {/* {emails.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <span>Page {page} of {totalPages} ({totalCount} emails)</span>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={page === 1}>Prev</Button>
                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={page === totalPages}>Next</Button>
              </div>
            </div>
          )} */}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Draft Emails</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : emails.filter(email => email.status === 'draft').length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-muted-foreground">No draft emails found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {emails.filter(email => email.status === 'draft').map((email) => (
                    <div
                      key={email.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedEmail?.id === email.id ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                      }`}
                      onClick={() => openCompose(email)}
                    >
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {email.to_email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{email.to_email}</span>
                              <Badge variant="outline" className="text-xs">Draft</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">{formatDate(email.created_at)}</span>
                          </div>

                          <h3 className="text-sm font-medium">{email.subject}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{email.text_content}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); handleDeleteEmail(email) }} title="Delete Email">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        
      </Tabs>

      {/* Reply Dialog */}
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply to Email</DialogTitle>
            <DialogDescription>Send a reply to this email</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reply-subject">Subject</Label>
              <Input
                id="reply-subject"
                value={replyData.subject}
                onChange={(e) => setReplyData({ ...replyData, subject: e.target.value })}
                placeholder="Reply subject"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reply-content">Message</Label>
              <Textarea
                id="reply-content"
                value={replyData.content}
                onChange={(e) => setReplyData({ ...replyData, content: e.target.value })}
                placeholder="Type your reply..."
                rows={6}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reply-cc">CC</Label>
                <Input
                  id="reply-cc"
                  value={replyData.cc_emails}
                  onChange={(e) => setReplyData({ ...replyData, cc_emails: e.target.value })}
                  placeholder="cc@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reply-bcc">BCC</Label>
                <Input
                  id="reply-bcc"
                  value={replyData.bcc_emails}
                  onChange={(e) => setReplyData({ ...replyData, bcc_emails: e.target.value })}
                  placeholder="bcc@example.com"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setReplyOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleReply}>
                <Send className="h-4 w-4 mr-2" />
                Send Reply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Forward Dialog */}
      <Dialog open={forwardOpen} onOpenChange={setForwardOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Forward Email</DialogTitle>
            <DialogDescription>Forward this email to another recipient</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forward-to">To *</Label>
              <Input
                id="forward-to"
                value={forwardData.to_email}
                onChange={(e) => setForwardData({ ...forwardData, to_email: e.target.value })}
                placeholder="recipient@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="forward-subject">Subject</Label>
              <Input
                id="forward-subject"
                value={forwardData.subject}
                onChange={(e) => setForwardData({ ...forwardData, subject: e.target.value })}
                placeholder="Forward subject"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="forward-message">Message (optional)</Label>
              <Textarea
                id="forward-message"
                value={forwardData.message}
                onChange={(e) => setForwardData({ ...forwardData, message: e.target.value })}
                placeholder="Add a message before forwarding..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="forward-cc">CC</Label>
                <Input
                  id="forward-cc"
                  value={forwardData.cc_emails}
                  onChange={(e) => setForwardData({ ...forwardData, cc_emails: e.target.value })}
                  placeholder="cc@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="forward-bcc">BCC</Label>
                <Input
                  id="forward-bcc"
                  value={forwardData.bcc_emails}
                  onChange={(e) => setForwardData({ ...forwardData, bcc_emails: e.target.value })}
                  placeholder="bcc@example.com"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setForwardOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleForward}>
                <Send className="h-4 w-4 mr-2" />
                Forward
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Case Dialog */}
      <Dialog open={createCaseOpen} onOpenChange={setCreateCaseOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Case from Email</DialogTitle>
            <DialogDescription>Create a new support case from this email</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="case-title">Title *</Label>
              <Input
                id="case-title"
                value={caseData.title}
                onChange={(e) => setCaseData({ ...caseData, title: e.target.value })}
                placeholder="Case title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="case-description">Description</Label>
              <Textarea
                id="case-description"
                value={caseData.description}
                onChange={(e) => setCaseData({ ...caseData, description: e.target.value })}
                placeholder="Case description"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="case-category">Category</Label>
                <Select value={caseData.category} onValueChange={(value) => setCaseData({ ...caseData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="Billing">Billing</SelectItem>
                    <SelectItem value="General">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="case-priority">Priority</Label>
                <Select value={caseData.priority} onValueChange={(value) => setCaseData({ ...caseData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="case-customer">Customer *</Label>
                <Select value={caseData.customer} onValueChange={(value) => setCaseData({ ...caseData, customer: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id.toString()}>
                        {contact.first_name} {contact.last_name} ({contact.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="case-company">Company</Label>
                <Select value={caseData.company} onValueChange={(value) => setCaseData({ ...caseData, company: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setCreateCaseOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCase}>
                Create Case
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <ConfirmDialogContent>
          <ConfirmDialogHeader>
            <ConfirmDialogTitle>Delete Email</ConfirmDialogTitle>
            <ConfirmDialogDescription>
              Are you sure you want to delete this email? This action cannot be undone.
            </ConfirmDialogDescription>
          </ConfirmDialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteEmail}>Delete</Button>
          </div>
        </ConfirmDialogContent>
      </ConfirmDialog>
    </div>
  )
}
