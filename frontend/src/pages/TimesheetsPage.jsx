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
  Clock,
  DollarSign,
  User,
  Building2,
  CheckCircle,
  Send,
  FileText
} from 'lucide-react';

const TIMESHEET_STATUSES = ['Draft', 'Submitted', 'Approved', 'Processed'];

const TimesheetsPage = () => {
  const [timesheets, setTimesheets] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);

  const [formData, setFormData] = useState({
    assignment_id: '',
    candidate_id: '',
    week_start: '',
    week_end: '',
    entries: [],
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);

      const [timesheetsRes, assignmentsRes] = await Promise.all([
        api.get(`/timesheets?${params.toString()}`),
        api.get('/assignments?status=Active')
      ]);
      setTimesheets(timesheetsRes.data);
      setAssignments(assignmentsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTimesheet = async (e) => {
    e.preventDefault();
    try {
      // Find the assignment to get candidate_id
      const assignment = assignments.find(a => a.id === formData.assignment_id);
      if (!assignment) {
        toast.error('Please select an assignment');
        return;
      }

      const payload = {
        ...formData,
        candidate_id: assignment.candidate_id,
        entries: generateWeekEntries(formData.week_start)
      };

      await api.post('/timesheets', payload);
      toast.success('Timesheet created');
      setShowAddDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to create timesheet');
    }
  };

  const handleSubmitTimesheet = async (timesheetId) => {
    try {
      await api.post(`/timesheets/${timesheetId}/submit`);
      toast.success('Timesheet submitted');
      fetchData();
    } catch (error) {
      toast.error('Failed to submit timesheet');
    }
  };

  const handleApproveTimesheet = async (timesheetId) => {
    try {
      await api.post(`/timesheets/${timesheetId}/approve`);
      toast.success('Timesheet approved');
      fetchData();
    } catch (error) {
      toast.error('Failed to approve timesheet');
    }
  };

  const generateWeekEntries = (startDate) => {
    if (!startDate) return [];
    const entries = [];
    const start = new Date(startDate);
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      entries.push({
        day: date.toISOString().split('T')[0],
        regular_hours: i < 5 ? 8 : 0,
        ot_hours: 0
      });
    }
    return entries;
  };

  const calculateWeekEnd = (startDate) => {
    if (!startDate) return '';
    const start = new Date(startDate);
    start.setDate(start.getDate() + 6);
    return start.toISOString().split('T')[0];
  };

  const resetForm = () => {
    setFormData({
      assignment_id: '',
      candidate_id: '',
      week_start: '',
      week_end: '',
      entries: [],
      notes: ''
    });
  };

  const handleWeekStartChange = (date) => {
    setFormData({
      ...formData,
      week_start: date,
      week_end: calculateWeekEnd(date),
      entries: generateWeekEntries(date)
    });
  };

  const getStatusBadge = (status) => {
    const colors = {
      'Draft': 'badge-neutral',
      'Submitted': 'badge-pending',
      'Approved': 'badge-active',
      'Processed': 'bg-green-50 text-green-700 border border-green-200'
    };
    return colors[status] || 'badge-neutral';
  };

  const filteredTimesheets = timesheets.filter(t => {
    if (!searchQuery) return true;
    return t.candidate_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.facility_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Summary stats
  const draftCount = timesheets.filter(t => t.status === 'Draft').length;
  const submittedCount = timesheets.filter(t => t.status === 'Submitted').length;
  const approvedCount = timesheets.filter(t => t.status === 'Approved').length;
  const totalBillable = timesheets.filter(t => t.status === 'Approved')
    .reduce((sum, t) => sum + (t.total_billable || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="timesheets-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Timesheets</h1>
          <p className="text-slate-500 mt-1">Manage weekly timesheets and billing</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-red-600 hover:bg-red-700" data-testid="add-timesheet-btn">
          <Plus className="w-4 h-4 mr-2" />
          Create Timesheet
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Draft</p>
                <p className="text-2xl font-bold text-slate-600">{draftCount}</p>
              </div>
              <FileText className="w-8 h-8 text-slate-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Submitted</p>
                <p className="text-2xl font-bold text-amber-600">{submittedCount}</p>
              </div>
              <Send className="w-8 h-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Approved</p>
                <p className="text-2xl font-bold text-teal-600">{approvedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-teal-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Billable</p>
                <p className="text-2xl font-bold text-green-600">${totalBillable.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-200" />
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
                  placeholder="Search timesheets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-timesheets-input"
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
                {TIMESHEET_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Timesheets Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Week</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Billable</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTimesheets.length > 0 ? filteredTimesheets.map((timesheet) => (
                <TableRow key={timesheet.id} className="table-row-hover" data-testid={`timesheet-row-${timesheet.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{timesheet.candidate_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span>{timesheet.facility_name || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(timesheet.week_start).toLocaleDateString()} - {new Date(timesheet.week_end).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium">{timesheet.total_hours || 0}h total</p>
                      <p className="text-slate-500">{timesheet.total_regular_hours || 0}h reg, {timesheet.total_ot_hours || 0}h OT</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-green-600">
                      ${(timesheet.total_billable || 0).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusBadge(timesheet.status)} rounded-full px-2.5 py-0.5 text-xs font-medium`}>
                      {timesheet.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {timesheet.status === 'Draft' && (
                        <Button variant="outline" size="sm" onClick={() => handleSubmitTimesheet(timesheet.id)}>
                          <Send className="w-4 h-4 mr-1" />
                          Submit
                        </Button>
                      )}
                      {timesheet.status === 'Submitted' && (
                        <Button variant="outline" size="sm" className="text-teal-600" onClick={() => handleApproveTimesheet(timesheet.id)}>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No timesheets found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Timesheet Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Timesheet</DialogTitle>
            <DialogDescription>Create a new weekly timesheet.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTimesheet} className="space-y-4">
            <div className="space-y-2">
              <Label>Assignment *</Label>
              <Select value={formData.assignment_id} onValueChange={(v) => setFormData({ ...formData, assignment_id: v })}>
                <SelectTrigger data-testid="timesheet-assignment-select">
                  <SelectValue placeholder="Select assignment" />
                </SelectTrigger>
                <SelectContent>
                  {assignments.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.candidate_name} @ {a.facility_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Week Start *</Label>
                <Input
                  type="date"
                  value={formData.week_start}
                  onChange={(e) => handleWeekStartChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Week End</Label>
                <Input
                  type="date"
                  value={formData.week_end}
                  disabled
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700" data-testid="submit-timesheet-btn">Create Timesheet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimesheetsPage;
