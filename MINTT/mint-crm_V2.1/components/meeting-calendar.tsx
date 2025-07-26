"use client"

import { useState, useEffect } from "react"
import { Plus, Calendar, Clock, Users, Video, MapPin, Search, RefreshCw } from "lucide-react"
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
  DialogClose,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiService, Meeting as ApiMeeting, User } from "@/lib/api"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, getDate, getMonth, getYear } from "date-fns"

// Extend Meeting type to include recurrence fields for UI
type Meeting = ApiMeeting & {
  recurrence_pattern?: string;
  recurrence_end_date?: string;
}

export default function MeetingCalendar() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMeetingOpen, setNewMeetingOpen] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [newMeeting, setNewMeeting] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    duration: "60",
    type: "internal",
    location: "",
    attendees: [] as number[],
    meetingLink: "",
    is_recurring: false,
    recurrence_pattern: "none",
    recurrence_end_date: "",
  })
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editMeeting, setEditMeeting] = useState<any>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterOrganizer, setFilterOrganizer] = useState("")
  const [filterDate, setFilterDate] = useState("")
  const [calendarDate, setCalendarDate] = useState(new Date())

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [meetingsRes, usersRes] = await Promise.all([
        apiService.getMeetings(),
        apiService.getUsers(),
      ])
      setMeetings(meetingsRes.results)
      setUsers(usersRes.results)
    } catch (e: any) {
      setError(e.message || "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateMeeting() {
    setCreating(true)
    setError(null)
    try {
      // Compose start_time and end_time from date, time, duration
      const start_time = newMeeting.date && newMeeting.time
        ? new Date(`${newMeeting.date}T${newMeeting.time}`)
        : null
      const end_time = start_time
        ? new Date(start_time.getTime() + Number(newMeeting.duration) * 60000)
        : null
      if (!start_time || !end_time) throw new Error("Please provide date and time")
      const payload = {
        title: newMeeting.title,
        description: newMeeting.description,
        meeting_type: newMeeting.type,
        start_time: start_time.toISOString(),
        end_time: end_time.toISOString(),
        location: newMeeting.location,
        location_type: newMeeting.location?.toLowerCase().includes("virtual") ? "virtual" : "physical",
        meeting_url: newMeeting.meetingLink,
        attendee_ids: newMeeting.attendees,
        is_recurring: newMeeting.is_recurring,
        recurrence_pattern: newMeeting.is_recurring ? newMeeting.recurrence_pattern : "none",
        recurrence_end_date: newMeeting.is_recurring && newMeeting.recurrence_end_date ? newMeeting.recurrence_end_date : null,
      }
      const created = await apiService.createMeeting(payload)
      setMeetings((prev) => [created, ...prev])
      setNewMeetingOpen(false)
      setNewMeeting({
        title: "",
        description: "",
        date: "",
        time: "",
        duration: "60",
        type: "internal",
        location: "",
        attendees: [],
        meetingLink: "",
        is_recurring: false,
        recurrence_pattern: "none",
        recurrence_end_date: "",
      })
    } catch (e: any) {
      setError(e.message || "Failed to create meeting")
    } finally {
      setCreating(false)
    }
  }

  function openDetails(meeting: Meeting) {
    setSelectedMeeting(meeting)
    setDetailsOpen(true)
    setEditMode(false)
    setEditMeeting(null)
  }

  function openEdit(meeting: Meeting) {
    setEditMode(true)
    setEditMeeting({
      ...meeting,
      date: meeting.start_time ? meeting.start_time.slice(0, 10) : "",
      time: meeting.start_time ? new Date(meeting.start_time).toISOString().slice(11, 16) : "",
      duration: meeting.duration_minutes ? String(meeting.duration_minutes) : "60",
      attendees: meeting.attendees ? meeting.attendees.map((u: any) => u.id) : [],
      meetingLink: meeting.meeting_url || "",
      is_recurring: meeting.is_recurring || false,
      recurrence_pattern: meeting.recurrence_pattern || "none",
      recurrence_end_date: meeting.recurrence_end_date ? meeting.recurrence_end_date.slice(0, 10) : "",
    })
  }

  async function handleUpdateMeeting() {
    if (!selectedMeeting || !editMeeting) return
    setEditLoading(true)
    setError(null)
    try {
      const start_time = editMeeting.date && editMeeting.time
        ? new Date(`${editMeeting.date}T${editMeeting.time}`)
        : null
      const end_time = start_time
        ? new Date(start_time.getTime() + Number(editMeeting.duration) * 60000)
        : null
      if (!start_time || !end_time) throw new Error("Please provide date and time")
      // Merge all required fields from selectedMeeting and editMeeting
      const payload = {
        title: editMeeting.title,
        description: editMeeting.description,
        meeting_type: editMeeting.type,
        status: selectedMeeting.status || 'scheduled',
        priority: selectedMeeting.priority || 'medium',
        start_time: start_time.toISOString(),
        end_time: end_time.toISOString(),
        timezone: selectedMeeting.timezone || 'UTC',
        all_day: selectedMeeting.all_day || false,
        location: editMeeting.location,
        location_type: editMeeting.location?.toLowerCase().includes("virtual") ? "virtual" : "physical",
        meeting_url: editMeeting.meetingLink,
        category: selectedMeeting.category?.id ?? null,
        case: typeof selectedMeeting.case === 'object' && selectedMeeting.case !== null ? selectedMeeting.case.id : (typeof selectedMeeting.case === 'number' ? selectedMeeting.case : null),
        contact: typeof selectedMeeting.contact === 'object' && selectedMeeting.contact !== null ? selectedMeeting.contact.id : (typeof selectedMeeting.contact === 'number' ? selectedMeeting.contact : null),
        company: typeof selectedMeeting.company === 'object' && selectedMeeting.company !== null ? selectedMeeting.company.id : (typeof selectedMeeting.company === 'number' ? selectedMeeting.company : null),
        is_recurring: editMeeting.is_recurring,
        recurrence_pattern: editMeeting.is_recurring ? editMeeting.recurrence_pattern : "none",
        recurrence_end_date: editMeeting.is_recurring && editMeeting.recurrence_end_date ? editMeeting.recurrence_end_date : null,
        recurrence_rule: selectedMeeting.recurrence_rule || {},
        reminder_minutes: selectedMeeting.reminder_minutes || 15,
        send_reminders: selectedMeeting.send_reminders || true,
        agenda: selectedMeeting.agenda || '',
        notes: selectedMeeting.notes || '',
        outcome: selectedMeeting.outcome || '',
        is_private: selectedMeeting.is_private || false,
        attendee_ids: editMeeting.attendees,
      }
      const updated = await apiService.updateMeeting(selectedMeeting.id, payload)
      setMeetings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
      setEditMode(false)
      setEditMeeting(null)
      setDetailsOpen(false)
      setSelectedMeeting(updated)
    } catch (e: any) {
      setError(e.message || "Failed to update meeting")
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDeleteMeeting() {
    if (!selectedMeeting) return
    setDeleteLoading(true)
    setError(null)
    try {
      await apiService.deleteMeeting(selectedMeeting.id)
      setMeetings((prev) => prev.filter((m) => m.id !== selectedMeeting.id))
      setDetailsOpen(false)
      setSelectedMeeting(null)
    } catch (e: any) {
      setError(e.message || "Failed to delete meeting")
    } finally {
      setDeleteLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "default"
      case "in_progress":
        return "secondary"
      case "completed":
        return "outline"
      case "cancelled":
        return "destructive"
      default:
        return "outline"
    }
  }

  // Filtered meetings
  const filteredMeetings = meetings.filter((meeting) => {
    // Search by title, description, or attendee
    const searchLower = search.toLowerCase()
    const matchesSearch =
      meeting.title.toLowerCase().includes(searchLower) ||
      meeting.description?.toLowerCase().includes(searchLower) ||
      (meeting.attendees && meeting.attendees.some((a: any) => `${a.first_name} ${a.last_name}`.toLowerCase().includes(searchLower)))
    // Filter by type
    const matchesType = filterType ? meeting.meeting_type === filterType : true
    // Filter by status
    const matchesStatus = filterStatus ? meeting.status === filterStatus : true
    // Filter by organizer
    const matchesOrganizer = filterOrganizer ? `${meeting.organizer?.id}` === filterOrganizer : true
    // Filter by date (YYYY-MM-DD)
    const matchesDate = filterDate ? meeting.start_time.slice(0, 10) === filterDate : true
    return matchesSearch && matchesType && matchesStatus && matchesOrganizer && matchesDate
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Meeting & Calendar</h1>
          <p className="text-muted-foreground">Schedule meetings and manage calendar events</p>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Dialog open={newMeetingOpen} onOpenChange={setNewMeetingOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule New Meeting</DialogTitle>
                <DialogDescription>Create a new meeting and invite attendees</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Meeting Title</Label>
                  <Input
                    id="title"
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                    placeholder="Weekly team meeting"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newMeeting.description}
                    onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                    placeholder="Meeting agenda and objectives..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newMeeting.date}
                      onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={newMeeting.time}
                      onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (min)</Label>
                    <Select
                      value={newMeeting.duration}
                      onValueChange={(value) => setNewMeeting({ ...newMeeting, duration: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Meeting Type</Label>
                    <Select
                      value={newMeeting.type}
                      onValueChange={(value) => setNewMeeting({ ...newMeeting, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Team Meeting</SelectItem>
                        <SelectItem value="client">Client Meeting</SelectItem>
                        <SelectItem value="review">Review Meeting</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={newMeeting.location}
                      onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
                      placeholder="Conference Room A or Virtual"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meetingLink">Meeting Link (Optional)</Label>
                  <Input
                    id="meetingLink"
                    value={newMeeting.meetingLink}
                    onChange={(e) => setNewMeeting({ ...newMeeting, meetingLink: e.target.value })}
                    placeholder="https://meet.company.com/room/..."
                  />
                </div>
                {/* Recurrence options */}
                <div className="space-y-2">
                  <Label>Recurrence</Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id="is_recurring"
                      checked={newMeeting.is_recurring}
                      onChange={e => setNewMeeting({ ...newMeeting, is_recurring: e.target.checked, recurrence_pattern: e.target.checked ? "weekly" : "none" })}
                    />
                    <Label htmlFor="is_recurring">Repeat</Label>
                    {newMeeting.is_recurring && (
                      <Select value={newMeeting.recurrence_pattern} onValueChange={v => setNewMeeting({ ...newMeeting, recurrence_pattern: v })}>
                        <SelectTrigger className="w-32"><SelectValue placeholder="Pattern" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {newMeeting.is_recurring && (
                      <div className="flex items-center gap-2">
                        <Label htmlFor="recurrence_end_date">End Date</Label>
                        <Input
                          id="recurrence_end_date"
                          type="date"
                          value={newMeeting.recurrence_end_date}
                          onChange={e => setNewMeeting({ ...newMeeting, recurrence_end_date: e.target.value })}
                          className="w-36"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Attendees</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`user-${user.id}`}
                          checked={newMeeting.attendees.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewMeeting((prev) => ({ ...prev, attendees: [...prev.attendees, user.id] }))
                            } else {
                              setNewMeeting((prev) => ({ ...prev, attendees: prev.attendees.filter((id) => id !== user.id) }))
                            }
                          }}
                        />
                        <Label htmlFor={`user-${user.id}`} className="text-sm">
                          {user.first_name} {user.last_name} ({user.email})
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setNewMeetingOpen(false)} disabled={creating}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateMeeting} disabled={creating}>
                    {creating ? "Scheduling..." : "Schedule Meeting"}
                  </Button>
                </div>
                {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="meetings">All Meetings</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
              <CardDescription>View and manage scheduled meetings</CardDescription>
              <div className="flex items-center gap-4 mt-2">
                <Button variant="ghost" size="sm" onClick={() => setCalendarDate(subMonths(calendarDate, 1))}>&lt; Prev</Button>
                <span className="font-semibold">{format(calendarDate, 'MMMM yyyy')}</span>
                <Button variant="ghost" size="sm" onClick={() => setCalendarDate(addMonths(calendarDate, 1))}>Next &gt;</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="p-2 text-center font-medium text-sm bg-gray-100 rounded">
                    {day}
                  </div>
                ))}
              </div>
              {/* Dynamic calendar grid with month navigation */}
              <div className="grid grid-cols-7 gap-2">
                {(() => {
                  const monthStart = startOfMonth(calendarDate)
                  const monthEnd = endOfMonth(calendarDate)
                  const startDate = startOfWeek(monthStart)
                  const endDate = endOfWeek(monthEnd)
                  const days: JSX.Element[] = []
                  let day = startDate
                  let idx = 0
                  while (day <= endDate) {
                    const isCurrentMonth = isSameMonth(day, monthStart)
                    const dayMeetings = meetings.filter(m => {
                      const d = new Date(m.start_time)
                      return isSameDay(d, day)
                    })
                    days.push(
                      <div
                        key={day.toISOString()}
                        className={`p-2 h-24 border rounded text-sm flex flex-col ${isCurrentMonth ? "bg-white" : "bg-gray-50"} ${dayMeetings.length ? "bg-blue-50 border-blue-200" : ""}`}
                      >
                        <div className="font-medium">{getDate(day)}</div>
                        <div className="flex-1 overflow-y-auto">
                          {dayMeetings.map((m) => (
                            <div key={m.id} className="text-xs bg-blue-500 text-white px-1 rounded truncate mt-1 cursor-pointer" onClick={() => openDetails(m)}>
                              {m.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                    day = addDays(day, 1)
                    idx++
                  }
                  return days
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>All Meetings</CardTitle>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search meetings..."
                      className="pl-10 w-48"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <Select value={filterType} onValueChange={v => setFilterType(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="internal">Team</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={v => setFilterStatus(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterOrganizer} onValueChange={v => setFilterOrganizer(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="Organizer" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Organizers</SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={String(u.id)}>{u.first_name} {u.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    className="w-36"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                  />
                  <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterType(""); setFilterStatus(""); setFilterOrganizer(""); setFilterDate(""); }}>Clear</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => openDetails(meeting)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{meeting.title}</h3>
                          <Badge variant={getStatusColor(meeting.status)}>{meeting.status}</Badge>
                          <Badge variant="outline">{meeting.meeting_type}</Badge>
                          {meeting.is_recurring && (
                            <Badge variant="secondary">Repeats {meeting.recurrence_pattern ?? ''}</Badge>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground">{meeting.description}</p>

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(meeting.start_time).toLocaleDateString()} at {new Date(meeting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{meeting.duration_minutes || "-"} min</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{meeting.location}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">Organizer:</span>
                          <span className="text-sm font-medium">{meeting.organizer?.first_name} {meeting.organizer?.last_name}</span>
                          <span className="text-sm text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">{meeting.attendees?.length || 0} attendees</span>
                        </div>
                      </div>

                      {meeting.meeting_url && (
                        <Button variant="outline" size="sm">
                          <Video className="h-4 w-4 mr-2" />
                          Join
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {filteredMeetings.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">No meetings found.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Meetings</CardTitle>
              <CardDescription>Your scheduled meetings for the next 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredMeetings
                  .filter((m) => m.status === "scheduled" && new Date(m.start_time) > new Date())
                  .map((meeting) => (
                    <div key={meeting.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="text-center">
                        <div className="text-lg font-bold">{new Date(meeting.start_time).getDate()}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(meeting.start_time).toLocaleDateString("en", { month: "short" })}
                        </div>
                      </div>

                      <div className="flex-1 space-y-1">
                        <h3 className="font-semibold">{meeting.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{new Date(meeting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>•</span>
                          <span>{meeting.duration_minutes || "-"} min</span>
                          <span>•</span>
                          <span>{meeting.location}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {meeting.attendees?.slice(0, 3).map((attendee) => (
                            <Avatar key={attendee.id} className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {attendee.first_name?.[0]}{attendee.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {meeting.attendees && meeting.attendees.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{meeting.attendees.length - 3} more</span>
                          )}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        {meeting.meeting_url && (
                          <Button variant="outline" size="sm">
                            <Video className="h-4 w-4 mr-2" />
                            Join
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                {filteredMeetings.filter((m) => m.status === "scheduled" && new Date(m.start_time) > new Date()).length === 0 && (
                  <div className="text-center text-muted-foreground py-8">No upcoming meetings found.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      {/* Details/Edit Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          {!editMode && selectedMeeting && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedMeeting.title}</DialogTitle>
                <DialogDescription>
                  {selectedMeeting.description}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusColor(selectedMeeting.status)}>{selectedMeeting.status}</Badge>
                  <Badge variant="outline">{selectedMeeting.meeting_type}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(selectedMeeting.start_time).toLocaleString()} - {new Date(selectedMeeting.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-sm">Location: {selectedMeeting.location}</div>
                <div className="text-sm">Organizer: {selectedMeeting.organizer?.first_name} {selectedMeeting.organizer?.last_name}</div>
                <div className="text-sm">Attendees: {selectedMeeting.attendees?.map((u: any) => `${u.first_name} ${u.last_name}`).join(", ")}</div>
                {selectedMeeting.is_recurring && (
                  <div className="text-sm">Recurrence: Repeats {selectedMeeting.recurrence_pattern ?? ''}{selectedMeeting.recurrence_end_date ? ` until ${selectedMeeting.recurrence_end_date}` : ''}</div>
                )}
                {selectedMeeting.meeting_url && (
                  <div className="text-sm">Meeting Link: <a href={selectedMeeting.meeting_url} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">{selectedMeeting.meeting_url}</a></div>
                )}
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={() => openEdit(selectedMeeting)}>
                  Edit
                </Button>
                <Button variant="destructive" onClick={handleDeleteMeeting} disabled={deleteLoading}>
                  {deleteLoading ? "Deleting..." : "Delete"}
                </Button>
                <DialogClose asChild>
                  <Button variant="secondary">Close</Button>
                </DialogClose>
              </div>
              {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
            </>
          )}
          {editMode && editMeeting && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Meeting</DialogTitle>
                <DialogDescription>Update meeting details</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Meeting Title</Label>
                  <Input
                    id="edit-title"
                    value={editMeeting.title}
                    onChange={(e) => setEditMeeting({ ...editMeeting, title: e.target.value })}
                    placeholder="Meeting title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editMeeting.description}
                    onChange={(e) => setEditMeeting({ ...editMeeting, description: e.target.value })}
                    placeholder="Meeting agenda and objectives..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-date">Date</Label>
                    <Input
                      id="edit-date"
                      type="date"
                      value={editMeeting.date}
                      onChange={(e) => setEditMeeting({ ...editMeeting, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-time">Time</Label>
                    <Input
                      id="edit-time"
                      type="time"
                      value={editMeeting.time}
                      onChange={(e) => setEditMeeting({ ...editMeeting, time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-duration">Duration (min)</Label>
                    <Select
                      value={editMeeting.duration}
                      onValueChange={(value) => setEditMeeting({ ...editMeeting, duration: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-type">Meeting Type</Label>
                    <Select
                      value={editMeeting.type}
                      onValueChange={(value) => setEditMeeting({ ...editMeeting, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Team Meeting</SelectItem>
                        <SelectItem value="client">Client Meeting</SelectItem>
                        <SelectItem value="review">Review Meeting</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-location">Location</Label>
                    <Input
                      id="edit-location"
                      value={editMeeting.location}
                      onChange={(e) => setEditMeeting({ ...editMeeting, location: e.target.value })}
                      placeholder="Conference Room A or Virtual"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-meetingLink">Meeting Link (Optional)</Label>
                  <Input
                    id="edit-meetingLink"
                    value={editMeeting.meetingLink}
                    onChange={(e) => setEditMeeting({ ...editMeeting, meetingLink: e.target.value })}
                    placeholder="https://meet.company.com/room/..."
                  />
                </div>
                {/* Recurrence options for edit */}
                <div className="space-y-2">
                  <Label>Recurrence</Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id="edit-is_recurring"
                      checked={editMeeting.is_recurring}
                      onChange={e => setEditMeeting({ ...editMeeting, is_recurring: e.target.checked, recurrence_pattern: e.target.checked ? "weekly" : "none" })}
                    />
                    <Label htmlFor="edit-is_recurring">Repeat</Label>
                    {editMeeting.is_recurring && (
                      <Select value={editMeeting.recurrence_pattern} onValueChange={v => setEditMeeting({ ...editMeeting, recurrence_pattern: v })}>
                        <SelectTrigger className="w-32"><SelectValue placeholder="Pattern" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {editMeeting.is_recurring && (
                      <div className="flex items-center gap-2">
                        <Label htmlFor="edit-recurrence_end_date">End Date</Label>
                        <Input
                          id="edit-recurrence_end_date"
                          type="date"
                          value={editMeeting.recurrence_end_date}
                          onChange={e => setEditMeeting({ ...editMeeting, recurrence_end_date: e.target.value })}
                          className="w-36"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Attendees</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`edit-user-${user.id}`}
                          checked={editMeeting.attendees.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditMeeting((prev: any) => ({ ...prev, attendees: [...prev.attendees, user.id] }))
                            } else {
                              setEditMeeting((prev: any) => ({ ...prev, attendees: prev.attendees.filter((id: number) => id !== user.id) }))
                            }
                          }}
                        />
                        <Label htmlFor={`edit-user-${user.id}`} className="text-sm">
                          {user.first_name} {user.last_name} ({user.email})
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setEditMode(false)} disabled={editLoading}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateMeeting} disabled={editLoading}>
                    {editLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
                {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
