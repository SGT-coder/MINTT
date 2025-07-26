"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { toast } from "@/hooks/use-toast"
import { Plus, Search, Edit, Trash2, Building, Mail, Phone, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiService, Contact, Company } from "@/lib/api"

export default function ContactRegistration() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [newContactOpen, setNewContactOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [newContact, setNewContact] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
    position: "",
    department: "",
    address: "",
    notes: "",
  })
  const [showAllActivity, setShowAllActivity] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  const loadContacts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = {}
      if (search) params.search = search
      const response = await apiService.getContacts(params)
      setContacts(response.results)
    } catch (err: any) {
      setError(err.message || "Failed to load contacts.")
    } finally {
      setLoading(false)
    }
  }, [search])

  const loadCompanies = useCallback(async () => {
    try {
      const response = await apiService.getCompanies({})
      setCompanies(response.results)
    } catch {
      setCompanies([])
    }
  }, [])

  useEffect(() => {
    loadContacts()
    loadCompanies()
  }, [loadContacts, loadCompanies])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Contacts for recent activity:', contacts);
    }
  }, [contacts]);

  const handleCreateContact = async () => {
    try {
      setLoading(true)
      await apiService.createContact({
        first_name: newContact.first_name,
        last_name: newContact.last_name,
        email: newContact.email,
        phone: newContact.phone,
        company: newContact.company ? companies.find(c => c.id === Number(newContact.company)) : undefined,
        job_title: newContact.position,
        department: newContact.department,
        address: newContact.address,
        notes: newContact.notes,
      })
      toast({ title: "Contact Created", description: `Contact ${newContact.email} created successfully.` })
    setNewContactOpen(false)
    setNewContact({
        first_name: "",
        last_name: "",
      email: "",
      phone: "",
      company: "",
      position: "",
      department: "",
      address: "",
      notes: "",
      })
      loadContacts()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateContact = async (contactId: number, updates: any) => {
    try {
      setLoading(true)
      await apiService.updateContact(contactId, updates)
      toast({ title: "Contact Updated", description: `Contact updated successfully.` })
      loadContacts()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteContact = async (contactId: number) => {
    if (!window.confirm("Are you sure you want to delete this contact?")) return
    try {
      setLoading(true)
      await apiService.deleteContact(contactId)
      toast({ title: "Contact Deleted", description: `Contact deleted successfully.` })
      loadContacts()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Debounced search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    if (searchTimeout) clearTimeout(searchTimeout)
    setSearchTimeout(setTimeout(() => {
      loadContacts()
    }, 400))
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (searchTimeout) clearTimeout(searchTimeout)
      loadContacts()
    }
  }

  const handleSearchBlur = () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    loadContacts()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Contact Registration</h1>
          <p className="text-muted-foreground">Register and manage customer contacts</p>
        </div>

        <Dialog open={newContactOpen} onOpenChange={setNewContactOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Register New Contact</DialogTitle>
              <DialogDescription>Add a new customer contact to the system</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={newContact.first_name}
                    onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={newContact.last_name}
                    onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    placeholder="john.doe@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Select
                    value={newContact.company}
                    onValueChange={(value) => setNewContact({ ...newContact, company: value })}
                  >
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={newContact.address}
                    onChange={(e) => setNewContact({ ...newContact, address: e.target.value })}
                    placeholder="123 Business Street, City, State 12345"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={newContact.position}
                    onChange={(e) => setNewContact({ ...newContact, position: e.target.value })}
                    placeholder="IT Director"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={newContact.department}
                    onChange={(e) => setNewContact({ ...newContact, department: e.target.value })}
                    placeholder="Information Technology"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newContact.notes}
                  onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                  placeholder="Additional notes about this contact..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setNewContactOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateContact}>Register Contact</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="contacts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="contacts">All Contacts</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Contact Directory</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search contacts..."
                    className="pl-10 w-64 pr-10"
                    value={search}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchKeyDown}
                    onBlur={handleSearchBlur}
                  />
                  {loading && (
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                  <p>Loading contacts...</p>
                ) : error ? (
                  <p className="text-red-500">{error}</p>
                ) : contacts.length === 0 ? (
                  <p>No contacts found.</p>
                ) : (
                  contacts.map((contact) => (
                  <Card key={contact.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback>
                                {[contact.first_name, contact.last_name].filter(Boolean).map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                              <CardTitle className="text-lg">{contact.first_name} {contact.last_name}</CardTitle>
                              <CardDescription>{contact.job_title}</CardDescription>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedContact(contact)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteContact(contact.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <Building className="h-4 w-4 text-muted-foreground" />
                            <span>{contact.company?.name || "N/A"}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{contact.phone}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Directory</CardTitle>
              <CardDescription>Manage customer companies and organizations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <p>Loading companies...</p>
                ) : error ? (
                  <p className="text-red-500">{error}</p>
                ) : companies.length === 0 ? (
                  <p>No companies found.</p>
                ) : (
                  companies.map((company) => (
                  <div key={company.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {company.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{company.name}</h3>
                        <p className="text-sm text-muted-foreground">{company.industry}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
                          {contacts.filter((c) => c.company?.id === company.id).length} contacts
                      </span>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Contact Activity</CardTitle>
              <CardDescription>Latest interactions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contacts.length === 0 ? (
                  <p>No recent activity found.</p>
                ) : (
                  <>
                    {([...contacts]
                      .sort((a, b) => {
                        const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
                        const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
                        return dateB - dateA;
                      })
                      .slice(0, showAllActivity ? contacts.length : 5)
                    ).map((contact) => {
                      let dateLabel = 'Unknown date';
                      const dateStr = contact.updated_at || contact.created_at;
                      if (dateStr) {
                        const dateObj = new Date(dateStr);
                        dateLabel = isNaN(dateObj.getTime()) ? 'Unknown date' : dateObj.toLocaleString();
                      }
                      return (
                        <div key={contact.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                          {/* Avatar with initials, large, bold, colored, circular, with border */}
                          <div
                            className="flex items-center justify-center rounded-full border-2 border-gray-300 bg-blue-100"
                            style={{ width: 56, height: 56, minWidth: 56, minHeight: 56 }}
                          >
                            <span className="text-2xl font-bold text-blue-700 select-none">
                              {[contact.first_name, contact.last_name].filter(Boolean).map(n => n[0]).join("")}
                            </span>
                          </div>
                          {/* Name and activity info */}
                  <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-2xl text-gray-900">{contact.first_name} {contact.last_name}</span>
                            </div>
                            <div className="text-base font-medium mt-1">
                              {(contact.created_at === contact.updated_at || !contact.updated_at) ? 'added' : 'updated'}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {dateLabel} • {contact.email}
                  </div>
                </div>
                  </div>
                      )
                    })}
                    {contacts.length > 5 && (
                      <div className="flex justify-center mt-2">
                        <Button variant="outline" size="sm" onClick={() => setShowAllActivity(v => !v)}>
                          {showAllActivity ? 'Show less' : 'Show more'}
                        </Button>
                </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
