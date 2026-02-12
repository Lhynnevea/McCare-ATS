import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Bell, Mail, Clock, Shield, AlertTriangle, CheckCircle, X, Plus, Loader2, Play, FileText } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningCheck, setRunningCheck] = useState(false);
  const [logs, setLogs] = useState([]);
  const [newFallbackEmail, setNewFallbackEmail] = useState('');
  const [newComplianceEmail, setNewComplianceEmail] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchLogs();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/notifications/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
    } catch (error) {
      toast.error('Failed to load notification settings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/notifications/logs?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/api/notifications/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Notification settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const runCredentialCheck = async () => {
    setRunningCheck(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/api/notifications/check-expiring-credentials`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Credential check complete: ${response.data.notifications_sent} notifications sent`);
      fetchLogs();
    } catch (error) {
      toast.error('Failed to run credential check');
      console.error(error);
    } finally {
      setRunningCheck(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleThreshold = (threshold) => {
    const current = settings.expiring_thresholds || [];
    const updated = current.includes(threshold)
      ? current.filter(t => t !== threshold)
      : [...current, threshold].sort((a, b) => b - a);
    updateSetting('expiring_thresholds', updated);
  };

  const addFallbackEmail = () => {
    if (newFallbackEmail && !settings.new_lead_fallback_emails?.includes(newFallbackEmail)) {
      updateSetting('new_lead_fallback_emails', [...(settings.new_lead_fallback_emails || []), newFallbackEmail]);
      setNewFallbackEmail('');
    }
  };

  const removeFallbackEmail = (email) => {
    updateSetting('new_lead_fallback_emails', settings.new_lead_fallback_emails.filter(e => e !== email));
  };

  const addComplianceEmail = () => {
    if (newComplianceEmail && !settings.compliance_emails?.includes(newComplianceEmail)) {
      updateSetting('compliance_emails', [...(settings.compliance_emails || []), newComplianceEmail]);
      setNewComplianceEmail('');
    }
  };

  const removeComplianceEmail = (email) => {
    updateSetting('compliance_emails', settings.compliance_emails.filter(e => e !== email));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="notification-settings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Notification Settings</h1>
          <p className="text-slate-600 mt-1">Configure email and in-app notifications</p>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="bg-red-600 hover:bg-red-700">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Save Settings
        </Button>
      </div>

      {/* Demo Mode Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
        <div>
          <p className="font-medium text-amber-800">Demo Mode Active</p>
          <p className="text-amber-700 text-sm">
            Emails are logged but not actually sent. Configure SendGrid, AWS SES, or Mailgun credentials to enable real email delivery.
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="general" className="data-[state=active]:bg-white">
            <Bell className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="new-lead" className="data-[state=active]:bg-white">
            <Mail className="w-4 h-4 mr-2" />
            New Leads
          </TabsTrigger>
          <TabsTrigger value="credentials" className="data-[state=active]:bg-white">
            <Shield className="w-4 h-4 mr-2" />
            Credentials
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-white">
            <FileText className="w-4 h-4 mr-2" />
            Email Logs
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Global Settings</CardTitle>
                <CardDescription>Master controls for the notification system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Enable Notifications</Label>
                    <p className="text-sm text-slate-500">Turn all notifications on or off</p>
                  </div>
                  <Switch
                    checked={settings.enabled}
                    onCheckedChange={(checked) => updateSetting('enabled', checked)}
                  />
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Sender Name</Label>
                    <Input
                      value={settings.sender_name || ''}
                      onChange={(e) => updateSetting('sender_name', e.target.value)}
                      placeholder="McCare Global ATS"
                    />
                  </div>
                  <div>
                    <Label>Sender Email</Label>
                    <Input
                      type="email"
                      value={settings.sender_email || ''}
                      onChange={(e) => updateSetting('sender_email', e.target.value)}
                      placeholder="noreply@mccareglobal.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Quiet Hours
                </CardTitle>
                <CardDescription>Pause notifications during off-hours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Enable Quiet Hours</Label>
                    <p className="text-sm text-slate-500">Suppress notifications during specified hours</p>
                  </div>
                  <Switch
                    checked={settings.quiet_hours_enabled}
                    onCheckedChange={(checked) => updateSetting('quiet_hours_enabled', checked)}
                  />
                </div>
                
                {settings.quiet_hours_enabled && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={settings.quiet_hours_start || '22:00'}
                        onChange={(e) => updateSetting('quiet_hours_start', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={settings.quiet_hours_end || '07:00'}
                        onChange={(e) => updateSetting('quiet_hours_end', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* New Lead Notifications */}
        <TabsContent value="new-lead">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-green-600" />
                New Lead Notifications
              </CardTitle>
              <CardDescription>Configure alerts when new leads are submitted</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable New Lead Alerts</Label>
                  <p className="text-sm text-slate-500">Send notifications when leads are created</p>
                </div>
                <Switch
                  checked={settings.new_lead_enabled}
                  onCheckedChange={(checked) => updateSetting('new_lead_enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Notify Assigned Owner</Label>
                  <p className="text-sm text-slate-500">Email the recruiter assigned to the lead</p>
                </div>
                <Switch
                  checked={settings.new_lead_notify_owner}
                  onCheckedChange={(checked) => updateSetting('new_lead_notify_owner', checked)}
                />
              </div>

              <div>
                <Label className="text-base">Fallback Recipients</Label>
                <p className="text-sm text-slate-500 mb-3">
                  These emails receive alerts when no owner is assigned (admins are included by default)
                </p>
                <div className="flex gap-2 mb-2">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={newFallbackEmail}
                    onChange={(e) => setNewFallbackEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addFallbackEmail()}
                  />
                  <Button variant="outline" onClick={addFallbackEmail}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(settings.new_lead_fallback_emails || []).map((email) => (
                    <Badge key={email} variant="secondary" className="flex items-center gap-1 py-1.5">
                      {email}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeFallbackEmail(email)} />
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expiring Credentials */}
        <TabsContent value="credentials">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-600" />
                  Expiring Credential Alerts
                </CardTitle>
                <CardDescription>Configure compliance notification rules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Enable Credential Expiry Alerts</Label>
                    <p className="text-sm text-slate-500">Send notifications for expiring documents</p>
                  </div>
                  <Switch
                    checked={settings.expiring_credential_enabled}
                    onCheckedChange={(checked) => updateSetting('expiring_credential_enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Expired Document Alerts</Label>
                    <p className="text-sm text-slate-500">Also alert when credentials have already expired</p>
                  </div>
                  <Switch
                    checked={settings.expired_alert_enabled}
                    onCheckedChange={(checked) => updateSetting('expired_alert_enabled', checked)}
                  />
                </div>

                <div>
                  <Label className="text-base">Alert Thresholds (Days Before Expiry)</Label>
                  <p className="text-sm text-slate-500 mb-3">Select when to send expiry warnings</p>
                  <div className="flex flex-wrap gap-2">
                    {[60, 30, 14, 7].map((days) => (
                      <Badge
                        key={days}
                        variant={settings.expiring_thresholds?.includes(days) ? "default" : "outline"}
                        className={`cursor-pointer py-2 px-4 ${
                          settings.expiring_thresholds?.includes(days) ? 'bg-red-600' : ''
                        }`}
                        onClick={() => toggleThreshold(days)}
                      >
                        {days} days
                        {settings.expiring_thresholds?.includes(days) && (
                          <CheckCircle className="w-3 h-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recipients</CardTitle>
                <CardDescription>Who should receive credential expiry alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Notify Compliance Team</Label>
                    <p className="text-sm text-slate-500">Send to compliance officers and admins</p>
                  </div>
                  <Switch
                    checked={settings.expiring_notify_compliance}
                    onCheckedChange={(checked) => updateSetting('expiring_notify_compliance', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Notify Recruiter Owner</Label>
                    <p className="text-sm text-slate-500">Send to the candidate's assigned recruiter</p>
                  </div>
                  <Switch
                    checked={settings.expiring_notify_recruiter}
                    onCheckedChange={(checked) => updateSetting('expiring_notify_recruiter', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Notify Candidate</Label>
                    <p className="text-sm text-slate-500">Send directly to the nurse (if email available)</p>
                  </div>
                  <Switch
                    checked={settings.expiring_notify_candidate}
                    onCheckedChange={(checked) => updateSetting('expiring_notify_candidate', checked)}
                  />
                </div>

                <div>
                  <Label className="text-base">Additional Compliance Emails</Label>
                  <p className="text-sm text-slate-500 mb-3">Extra recipients for compliance alerts</p>
                  <div className="flex gap-2 mb-2">
                    <Input
                      type="email"
                      placeholder="compliance@example.com"
                      value={newComplianceEmail}
                      onChange={(e) => setNewComplianceEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addComplianceEmail()}
                    />
                    <Button variant="outline" onClick={addComplianceEmail}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(settings.compliance_emails || []).map((email) => (
                      <Badge key={email} variant="secondary" className="flex items-center gap-1 py-1.5">
                        {email}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeComplianceEmail(email)} />
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manual Check</CardTitle>
                <CardDescription>Run credential expiry check immediately</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={runCredentialCheck}
                  disabled={runningCheck}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {runningCheck ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Run Credential Check Now
                </Button>
                <p className="text-sm text-slate-500 mt-2">
                  This runs automatically daily. Use this to test or trigger immediately.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Email Logs */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Email Notification Logs
              </CardTitle>
              <CardDescription>Audit trail of sent notifications (demo mode shows logged emails)</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No email logs yet</p>
                  <p className="text-sm">Notifications will appear here when triggered</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {logs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4 bg-slate-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={log.status === 'logged' ? 'secondary' : 'default'}>
                              {log.status}
                            </Badge>
                            <Badge variant="outline">{log.type}</Badge>
                            <span className="text-sm text-slate-500">{log.provider}</span>
                          </div>
                          <p className="font-medium mt-1">{log.subject}</p>
                          <p className="text-sm text-slate-600">To: {log.to?.join(', ')}</p>
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      {log.body_preview && (
                        <p className="text-sm text-slate-500 mt-2 truncate">{log.body_preview}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
