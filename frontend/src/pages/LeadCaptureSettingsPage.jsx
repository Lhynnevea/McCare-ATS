import React, { useState, useEffect } from 'react';
import { api } from '../App';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Code,
  Link,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  Settings,
  FileText,
  Activity,
  BarChart3,
  Globe,
  Webhook,
  FormInput,
  Tag,
  Users,
  RefreshCw
} from 'lucide-react';

const SPECIALTIES = ['ICU', 'ER', 'Med-Surg', 'OR', 'Pediatrics', 'NICU', 'L&D', 'Cardiac', 'Oncology', 'Psych'];
const PROVINCES = ['Ontario', 'British Columbia', 'Alberta', 'Quebec', 'Manitoba', 'Saskatchewan', 'Nova Scotia', 'New Brunswick'];
const PIPELINE_STAGES = ['New Lead', 'Contacted', 'Screening Scheduled', 'Application Submitted', 'Interview', 'Offer'];

const LeadCaptureSettingsPage = () => {
  const [settings, setSettings] = useState(null);
  const [embedCode, setEmbedCode] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [intakeStats, setIntakeStats] = useState(null);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddRuleDialog, setShowAddRuleDialog] = useState(false);
  const [newRule, setNewRule] = useState({ field: 'province_preference', value: '', tag: '' });
  const [copiedEndpoint, setCopiedEndpoint] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, embedRes, logsRes, statsRes, usersRes] = await Promise.all([
        api.get('/lead-capture/settings'),
        api.get('/lead-capture/embed-code'),
        api.get('/lead-audit-logs?limit=50'),
        api.get('/lead-intake/stats'),
        api.get('/users')
      ]);
      setSettings(settingsRes.data);
      setEmbedCode(embedRes.data);
      setAuditLogs(logsRes.data);
      setIntakeStats(statsRes.data);
      setRecruiters(usersRes.data.filter(u => u.role === 'Recruiter' || u.role === 'Admin'));
    } catch (error) {
      toast.error('Failed to fetch lead capture settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/lead-capture/settings', settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRule = () => {
    if (!newRule.value || !newRule.tag) {
      toast.error('Please fill in all fields');
      return;
    }
    const updatedRules = [...(settings.auto_tag_rules || []), newRule];
    setSettings({ ...settings, auto_tag_rules: updatedRules });
    setNewRule({ field: 'province_preference', value: '', tag: '' });
    setShowAddRuleDialog(false);
  };

  const handleRemoveRule = (index) => {
    const updatedRules = settings.auto_tag_rules.filter((_, i) => i !== index);
    setSettings({ ...settings, auto_tag_rules: updatedRules });
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedEndpoint(''), 2000);
  };

  const getSourceBadgeColor = (source) => {
    const colors = {
      'HubSpot': 'bg-orange-100 text-orange-700 border-orange-200',
      'ATS Form': 'bg-red-100 text-red-700 border-red-200',
      'API': 'bg-blue-100 text-blue-700 border-blue-200',
      'Landing Page': 'bg-green-100 text-green-700 border-green-200',
      'Website': 'bg-purple-100 text-purple-700 border-purple-200',
      'LinkedIn': 'bg-sky-100 text-sky-700 border-sky-200',
      'Referral': 'bg-teal-100 text-teal-700 border-teal-200',
    };
    return colors[source] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="lead-capture-settings-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Lead Capture</h1>
          <p className="text-slate-500 mt-1">Configure lead intake forms, APIs, and automation rules</p>
        </div>
        <Button onClick={handleSaveSettings} disabled={saving} className="bg-red-600 hover:bg-red-700" data-testid="save-settings-btn">
          {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Leads</p>
                <p className="text-2xl font-bold text-slate-900">{intakeStats?.total_leads || 0}</p>
              </div>
              <Users className="w-8 h-8 text-slate-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Last 7 Days</p>
                <p className="text-2xl font-bold text-green-600">{intakeStats?.last_7_days || 0}</p>
              </div>
              <Activity className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Auto Converted</p>
                <p className="text-2xl font-bold text-teal-600">{intakeStats?.auto_converted_total || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-teal-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Sources Active</p>
                <p className="text-2xl font-bold text-blue-600">{Object.keys(intakeStats?.by_source || {}).length}</p>
              </div>
              <Globe className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="embed" data-testid="tab-embed">
            <Code className="w-4 h-4 mr-2" />
            Embed Form
          </TabsTrigger>
          <TabsTrigger value="api" data-testid="tab-api">
            <Webhook className="w-4 h-4 mr-2" />
            API Endpoints
          </TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">
            <Activity className="w-4 h-4 mr-2" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pipeline Settings */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Pipeline Settings</CardTitle>
                <CardDescription>Configure how new leads enter the pipeline</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default Pipeline Stage</Label>
                  <Select 
                    value={settings?.default_pipeline_stage || 'New Lead'} 
                    onValueChange={(v) => setSettings({ ...settings, default_pipeline_stage: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map(stage => (
                        <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default Owner (Recruiter)</Label>
                  <Select 
                    value={settings?.default_recruiter_id || 'none'} 
                    onValueChange={(v) => setSettings({ ...settings, default_recruiter_id: v === 'none' ? null : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select recruiter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No default owner</SelectItem>
                      {recruiters.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.first_name} {r.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Auto-convert to Candidate</p>
                    <p className="text-xs text-slate-500">Automatically create candidate if all required fields are filled</p>
                  </div>
                  <Switch 
                    checked={settings?.auto_convert_to_candidate || false}
                    onCheckedChange={(v) => setSettings({ ...settings, auto_convert_to_candidate: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Notify on New Lead</p>
                    <p className="text-xs text-slate-500">Send notification when new lead is captured</p>
                  </div>
                  <Switch 
                    checked={settings?.notify_on_new_lead || false}
                    onCheckedChange={(v) => setSettings({ ...settings, notify_on_new_lead: v })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Auto-Tagging Rules */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Auto-Tagging Rules</CardTitle>
                  <CardDescription>Automatically apply tags based on lead data</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowAddRuleDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Rule
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {settings?.auto_tag_rules?.length > 0 ? settings.auto_tag_rules.map((rule, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-slate-400" />
                        <span className="text-sm">
                          If <code className="bg-slate-200 px-1 rounded">{rule.field}</code> = 
                          <code className="bg-slate-200 px-1 rounded ml-1">{rule.value}</code>
                        </span>
                        <span className="text-sm text-slate-500">→</span>
                        <Badge variant="secondary">{rule.tag}</Badge>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-500 h-8 w-8 p-0" onClick={() => handleRemoveRule(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500 text-center py-4">No auto-tagging rules configured</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Source Stats */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Leads by Source</CardTitle>
              <CardDescription>Distribution of leads across different intake sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Object.entries(intakeStats?.by_source || {}).map(([source, count]) => (
                  <div key={source} className="p-3 bg-slate-50 rounded-lg text-center">
                    <Badge className={`${getSourceBadgeColor(source)} border mb-2`}>{source}</Badge>
                    <p className="text-2xl font-bold text-slate-900">{count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Embed Form Tab */}
        <TabsContent value="embed" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FormInput className="w-5 h-5" />
                Embeddable Lead Capture Form
              </CardTitle>
              <CardDescription>
                Copy and paste this code snippet into your website to capture leads directly into McCare ATS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <div className="bg-slate-900 rounded-lg overflow-hidden">
                  <pre className="font-mono text-xs text-slate-100 p-4 h-64 overflow-auto whitespace-pre-wrap">
                    {embedCode?.embed_code || 'Loading embed code...'}
                  </pre>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="absolute top-2 right-2 bg-white"
                  onClick={() => copyToClipboard(embedCode?.embed_code, 'Embed code')}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  {copiedEndpoint === 'Embed code' ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Usage:</strong> Add this code to any webpage where you want to capture leads. 
                  The form automatically captures UTM parameters, referrer URL, and landing page URL.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Form Preview */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Form Preview</CardTitle>
              <CardDescription>This is how the embedded form will look on your website</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md mx-auto p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">First Name *</Label>
                      <Input placeholder="John" className="mt-1" disabled />
                    </div>
                    <div>
                      <Label className="text-sm">Last Name *</Label>
                      <Input placeholder="Doe" className="mt-1" disabled />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm">Email *</Label>
                    <Input type="email" placeholder="john@example.com" className="mt-1" disabled />
                  </div>
                  <div>
                    <Label className="text-sm">Phone</Label>
                    <Input placeholder="+1-416-555-0000" className="mt-1" disabled />
                  </div>
                  <div>
                    <Label className="text-sm">Nursing Specialty</Label>
                    <Select disabled>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Province Preference</Label>
                    <Select disabled>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Message</Label>
                    <Textarea placeholder="Your message..." className="mt-1" disabled />
                  </div>
                  <Button className="w-full bg-red-600" disabled>Submit Application</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Endpoints Tab */}
        <TabsContent value="api" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Webhook className="w-5 h-5" />
                API Endpoints
              </CardTitle>
              <CardDescription>
                Use these endpoints to submit leads from external systems and landing pages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Public Lead API */}
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700">POST</Badge>
                    <span className="font-medium">Public Lead Submission</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(embedCode?.api_endpoint, 'API Endpoint')}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    {copiedEndpoint === 'API Endpoint' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <code className="block text-sm bg-slate-200 p-2 rounded">{embedCode?.api_endpoint}</code>
                <p className="text-xs text-slate-500">For third-party landing pages and external integrations</p>
              </div>

              {/* Form Submit Endpoint */}
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700">POST</Badge>
                    <span className="font-medium">ATS Form Submission</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(embedCode?.form_endpoint, 'Form Endpoint')}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    {copiedEndpoint === 'Form Endpoint' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <code className="block text-sm bg-slate-200 p-2 rounded">{embedCode?.form_endpoint}</code>
                <p className="text-xs text-slate-500">For the embedded ATS lead capture form</p>
              </div>

              {/* HubSpot Webhook */}
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-100 text-orange-700">POST</Badge>
                    <span className="font-medium">HubSpot Webhook</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(embedCode?.hubspot_webhook, 'HubSpot Webhook')}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    {copiedEndpoint === 'HubSpot Webhook' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <code className="block text-sm bg-slate-200 p-2 rounded">{embedCode?.hubspot_webhook}</code>
                <p className="text-xs text-slate-500">Configure this URL in HubSpot workflow webhooks</p>
              </div>

              {/* Landing Page Endpoint */}
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-700">POST</Badge>
                    <span className="font-medium">Landing Page Submission</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(embedCode?.landing_page_endpoint, 'Landing Page Endpoint')}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    {copiedEndpoint === 'Landing Page Endpoint' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <code className="block text-sm bg-slate-200 p-2 rounded">{embedCode?.landing_page_endpoint}</code>
                <p className="text-xs text-slate-500">For custom landing page forms with flexible field mapping</p>
              </div>
            </CardContent>
          </Card>

          {/* API Documentation */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">API Request Example</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X POST "${embedCode?.api_endpoint}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane.doe@example.com",
    "phone": "+1-416-555-1234",
    "specialty": "ICU",
    "province_preference": "Ontario",
    "notes": "Interested in travel nursing",
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "travel-nurse-ontario"
  }'`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Lead Intake Audit Log
              </CardTitle>
              <CardDescription>Track all lead submissions across all sources</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Lead Info</TableHead>
                    <TableHead>Auto Tags</TableHead>
                    <TableHead>Converted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.length > 0 ? auditLogs.map((log) => (
                    <TableRow key={log.id} className="table-row-hover">
                      <TableCell className="text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getSourceBadgeColor(log.source)} border`}>
                          {log.source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{log.payload_summary?.name}</p>
                          <p className="text-xs text-slate-500">{log.payload_summary?.email}</p>
                          {log.payload_summary?.utm_campaign && (
                            <p className="text-xs text-slate-400">Campaign: {log.payload_summary.utm_campaign}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {log.auto_tags_applied?.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                          {(!log.auto_tags_applied || log.auto_tags_applied.length === 0) && (
                            <span className="text-xs text-slate-400">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.auto_converted ? (
                          <Badge className="bg-green-100 text-green-700 border border-green-200">Yes</Badge>
                        ) : (
                          <span className="text-xs text-slate-400">No</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Rule Dialog */}
      <Dialog open={showAddRuleDialog} onOpenChange={setShowAddRuleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Auto-Tagging Rule</DialogTitle>
            <DialogDescription>Create a rule to automatically tag leads based on their data</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Field to Check</Label>
              <Select value={newRule.field} onValueChange={(v) => setNewRule({ ...newRule, field: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="province_preference">Province Preference</SelectItem>
                  <SelectItem value="specialty">Specialty</SelectItem>
                  <SelectItem value="source">Source</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value to Match</Label>
              {newRule.field === 'province_preference' ? (
                <Select value={newRule.value} onValueChange={(v) => setNewRule({ ...newRule, value: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVINCES.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : newRule.field === 'specialty' ? (
                <Select value={newRule.value} onValueChange={(v) => setNewRule({ ...newRule, value: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input 
                  value={newRule.value} 
                  onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                  placeholder="Enter value"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Tag to Apply</Label>
              <Input 
                value={newRule.tag} 
                onChange={(e) => setNewRule({ ...newRule, tag: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                placeholder="e.g., ontario-lead"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRuleDialog(false)}>Cancel</Button>
            <Button onClick={handleAddRule} className="bg-red-600 hover:bg-red-700">Add Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadCaptureSettingsPage;
