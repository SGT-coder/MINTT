import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { apiService, UserEmailConfig } from "@/lib/api"

export default function UserEmailConfigForm() {
  const [config, setConfig] = useState<Partial<UserEmailConfig> & { smtp_password?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    setLoading(true)
    try {
      const res = await apiService.getUserEmailConfigs()
      setConfig(res.results && res.results.length > 0 ? res.results[0] : {
        provider: "gmail",
        email_address: "",
        display_name: "",
        smtp_password: "",
      })
    } catch (e: any) {
      toast({ title: "Failed to load email config", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  function handleChange(field: string, value: any) {
    setConfig((prev: any) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (!config) return
      // Use the same app password for both SMTP and IMAP
      const payload = {
        ...config,
        provider: "gmail",
        smtp_host: "smtp.gmail.com",
        smtp_port: 587,
        smtp_username: config.email_address || "",
        use_tls: true,
        use_ssl: false,
        imap_host: "imap.gmail.com",
        imap_port: 993,
        imap_username: config.email_address || "",
        use_imap_ssl: true,
        smtp_password: config.smtp_password || "",
        imap_password: config.smtp_password || "",
        is_active: true,
        email_address: config.email_address || "",
        display_name: config.display_name || "",
      }
      if (config.id) {
        await apiService.updateUserEmailConfig(config.id, payload)
        toast({ title: "Gmail config updated" })
      } else {
        await apiService.createUserEmailConfig(payload)
        toast({ title: "Gmail config created" })
      }
      await loadConfig()
    } catch (e: any) {
      toast({ title: "Failed to save Gmail config", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    if (!config || !config.id) return
    setTesting(true)
    setTestResult(null)
    try {
      const url = `/api/email-configs/${config.id}/test_connection/`;
      console.log('Testing connection with URL:', url);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_type: "both" })
      })
      const data = await res.json()
      if (res.ok) {
        setTestResult(JSON.stringify(data.results, null, 2))
        toast({ title: "Connection test completed" })
      } else {
        setTestResult(data.error || "Test failed")
        toast({ title: "Connection test failed", description: data.error || "Test failed", variant: "destructive" })
      }
    } catch (e: any) {
      setTestResult(e.message)
      toast({ title: "Connection test failed", description: e.message, variant: "destructive" })
    } finally {
      setTesting(false)
    }
  }

  if (loading || !config) return <div>Loading Gmail config...</div>

  return (
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSave() }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Email Address (Gmail)</Label>
          <Input value={config.email_address || ""} onChange={e => handleChange("email_address", e.target.value)} required autoComplete="username" />
        </div>
        <div className="space-y-2">
          <Label>Display Name</Label>
          <Input value={config.display_name || ""} onChange={e => handleChange("display_name", e.target.value)} />
        </div>
      </div>
      <div className="flex gap-4">
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : (config.id ? "Update" : "Create") + " Gmail Config"}</Button>
        <Button type="button" variant="outline" onClick={handleTest} disabled={testing || !config.id}>{testing ? "Testing..." : "Test Connection"}</Button>
      </div>
      {testResult && <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">{testResult}</pre>}
    </form>
  )
} 