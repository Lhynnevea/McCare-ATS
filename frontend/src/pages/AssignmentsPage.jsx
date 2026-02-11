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
  Calendar,
  Building2,
  User,
  Clock,
  DollarSign,
  AlertTriangle,
  Edit
} from 'lucide-react';

const CONTRACT_TYPES = ['Travel', 'Local', 'Per Diem'];
const ASSIGNMENT_STATUSES = ['Scheduled', 'Active', 'Completed', 'Cancelled'];

const AssignmentsPage = () => {
  const [assignments, setAssignments] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [jobOrders, setJobOrders] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const [formData, setFormData] = useState({
    candidate_id: '',
    job_order_id: '',
    facility_id: '',
    start_date: '',
    end_date: '',
    shift_pattern: 'Mon-Fri Days',
    contract_type: 'Travel',
    pay_rate_regular: '',
    pay_rate_ot: '',
    pay_rate_holiday: '',
    bill_rate: '',
    weekly_hours: 36,
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);

      const [assignmentsRes, candidatesRes, jobsRes, facilitiesRes] = await Promise.all([
        api.get(`/assignments?${params.toString()}`),
        api.get('/candidates?status=Active'),
        api.get('/job-orders?status=Open'),
        api.get('/facilities')
      ]);
      setAssignments(assignmentsRes.data);
      setCandidates(candidatesRes.data);
      setJobOrders(jobsRes.data);
      setFacilities(facilitiesRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        pay_rate_regular: parseFloat(formData.pay_rate_regular) || null,
        pay_rate_ot: parseFloat(formData.pay_rate_ot) || null,
        pay_rate_holiday: parseFloat(formData.pay_rate_holiday) || null,
        bill_rate: parseFloat(formData.bill_rate) || null,
        weekly_hours: parseFloat(formData.weekly_hours) || 36
      };
      await api.post('/assignments', payload);
      toast.success('Assignment created');
      setShowAddDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to create assignment');
    }
  };

  const handleUpdateStatus = async (assignmentId, newStatus) => {
    try {
      await api.put(`/assignments/${assignmentId}`, { status: newStatus });
      toast.success('Status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      candidate_id: '',
      job_order_id: '',
      facility_id: '',
      start_date: '',
      end_date: '',
      shift_pattern: 'Mon-Fri Days',
      contract_type: 'Travel',
      pay_rate_regular: '',
      pay_rate_ot: '',
      pay_rate_holiday: '',
      bill_rate: '',
      weekly_hours: 36,
      notes: ''
    });
  };

  const handleJobOrderChange = (jobOrderId) => {
    const job = jobOrders.find(j => j.id === jobOrderId);
    if (job) {
      setFormData({
        ...formData,
        job_order_id: jobOrderId,
        facility_id: job.facility_id,
        start_date: job.start_date || '',
        end_date: job.end_date || '',
        pay_rate_regular: job.pay_rate?.toString() || '',
        bill_rate: job.bill_rate?.toString() || ''
      });
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      'Scheduled': 'bg-blue-50 text-blue-700 border border-blue-200',
      'Active': 'badge-active',
      'Completed': 'bg-green-50 text-green-700 border border-green-200',
      'Cancelled': 'badge-critical'
    };
    return colors[status] || 'badge-neutral';
  };

  const filteredAssignments = assignments.filter(a => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return a.candidate_name?.toLowerCase().includes(query) ||
      a.facility_name?.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="assignments-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Assignments</h1>
          <p className="text-slate-500 mt-1">Manage travel nurse contracts and placements</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-red-600 hover:bg-red-700" data-testid="add-assignment-btn">
          <Plus className="w-4 h-4 mr-2" />
          Create Assignment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">
                  {assignments.filter(a => a.status === 'Scheduled').length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active</p>
                <p className="text-2xl font-bold text-teal-600">
                  {assignments.filter(a => a.status === 'Active').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-teal-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {assignments.filter(a => a.status === 'Completed').length}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">With Warnings</p>
                <p className="text-2xl font-bold text-amber-600">
                  {assignments.filter(a => a.credential_warnings?.length > 0).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search assignments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-assignments-input"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                {ASSIGNMENT_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Rates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Warnings</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.length > 0 ? filteredAssignments.map((assignment) => (
                <TableRow key={assignment.id} className="table-row-hover" data-testid={`assignment-row-${assignment.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{assignment.candidate_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span>{assignment.facility_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(assignment.start_date).toLocaleDateString()} - {new Date(assignment.end_date).toLocaleDateString()}
                      </div>
                      <span className="text-slate-500">{assignment.shift_pattern}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{assignment.contract_type}</Badge>
                    <p className="text-xs text-slate-500 mt-1">{assignment.weekly_hours}h/week</p>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {assignment.pay_rate_regular && <p>Pay: ${assignment.pay_rate_regular}/hr</p>}
                      {assignment.bill_rate && <p className="text-slate-500">Bill: ${assignment.bill_rate}/hr</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusBadge(assignment.status)} rounded-full px-2.5 py-0.5 text-xs font-medium`}>
                      {assignment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {assignment.credential_warnings?.length > 0 ? (
                      <div className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs">{assignment.credential_warnings.length} credential(s)</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select value={assignment.status} onValueChange={(v) => handleUpdateStatus(assignment.id, v)}>
                      <SelectTrigger className="w-[120px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNMENT_STATUSES.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    No assignments found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Assignment Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
            <DialogDescription>Create a new travel nurse assignment.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAssignment} className="space-y-4">
            <div className="space-y-2">
              <Label>Candidate *</Label>
              <Select value={formData.candidate_id} onValueChange={(v) => setFormData({ ...formData, candidate_id: v })}>
                <SelectTrigger data-testid="assignment-candidate-select">
                  <SelectValue placeholder="Select candidate" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Job Order (optional - auto-fills details)</Label>
              <Select value={formData.job_order_id} onValueChange={handleJobOrderChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job order" />
                </SelectTrigger>
                <SelectContent>
                  {jobOrders.map(j => (
                    <SelectItem key={j.id} value={j.id}>{j.facility_name} - {j.role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Facility *</Label>
              <Select value={formData.facility_id} onValueChange={(v) => setFormData({ ...formData, facility_id: v })}>
                <SelectTrigger>
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
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contract Type</Label>
                <Select value={formData.contract_type} onValueChange={(v) => setFormData({ ...formData, contract_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Weekly Hours</Label>
                <Input
                  type="number"
                  value={formData.weekly_hours}
                  onChange={(e) => setFormData({ ...formData, weekly_hours: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pay Rate ($/hr)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.pay_rate_regular}
                  onChange={(e) => setFormData({ ...formData, pay_rate_regular: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Bill Rate ($/hr)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.bill_rate}
                  onChange={(e) => setFormData({ ...formData, bill_rate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Shift Pattern</Label>
              <Input
                value={formData.shift_pattern}
                onChange={(e) => setFormData({ ...formData, shift_pattern: e.target.value })}
                placeholder="e.g., Mon-Fri Days"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700" data-testid="submit-assignment-btn">Create Assignment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssignmentsPage;
