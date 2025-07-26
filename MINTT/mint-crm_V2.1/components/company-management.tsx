"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, Plus, MoreHorizontal, Mail, Phone, Building, MapPin, Edit, Trash2, Eye, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { apiService, Company } from "@/lib/api"

const industryOptions = [
  { value: "technology", label: "Technology" },
  { value: "healthcare", label: "Healthcare" },
  { value: "finance", label: "Finance" },
  { value: "education", label: "Education" },
  { value: "retail", label: "Retail" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "consulting", label: "Consulting" },
  { value: "other", label: "Other" },
]

export default function CompanyManagement() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [industryFilter, setIndustryFilter] = useState("all")
  const [newCompanyOpen, setNewCompanyOpen] = useState(false)
  const [editCompanyOpen, setEditCompanyOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [newCompany, setNewCompany] = useState({
    name: "",
    industry: "other",
    website: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
    description: "",
  })

  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  // Debounced search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    if (searchTimeout) clearTimeout(searchTimeout)
    setSearchTimeout(setTimeout(() => {
      loadCompanies()
    }, 400))
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (searchTimeout) clearTimeout(searchTimeout)
      loadCompanies()
    }
  }

  const handleSearchBlur = () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    loadCompanies()
  }

  // Load companies from API
  const loadCompanies = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = {}
      if (searchTerm) params.search = searchTerm
      if (industryFilter !== "all") params.industry = industryFilter
      
      const response = await apiService.getCompanies(params)
      setCompanies(response.results)
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load companies. Please try again."
      setError(errorMessage)
      toast({ 
        title: "Error Loading Companies", 
        description: errorMessage, 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }, [searchTerm, industryFilter])

  useEffect(() => {
    loadCompanies()
  }, [loadCompanies])

  const handleCreateCompany = async () => {
    if (!newCompany.name) {
      toast({ title: "Validation Error", description: "Company name is required.", variant: "destructive" })
      return
    }

    try {
      setLoading(true)
      await apiService.createCompany(newCompany)
      toast({ title: "Company Created", description: `Company ${newCompany.name} created successfully.` })
      setNewCompanyOpen(false)
      setNewCompany({
        name: "",
        industry: "other",
        website: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        country: "",
        postal_code: "",
        description: "",
      })
      loadCompanies()
    } catch (err: any) {
      const errorMessage = err.message || "Failed to create company. Please try again."
      toast({ title: "Error Creating Company", description: errorMessage, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleEditCompany = async () => {
    if (!selectedCompany) return

    try {
      setLoading(true)
      await apiService.updateCompany(selectedCompany.id, {
        name: selectedCompany.name,
        industry: selectedCompany.industry,
        website: selectedCompany.website,
        phone: selectedCompany.phone,
        address: selectedCompany.address,
        city: selectedCompany.city,
        state: selectedCompany.state,
        country: selectedCompany.country,
        postal_code: selectedCompany.postal_code,
      })
      toast({ title: "Company Updated", description: `Company ${selectedCompany.name} updated successfully.` })
      setEditCompanyOpen(false)
      setSelectedCompany(null)
      loadCompanies()
    } catch (err: any) {
      const errorMessage = err.message || "Failed to update company. Please try again."
      toast({ title: "Error Updating Company", description: errorMessage, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCompany = async (companyId: number) => {
    if (!window.confirm("Are you sure you want to delete this company?")) return
    
    try {
      setLoading(true)
      await apiService.deleteCompany(companyId)
      toast({ title: "Company Deleted", description: "Company deleted successfully." })
      loadCompanies()
    } catch (err: any) {
      const errorMessage = err.message || "Failed to delete company. Please try again."
      toast({ title: "Error Deleting Company", description: errorMessage, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const getIndustryLabel = (industry: string) => {
    return industryOptions.find(opt => opt.value === industry)?.label || industry
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          <p className="text-muted-foreground">Manage company information and relationships</p>
        </div>
        <Button onClick={() => setNewCompanyOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Company
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                ref={searchInputRef}
                placeholder="Search companies by name, industry, or location..."
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                onBlur={handleSearchBlur}
                className="pl-10 pr-10"
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
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {industryOptions.map((industry) => (
                  <SelectItem key={industry.value} value={industry.value}>
                    {industry.label}
                  </SelectItem>
                ))}
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
              <p className="text-muted-foreground">Loading companies...</p>
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
                onClick={loadCompanies}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Companies Grid */}
      {!loading && !error && companies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <Card key={company.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {company.name.split(' ').map(word => word[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{company.name}</CardTitle>
                      <CardDescription>{getIndustryLabel(company.industry)}</CardDescription>
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
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelectedCompany(company); setEditCompanyOpen(true); }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Company
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDeleteCompany(company.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Company
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {company.website && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{company.website}</span>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{company.phone}</span>
                    </div>
                  )}
                  {(company.city || company.state || company.country) && (
                    <div className="flex items-center space-x-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">
                        {[company.city, company.state, company.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Badge variant={company.is_customer ? "default" : "secondary"}>
                      {company.is_customer ? "Customer" : "Prospect"}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Created: {new Date(company.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && companies.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm || industryFilter !== "all" 
                  ? "No companies found matching your criteria." 
                  : "No companies found. Create your first company to get started."
                }
              </p>
              {!searchTerm && industryFilter === "all" && (
                <Button 
                  className="mt-4"
                  onClick={() => setNewCompanyOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Company
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Company Dialog */}
      <Dialog open={newCompanyOpen} onOpenChange={setNewCompanyOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Company</DialogTitle>
            <DialogDescription>Add a new company to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  placeholder="Acme Corporation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select
                  value={newCompany.industry}
                  onValueChange={(value) => setNewCompany({ ...newCompany, industry: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industryOptions.map((industry) => (
                      <SelectItem key={industry.value} value={industry.value}>
                        {industry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={newCompany.website}
                  onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newCompany.phone}
                  onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={newCompany.address}
                onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={newCompany.city}
                  onChange={(e) => setNewCompany({ ...newCompany, city: e.target.value })}
                  placeholder="New York"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={newCompany.state}
                  onChange={(e) => setNewCompany({ ...newCompany, state: e.target.value })}
                  placeholder="NY"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  value={newCompany.postal_code}
                  onChange={(e) => setNewCompany({ ...newCompany, postal_code: e.target.value })}
                  placeholder="10001"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={newCompany.country}
                onChange={(e) => setNewCompany({ ...newCompany, country: e.target.value })}
                placeholder="United States"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newCompany.description}
                onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
                placeholder="Brief description of the company..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setNewCompanyOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCompany}>Create Company</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog open={editCompanyOpen} onOpenChange={setEditCompanyOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>Update company information</DialogDescription>
          </DialogHeader>
          {selectedCompany && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_company_name">Company Name *</Label>
                  <Input
                    id="edit_company_name"
                    value={selectedCompany.name}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_industry">Industry</Label>
                  <Select
                    value={selectedCompany.industry}
                    onValueChange={(value) => setSelectedCompany({ ...selectedCompany, industry: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industryOptions.map((industry) => (
                        <SelectItem key={industry.value} value={industry.value}>
                          {industry.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_website">Website</Label>
                  <Input
                    id="edit_website"
                    value={selectedCompany.website || ""}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, website: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_phone">Phone</Label>
                  <Input
                    id="edit_phone"
                    value={selectedCompany.phone || ""}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_address">Address</Label>
                <Textarea
                  id="edit_address"
                  value={selectedCompany.address || ""}
                  onChange={(e) => setSelectedCompany({ ...selectedCompany, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_city">City</Label>
                  <Input
                    id="edit_city"
                    value={selectedCompany.city || ""}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_state">State</Label>
                  <Input
                    id="edit_state"
                    value={selectedCompany.state || ""}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, state: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_postal_code">Postal Code</Label>
                  <Input
                    id="edit_postal_code"
                    value={selectedCompany.postal_code || ""}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, postal_code: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_country">Country</Label>
                <Input
                  id="edit_country"
                  value={selectedCompany.country || ""}
                  onChange={(e) => setSelectedCompany({ ...selectedCompany, country: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditCompanyOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEditCompany}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 