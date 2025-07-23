"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Plus, Search, Edit, Shield, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import { apiService, User } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

const roleOptions = [
  { value: "admin", label: "Administrator" },
  { value: "manager", label: "Manager" },
  { value: "agent", label: "Support Agent" },
  { value: "customer", label: "Customer" },
]

export default function UserManagement() {
  // All hooks must be at the top!
  const { user: currentUser, isAuthenticated } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newUserOpen, setNewUserOpen] = useState(false)
  const [editUserOpen, setEditUserOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "agent",
    department: "",
    password: "",
    password_confirm: "",
  })
  const [editUser, setEditUser] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [manageRolesOpen, setManageRolesOpen] = useState(false)

  // Compute user counts per role
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    roleOptions.forEach(r => { counts[r.value] = 0 })
    users.forEach(u => { if (u.role) counts[u.role] = (counts[u.role] || 0) + 1 })
    return counts
  }, [users])

  // Fetch users from API
  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = { page, ordering: "-date_joined" }
      if (search) params.search = search
      if (roleFilter) params.role = roleFilter
      const response = await apiService.getUsers(params)
      setUsers(response.results)
      setTotal(response.count)
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load users. Please try again."
      setError(errorMessage)
      toast({ 
        title: "Error Loading Users", 
        description: errorMessage, 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, page])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // Handlers
  const handleCreateUser = async () => {
    if (!newUser.first_name || !newUser.last_name || !newUser.email || !newUser.password || !newUser.password_confirm) {
      toast({ title: "Validation Error", description: "All fields are required.", variant: "destructive" })
      return
    }
    if (newUser.password !== newUser.password_confirm) {
      toast({ title: "Validation Error", description: "Passwords do not match.", variant: "destructive" })
      return
    }
    try {
      setLoading(true)
      await apiService.signup({
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        email: newUser.email,
        password: newUser.password,
        password_confirm: newUser.password_confirm,
        role: newUser.role,
        company: "",
      })
      toast({ title: "User Created", description: `User ${newUser.email} created successfully.` })
    setNewUserOpen(false)
    setNewUser({
        first_name: "",
        last_name: "",
      email: "",
      phone: "",
        role: "agent",
      department: "",
      password: "",
        password_confirm: "",
      })
      loadUsers()
    } catch (err: any) {
      const errorMessage = err.message || "Failed to create user. Please try again."
      toast({ title: "Error Creating User", description: errorMessage, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = async () => {
    if (!editUser) return
    try {
      setLoading(true)
      await apiService.updateUser(editUser.id, {
        first_name: editUser.first_name,
        last_name: editUser.last_name,
        role: editUser.role,
        is_active: editUser.is_active,
        department: editUser.department,
      })
      toast({ title: "User Updated", description: `User ${editUser.email} updated successfully.` })
      setEditUserOpen(false)
      setEditUser(null)
      loadUsers()
    } catch (err: any) {
      const errorMessage = err.message || "Failed to update user. Please try again."
      toast({ title: "Error Updating User", description: errorMessage, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return
    try {
      setLoading(true)
      await apiService.deleteUser(userId)
      toast({ title: "User Deleted", description: `User deleted successfully.` })
      loadUsers()
    } catch (err: any) {
      const errorMessage = err.message || "Failed to delete user. Please try again."
      toast({ title: "Error Deleting User", description: errorMessage, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // UI rendering (list, dialogs, forms, etc.) would go here, using users state and handlers above
  // Add error and loading state rendering
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts, roles, and permissions</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={newUserOpen} onOpenChange={setNewUserOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>Add a new user to the system</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={newUser.first_name}
                      onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={newUser.last_name}
                      onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
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
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="john.doe@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={newUser.department}
                      onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                      placeholder="Support"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password_confirm">Confirm Password</Label>
                    <Input
                      id="password_confirm"
                      type="password"
                      value={newUser.password_confirm}
                      onChange={(e) => setNewUser({ ...newUser, password_confirm: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setNewUserOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUser}>Create User</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={manageRolesOpen} onOpenChange={setManageRolesOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                Manage Roles
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Manage Roles</DialogTitle>
                <DialogDescription>View and change user roles. Only admins can change roles.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {roleOptions.map(role => (
                  <div key={role.value} className="border-b pb-2 mb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{role.label}</div>
                        <div className="text-xs text-muted-foreground">{role.value}</div>
                      </div>
                      <Badge>{roleCounts[role.value] || 0} users</Badge>
                    </div>
                    {/* List users for this role and allow role change */}
                    <div className="mt-2 space-y-1">
                      {users.filter(u => u.role === role.value).map(u => (
                        <div key={u.id} className="flex items-center gap-2 pl-2">
                          <span>{u.first_name} {u.last_name} ({u.email})</span>
                          <Select
                            value={u.role}
                            onValueChange={async (newRole) => {
                              try {
                                setLoading(true);
                                await apiService.updateUser(u.id, { role: newRole });
                                toast({ title: "Role Updated", description: `${u.email} is now ${newRole}.` });
                                loadUsers();
                              } catch (err: any) {
                                const errorMessage = err.message || "Failed to update role. Please try again."
                                toast({ title: "Error Updating Role", description: errorMessage, variant: "destructive" });
                              } finally {
                                setLoading(false);
                              }
                            }}
                            disabled={currentUser?.role !== "admin" || u.id === currentUser?.id}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roleOptions.map((r) => (
                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search users..."
              className="pl-10 w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadUsers()}
            />
          </div>
          <Select
            value={roleFilter === "" ? "all" : roleFilter}
            onValueChange={val => setRoleFilter(val === "all" ? "" : val)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roleOptions.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Pagination controls could go here */}
      </div>
      {/* User List */}
      {error && <div className="text-red-500">{error}</div>}
      {loading && <div className="text-muted-foreground">Loading users...</div>}
      {!loading && users.length === 0 && !error && (
        <div className="text-muted-foreground">No users found.</div>
      )}
      {!loading && users.length > 0 && (
          <div className="space-y-4">
            {users.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {user.first_name[0]}{user.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{user.first_name} {user.last_name}</CardTitle>
                    <CardDescription>
                      <Select
                        value={user.role}
                        onValueChange={async (newRole) => {
                          try {
                            setLoading(true);
                            await apiService.updateUser(user.id, { role: newRole });
                            toast({ title: "Role Updated", description: `${user.email} is now ${newRole}.` });
                            loadUsers();
                          } catch (err: any) {
                            const errorMessage = err.message || "Failed to update role. Please try again."
                            toast({ title: "Error Updating Role", description: errorMessage, variant: "destructive" });
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={currentUser?.role !== "admin" || user.id === currentUser?.id}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardDescription>
                    </div>
                      </div>
                <div className="flex gap-2 items-center">
                  <Button variant="outline" size="sm" onClick={() => { setEditUser(user); setEditUserOpen(true); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteUser(user.id)}>
                    Delete
                  </Button>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={user.is_active}
                      onCheckedChange={async (checked) => {
                        try {
                          setLoading(true);
                          await apiService.updateUser(user.id, { is_active: checked });
                          toast({ title: checked ? "User Activated" : "User Deactivated", description: `${user.email} is now ${checked ? "active" : "inactive"}.` });
                          loadUsers();
                        } catch (err: any) {
                          const errorMessage = err.message || "Failed to update user status. Please try again."
                          toast({ title: "Error Updating Status", description: errorMessage, variant: "destructive" });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={currentUser?.role !== "admin" || user.id === currentUser?.id}
                    />
                    <Badge variant={user.is_active ? "default" : "secondary"}>{user.is_active ? "Active" : "Inactive"}</Badge>
                      </div>
                    </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 md:gap-8 text-sm">
                  <div className="flex-1">
                    <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span>{user.email}</span></div>
                    <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span>{user.phone || "-"}</span></div>
                    </div>
                  <div className="flex-1">
                    <div>Department: {user.department || "-"}</div>
                    <div>Date Joined: {user.date_joined ? new Date(user.date_joined).toLocaleDateString() : "-"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Edit User Dialog */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details and role</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_first_name">First Name</Label>
                  <Input
                    id="edit_first_name"
                    value={editUser.first_name}
                    onChange={(e) => setEditUser({ ...editUser, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_last_name">Last Name</Label>
                  <Input
                    id="edit_last_name"
                    value={editUser.last_name}
                    onChange={(e) => setEditUser({ ...editUser, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_role">Role</Label>
                  <Select
                  value={editUser.role}
                  onValueChange={(value) => setEditUser({ ...editUser, role: value })}
                  disabled={currentUser?.role !== "admin" || editUser.id === currentUser?.id}
                  >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_department">Department</Label>
                <Input
                  id="edit_department"
                  value={editUser.department || ""}
                  onChange={(e) => setEditUser({ ...editUser, department: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="edit_is_active">Active</Label>
                <Switch
                  id="edit_is_active"
                  checked={editUser.is_active}
                  onCheckedChange={(checked) => setEditUser({ ...editUser, is_active: checked })}
                  disabled={currentUser?.role !== "admin" || editUser.id === currentUser?.id}
                />
                {currentUser?.role !== "admin" && editUser.id === currentUser?.id && (
                  <span className="text-xs text-muted-foreground">(You cannot change your own role or activation status)</span>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditUserOpen(false)}>
                  Cancel
                  </Button>
                <Button onClick={handleEditUser}>Save Changes</Button>
              </div>
          </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
