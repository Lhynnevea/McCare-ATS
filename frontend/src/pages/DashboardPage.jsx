import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Users,
  UserCheck,
  Briefcase,
  Calendar,
  FileWarning,
  Clock,
  TrendingUp,
  Building2,
  ArrowRight,
  Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, activitiesRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-activities')
      ]);
      setStats(statsRes.data);
      setActivities(activitiesRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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
    name: stage.replace(' ', '\n'),
    value: count
  })) : [];

  const specialtyData = stats?.candidates_by_specialty ? Object.entries(stats.candidates_by_specialty).map(([specialty, count]) => ({
    name: specialty || 'Unspecified',
    value: count
  })) : [];

  const COLORS = ['#ff0000', '#008080', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1'];

  const statCards = [
    { label: 'Total Leads', value: stats?.total_leads || 0, icon: Users, color: 'bg-blue-500', link: '/leads' },
    { label: 'Active Candidates', value: stats?.active_candidates || 0, icon: UserCheck, color: 'bg-teal-500', link: '/candidates' },
    { label: 'Open Job Orders', value: stats?.open_job_orders || 0, icon: Briefcase, color: 'bg-amber-500', link: '/clients-jobs' },
    { label: 'Active Assignments', value: stats?.active_assignments || 0, icon: Calendar, color: 'bg-green-500', link: '/assignments' },
    { label: 'Expiring Credentials', value: stats?.credentials_expiring_30_days || 0, icon: FileWarning, color: 'bg-red-500', link: '/compliance' },
    { label: 'Pending Timesheets', value: stats?.pending_timesheets || 0, icon: Clock, color: 'bg-purple-500', link: '/timesheets' },
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'created': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'stage_change': return <Activity className="w-4 h-4 text-blue-500" />;
      case 'document_uploaded': return <FileWarning className="w-4 h-4 text-amber-500" />;
      default: return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back! Here's your recruitment overview.</p>
        </div>
        <Button asChild className="bg-red-600 hover:bg-red-700">
          <Link to="/leads">
            <Users className="w-4 h-4 mr-2" />
            View All Leads
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4" data-testid="stats-grid">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={index} to={stat.link}>
              <Card className="card-hover cursor-pointer border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg ${stat.color} bg-opacity-10 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${stat.color.replace('bg-', 'text-')}`} />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Leads by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#ff0000" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Candidates by Specialty */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Candidates by Specialty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center">
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie
                    data={specialtyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {specialtyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 grid grid-cols-2 gap-2">
                {specialtyData.slice(0, 8).map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs text-slate-600 truncate">{item.name}</span>
                    <span className="text-xs font-semibold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/leads">
                <Users className="w-4 h-4 mr-3 text-blue-500" />
                Add New Lead
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/candidates">
                <UserCheck className="w-4 h-4 mr-3 text-teal-500" />
                View Candidates
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/clients-jobs">
                <Building2 className="w-4 h-4 mr-3 text-amber-500" />
                Manage Job Orders
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/compliance">
                <FileWarning className="w-4 h-4 mr-3 text-red-500" />
                Check Compliance
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Assignments */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Upcoming Assignments</CardTitle>
              <Badge variant="secondary">{stats?.assignments_starting_14_days || 0} in 14 days</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">Starting in 14 days</p>
                  <p className="text-sm text-slate-500">Assignments beginning soon</p>
                </div>
                <span className="text-2xl font-bold text-teal-600">{stats?.assignments_starting_14_days || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">Starting in 30 days</p>
                  <p className="text-sm text-slate-500">Plan ahead</p>
                </div>
                <span className="text-2xl font-bold text-blue-600">{stats?.assignments_starting_30_days || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activities.length > 0 ? activities.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="mt-0.5">{getActivityIcon(activity.activity_type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{activity.description}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
