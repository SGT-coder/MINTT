"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Plus, MoreHorizontal, Mail, Phone, Building, MapPin, Edit, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { apiService, Contact } from "@/lib/api"
import ContactRegistration from "./contact-registration"

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showContactRegistration, setShowContactRegistration] = useState(false)

  // Load contacts from API
  const loadContacts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = {}
      if (searchTerm) params.search = searchTerm
      if (statusFilter !== "all") {
        if (statusFilter === "active") params.is_customer = true
        if (statusFilter === "inactive") params.is_prospect = true
      }
      
      const response = await apiService.getContacts(params)
      setContacts(response.results)
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load contacts. Please try again."
      setError(errorMessage)
      toast({ 
        title: "Error Loading Contacts", 
        description: errorMessage, 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }, [searchTerm, statusFilter])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  const handleDeleteContact = async (contactId: number) => {
    if (!window.confirm("Are you sure you want to delete this contact?")) return
    
    try {
      setLoading(true)
      await apiService.deleteContact(contactId)
      toast({ title: "Contact Deleted", description: "Contact deleted successfully." })
      loadContacts()
    } catch (err: any) {
      const errorMessage = err.message || "Failed to delete contact. Please try again."
      toast({ title: "Error Deleting Contact", description: errorMessage, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const getContactStatus = (contact: Contact) => {
    if (contact.is_customer) return "Customer"
    if (contact.is_prospect) return "Prospect"
    return "Lead"
  }

  const getContactStatusColor = (contact: Contact) => {
    if (contact.is_customer) return "default"
    if (contact.is_prospect) return "secondary"
    return "outline"
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">Manage customer contacts and relationships</p>
        </div>
        <Button onClick={() => setShowContactRegistration(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Contact
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search contacts by name, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contacts</SelectItem>
                <SelectItem value="active">Customers</SelectItem>
                <SelectItem value="inactive">Prospects</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading and Error States */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading contacts...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && !loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={loadContacts}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contacts Grid */}
      {!loading && !error && contacts.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contacts.map((contact) => (
          <Card key={contact.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {contact.first_name[0]}{contact.last_name[0]}
                      </AvatarFallback>
                  </Avatar>
                  <div>
                      <CardTitle className="text-lg">
                        {contact.first_name} {contact.last_name}
                      </CardTitle>
                      <CardDescription>{contact.job_title || "No title"}</CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Contact
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Building className="h-4 w-4 mr-2" />
                        Create Case
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDeleteContact(contact.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Contact
                      </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                  {contact.company && (
                <div className="flex items-center space-x-2 text-sm">
                  <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{contact.company.name}</span>
                </div>
                  )}
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{contact.email}</span>
                </div>
                  {contact.phone && (
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{contact.phone}</span>
                </div>
                  )}
                  {contact.department && (
                <div className="flex items-center space-x-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{contact.department}</span>
                </div>
                  )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-2">
                    <Badge variant={getContactStatusColor(contact)}>
                      {getContactStatus(contact)}
                    </Badge>
                </div>
                  <span className="text-xs text-muted-foreground">
                    Created: {new Date(contact.created_at).toLocaleDateString()}
                  </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Empty State */}
      {!loading && !error && contacts.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" 
                  ? "No contacts found matching your criteria." 
                  : "No contacts found. Create your first contact to get started."
                }
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button 
                  className="mt-4"
                  onClick={() => setShowContactRegistration(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Contact
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact Registration Dialog */}
      {showContactRegistration && (
        <ContactRegistration />
      )}
    </div>
  )
}
