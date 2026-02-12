import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import { Progress } from '../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  FileText,
  Plus,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Building2,
  Download,
  File,
  Image,
  FileType,
  X,
  RefreshCw,
  AlertTriangle,
  XCircle,
  FileWarning,
  Shield
} from 'lucide-react';

const DOCUMENT_TYPES = [
  'Nursing License', 'Criminal Record Check', 'Immunization Records', 
  'BLS/ACLS', 'Resume', 'References', 'Employment Contract', 
  'Government ID', 'Work Permit', 'Other'
];

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.txt'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const CandidateDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [candidate, setCandidate] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDocDialog, setShowDocDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [formData, setFormData] = useState({});
  const [docFormData, setDocFormData] = useState({
    document_type: '',
    file_url: '',
    issue_date: '',
    expiry_date: '',
    notes: ''
  });
  const [uploadData, setUploadData] = useState({
    document_type: '',
    issue_date: '',
    expiry_date: '',
    notes: '',
    file: null
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchCandidateData();
  }, [id]);

  const fetchCandidateData = async () => {
    try {
      const [candidateRes, docsRes, activitiesRes, assignmentsRes, complianceRes] = await Promise.all([
        api.get(`/candidates/${id}`),
        api.get(`/documents?candidate_id=${id}`),
        api.get(`/activities?entity_type=candidate&entity_id=${id}`),
        api.get(`/assignments?candidate_id=${id}`),
        api.get(`/compliance/candidate/${id}`)
      ]);
      setCandidate(candidateRes.data);
      setFormData(candidateRes.data);
      setDocuments(docsRes.data);
      setActivities(activitiesRes.data);
      setAssignments(assignmentsRes.data);
      setCompliance(complianceRes.data);
    } catch (error) {
      toast.error('Failed to fetch candidate data');
      navigate('/candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCandidate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/candidates/${id}`, formData);
      toast.success('Candidate updated successfully');
      setShowEditDialog(false);
      fetchCandidateData();
    } catch (error) {
      toast.error('Failed to update candidate');
    }
  };

  const handleDeleteCandidate = async () => {
    if (!window.confirm('Are you sure you want to delete this candidate?')) return;
    try {
      await api.delete(`/candidates/${id}`);
      toast.success('Candidate deleted');
      navigate('/candidates');
    } catch (error) {
      toast.error('Failed to delete candidate');
    }
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    try {
      await api.post('/documents', { ...docFormData, candidate_id: id });
      toast.success('Document added successfully');
      setShowDocDialog(false);
      setDocFormData({ document_type: '', file_url: '', issue_date: '', expiry_date: '', notes: '' });
      fetchCandidateData();
    } catch (error) {
      toast.error('Failed to add document');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file extension
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    setUploadData({ ...uploadData, file });
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    
    if (!uploadData.file) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!uploadData.document_type) {
      toast.error('Please select a document type');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formDataObj = new FormData();
    formDataObj.append('file', uploadData.file);
    formDataObj.append('candidate_id', id);
    formDataObj.append('document_type', uploadData.document_type);
    if (uploadData.issue_date) formDataObj.append('issue_date', uploadData.issue_date);
    if (uploadData.expiry_date) formDataObj.append('expiry_date', uploadData.expiry_date);
    if (uploadData.notes) formDataObj.append('notes', uploadData.notes);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const response = await api.post('/upload/document', formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast.success('Document uploaded successfully');
      setShowUploadDialog(false);
      setUploadData({ document_type: '', issue_date: '', expiry_date: '', notes: '', file: null });
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchCandidateData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload document');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownloadDocument = async (docId, fileName) => {
    try {
      const response = await api.get(`/documents/${docId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'document');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download document');
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/documents/${docId}`);
      toast.success('Document deleted');
      fetchCandidateData();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const handleVerifyDocument = async (docId) => {
    try {
      await api.put(`/documents/${docId}`, { verified_by: 'current_user' });
      toast.success('Document verified');
      fetchCandidateData();
    } catch (error) {
      toast.error('Failed to verify document');
    }
  };

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

  const getDocStatusBadge = (status) => {
    switch (status) {
      case 'Verified': return 'badge-active';
      case 'Pending': return 'badge-pending';
      case 'Expiring Soon': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Expired': return 'badge-critical';
      default: return 'badge-neutral';
    }
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return <FileText className="w-5 h-5 text-slate-400" />;
    const type = fileType.toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif'].includes(type)) {
      return <Image className="w-5 h-5 text-purple-500" />;
    }
    if (type === '.pdf') {
      return <FileType className="w-5 h-5 text-red-500" />;
    }
    if (['.doc', '.docx'].includes(type)) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    }
    return <File className="w-5 h-5 text-slate-400" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!candidate) return null;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="candidate-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/candidates')} data-testid="back-btn">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {candidate.first_name} {candidate.last_name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {candidate.nurse_type && (
                <Badge variant="outline">{candidate.nurse_type}</Badge>
              )}
              {candidate.primary_specialty && (
                <span className="text-slate-500">{candidate.primary_specialty}</span>
              )}
              <Badge className={`${getStatusBadge(candidate.status)} rounded-full px-2.5 py-0.5 text-xs font-medium`}>
                {candidate.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEditDialog(true)} data-testid="edit-candidate-btn">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDeleteCandidate} data-testid="delete-candidate-btn">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
          <TabsTrigger value="assignments" data-testid="tab-assignments">Assignments</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contact Info */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-sm font-medium">{candidate.email}</p>
                  </div>
                </div>
                {candidate.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Phone</p>
                      <p className="text-sm font-medium">{candidate.phone}</p>
                    </div>
                  </div>
                )}
                {(candidate.city || candidate.province) && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Location</p>
                      <p className="text-sm font-medium">
                        {[candidate.city, candidate.province, candidate.country].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Professional Info */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Professional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Nurse Type / Specialty</p>
                    <p className="text-sm font-medium">
                      {candidate.nurse_type || '-'} • {candidate.primary_specialty || '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Experience</p>
                    <p className="text-sm font-medium">{candidate.years_of_experience || 0} years</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Work Eligibility</p>
                    <p className="text-sm font-medium">{candidate.work_eligibility || '-'}</p>
                  </div>
                </div>
                {candidate.start_date_availability && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Available From</p>
                      <p className="text-sm font-medium">{new Date(candidate.start_date_availability).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {candidate.notes ? (
                  <p className="text-sm text-slate-600">{candidate.notes}</p>
                ) : (
                  <p className="text-sm text-slate-400">No notes added</p>
                )}
                {candidate.tags && candidate.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {candidate.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Documents ({documents.length})</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDocDialog(true)} data-testid="add-document-url-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add by URL
              </Button>
              <Button onClick={() => setShowUploadDialog(true)} className="bg-red-600 hover:bg-red-700" data-testid="upload-document-btn">
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </Button>
            </div>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.length > 0 ? documents.map((doc) => (
                    <TableRow key={doc.id} className="table-row-hover">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(doc.file_type)}
                          <span className="font-medium">{doc.document_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.file_name ? (
                          <div>
                            <p className="text-sm text-slate-600 truncate max-w-[200px]">{doc.file_name}</p>
                            <p className="text-xs text-slate-400">{formatFileSize(doc.file_size)}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">URL only</span>
                        )}
                      </TableCell>
                      <TableCell>{doc.issue_date ? new Date(doc.issue_date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>
                        <Badge className={`${getDocStatusBadge(doc.status)} rounded-full px-2.5 py-0.5 text-xs font-medium`}>
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {doc.file_path && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDownloadDocument(doc.id, doc.file_name)}
                              title="Download"
                            >
                              <Download className="w-4 h-4 text-blue-600" />
                            </Button>
                          )}
                          {doc.status === 'Pending' && (
                            <Button variant="ghost" size="sm" onClick={() => handleVerifyDocument(doc.id)} title="Verify">
                              <CheckCircle className="w-4 h-4 text-teal-600" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteDocument(doc.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        No documents uploaded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <h2 className="text-lg font-semibold">Activity Log</h2>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              {activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity, index) => (
                    <div key={index} className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-700">{activity.description}</p>
                        <p className="text-xs text-slate-400">{new Date(activity.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">No activity recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          <h2 className="text-lg font-semibold">Assignments ({assignments.length})</h2>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Facility</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Contract Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.length > 0 ? assignments.map((assignment) => (
                    <TableRow key={assignment.id} className="table-row-hover">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{assignment.facility_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(assignment.start_date).toLocaleDateString()} - {new Date(assignment.end_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{assignment.contract_type}</TableCell>
                      <TableCell>
                        <Badge className={`${assignment.status === 'Active' ? 'badge-active' : 'badge-neutral'} rounded-full px-2.5 py-0.5 text-xs font-medium`}>
                          {assignment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link to="/assignments">View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No assignments found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Candidate Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Candidate</DialogTitle>
            <DialogDescription>Update candidate information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateCandidate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={formData.first_name || ''}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={formData.last_name || ''}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status || ''} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Do Not Place">Do Not Place</SelectItem>
                  <SelectItem value="On Assignment">On Assignment</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Document by URL Dialog */}
      <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Document by URL</DialogTitle>
            <DialogDescription>Link an existing document URL.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDocument} className="space-y-4">
            <div className="space-y-2">
              <Label>Document Type *</Label>
              <Select value={docFormData.document_type} onValueChange={(v) => setDocFormData({ ...docFormData, document_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>File URL *</Label>
              <Input
                placeholder="https://..."
                value={docFormData.file_url}
                onChange={(e) => setDocFormData({ ...docFormData, file_url: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Issue Date</Label>
                <Input
                  type="date"
                  value={docFormData.issue_date}
                  onChange={(e) => setDocFormData({ ...docFormData, issue_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={docFormData.expiry_date}
                  onChange={(e) => setDocFormData({ ...docFormData, expiry_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={docFormData.notes}
                onChange={(e) => setDocFormData({ ...docFormData, notes: e.target.value })}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDocDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700">Add Document</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Upload a document file for this candidate.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadDocument} className="space-y-4">
            <div className="space-y-2">
              <Label>Document Type *</Label>
              <Select value={uploadData.document_type} onValueChange={(v) => setUploadData({ ...uploadData, document_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* File Upload Zone */}
            <div className="space-y-2">
              <Label>File *</Label>
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  uploadData.file ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-red-300 hover:bg-red-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept={ALLOWED_EXTENSIONS.join(',')}
                />
                {uploadData.file ? (
                  <div className="flex items-center justify-center gap-3">
                    {getFileIcon('.' + uploadData.file.name.split('.').pop())}
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-700">{uploadData.file.name}</p>
                      <p className="text-xs text-slate-500">{formatFileSize(uploadData.file.size)}</p>
                    </div>
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadData({ ...uploadData, file: null });
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-600">Click to select a file</p>
                    <p className="text-xs text-slate-400 mt-1">
                      PDF, DOC, DOCX, JPG, PNG, GIF, TXT (max 10MB)
                    </p>
                  </>
                )}
              </div>
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Uploading...</span>
                  <span className="text-slate-600">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Issue Date</Label>
                <Input
                  type="date"
                  value={uploadData.issue_date}
                  onChange={(e) => setUploadData({ ...uploadData, issue_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={uploadData.expiry_date}
                  onChange={(e) => setUploadData({ ...uploadData, expiry_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={uploadData.notes}
                onChange={(e) => setUploadData({ ...uploadData, notes: e.target.value })}
                rows={2}
                placeholder="Optional notes about this document"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowUploadDialog(false)} disabled={uploading}>
                Cancel
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={uploading || !uploadData.file}>
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CandidateDetailPage;
