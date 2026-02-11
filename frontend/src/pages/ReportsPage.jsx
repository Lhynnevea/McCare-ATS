import React, { useState, useEffect } from 'react';
import { api } from '../App';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import {
  Users,
  Building2,
  DollarSign,
  TrendingUp,
  Calendar,
  FileText
} from 'lucide-react';

const ReportsPage = () => {
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      const [statsRes, invoicesRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/invoices')
      ]);
      setStats(statsRes.data);
      setInvoices(invoicesRes.data);
    } catch (error) {
      toast.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const pipelineData = stats?.leads_by_stage ? Object.entries(stats.leads_by_stage).map(([stage, count]) => ({
    name: stage,
    value: count
  })) : [];

  const specialtyData = stats?.candidates_by_specialty ? Object.entries(stats.candidates_by_specialty).map(([specialty, count]) => ({
    name: specialty || 'Unspecified',
    count: count
  })) : [];

  const COLORS = ['#ff0000', '#008080', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1'];

  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalHours = invoices.reduce((sum, inv) => sum + (inv.total_hours || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="reports-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-slate-500 mt-1">Overview of recruitment metrics and billing data</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Leads</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.total_leads || 0}</p>
                <p className="text-xs text-slate-400 mt-1">All time</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Candidates</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.active_candidates || 0}</p>
                <p className="text-xs text-slate-400 mt-1">Ready to place</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Assignments</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.active_assignments || 0}</p>
                <p className="text-xs text-slate-400 mt-1">Currently deployed</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Revenue</p>
                <p className="text-3xl font-bold text-green-600">${totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">Approved timesheets</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Funnel */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Lead Pipeline Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData} layout="vertical" margin={{ left: 40, right: 20 }}>
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#ff0000" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Candidates by Specialty */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Candidates by Specialty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-center">
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie
                    data={specialtyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="count"
                  >
                    {specialtyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 grid grid-cols-2 gap-2 pl-4">
                {specialtyData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs text-slate-600 truncate">{item.name}</span>
                    <span className="text-xs font-semibold text-slate-900">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing Summary */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Billing Summary by Facility</CardTitle>
            <Badge variant="secondary">{invoices.length} periods</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Timesheets</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length > 0 ? invoices.map((invoice, index) => (
                <TableRow key={index} className="table-row-hover">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{invoice.facility_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{invoice.period}</TableCell>
                  <TableCell>{invoice.total_hours?.toFixed(1) || 0} hrs</TableCell>
                  <TableCell className="font-medium text-green-600">
                    ${invoice.total_amount?.toLocaleString() || 0}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{invoice.timesheets?.length || 0}</Badge>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    No billing data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Open Job Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-5xl font-bold text-amber-600">{stats?.open_job_orders || 0}</p>
              <p className="text-sm text-slate-500 mt-2">Positions to fill</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Partner Facilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-5xl font-bold text-teal-600">{stats?.total_facilities || 0}</p>
              <p className="text-sm text-slate-500 mt-2">Healthcare partners</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Pending Timesheets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-5xl font-bold text-blue-600">{stats?.pending_timesheets || 0}</p>
              <p className="text-sm text-slate-500 mt-2">Awaiting approval</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsPage;
