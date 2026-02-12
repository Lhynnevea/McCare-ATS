import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Bell, CheckCircle, User, FileText, AlertTriangle, Clock, ExternalLink, Check } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

export default function NotificationsDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const [notifRes, countRes] = await Promise.all([
        axios.get(`${API}/api/notifications?limit=20`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/api/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setNotifications(notifRes.data);
      setUnreadCount(countRes.data.count);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/api/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Navigate based on entity type
    if (notification.entity_type === 'lead') {
      navigate('/leads');
    } else if (notification.entity_type === 'document' || notification.entity_type === 'candidate') {
      const candidateId = notification.metadata?.candidate_id || notification.entity_id;
      if (candidateId) {
        navigate(`/candidates/${candidateId}`);
      } else {
        navigate('/compliance');
      }
    }
    
    setOpen(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_lead':
        return <User className="w-4 h-4 text-green-600" />;
      case 'expiring_credential':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'expired_credential':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-amber-50 border-amber-200';
      case 'normal':
        return 'bg-white border-slate-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          data-testid="notifications-trigger"
        >
          <Bell className="w-5 h-5 text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-96 p-0"
        data-testid="notifications-dropdown"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-slate-900">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs text-red-600 hover:text-red-700"
            >
              <Check className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Bell className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50/50' : ''
                  } ${getPriorityColor(notification.priority)}`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!notification.is_read ? 'font-semibold' : 'font-medium'} text-slate-900 line-clamp-1`}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-400">
                          {formatTime(notification.created_at)}
                        </span>
                        {notification.priority === 'urgent' && (
                          <Badge variant="destructive" className="text-xs py-0">Urgent</Badge>
                        )}
                        {notification.priority === 'high' && (
                          <Badge variant="outline" className="text-xs py-0 border-amber-500 text-amber-600">High</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-3 border-t bg-slate-50">
          <Button 
            variant="ghost" 
            className="w-full text-sm text-slate-600"
            onClick={() => {
              navigate('/notifications-settings');
              setOpen(false);
            }}
          >
            <FileText className="w-4 h-4 mr-2" />
            Notification Settings
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
