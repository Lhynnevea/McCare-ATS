import React, { useState, useEffect } from 'react';
import { api } from '../App';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import {
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  FileWarning,
  Calendar,
  User
} from 'lucide-react';

const CompliancePage = () => {
  const [expiringDocs, setExpiringDocs] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDays, setFilterDays] = useState('30');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDocType, setFilterDocType] = useState('');

  useEffect(() => {
    fetchComplianceData();
  }, [filterDays]);

  const fetchComplianceData = async () => {
    try {
      const [expiringRes, allDocsRes] = await Promise.all([
        api.get(`/compliance/expiring?days=${filterDays}`),
        api.get('/documents')
      ]);
      setExpiringDocs(expiringRes.data);
      setAllDocuments(allDocsRes.data);
    } catch (error) {
      toast.error('Failed to fetch compliance data');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDocument = async (docId) => {
    try {
      await api.put(`/documents/${docId}`, { verified_by: 'current_user' });
      toast.success('Document verified');
      fetchComplianceData();
    } catch (error) {
      toast.error('Failed to verify document');
    }
  };

  const getStatusBadge = (status, isExpired) => {
    if (isExpired) return 'badge-critical';
    switch (status) {
      case 'Verified': return 'badge-active';
      case 'Pending': return 'badge-pending';
      case 'Expiring Soon': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Expired': return 'badge-critical';
      default: return 'badge-neutral';
    }
  };

  const getStatusIcon = (status, isExpired) => {
    if (isExpired) return <XCircle className="w-4 h-4 text-red-500" />;
    switch (status) {
      case 'Verified': return <CheckCircle className="w-4 h-4 text-teal-500" />;
      case 'Pending': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'Expiring Soon': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return <FileWarning className="w-4 h-4 text-slate-400" />;
    }
  };

  const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredDocuments = allDocuments.filter(doc => {
    if (filterStatus && doc.status !== filterStatus) return false;
    if (filterDocType && doc.document_type !== filterDocType) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return doc.document_type.toLowerCase().includes(query);
    }
    return true;
  });

  const documentTypes = [...new Set(allDocuments.map(d => d.document_type))];

  // Summary stats
  const expiredCount = expiringDocs.filter(d => d.is_expired).length;
  const expiringCount = expiringDocs.filter(d => !d.is_expired).length;
  const pendingCount = allDocuments.filter(d => d.status === 'Pending').length;
  const verifiedCount = allDocuments.filter(d => d.status === 'Verified').length;

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
          <p className="text-slate-500 mt-1">Monitor document status and expiring credentials</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Expired</p>
                <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Expiring Soon</p>
                <p className="text-2xl font-bold text-amber-600">{expiringCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Review</p>
                <p className="text-2xl font-bold text-blue-600">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-teal-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Verified</p>
                <p className="text-2xl font-bold text-teal-600">{verifiedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-teal-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Documents Alert */}
      {expiringDocs.length > 0 && (
        <Card className="border-0 shadow-sm bg-red-50 border border-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Documents Requiring Attention ({expiringDocs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm text-red-600">Show documents expiring within:</span>
              <Select value={filterDays} onValueChange={setFilterDays}>
                <SelectTrigger className="w-[140px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-white rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Days Remaining</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiringDocs.map((doc) => {
                    const daysRemaining = getDaysUntilExpiry(doc.expiry_date);
                    return (
                      <TableRow key={doc.id} className="table-row-hover">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="font-medium">{doc.candidate_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{doc.document_type}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {new Date(doc.expiry_date).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${daysRemaining <= 0 ? 'text-red-600' : daysRemaining <= 14 ? 'text-amber-600' : 'text-slate-600'}`}>
                            {daysRemaining <= 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(doc.status, doc.is_expired)}
                            <Badge className={`${getStatusBadge(doc.status, doc.is_expired)} rounded-full px-2.5 py-0.5 text-xs font-medium`}>
                              {doc.is_expired ? 'Expired' : doc.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {doc.status === 'Pending' && (
                            <Button variant="outline" size="sm" onClick={() => handleVerifyDocument(doc.id)}>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Verify
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Documents */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">All Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-documents-input"
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
                <SelectItem value="Verified">Verified</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDocType} onValueChange={setFilterDocType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Document Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {documentTypes.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Type</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length > 0 ? filteredDocuments.map((doc) => (
                <TableRow key={doc.id} className="table-row-hover">
                  <TableCell className="font-medium">{doc.document_type}</TableCell>
                  <TableCell>{doc.issue_date ? new Date(doc.issue_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>{doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(doc.status, false)}
                      <Badge className={`${getStatusBadge(doc.status, false)} rounded-full px-2.5 py-0.5 text-xs font-medium`}>
                        {doc.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {doc.status === 'Pending' && (
                      <Button variant="ghost" size="sm" onClick={() => handleVerifyDocument(doc.id)}>
                        <CheckCircle className="w-4 h-4 mr-1 text-teal-600" />
                        Verify
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    No documents found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompliancePage;
