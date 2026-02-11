import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../App';
import { toast } from 'sonner';
import { Card, CardContent } from '../components/ui/card';
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
  Eye,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  ChevronRight
} from 'lucide-react';

const NURSE_TYPES = ['RN', 'RPN', 'LPN', 'NP'];
const SPECIALTIES = ['ICU', 'ER', 'Med-Surg', 'OR', 'Pediatrics', 'NICU', 'L&D', 'Cardiac', 'Oncology', 'Psych'];
const PROVINCES = ['Ontario', 'British Columbia', 'Alberta', 'Quebec', 'Manitoba', 'Saskatchewan', 'Nova Scotia', 'New Brunswick'];
const STATUSES = ['Active', 'Inactive', 'Do Not Place', 'On Assignment', 'Completed'];

const CandidatesPage = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    preferred_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    country: 'Canada',
    work_eligibility: 'Canadian Citizen',
    nurse_type: 'RN',
    primary_specialty: '',
    years_of_experience: 0,
    desired_locations: [],
    travel_willingness: true,
    start_date_availability: '',
    status: 'Active',
    tags: [],
    notes: ''
  });

  useEffect(() => {
    fetchCandidates();
  }, [filterStatus, filterSpecialty, filterProvince]);

  const fetchCandidates = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterSpecialty) params.append('specialty', filterSpecialty);
      if (filterProvince) params.append('province', filterProvince);
      
      const response = await api.get(`/candidates?${params.toString()}`);
      setCandidates(response.data);
    } catch (error) {
      toast.error('Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/candidates', formData);
      toast.success('Candidate added successfully');
      setShowAddDialog(false);
      resetForm();
      fetchCandidates();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add candidate');
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      preferred_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      province: '',
      postal_code: '',
      country: 'Canada',
      work_eligibility: 'Canadian Citizen',
      nurse_type: 'RN',
      primary_specialty: '',
      years_of_experience: 0,
      desired_locations: [],
      travel_willingness: true,
      start_date_availability: '',
      status: 'Active',
      tags: [],
      notes: ''
    });
  };

  const filteredCandidates = candidates.filter(candidate => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      candidate.first_name.toLowerCase().includes(query) ||
      candidate.last_name.toLowerCase().includes(query) ||
      candidate.email.toLowerCase().includes(query) ||
      (candidate.primary_specialty && candidate.primary_specialty.toLowerCase().includes(query))
    );
  });

  const getStatusBadge = (status) => {
    const colors = {
      'Active': 'badge-active',
      'Inactive': 'badge-neutral',
      'Do Not Place': 'badge-critical',
      'On Assignment': 'bg-blue-50 text-blue-700 border border-blue-200',
      'Completed': 'bg-green-50 text-green-700 border border-green-200'
    };
    return colors[status] || 'badge-neutral';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="candidates-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Candidates</h1>
          <p className="text-slate-500 mt-1">Manage your nurse candidate database</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-red-600 hover:bg-red-700" data-testid="add-candidate-btn">
          <Plus className="w-4 h-4 mr-2" />
          Add Candidate
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
                  placeholder="Search candidates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-candidates-input"
                />
              </div>
            </div>
            <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[160px]" data-testid="filter-status">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSpecialty || "all"} onValueChange={(v) => setFilterSpecialty(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[160px]">
                <Briefcase className="w-4 h-4 mr-2" />
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
              <SelectTrigger className="w-[160px]">
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

      {/* Candidates Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type / Specialty</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.length > 0 ? filteredCandidates.map((candidate) => (
                <TableRow key={candidate.id} className="table-row-hover" data-testid={`candidate-row-${candidate.id}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900">
                        {candidate.first_name} {candidate.last_name}
                      </p>
                      {candidate.preferred_name && (
                        <p className="text-xs text-slate-500">"{candidate.preferred_name}"</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="w-3 h-3" />
                        <span className="truncate max-w-[180px]">{candidate.email}</span>
                      </div>
                      {candidate.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-3 h-3" />
                          <span>{candidate.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {candidate.nurse_type && (
                        <Badge variant="outline" className="w-fit">{candidate.nurse_type}</Badge>
                      )}
                      {candidate.primary_specialty && (
                        <span className="text-sm text-slate-600">{candidate.primary_specialty}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {candidate.city || candidate.province ? (
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <MapPin className="w-3 h-3" />
                        <span>{[candidate.city, candidate.province].filter(Boolean).join(', ')}</span>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {candidate.years_of_experience ? (
                      <span className="text-sm text-slate-600">{candidate.years_of_experience} years</span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusBadge(candidate.status)} rounded-full px-2.5 py-0.5 text-xs font-medium`}>
                      {candidate.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/candidates/${candidate.id}`} data-testid={`view-candidate-${candidate.id}`}>
                        <Eye className="w-4 h-4 mr-1" />
                        View
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No candidates found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Candidate Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Candidate</DialogTitle>
            <DialogDescription>Enter the candidate's information below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCandidate} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Personal Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                    data-testid="candidate-firstname-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                    data-testid="candidate-lastname-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferred_name">Preferred Name</Label>
                  <Input
                    id="preferred_name"
                    value={formData.preferred_name}
                    onChange={(e) => setFormData({ ...formData, preferred_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    data-testid="candidate-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Province</Label>
                  <Select value={formData.province} onValueChange={(v) => setFormData({ ...formData, province: v })}>
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
            </div>

            {/* Professional Information */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Professional Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nurse Type</Label>
                  <Select value={formData.nurse_type} onValueChange={(v) => setFormData({ ...formData, nurse_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NURSE_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Primary Specialty</Label>
                  <Select value={formData.primary_specialty} onValueChange={(v) => setFormData({ ...formData, primary_specialty: v })}>
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
                <div className="space-y-2">
                  <Label htmlFor="years">Years of Experience</Label>
                  <Input
                    id="years"
                    type="number"
                    min="0"
                    value={formData.years_of_experience}
                    onChange={(e) => setFormData({ ...formData, years_of_experience: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>Work Eligibility</Label>
                  <Select value={formData.work_eligibility} onValueChange={(v) => setFormData({ ...formData, work_eligibility: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Canadian Citizen">Canadian Citizen</SelectItem>
                      <SelectItem value="Permanent Resident">Permanent Resident</SelectItem>
                      <SelectItem value="Work Permit">Work Permit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_date">Available Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date_availability}
                    onChange={(e) => setFormData({ ...formData, start_date_availability: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
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
              <Button type="submit" className="bg-red-600 hover:bg-red-700" data-testid="submit-candidate-btn">Add Candidate</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CandidatesPage;
