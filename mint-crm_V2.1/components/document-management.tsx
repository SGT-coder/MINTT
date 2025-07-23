"use client"

import { useState, useEffect } from "react"
import { Upload, Search, Download, Eye, Trash2, FileText, ImageIcon, File, Folder } from "lucide-react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api"

export default function DocumentManagement() {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [newFolder, setNewFolder] = useState("")
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [folders, setFolders] = useState<any[]>([])
  const [selectedFolder, setSelectedFolder] = useState<any>(null)

  useEffect(() => {
    loadDocuments()
    loadFolders()
  }, [])

  const loadDocuments = async () => {
    setLoading(true)
    try {
      const response = await apiService.getDocuments()
      setDocuments(response.results)
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to load documents.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const loadFolders = async () => {
    try {
      const response = await apiService.getFolders()
      setFolders(response.results)
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to load folders.", variant: "destructive" })
    }
  }

  // Update handleFileUpload to support folder upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []) as File[]
    setSelectedFiles(files)
    if (files.length === 0) return
    const formData = new FormData()
    files.forEach((file: File) => {
      formData.append("file", file)
      formData.append("title", file.name)
    })
    if (selectedFolder) {
      formData.append("folder_id", selectedFolder.id)
    }
    setUploadProgress(0)
    setLoading(true)
    try {
      await apiService.uploadDocument(formData)
      setUploadProgress(100)
      toast({ title: "Upload Complete", description: "Document(s) uploaded successfully." })
      setTimeout(() => {
        setUploadOpen(false)
        setSelectedFiles([])
        setUploadProgress(0)
        loadDocuments()
      }, 1000)
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to upload document.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Add handleCreateFolder
  const handleCreateFolder = async () => {
    if (!newFolder.trim()) return
    try {
      await apiService.createFolder({ name: newFolder })
      toast({ title: "Folder Created", description: `Folder '${newFolder}' created successfully.` })
      setNewFolder("")
      loadFolders()
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create folder.", variant: "destructive" })
    }
  }

  const getFileUrl = (doc: any) => doc.file // Assumes backend returns a 'file' field with the file URL

  const handleDownload = (docId: number) => {
    const doc = documents.find((d) => d.id === docId)
    if (!doc) return
    const url = getFileUrl(doc)
    if (url) {
      const link = document.createElement('a')
      link.href = url
      link.download = doc.title || doc.name || 'document'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      toast({ title: 'Error', description: 'File URL not available.', variant: 'destructive' })
    }
  }

  const handleDelete = async (docId: number) => {
    setLoading(true)
    try {
      await apiService.deleteDocument(docId)
      toast({ title: "Deleted", description: "Document deleted successfully." })
      loadDocuments()
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete document.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = (docId: number) => {
    const doc = documents.find((d) => d.id === docId)
    if (!doc) return
    const url = getFileUrl(doc)
    if (url) {
      window.open(url, '_blank')
    } else {
      toast({ title: 'Error', description: 'File URL not available.', variant: 'destructive' })
    }
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="h-8 w-8 text-red-500" />
      case "image":
        return <ImageIcon className="h-8 w-8 text-blue-500" />
      case "document":
        return <File className="h-8 w-8 text-blue-600" />
      default:
        return <File className="h-8 w-8 text-gray-500" />
    }
  }

  // Filtered documents based on search and type
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !search ||
      (doc.title && doc.title.toLowerCase().includes(search.toLowerCase())) ||
      (doc.description && doc.description.toLowerCase().includes(search.toLowerCase()))
    const matchesType = typeFilter === "all" || doc.file_type === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Document Management</h1>
          <p className="text-muted-foreground">Upload, organize, and manage documents</p>
        </div>

        <div className="flex space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Folder className="h-4 w-4 mr-2" />
                New Folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogDescription>Create a new folder to organize documents</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="folderName">Folder Name</Label>
                  <Input
                    id="folderName"
                    value={newFolder}
                    onChange={(e) => setNewFolder(e.target.value)}
                    placeholder="Enter folder name"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setNewFolder("")}>Cancel</Button>
                  <Button onClick={handleCreateFolder}>Create Folder</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Documents
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload Documents</DialogTitle>
                <DialogDescription>Upload files to the document library</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Folder selection for upload */}
                <div className="space-y-2">
                  <Label>Select Folder (optional)</Label>
                  <Select value={selectedFolder ? selectedFolder.id.toString() : "none"} onValueChange={val => setSelectedFolder(val === "none" ? null : folders.find(f => f.id.toString() === val))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select folder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Folder</SelectItem>
                      {folders.map(folder => (
                        <SelectItem key={folder.id} value={folder.id.toString()}>{folder.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Supports PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, GIF (Max 10MB each)
                  </p>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
                  />
                  <Button asChild>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      Select Files
                    </label>
                  </Button>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Selected Files:</h4>
                    {selectedFiles.map((file: File, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    ))}

                    {uploadProgress > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} />
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical Documentation</SelectItem>
                        <SelectItem value="procedures">Procedures</SelectItem>
                        <SelectItem value="diagrams">Diagrams</SelectItem>
                        <SelectItem value="manuals">User Manuals</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Related Case (Optional)</Label>
                    <Input placeholder="CASE-001" />
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList>
          <TabsTrigger value="documents">All Documents</TabsTrigger>
          <TabsTrigger value="folders">Folders</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Document Library</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search documents..."
                      className="pl-10 w-64"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="image">Images</SelectItem>
                      <SelectItem value="document">Documents</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocuments
                  .filter(doc => !selectedFolder || (doc.folder && doc.folder.id === selectedFolder.id))
                  .map((doc) => (
                  <Card key={doc.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start space-x-3">
                        {getFileIcon(doc.type)}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{doc.name}</h3>
                          <p className="text-sm text-muted-foreground">{doc.size}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(doc.tags || []).map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="text-sm text-muted-foreground">
                          <p>Category: {doc.category}</p>
                          <p>Uploaded by: {doc.uploadedBy}</p>
                          <p>Date: {doc.uploadDate}</p>
                          {doc.caseId && <p>Case: {doc.caseId}</p>}
                        </div>

                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handlePreview(doc.id)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDownload(doc.id)}>
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(doc.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="folders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Folder Structure</CardTitle>
              <CardDescription>Organize documents into folders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {folders.map((folder) => (
                  <Card key={folder.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedFolder(folder)}>
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-3">
                        <Folder className="h-12 w-12 text-blue-500" />
                        <div>
                          <h3 className="font-semibold">{folder.name}</h3>
                          <p className="text-sm text-muted-foreground">{(documents.filter(doc => doc.folder && doc.folder.id === folder.id)).length} files</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Recently uploaded and modified documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                    {getFileIcon(doc.type)}
                    <div className="flex-1">
                      <h4 className="font-medium">{doc.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Uploaded by {doc.uploadedBy} on {doc.uploadDate}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
