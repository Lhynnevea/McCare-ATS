import React, { useState, useEffect } from 'react';
import { api, useAuth } from '../App';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Separator } from '../components/ui/separator';
import {
  User,
  Users,
  Shield,
  Database,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const SettingsPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (user?.role === 'Admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users');
    }
  };

  const handleSeedDatabase = async () => {
    if (!window.confirm('This will reset all data and seed with demo data. Continue?')) return;
    setSeeding(true);
    try {
      const response = await api.post('/seed');
      toast.success('Database seeded successfully!');
      console.log('Seed result:', response.data);
    } catch (error) {
      toast.error('Failed to seed database');
    } finally {
      setSeeding(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      'Admin': 'bg-red-100 text-red-700 border-red-200',
      'Recruiter': 'bg-blue-100 text-blue-700 border-blue-200',
      'Compliance Officer': 'bg-amber-100 text-amber-700 border-amber-200',
      'Scheduler': 'bg-teal-100 text-teal-700 border-teal-200',
      'Finance': 'bg-green-100 text-green-700 border-green-200',
      'Nurse': 'bg-purple-100 text-purple-700 border-purple-200',
    };
    return colors[role] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account and system settings</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          {user?.role === 'Admin' && (
            <>
              <TabsTrigger value="users">
                <Users className="w-4 h-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="system">
                <Database className="w-4 h-4 mr-2" />
                System
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid gap-6 max-w-2xl">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Your account details and role</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-2xl font-bold text-red-600">
                      {user?.first_name?.[0]}{user?.last_name?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-slate-900">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <Badge className={`${getRoleBadgeColor(user?.role)} border mt-1`}>
                      {user?.role}
                    </Badge>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input value={user?.first_name || ''} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input value={user?.last_name || ''} disabled />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user?.email || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input value={user?.role || ''} disabled />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>Access levels for your role</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {getPermissionsForRole(user?.role).map((permission, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-teal-500" />
                      <span className="text-sm text-slate-700">{permission}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab (Admin only) */}
        {user?.role === 'Admin' && (
          <TabsContent value="users">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View all registered users</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} className="table-row-hover">
                        <TableCell className="font-medium">{u.first_name} {u.last_name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge className={`${getRoleBadgeColor(u.role)} border rounded-full px-2.5 py-0.5 text-xs`}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* System Tab (Admin only) */}
        {user?.role === 'Admin' && (
          <TabsContent value="system">
            <div className="grid gap-6 max-w-2xl">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Demo Data</CardTitle>
                  <CardDescription>Reset and seed the database with demo data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">Warning</p>
                        <p className="text-sm text-amber-700">
                          This action will delete all existing data and replace it with demo data.
                          This cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={handleSeedDatabase} 
                    disabled={seeding}
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    data-testid="seed-database-btn"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${seeding ? 'animate-spin' : ''}`} />
                    {seeding ? 'Seeding...' : 'Seed Database'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Demo Credentials</CardTitle>
                  <CardDescription>Test accounts for each role</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {[
                      { role: 'Admin', email: 'admin@mccareglobal.com', pass: 'admin123' },
                      { role: 'Recruiter', email: 'recruiter@mccareglobal.com', pass: 'recruiter123' },
                      { role: 'Compliance', email: 'compliance@mccareglobal.com', pass: 'compliance123' },
                      { role: 'Scheduler', email: 'scheduler@mccareglobal.com', pass: 'scheduler123' },
                      { role: 'Finance', email: 'finance@mccareglobal.com', pass: 'finance123' },
                      { role: 'Nurse', email: 'nurse@mccareglobal.com', pass: 'nurse123' },
                    ].map((cred, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge className={`${getRoleBadgeColor(cred.role)} border`}>{cred.role}</Badge>
                          <span className="text-sm text-slate-600">{cred.email}</span>
                        </div>
                        <code className="text-xs bg-slate-200 px-2 py-1 rounded">{cred.pass}</code>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

const getPermissionsForRole = (role) => {
  const permissions = {
    'Admin': [
      'Full access to all modules',
      'User management',
      'System configuration',
      'View all reports',
      'Manage all data'
    ],
    'Recruiter': [
      'Manage leads and pipeline',
      'Create and edit candidates',
      'View job orders',
      'Add notes and activities',
      'Convert leads to candidates'
    ],
    'Compliance Officer': [
      'View all documents',
      'Verify credentials',
      'Monitor expiring documents',
      'Access compliance dashboard',
      'Update document status'
    ],
    'Scheduler': [
      'Create and manage assignments',
      'View candidates and job orders',
      'Schedule placements',
      'Manage timesheets',
      'View facility information'
    ],
    'Finance': [
      'View and approve timesheets',
      'Access billing reports',
      'View assignment rates',
      'Generate invoices',
      'Financial reporting'
    ],
    'Nurse': [
      'View own profile',
      'Update personal information',
      'View assignments',
      'Submit timesheets',
      'Upload documents'
    ]
  };
  return permissions[role] || ['Basic access'];
};

export default SettingsPage;
