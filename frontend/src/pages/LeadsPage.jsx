import React, { useState, useEffect } from 'react';
import { api } from '../App';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Phone,
  Mail,
  MapPin,
  UserPlus,
  Trash2,
  Edit,
  GripVertical
} from 'lucide-react';

const PIPELINE_STAGES = [
  { id: 'New Lead', color: 'bg-blue-500' },
  { id: 'Contacted', color: 'bg-purple-500' },
  { id: 'Screening Scheduled', color: 'bg-amber-500' },
  { id: 'Application Submitted', color: 'bg-cyan-500' },
  { id: 'Interview', color: 'bg-indigo-500' },
  { id: 'Offer', color: 'bg-green-500' },
  { id: 'Hired', color: 'bg-teal-500' },
  { id: 'Rejected', color: 'bg-red-500' },
];

const SPECIALTIES = ['ICU', 'ER', 'Med-Surg', 'OR', 'Pediatrics', 'NICU', 'L&D', 'Cardiac', 'Oncology', 'Psych'];
const PROVINCES = ['Ontario', 'British Columbia', 'Alberta', 'Quebec', 'Manitoba', 'Saskatchewan', 'Nova Scotia', 'New Brunswick'];
const SOURCES = ['HubSpot', 'ATS Form', 'API', 'Landing Page', 'LinkedIn', 'Referral', 'Job Board', 'Direct Application', 'Website', 'Career Fair'];

const getSourceBadgeColor = (source) => {
  const colors = {
    'HubSpot': 'bg-orange-100 text-orange-700 border-orange-200',
    'ATS Form': 'bg-red-100 text-red-700 border-red-200',
    'API': 'bg-blue-100 text-blue-700 border-blue-200',
    'Landing Page': 'bg-green-100 text-green-700 border-green-200',
    'Website': 'bg-purple-100 text-purple-700 border-purple-200',
    'LinkedIn': 'bg-sky-100 text-sky-700 border-sky-200',
    'Referral': 'bg-teal-100 text-teal-700 border-teal-200',
    'Job Board': 'bg-amber-100 text-amber-700 border-amber-200',
    'Direct Application': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Career Fair': 'bg-pink-100 text-pink-700 border-pink-200',
  };
  return colors[source] || 'bg-slate-100 text-slate-700 border-slate-200';
};

const LeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    source: 'Direct Application',
    specialty: '',
    province_preference: '',
    tags: [],
    notes: ''
  });

  useEffect(() => {
    fetchLeads();
  }, [filterSpecialty, filterProvince]);

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (filterSpecialty) params.append('specialty', filterSpecialty);
      if (filterProvince) params.append('province', filterProvince);
      
      const response = await api.get(`/leads?${params.toString()}`);
      setLeads(response.data);
    } catch (error) {
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leads', formData);
      toast.success('Lead added successfully');
      setShowAddDialog(false);
      resetForm();
      fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add lead');
    }
  };

  const handleUpdateLead = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/leads/${selectedLead.id}`, formData);
      toast.success('Lead updated successfully');
      setShowEditDialog(false);
      setSelectedLead(null);
      resetForm();
      fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update lead');
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.delete(`/leads/${leadId}`);
      toast.success('Lead deleted successfully');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  };

  const handleConvertToCandidate = async (leadId) => {
    try {
      await api.post(`/leads/${leadId}/convert`);
      toast.success('Lead converted to candidate');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to convert lead');
    }
  };

  const handleStageChange = async (leadId, newStage) => {
    try {
      await api.put(`/leads/${leadId}`, { stage: newStage });
      toast.success(`Moved to ${newStage}`);
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update stage');
    }
  };

  const openEditDialog = (lead) => {
    setSelectedLead(lead);
    setFormData({
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone || '',
      source: lead.source || 'Direct Application',
      specialty: lead.specialty || '',
      province_preference: lead.province_preference || '',
      tags: lead.tags || [],
      notes: lead.notes || ''
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      source: 'Direct Application',
      specialty: '',
      province_preference: '',
      tags: [],
      notes: ''
    });
  };

  const getLeadsByStage = (stage) => {
    return leads.filter(lead => lead.stage === stage)
      .filter(lead => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          lead.first_name.toLowerCase().includes(query) ||
          lead.last_name.toLowerCase().includes(query) ||
          lead.email.toLowerCase().includes(query)
        );
      });
  };

  const getStageColor = (stage) => {
    const stageConfig = PIPELINE_STAGES.find(s => s.id === stage);
    return stageConfig?.color || 'bg-slate-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="leads-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Leads Pipeline</h1>
          <p className="text-slate-500 mt-1">Manage your recruitment pipeline with drag-and-drop</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-red-600 hover:bg-red-700" data-testid="add-lead-btn">
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-leads-input"
                />
              </div>
            </div>
            <Select value={filterSpecialty || "all"} onValueChange={(v) => setFilterSpecialty(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]" data-testid="filter-specialty">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Specialty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {SPECIALTIES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterProvince || "all"} onValueChange={(v) => setFilterProvince(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]" data-testid="filter-province">
                <MapPin className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Province" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Provinces</SelectItem>
                {PROVINCES.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max" data-testid="kanban-board">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = getLeadsByStage(stage.id);
            return (
              <div key={stage.id} className="w-72 flex-shrink-0">
                <div className="kanban-column p-3">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                      <h3 className="font-semibold text-slate-700 text-sm">{stage.id}</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs">{stageLeads.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {stageLeads.map((lead) => (
                      <div key={lead.id} className="kanban-card" data-testid={`lead-card-${lead.id}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
                            <div>
                              <p className="font-medium text-slate-900 text-sm">
                                {lead.first_name} {lead.last_name}
                              </p>
                              {lead.specialty && (
                                <Badge variant="outline" className="text-xs mt-1">{lead.specialty}</Badge>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(lead)}>
                                <Edit className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              {stage.id !== 'Hired' && (
                                <DropdownMenuItem onClick={() => handleConvertToCandidate(lead.id)}>
                                  <UserPlus className="w-4 h-4 mr-2" /> Convert to Candidate
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteLead(lead.id)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="space-y-1.5 text-xs text-slate-500">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                          {lead.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3" />
                              <span>{lead.phone}</span>
                            </div>
                          )}
                          {lead.province_preference && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3" />
                              <span>{lead.province_preference}</span>
                            </div>
                          )}
                        </div>
                        {lead.source && (
                          <div className="mt-2 pt-2 border-t border-slate-100">
                            <span className="text-xs text-slate-400">Source: {lead.source}</span>
                          </div>
                        )}
                        {/* Stage change buttons */}
                        <div className="mt-3 flex gap-1 flex-wrap">
                          {PIPELINE_STAGES.filter(s => s.id !== stage.id).slice(0, 3).map(s => (
                            <Button
                              key={s.id}
                              variant="ghost"
                              size="sm"
                              className="text-xs h-6 px-2"
                              onClick={() => handleStageChange(lead.id, s.id)}
                            >
                              → {s.id.split(' ')[0]}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-sm">
                        No leads in this stage
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Lead Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>Enter the lead's information below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddLead} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                  data-testid="lead-firstname-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                  data-testid="lead-lastname-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                data-testid="lead-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                data-testid="lead-phone-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Specialty</Label>
                <Select value={formData.specialty} onValueChange={(v) => setFormData({ ...formData, specialty: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Province Preference</Label>
              <Select value={formData.province_preference} onValueChange={(v) => setFormData({ ...formData, province_preference: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCES.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700" data-testid="submit-lead-btn">Add Lead</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>Update the lead's information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateLead} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_first_name">First Name *</Label>
                <Input
                  id="edit_first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_last_name">Last Name *</Label>
                <Input
                  id="edit_last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email *</Label>
              <Input
                id="edit_email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_phone">Phone</Label>
              <Input
                id="edit_phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Specialty</Label>
                <Select value={formData.specialty} onValueChange={(v) => setFormData({ ...formData, specialty: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Province Preference</Label>
              <Select value={formData.province_preference} onValueChange={(v) => setFormData({ ...formData, province_preference: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCES.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700">Update Lead</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadsPage;
