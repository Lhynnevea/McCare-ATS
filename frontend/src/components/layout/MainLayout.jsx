import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../App';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FileCheck,
  Building2,
  CalendarClock,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/leads', label: 'Leads', icon: Users },
  { path: '/candidates', label: 'Candidates', icon: UserCheck },
  { path: '/compliance', label: 'Compliance', icon: FileCheck },
  { path: '/clients-jobs', label: 'Clients & Jobs', icon: Building2 },
  { path: '/assignments', label: 'Assignments', icon: CalendarClock },
  { path: '/timesheets', label: 'Timesheets', icon: Clock },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const MainLayout = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      'Admin': 'bg-red-100 text-red-700',
      'Recruiter': 'bg-blue-100 text-blue-700',
      'Compliance Officer': 'bg-amber-100 text-amber-700',
      'Scheduler': 'bg-teal-100 text-teal-700',
      'Finance': 'bg-green-100 text-green-700',
      'Nurse': 'bg-purple-100 text-purple-700',
    };
    return colors[role] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex" data-testid="main-layout">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full" data-testid="sidebar">
        {/* Logo */}
        <div className="p-6 border-b border-slate-100">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-lg leading-tight">McCare</h1>
              <p className="text-xs text-slate-500">Global ATS</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path === '/dashboard' && location.pathname === '/');
            
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-slate-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start p-2 h-auto" data-testid="user-menu-trigger">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-red-100 text-red-700 font-semibold">
                    {getInitials(user?.first_name, user?.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3 text-left flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${getRoleBadgeColor(user?.role)}`}>
                    {user?.role}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer" data-testid="logout-btn">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
