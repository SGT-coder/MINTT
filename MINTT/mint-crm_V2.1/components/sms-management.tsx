"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Send, MessageSquare, Settings, TestTube, CheckCircle, XCircle, Edit, Trash2, RefreshCw, Phone, Archive, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { apiService, SMS, SMSTemplate, UserSMSConfig, CreateSMSData, SendSMSData, CreateUserSMSConfigData, SMSProvider } from "@/lib/api"

export default function SMSManagement() {
  const [activeTab, setActiveTab] = useState("inbox")
  const [smsMessages, setSmsMessages] = useState<SMS[]>([])
  const [templates, setTemplates] = useState<SMSTemplate[]>([])
  const [configs, setConfigs] = useState<UserSMSConfig[]>([])
  const [providers, setProviders] = useState<SMSProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [selectedSMS, setSelectedSMS] = useState<SMS | null>(null)
  
  // Dialog states
  const [composeOpen, setComposeOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null)
  const [editingConfig, setEditingConfig] = useState<UserSMSConfig | null>(null)
  
  // Form states
  const [newSMS, setNewSMS] = useState<SendSMSData>({
    message: "",
    to_number: "",
    from_number: "",
  })
  
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    template_type: "",
    message: "",
    variables: {},
    is_active: true,
  })
  
  const [newConfig, setNewConfig] = useState<CreateUserSMSConfigData>({
    provider: "",
    account_sid: "",
    auth_token: "",
    api_key: "",
    api_secret: "",
    from_number: "",
    webhook_url: "",
  })

  const { toast } = useToast()

  // Load data based on active tab
  const loadData = async () => {
    try {
      setLoading(true)
      
      switch (activeTab) {
        case "inbox":
          const smsRes = await apiService.getSMS({
            search: searchQuery || undefined,
            status: filter === "all" ? undefined : filter,
            ordering: "-created_at"
          })
          setSmsMessages(smsRes.results)
          break
          
        case "templates":
          const templatesRes = await apiService.getSMSTemplates()
          setTemplates(templatesRes.results)
          break
          
        case "config":
          const [configsRes, providersRes] = await Promise.all([
            apiService.getUserSMSConfigs(),
            apiService.getSMSProviders()
          ])
          setConfigs(configsRes.results)
          setProviders(providersRes)
          break
      }
    } catch (error) {
      console.error("Error loading SMS data:", error)
      toast({
        title: "Error",
        description: "Failed to load SMS data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeTab, searchQuery, filter])

  // SMS Actions
  const handleSendSMS = async () => {
    try {
      if (!newSMS.message || !newSMS.to_number) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        return
      }

      await apiService.sendSMS(newSMS)
      
      toast({
        title: "Success",
        description: "SMS sent successfully",
      })

      setComposeOpen(false)
      setNewSMS({
        message: "",
        to_number: "",
        from_number: "",
      })
      
      loadData()
    } catch (error) {
      console.error("Error sending SMS:", error)
      toast({
        title: "Error",
        description: "Failed to send SMS",
        variant: "destructive",
      })
    }
  }

  const handleRetrySMS = async (smsId: number) => {
    try {
      await apiService.retrySMS(smsId)
      toast({
        title: "Success",
        description: "SMS retry initiated",
      })
      loadData()
    } catch (error) {
      console.error("Error retrying SMS:", error)
      toast({
        title: "Error",
        description: "Failed to retry SMS",
        variant: "destructive",
      })
    }
  }

  // Template Actions
  const handleCreateTemplate = async () => {
    try {
      await apiService.createSMSTemplate(newTemplate)
      toast({
        title: "Success",
        description: "SMS template created successfully",
      })
      setTemplateOpen(false)
      setNewTemplate({
        name: "",
        template_type: "",
        message: "",
        variables: {},
        is_active: true,
      })
      loadData()
    } catch (error) {
      console.error("Error creating template:", error)
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTemplate = async (templateId: number) => {
    try {
      await apiService.deleteSMSTemplate(templateId)
      toast({
        title: "Success",
        description: "Template deleted successfully",
      })
      loadData()
    } catch (error) {
      console.error("Error deleting template:", error)
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      })
    }
  }

  // Config Actions
  const handleCreateConfig = async () => {
    try {
      await apiService.createUserSMSConfig(newConfig)
      toast({
        title: "Success",
        description: "SMS configuration created successfully",
      })
      setConfigOpen(false)
      setNewConfig({
        provider: "",
        account_sid: "",
        auth_token: "",
        api_key: "",
        api_secret: "",
        from_number: "",
        webhook_url: "",
      })
      loadData()
    } catch (error) {
      console.error("Error creating config:", error)
      toast({
        title: "Error",
        description: "Failed to create configuration",
        variant: "destructive",
      })
    }
  }

  const handleTestConfig = async (configId: number, testNumber: string) => {
    try {
      await apiService.testSMSConfig(configId, testNumber)
      toast({
        title: "Success",
        description: "SMS configuration test successful",
      })
      loadData()
    } catch (error) {
      console.error("Error testing config:", error)
      toast({
        title: "Error",
        description: "SMS configuration test failed",
        variant: "destructive",
      })
    }
  }

  const handleDeleteConfig = async (configId: number) => {
    try {
      await apiService.deleteUserSMSConfig(configId)
      toast({
        title: "Success",
        description: "SMS configuration deleted successfully",
      })
      loadData()
    } catch (error) {
      console.error("Error deleting config:", error)
      toast({
        title: "Error",
        description: "Failed to delete configuration",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
      case "delivered":
        return "default"
      case "failed":
      case "undelivered":
        return "destructive"
      case "draft":
        return "secondary"
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">SMS Management</h1>
          <p className="text-muted-foreground">Manage SMS communications and notifications</p>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Send SMS
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Send SMS</DialogTitle>
                <DialogDescription>Send a new SMS message</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="to-number">To Number *</Label>
                  <Input
                    id="to-number"
                    value={newSMS.to_number}
                    onChange={(e) => setNewSMS({ ...newSMS, to_number: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="from-number">From Number</Label>
                  <Input
                    id="from-number"
                    value={newSMS.from_number}
                    onChange={(e) => setNewSMS({ ...newSMS, from_number: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={newSMS.message}
                    onChange={(e) => setNewSMS({ ...newSMS, message: e.target.value })}
                    placeholder="Type your message here..."
                    rows={4}
                    maxLength={1600}
                  />
                  <p className="text-sm text-muted-foreground">
                    {newSMS.message.length}/1600 characters
                  </p>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setComposeOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendSMS}>
                    <Send className="h-4 w-4 mr-2" />
                    Send SMS
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inbox" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>SMS Inbox</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center space-x-2">
            <Phone className="h-4 w-4" />
            <span>Templates</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Configuration</span>
          </TabsTrigger>
        </TabsList>

        {/* SMS Inbox */}
        <TabsContent value="inbox" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SMS List */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>SMS Messages</CardTitle>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input 
                          placeholder="Search SMS..." 
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
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
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
                  ) : smsMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-muted-foreground">No SMS messages found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {smsMessages.map((sms) => (
                        <div
                          key={sms.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedSMS?.id === sms.id ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                          }`}
                          onClick={() => setSelectedSMS(sms)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">{sms.to_number}</span>
                                  <Badge variant={getStatusColor(sms.status)} className="text-xs">
                                    {sms.status}
                                  </Badge>
                                  {sms.case && (
                                    <Badge variant="outline" className="text-xs">
                                      {sms.case}
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">{formatDate(sms.created_at)}</span>
                              </div>

                              <p className="text-sm text-muted-foreground line-clamp-2">{sms.message}</p>
                              
                              {sms.is_failed && (
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleRetrySMS(sms.id)
                                    }}
                                  >
                                    Retry
                                  </Button>
                                  <span className="text-xs text-red-600">{sms.error_message}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* SMS Details */}
            <div className="space-y-4">
              {selectedSMS ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">SMS Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium">To:</span> {selectedSMS.to_number}
                      </div>
                      <div>
                        <span className="font-medium">From:</span> {selectedSMS.from_number}
                      </div>
                      <div>
                        <span className="font-medium">Status:</span> 
                        <Badge variant={getStatusColor(selectedSMS.status)} className="ml-2">
                          {selectedSMS.status}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">Date:</span> {formatDate(selectedSMS.created_at)}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold">Message</h3>
                      <div className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">
                        {selectedSMS.message}
                      </div>
                    </div>

                    {selectedSMS.is_failed && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-red-600">Error</h3>
                        <p className="text-sm text-red-600">{selectedSMS.error_message}</p>
                        <Button
                          size="sm"
                          onClick={() => handleRetrySMS(selectedSMS.id)}
                        >
                          Retry SMS
                        </Button>
                      </div>
                    )}

                    {selectedSMS.logs.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold">Activity Log</h3>
                        <div className="space-y-1">
                          {selectedSMS.logs.map((log) => (
                            <div key={log.id} className="text-sm">
                              <span className="font-medium">{log.event}</span> - {formatDate(log.timestamp)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <div className="text-muted-foreground">Select an SMS to view details</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* SMS Templates */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>SMS Templates</CardTitle>
                <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create SMS Template</DialogTitle>
                      <DialogDescription>Create a reusable SMS template</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="template-name">Template Name *</Label>
                        <Input
                          id="template-name"
                          value={newTemplate.name}
                          onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                          placeholder="Template name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="template-type">Template Type *</Label>
                        <Select value={newTemplate.template_type} onValueChange={(value) => setNewTemplate({ ...newTemplate, template_type: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="case_assignment">Case Assignment</SelectItem>
                            <SelectItem value="case_response">Case Response</SelectItem>
                            <SelectItem value="case_escalation">Case Escalation</SelectItem>
                            <SelectItem value="case_resolution">Case Resolution</SelectItem>
                            <SelectItem value="welcome">Welcome SMS</SelectItem>
                            <SelectItem value="notification">General Notification</SelectItem>
                            <SelectItem value="custom">Custom Template</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="template-message">Message *</Label>
                        <Textarea
                          id="template-message"
                          value={newTemplate.message}
                          onChange={(e) => setNewTemplate({ ...newTemplate, message: e.target.value })}
                          placeholder="Template message with variables like {{ customer.name }}"
                          rows={4}
                          maxLength={1600}
                        />
                        <p className="text-sm text-muted-foreground">
                          {newTemplate.message.length}/1600 characters
                        </p>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setTemplateOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateTemplate}>
                          Create Template
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8">
                  <Phone className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-muted-foreground">No SMS templates found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {templates.map((template) => (
                    <Card key={template.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{template.name}</h3>
                            <p className="text-sm text-muted-foreground">{template.template_type}</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteTemplate(template.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{template.message}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant={template.is_active ? "default" : "secondary"}>
                            {template.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Created by {template.created_by.first_name} {template.created_by.last_name}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Configuration */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>SMS Configuration</CardTitle>
                <Dialog open={configOpen} onOpenChange={setConfigOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add SMS Provider
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add SMS Provider</DialogTitle>
                      <DialogDescription>Configure your SMS provider settings</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="provider">Provider *</Label>
                        <Select value={newConfig.provider} onValueChange={(value) => setNewConfig({ ...newConfig, provider: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {providers.map(provider => (
                              <SelectItem key={provider.value} value={provider.value}>
                                {provider.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {newConfig.provider === 'twilio' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="account-sid">Account SID *</Label>
                            <Input
                              id="account-sid"
                              value={newConfig.account_sid}
                              onChange={(e) => setNewConfig({ ...newConfig, account_sid: e.target.value })}
                              placeholder="Your Twilio Account SID"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="auth-token">Auth Token *</Label>
                            <Input
                              id="auth-token"
                              type="password"
                              value={newConfig.auth_token}
                              onChange={(e) => setNewConfig({ ...newConfig, auth_token: e.target.value })}
                              placeholder="Your Twilio Auth Token"
                            />
                          </div>
                        </>
                      )}

                      {(newConfig.provider === 'aws_sns' || newConfig.provider === 'nexmo') && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="api-key">API Key *</Label>
                            <Input
                              id="api-key"
                              value={newConfig.api_key}
                              onChange={(e) => setNewConfig({ ...newConfig, api_key: e.target.value })}
                              placeholder="Your API Key"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="api-secret">API Secret *</Label>
                            <Input
                              id="api-secret"
                              type="password"
                              value={newConfig.api_secret}
                              onChange={(e) => setNewConfig({ ...newConfig, api_secret: e.target.value })}
                              placeholder="Your API Secret"
                            />
                          </div>
                        </>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="from-number">From Number</Label>
                        <Input
                          id="from-number"
                          value={newConfig.from_number}
                          onChange={(e) => setNewConfig({ ...newConfig, from_number: e.target.value })}
                          placeholder="+1234567890"
                        />
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setConfigOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateConfig}>
                          Create Configuration
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : configs.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-muted-foreground">No SMS configurations found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {configs.map((config) => (
                    <Card key={config.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{config.provider_display}</h3>
                            <p className="text-sm text-muted-foreground">{config.from_number}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {config.is_verified && (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTestConfig(config.id, "+1234567890")}
                            >
                              <TestTube className="h-4 w-4 mr-1" />
                              Test
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteConfig(config.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Provider:</span> {config.provider_display}
                          </div>
                          <div>
                            <span className="font-medium">Status:</span> {config.is_active ? "Active" : "Inactive"}
                          </div>
                          <div>
                            <span className="font-medium">Last Sync:</span> {config.last_sync ? new Date(config.last_sync).toLocaleDateString() : "Never"}
                          </div>
                          <div>
                            <span className="font-medium">Created:</span> {new Date(config.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 