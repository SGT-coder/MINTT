"use client"

import { useState, useEffect } from "react"
import { Plus, Settings, TestTube, CheckCircle, XCircle, Edit, Trash2, Mail, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { apiService, UserEmailConfig, CreateUserEmailConfigData, EmailProvider } from "@/lib/api"

export default function EmailConfigManagement() {
  const [configs, setConfigs] = useState<UserEmailConfig[]>([])
  const [providers, setProviders] = useState<EmailProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<number | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<UserEmailConfig | null>(null)
  
  const [formData, setFormData] = useState<CreateUserEmailConfigData>({
    provider: '',
    email_address: '',
    display_name: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    use_tls: true,
    use_ssl: false,
    imap_host: '',
    imap_port: 993,
    imap_username: '',
    imap_password: '',
    use_imap_ssl: true,
  })

  const { toast } = useToast()

  // Load configurations and providers
  const loadData = async () => {
    try {
      setLoading(true)
      const [configsRes, providersRes] = await Promise.all([
        apiService.getUserEmailConfigs(),
        apiService.getEmailProviders()
      ])
      
      setConfigs(configsRes.results)
      setProviders(providersRes)
    } catch (error) {
      console.error("Error loading email configurations:", error)
      toast({
        title: "Error",
        description: "Failed to load email configurations",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Handle provider selection
  const handleProviderChange = (providerValue: string) => {
    const provider = providers.find(p => p.value === providerValue)
    if (provider) {
      setFormData(prev => ({
        ...prev,
        provider: provider.value,
        smtp_host: provider.smtp_host,
        smtp_port: provider.smtp_port,
        imap_host: provider.imap_host,
        imap_port: provider.imap_port,
        use_tls: provider.use_tls,
        use_ssl: provider.use_ssl,
        use_imap_ssl: true,
      }))
    }
  }

  // Handle form submission
  const handleSubmit = async () => {
    try {
      if (editingConfig) {
        await apiService.updateUserEmailConfig(editingConfig.id, formData)
        toast({
          title: "Success",
          description: "Email configuration updated successfully",
        })
      } else {
        await apiService.createUserEmailConfig(formData)
        toast({
          title: "Success",
          description: "Email configuration created successfully",
        })
      }
      
      setConfigOpen(false)
      setEditingConfig(null)
      resetForm()
      loadData()
    } catch (error) {
      console.error("Error saving email configuration:", error)
      toast({
        title: "Error",
        description: "Failed to save email configuration",
        variant: "destructive",
      })
    }
  }

  // Handle configuration deletion
  const handleDelete = async (configId: number) => {
    try {
      await apiService.deleteUserEmailConfig(configId)
      toast({
        title: "Success",
        description: "Email configuration deleted successfully",
      })
      loadData()
    } catch (error) {
      console.error("Error deleting email configuration:", error)
      toast({
        title: "Error",
        description: "Failed to delete email configuration",
        variant: "destructive",
      })
    }
  }

  // Handle connection testing
  const handleTestConnection = async (configId: number, testType: 'smtp' | 'imap' | 'both') => {
    try {
      setTesting(configId)
      const result = await apiService.testEmailConfig(configId, testType)
      
      const hasErrors = Object.values(result.results).some(r => r.status !== 'success')
      
      toast({
        title: hasErrors ? "Test Completed with Issues" : "Test Successful",
        description: Object.values(result.results).map(r => r.message).join(', '),
        variant: hasErrors ? "destructive" : "default",
      })
      
      loadData() // Refresh to get updated verification status
    } catch (error) {
      console.error("Error testing connection:", error)
      toast({
        title: "Error",
        description: "Failed to test connection",
        variant: "destructive",
      })
    } finally {
      setTesting(null)
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      provider: '',
      email_address: '',
      display_name: '',
      smtp_host: '',
      smtp_port: 587,
      smtp_username: '',
      smtp_password: '',
      use_tls: true,
      use_ssl: false,
      imap_host: '',
      imap_port: 993,
      imap_username: '',
      imap_password: '',
      use_imap_ssl: true,
    })
  }

  // Open edit dialog
  const openEditDialog = (config: UserEmailConfig) => {
    setEditingConfig(config)
    setFormData({
      provider: config.provider,
      email_address: config.email_address,
      display_name: config.display_name,
      smtp_host: config.smtp_host,
      smtp_port: config.smtp_port,
      smtp_username: config.smtp_username,
      smtp_password: config.smtp_password,
      use_tls: config.use_tls,
      use_ssl: config.use_ssl,
      imap_host: config.imap_host,
      imap_port: config.imap_port,
      imap_username: config.imap_username,
      imap_password: config.imap_password,
      use_imap_ssl: config.use_imap_ssl,
    })
    setConfigOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Email Configuration</h1>
          <p className="text-muted-foreground">Manage your email account connections</p>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Dialog open={configOpen} onOpenChange={setConfigOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingConfig(null); resetForm(); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Email Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingConfig ? 'Edit Email Configuration' : 'Add Email Configuration'}
                </DialogTitle>
                <DialogDescription>
                  Configure your email account for sending and receiving emails
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                  <TabsTrigger value="smtp">SMTP Settings</TabsTrigger>
                  <TabsTrigger value="imap">IMAP Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="provider">Email Provider *</Label>
                      <Select value={formData.provider} onValueChange={handleProviderChange}>
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
                    
                    <div className="space-y-2">
                      <Label htmlFor="email_address">Email Address *</Label>
                      <Input
                        id="email_address"
                        value={formData.email_address}
                        onChange={(e) => setFormData(prev => ({ ...prev, email_address: e.target.value }))}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input
                      id="display_name"
                      value={formData.display_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                      placeholder="Your Name"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="smtp" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp_host">SMTP Host *</Label>
                      <Input
                        id="smtp_host"
                        value={formData.smtp_host}
                        onChange={(e) => setFormData(prev => ({ ...prev, smtp_host: e.target.value }))}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="smtp_port">SMTP Port *</Label>
                      <Input
                        id="smtp_port"
                        type="number"
                        value={formData.smtp_port}
                        onChange={(e) => setFormData(prev => ({ ...prev, smtp_port: parseInt(e.target.value) }))}
                        placeholder="587"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp_username">SMTP Username *</Label>
                      <Input
                        id="smtp_username"
                        value={formData.smtp_username}
                        onChange={(e) => setFormData(prev => ({ ...prev, smtp_username: e.target.value }))}
                        placeholder="your@email.com"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="smtp_password">SMTP Password *</Label>
                      <Input
                        id="smtp_password"
                        type="password"
                        value={formData.smtp_password}
                        onChange={(e) => setFormData(prev => ({ ...prev, smtp_password: e.target.value }))}
                        placeholder="Your password or app password"
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="use_tls"
                        checked={formData.use_tls}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, use_tls: !!checked }))}
                      />
                      <Label htmlFor="use_tls">Use TLS</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="use_ssl"
                        checked={formData.use_ssl}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, use_ssl: !!checked }))}
                      />
                      <Label htmlFor="use_ssl">Use SSL</Label>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="imap" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="imap_host">IMAP Host</Label>
                      <Input
                        id="imap_host"
                        value={formData.imap_host}
                        onChange={(e) => setFormData(prev => ({ ...prev, imap_host: e.target.value }))}
                        placeholder="imap.gmail.com"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="imap_port">IMAP Port</Label>
                      <Input
                        id="imap_port"
                        type="number"
                        value={formData.imap_port}
                        onChange={(e) => setFormData(prev => ({ ...prev, imap_port: parseInt(e.target.value) }))}
                        placeholder="993"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="imap_username">IMAP Username</Label>
                      <Input
                        id="imap_username"
                        value={formData.imap_username}
                        onChange={(e) => setFormData(prev => ({ ...prev, imap_username: e.target.value }))}
                        placeholder="your@email.com"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="imap_password">IMAP Password</Label>
                      <Input
                        id="imap_password"
                        type="password"
                        value={formData.imap_password}
                        onChange={(e) => setFormData(prev => ({ ...prev, imap_password: e.target.value }))}
                        placeholder="Your password or app password"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="use_imap_ssl"
                      checked={formData.use_imap_ssl}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, use_imap_ssl: !!checked }))}
                    />
                    <Label htmlFor="use_imap_ssl">Use IMAP SSL</Label>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setConfigOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingConfig ? 'Update' : 'Create'} Configuration
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Email Configurations List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading email configurations...</p>
          </div>
        ) : configs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No email configurations found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Add your first email account to start sending emails
              </p>
            </CardContent>
          </Card>
        ) : (
          configs.map(config => (
            <Card key={config.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h3 className="font-semibold">{config.email_address}</h3>
                      <p className="text-sm text-muted-foreground">
                        {config.display_name || 'No display name'} • {config.provider_display}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      {config.is_verified && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                      {config.is_active && (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestConnection(config.id, 'both')}
                      disabled={testing === config.id}
                    >
                      <TestTube className="h-4 w-4 mr-1" />
                      {testing === config.id ? 'Testing...' : 'Test'}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(config)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(config.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">SMTP:</span> {config.smtp_host}:{config.smtp_port}
                  </div>
                  <div>
                    <span className="font-medium">IMAP:</span> {config.imap_host || 'Not configured'}
                  </div>
                  <div>
                    <span className="font-medium">Last Sync:</span> {config.last_sync ? new Date(config.last_sync).toLocaleDateString() : 'Never'}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span> {new Date(config.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
} 