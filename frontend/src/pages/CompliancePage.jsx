import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../App';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  FileWarning,
  Calendar,
  User,
  Users,
  FileCheck,
  ExternalLink,
  Eye,
  CheckSquare,
  RefreshCw,
  Download,
  AlertCircle
} from 'lucide-react';

const DOCUMENT_TYPES = [
  'Nursing License',
  'Criminal Record Check',
  'Immunization Records',
  'BLS/ACLS',
  'Resume',
  'References',
  'Employment Contract',
  'Government ID',
  'Work Permit',
  'Other'
];

const STATUS_COLORS = {
  'Verified': 'bg-green-100 text-green-700 border-green-200',
  'Pending': 'bg-blue-100 text-blue-700 border-blue-200',
  'Expiring Soon': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Critical': 'bg-orange-100 text-orange-700 border-orange-200',
  'Expired': 'bg-red-100 text-red-700 border-red-200',
  'Fully Compliant': 'bg-green-100 text-green-700 border-green-200',
  'Pending Documents': 'bg-blue-100 text-blue-700 border-blue-200',
  'Missing Required Documents': 'bg-purple-100 text-purple-700 border-purple-200'
};

const CompliancePage = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifyingDoc, setVerifyingDoc] = useState(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDocType, setFilterDocType] = useState('all');
  const [filterProvince, setFilterProvince] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, summaryRes] = await Promise.all([
        api.get('/compliance/dashboard'),
        api.get('/compliance/summary')
      ]);
      setDocuments(dashboardRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      toast.error('Failed to fetch compliance data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDocument = async () => {
    if (!verifyingDoc) return;
    
    try {
      await api.put(`/documents/${verifyingDoc.id}`, { status: 'Verified' });
      toast.success('Document verified successfully');
      setShowVerifyDialog(false);
      setVerifyingDoc(null);
      fetchComplianceData();
    } catch (error) {
      toast.error('Failed to verify document');
    }
  };

  const openVerifyDialog = (doc) => {
    setVerifyingDoc(doc);
    setShowVerifyDialog(true);
  };

  // Get unique provinces from documents
  const provinces = useMemo(() => {
    const provSet = new Set(documents.map(d => d.candidate_province).filter(Boolean));
    return Array.from(provSet).sort();
  }, [documents]);

  // Filter documents based on all criteria
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Tab filter
      if (activeTab === 'expired' && !doc.is_expired) return false;
      if (activeTab === 'expiring' && (doc.is_expired || doc.status !== 'Expiring Soon' && doc.status !== 'Critical')) return false;
      if (activeTab === 'pending' && doc.original_status !== 'Pending') return false;
      if (activeTab === 'verified' && doc.original_status !== 'Verified') return false;
      if (activeTab === 'orphan' && !doc.is_orphan) return false;
      
      // Status filter
      if (filterStatus !== 'all' && doc.status !== filterStatus) return false;
      
      // Document type filter
      if (filterDocType !== 'all' && doc.document_type !== filterDocType) return false;
      
      // Province filter
      if (filterProvince !== 'all' && doc.candidate_province !== filterProvince) return false;
      
      // Search filter (candidate name or document type)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = doc.candidate_name?.toLowerCase().includes(query);
        const matchDocType = doc.document_type?.toLowerCase().includes(query);
        const matchEmail = doc.candidate_email?.toLowerCase().includes(query);
        if (!matchName && !matchDocType && !matchEmail) return false;
      }
      
      return true;
    });
  }, [documents, activeTab, filterStatus, filterDocType, filterProvince, searchQuery]);

  const getStatusBadge = (status, daysRemaining) => {
    const colorClass = STATUS_COLORS[status] || 'bg-slate-100 text-slate-700';
    
    let icon = null;
    switch (status) {
      case 'Verified':
      case 'Fully Compliant':
        icon = <CheckCircle className="w-3 h-3 mr-1" />;
        break;
      case 'Pending':
      case 'Pending Documents':
        icon = <Clock className="w-3 h-3 mr-1" />;
        break;
      case 'Expiring Soon':
        icon = <AlertTriangle className="w-3 h-3 mr-1" />;
        break;
      case 'Critical':
        icon = <AlertCircle className="w-3 h-3 mr-1" />;
        break;
      case 'Expired':
        icon = <XCircle className="w-3 h-3 mr-1" />;
        break;
      case 'Missing Required Documents':
        icon = <FileWarning className="w-3 h-3 mr-1" />;
        break;
    }
    
    return (
      <Badge className={`${colorClass} border flex items-center`}>
        {icon}
        {status}
      </Badge>
    );
  };

  const getDaysRemainingBadge = (days) => {
    if (days === null || days === undefined) return null;
    
    let colorClass = 'bg-green-100 text-green-700';
    if (days < 0) colorClass = 'bg-red-100 text-red-700';
    else if (days <= 7) colorClass = 'bg-orange-100 text-orange-700';
    else if (days <= 30) colorClass = 'bg-yellow-100 text-yellow-700';
    
    return (
      <Badge className={`${colorClass} text-xs`}>
        {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="compliance-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Compliance Dashboard</h1>
          <p className="text-slate-500 mt-1">Monitor document status and candidate compliance</p>
        </div>
        <Button onClick={fetchComplianceData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card 
          className={`border-0 shadow-sm border-l-4 border-l-slate-500 cursor-pointer hover:shadow-md transition-shadow ${activeTab === 'all' ? 'ring-2 ring-slate-500' : ''}`}
          onClick={() => setActiveTab('all')}
          data-testid="summary-total"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Candidates</p>
                <p className="text-2xl font-bold text-slate-700">{summary?.candidates?.total || 0}</p>
              </div>
              <Users className="w-8 h-8 text-slate-200" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`border-0 shadow-sm border-l-4 border-l-green-500 cursor-pointer hover:shadow-md transition-shadow ${activeTab === 'verified' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setActiveTab('verified')}
          data-testid="summary-compliant"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Fully Compliant</p>
                <p className="text-2xl font-bold text-green-600">{summary?.candidates?.fully_compliant || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`border-0 shadow-sm border-l-4 border-l-yellow-500 cursor-pointer hover:shadow-md transition-shadow ${activeTab === 'expiring' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => setActiveTab('expiring')}
          data-testid="summary-expiring"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600">{(summary?.documents?.expiring_soon || 0) + (summary?.documents?.critical || 0)}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-200" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`border-0 shadow-sm border-l-4 border-l-red-500 cursor-pointer hover:shadow-md transition-shadow ${activeTab === 'expired' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setActiveTab('expired')}
          data-testid="summary-expired"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Expired</p>
                <p className="text-2xl font-bold text-red-600">{summary?.documents?.expired || 0}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`border-0 shadow-sm border-l-4 border-l-purple-500 cursor-pointer hover:shadow-md transition-shadow ${activeTab === 'pending' ? 'ring-2 ring-purple-500' : ''}`}
          onClick={() => setActiveTab('pending')}
          data-testid="summary-pending"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Review</p>
                <p className="text-2xl font-bold text-purple-600">{summary?.documents?.pending || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Integrity Warning */}
      {summary?.documents?.orphan > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <div>
              <p className="font-medium text-orange-800">Data Integrity Issue</p>
              <p className="text-sm text-orange-700">
                {summary.documents.orphan} document(s) found without a linked candidate. 
                <Button 
                  variant="link" 
                  className="text-orange-700 underline p-0 h-auto ml-1"
                  onClick={() => setActiveTab('orphan')}
                >
                  View orphan records
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <Label className="text-xs text-slate-500 mb-1 block">Search Candidate / Document</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, email, or document type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger data-testid="filter-status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Verified">Verified</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
                  <SelectItem value="Critical">Critical (&lt;7 days)</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Document Type</Label>
              <Select value={filterDocType} onValueChange={setFilterDocType}>
                <SelectTrigger data-testid="filter-doctype">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {DOCUMENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Province</Label>
              <Select value={filterProvince} onValueChange={setFilterProvince}>
                <SelectTrigger data-testid="filter-province">
                  <SelectValue placeholder="All Provinces" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Provinces</SelectItem>
                  {provinces.map(prov => (
                    <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="all">All Compliance ({documents.length})</TabsTrigger>
          <TabsTrigger value="expired" className="text-red-600">Expired ({summary?.documents?.expired || 0})</TabsTrigger>
          <TabsTrigger value="expiring" className="text-yellow-600">Expiring ({(summary?.documents?.expiring_soon || 0) + (summary?.documents?.critical || 0)})</TabsTrigger>
          <TabsTrigger value="pending" className="text-blue-600">Pending ({summary?.documents?.pending || 0})</TabsTrigger>
          <TabsTrigger value="verified" className="text-green-600">Verified ({summary?.documents?.verified || 0})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Documents Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            Compliance Records ({filteredDocuments.length})
          </CardTitle>
          <CardDescription>
            Click on candidate name to view their profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Candidate</TableHead>
                  <TableHead className="font-semibold">Document Type</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Expiry Date</TableHead>
                  <TableHead className="font-semibold">Days Remaining</TableHead>
                  <TableHead className="font-semibold">Province</TableHead>
                  <TableHead className="font-semibold">Last Updated</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      <FileWarning className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      No compliance records found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((doc) => (
                    <TableRow 
                      key={doc.id} 
                      className={`hover:bg-slate-50 ${doc.is_orphan ? 'bg-orange-50' : ''}`}
                      data-testid={`compliance-row-${doc.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-slate-500" />
                          </div>
                          <div>
                            {doc.is_orphan ? (
                              <span className="text-orange-600 font-medium">{doc.candidate_name}</span>
                            ) : (
                              <Link 
                                to={`/candidates/${doc.candidate_id}`}
                                className="text-slate-900 font-medium hover:text-red-600 hover:underline flex items-center gap-1"
                                data-testid={`candidate-link-${doc.candidate_id}`}
                              >
                                {doc.candidate_name}
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                            {doc.candidate_email && (
                              <p className="text-xs text-slate-500">{doc.candidate_email}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{doc.document_type}</span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(doc.status, doc.days_remaining)}
                      </TableCell>
                      <TableCell>
                        {doc.expiry_date ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(doc.expiry_date).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getDaysRemainingBadge(doc.days_remaining)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">{doc.candidate_province || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-500">
                          {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString() : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {doc.file_url && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(doc.file_url, '_blank')}
                              title="View Document"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {doc.original_status !== 'Verified' && !doc.is_orphan && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => openVerifyDialog(doc)}
                              title="Verify Document"
                              data-testid={`verify-btn-${doc.id}`}
                            >
                              <CheckSquare className="w-4 h-4" />
                            </Button>
                          )}
                          {!doc.is_orphan && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/candidates/${doc.candidate_id}`)}
                              title="View Candidate"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Verify Document Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Document</DialogTitle>
          </DialogHeader>
          {verifyingDoc && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <p><span className="text-slate-500">Candidate:</span> <strong>{verifyingDoc.candidate_name}</strong></p>
                <p><span className="text-slate-500">Document:</span> <strong>{verifyingDoc.document_type}</strong></p>
                {verifyingDoc.expiry_date && (
                  <p><span className="text-slate-500">Expires:</span> <strong>{new Date(verifyingDoc.expiry_date).toLocaleDateString()}</strong></p>
                )}
              </div>
              <p className="text-sm text-slate-600">
                By verifying this document, you confirm that you have reviewed the document 
                and it meets all compliance requirements.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleVerifyDocument}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Verify Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompliancePage;
