import React, { useState, useEffect } from 'react';
import { api } from '../App';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Plus,
  Search,
  Filter,
  Building2,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Users,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';

const FACILITY_TYPES = ['Hospital', 'Long-Term Care', 'Clinic', 'Rehabilitation Center', 'Home Care', 'Urgent Care'];
const PROVINCES = ['Ontario', 'British Columbia', 'Alberta', 'Quebec', 'Manitoba', 'Saskatchewan', 'Nova Scotia', 'New Brunswick'];
const SPECIALTIES = ['ICU', 'ER', 'Med-Surg', 'OR', 'Pediatrics', 'NICU', 'L&D', 'Cardiac', 'Oncology', 'Psych'];
const SHIFT_TYPES = ['Days', 'Nights', 'Rotation', 'Evenings', 'Weekends Only'];
const JOB_STATUSES = ['Open', 'In Progress', 'Filled', 'Closed'];

const ClientsJobsPage = () => {
  const [facilities, setFacilities] = useState([]);
  const [jobOrders, setJobOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('facilities');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFacilityDialog, setShowFacilityDialog] = useState(false);
  const [showJobDialog, setShowJobDialog] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');

  const [facilityForm, setFacilityForm] = useState({
    name: '',
    address: '',
    city: '',
    province: '',
    facility_type: 'Hospital',
    main_contact_name: '',
    main_contact_email: '',
    main_contact_phone: '',
    billing_notes: ''
  });

  const [jobForm, setJobForm] = useState({
    facility_id: '',
    role: 'Registered Nurse',
    specialty: '',
    openings: 1,
    shift_type: 'Days',
    start_date: '',
    end_date: '',
    required_experience: 2,
    required_credentials: [],
    pay_rate: '',
    bill_rate: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [facilitiesRes, jobsRes] = await Promise.all([
        api.get('/facilities'),
        api.get('/job-orders')
      ]);
      setFacilities(facilitiesRes.data);
      setJobOrders(jobsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFacility = async (e) => {
    e.preventDefault();
    try {
      if (editingFacility) {
        await api.put(`/facilities/${editingFacility.id}`, facilityForm);
        toast.success('Facility updated');
      } else {
        await api.post('/facilities', facilityForm);
        toast.success('Facility added');
      }
      setShowFacilityDialog(false);
      resetFacilityForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to save facility');
    }
  };

  const handleAddJobOrder = async (e) => {
    e.preventDefault();
    try {
      const formData = {
        ...jobForm,
        pay_rate: parseFloat(jobForm.pay_rate) || null,
        bill_rate: parseFloat(jobForm.bill_rate) || null,
        required_experience: parseInt(jobForm.required_experience) || null
      };
      await api.post('/job-orders', formData);
      toast.success('Job order created');
      setShowJobDialog(false);
      resetJobForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to create job order');
    }
  };

  const handleDeleteFacility = async (id) => {
    if (!window.confirm('Delete this facility?')) return;
    try {
      await api.delete(`/facilities/${id}`);
      toast.success('Facility deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete facility');
    }
  };

  const handleUpdateJobStatus = async (jobId, newStatus) => {
    try {
      await api.put(`/job-orders/${jobId}`, { status: newStatus });
      toast.success('Status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const openEditFacility = (facility) => {
    setEditingFacility(facility);
    setFacilityForm({
      name: facility.name,
      address: facility.address || '',
      city: facility.city || '',
      province: facility.province || '',
      facility_type: facility.facility_type || 'Hospital',
      main_contact_name: facility.main_contact_name || '',
      main_contact_email: facility.main_contact_email || '',
      main_contact_phone: facility.main_contact_phone || '',
      billing_notes: facility.billing_notes || ''
    });
    setShowFacilityDialog(true);
  };

  const resetFacilityForm = () => {
    setEditingFacility(null);
    setFacilityForm({
      name: '',
      address: '',
      city: '',
      province: '',
      facility_type: 'Hospital',
      main_contact_name: '',
      main_contact_email: '',
      main_contact_phone: '',
      billing_notes: ''
    });
  };

  const resetJobForm = () => {
    setJobForm({
      facility_id: '',
      role: 'Registered Nurse',
      specialty: '',
      openings: 1,
      shift_type: 'Days',
      start_date: '',
      end_date: '',
      required_experience: 2,
      required_credentials: [],
      pay_rate: '',
      bill_rate: '',
      notes: ''
    });
  };

  const getStatusBadge = (status) => {
    const colors = {
      'Open': 'badge-active',
      'In Progress': 'bg-blue-50 text-blue-700 border border-blue-200',
      'Filled': 'bg-green-50 text-green-700 border border-green-200',
      'Closed': 'badge-neutral'
    };
    return colors[status] || 'badge-neutral';
  };

  const filteredFacilities = facilities.filter(f => {
    if (!searchQuery) return true;
    return f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.city && f.city.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const filteredJobs = jobOrders.filter(j => {
    if (filterStatus && j.status !== filterStatus) return false;
    if (filterSpecialty && j.specialty !== filterSpecialty) return false;
    if (searchQuery) {
      return j.facility_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.role.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="clients-jobs-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Clients & Job Orders</h1>
          <p className="text-slate-500 mt-1">Manage healthcare facilities and job openings</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="facilities" data-testid="tab-facilities">
              <Building2 className="w-4 h-4 mr-2" />
              Facilities ({facilities.length})
            </TabsTrigger>
            <TabsTrigger value="job-orders" data-testid="tab-job-orders">
              <Briefcase className="w-4 h-4 mr-2" />
              Job Orders ({jobOrders.length})
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            {activeTab === 'facilities' ? (
              <Button onClick={() => { resetFacilityForm(); setShowFacilityDialog(true); }} className="bg-red-600 hover:bg-red-700" data-testid="add-facility-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Facility
              </Button>
            ) : (
              <Button onClick={() => { resetJobForm(); setShowJobDialog(true); }} className="bg-red-600 hover:bg-red-700" data-testid="add-job-btn">
                <Plus className="w-4 h-4 mr-2" />
                Create Job Order
              </Button>
            )}
          </div>
        </div>

        {/* Facilities Tab */}
        <TabsContent value="facilities" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search facilities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 max-w-md"
                  data-testid="search-facilities-input"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFacilities.map((facility) => (
              <Card key={facility.id} className="border-0 shadow-sm card-hover" data-testid={`facility-card-${facility.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{facility.name}</h3>
                        <Badge variant="outline" className="mt-1 text-xs">{facility.facility_type}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditFacility(facility)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => handleDeleteFacility(facility.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    {(facility.city || facility.province) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {[facility.city, facility.province].filter(Boolean).join(', ')}
                      </div>
                    )}
                    {facility.main_contact_name && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        {facility.main_contact_name}
                      </div>
                    )}
                    {facility.main_contact_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="truncate">{facility.main_contact_email}</span>
                      </div>
                    )}
                    {facility.main_contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        {facility.main_contact_phone}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredFacilities.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500">
                No facilities found
              </div>
            )}
          </div>
        </TabsContent>

        {/* Job Orders Tab */}
        <TabsContent value="job-orders" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search job orders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="search-jobs-input"
                    />
                  </div>
                </div>
                <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {JOB_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterSpecialty || "all"} onValueChange={(v) => setFilterSpecialty(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {SPECIALTIES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Facility</TableHead>
                    <TableHead>Role / Specialty</TableHead>
                    <TableHead>Openings</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Rates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.length > 0 ? filteredJobs.map((job) => (
                    <TableRow key={job.id} className="table-row-hover" data-testid={`job-row-${job.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{job.facility_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{job.role}</p>
                          <p className="text-sm text-slate-500">{job.specialty}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{job.openings} position{job.openings > 1 ? 's' : ''}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {job.start_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {new Date(job.start_date).toLocaleDateString()} - {job.end_date ? new Date(job.end_date).toLocaleDateString() : 'Ongoing'}
                            </div>
                          )}
                          <span className="text-slate-500">{job.shift_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {job.pay_rate && <p>Pay: ${job.pay_rate}/hr</p>}
                          {job.bill_rate && <p className="text-slate-500">Bill: ${job.bill_rate}/hr</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusBadge(job.status)} rounded-full px-2.5 py-0.5 text-xs font-medium`}>
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Select value={job.status} onValueChange={(v) => handleUpdateJobStatus(job.id, v)}>
                          <SelectTrigger className="w-[100px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {JOB_STATUSES.map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No job orders found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Facility Dialog */}
      <Dialog open={showFacilityDialog} onOpenChange={setShowFacilityDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFacility ? 'Edit Facility' : 'Add New Facility'}</DialogTitle>
            <DialogDescription>Enter the facility details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddFacility} className="space-y-4">
            <div className="space-y-2">
              <Label>Facility Name *</Label>
              <Input
                value={facilityForm.name}
                onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
                required
                data-testid="facility-name-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={facilityForm.city}
                  onChange={(e) => setFacilityForm({ ...facilityForm, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Province</Label>
                <Select value={facilityForm.province} onValueChange={(v) => setFacilityForm({ ...facilityForm, province: v })}>
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
            </div>
            <div className="space-y-2">
              <Label>Facility Type</Label>
              <Select value={facilityForm.facility_type} onValueChange={(v) => setFacilityForm({ ...facilityForm, facility_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FACILITY_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Main Contact Name</Label>
              <Input
                value={facilityForm.main_contact_name}
                onChange={(e) => setFacilityForm({ ...facilityForm, main_contact_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  value={facilityForm.main_contact_email}
                  onChange={(e) => setFacilityForm({ ...facilityForm, main_contact_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  value={facilityForm.main_contact_phone}
                  onChange={(e) => setFacilityForm({ ...facilityForm, main_contact_phone: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowFacilityDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700" data-testid="submit-facility-btn">
                {editingFacility ? 'Update' : 'Add'} Facility
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Job Order Dialog */}
      <Dialog open={showJobDialog} onOpenChange={setShowJobDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Job Order</DialogTitle>
            <DialogDescription>Fill in the job order details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddJobOrder} className="space-y-4">
            <div className="space-y-2">
              <Label>Facility *</Label>
              <Select value={jobForm.facility_id} onValueChange={(v) => setJobForm({ ...jobForm, facility_id: v })}>
                <SelectTrigger data-testid="job-facility-select">
                  <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent>
                  {facilities.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role *</Label>
                <Input
                  value={jobForm.role}
                  onChange={(e) => setJobForm({ ...jobForm, role: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Specialty *</Label>
                <Select value={jobForm.specialty} onValueChange={(v) => setJobForm({ ...jobForm, specialty: v })}>
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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Openings</Label>
                <Input
                  type="number"
                  min="1"
                  value={jobForm.openings}
                  onChange={(e) => setJobForm({ ...jobForm, openings: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Shift Type</Label>
                <Select value={jobForm.shift_type} onValueChange={(v) => setJobForm({ ...jobForm, shift_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFT_TYPES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Experience (yrs)</Label>
                <Input
                  type="number"
                  min="0"
                  value={jobForm.required_experience}
                  onChange={(e) => setJobForm({ ...jobForm, required_experience: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={jobForm.start_date}
                  onChange={(e) => setJobForm({ ...jobForm, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={jobForm.end_date}
                  onChange={(e) => setJobForm({ ...jobForm, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pay Rate ($/hr)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={jobForm.pay_rate}
                  onChange={(e) => setJobForm({ ...jobForm, pay_rate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Bill Rate ($/hr)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={jobForm.bill_rate}
                  onChange={(e) => setJobForm({ ...jobForm, bill_rate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={jobForm.notes}
                onChange={(e) => setJobForm({ ...jobForm, notes: e.target.value })}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowJobDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700" data-testid="submit-job-btn">Create Job Order</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsJobsPage;
