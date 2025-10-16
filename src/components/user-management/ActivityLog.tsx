import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Activity, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  MoreHorizontal,
  User,
  Shield,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Trash2,
  Edit,
  UserPlus,
  UserX,
  Key
} from 'lucide-react';
import { User as UserType } from '@/lib/types/roles';

interface ActivityLogProps {
  currentUser?: UserType | null;
}

interface ActivityEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  result: 'success' | 'failure' | 'denied';
}

export function ActivityLog({ currentUser }: ActivityLogProps) {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedResult, setSelectedResult] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [activitiesPerPage] = useState(20);

  // Mock data - in real app, this would come from API
  useEffect(() => {
    const mockActivities: ActivityEntry[] = [
      {
        id: '1',
        userId: '1',
        userName: 'Nalungu Kevin',
        userEmail: 'nalungukevin@gmail.com',
        action: 'create_user',
        resource: 'user',
        details: {
          email: 'john.doe@company.com',
          role: 'organization_admin',
          firstName: 'John',
          lastName: 'Doe'
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        result: 'success'
      },
      {
        id: '2',
        userId: '1',
        userName: 'Nalungu Kevin',
        userEmail: 'nalungukevin@gmail.com',
        action: 'update_user',
        resource: 'user',
        details: {
          userId: '2',
          changes: ['role', 'permissions'],
          previousRole: 'employee',
          newRole: 'payroll_manager'
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        result: 'success'
      },
      {
        id: '3',
        userId: '2',
        userName: 'John Doe',
        userEmail: 'john.doe@company.com',
        action: 'login',
        resource: 'auth',
        details: {
          method: 'password',
          rememberMe: true
        },
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        result: 'success'
      },
      {
        id: '4',
        userId: '3',
        userName: 'Jane Smith',
        userEmail: 'jane.smith@company.com',
        action: 'failed_login',
        resource: 'auth',
        details: {
          reason: 'invalid_password',
          attempts: 3
        },
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
        result: 'failure'
      },
      {
        id: '5',
        userId: '4',
        userName: 'Mike Wilson',
        userEmail: 'mike.wilson@company.com',
        action: 'access_denied',
        resource: 'user_management',
        details: {
          reason: 'insufficient_permissions',
          requestedAction: 'delete_user'
        },
        ipAddress: '192.168.1.103',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        result: 'denied'
      },
      {
        id: '6',
        userId: '1',
        userName: 'Nalungu Kevin',
        userEmail: 'nalungukevin@gmail.com',
        action: 'change_role',
        resource: 'user',
        details: {
          targetUser: 'jane.smith@company.com',
          previousRole: 'employee',
          newRole: 'hr_business_partner',
          reason: 'promotion'
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        result: 'success'
      },
      {
        id: '7',
        userId: '1',
        userName: 'Nalungu Kevin',
        userEmail: 'nalungukevin@gmail.com',
        action: 'reset_password',
        resource: 'user',
        details: {
          targetUser: 'mike.wilson@company.com',
          method: 'admin_reset'
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        result: 'success'
      },
      {
        id: '8',
        userId: '2',
        userName: 'John Doe',
        userEmail: 'john.doe@company.com',
        action: 'export_users',
        resource: 'user',
        details: {
          format: 'csv',
          filters: ['active_only', 'organization_only'],
          recordCount: 45
        },
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        result: 'success'
      }
    ];
    
    setActivities(mockActivities);
    setIsLoading(false);
  }, []);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create_user':
        return <UserPlus className="h-4 w-4" />;
      case 'update_user':
        return <Edit className="h-4 w-4" />;
      case 'delete_user':
        return <Trash2 className="h-4 w-4" />;
      case 'change_role':
        return <Shield className="h-4 w-4" />;
      case 'reset_password':
        return <Key className="h-4 w-4" />;
      case 'login':
        return <User className="h-4 w-4" />;
      case 'failed_login':
        return <AlertCircle className="h-4 w-4" />;
      case 'access_denied':
        return <AlertCircle className="h-4 w-4" />;
      case 'export_users':
        return <Download className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string, result: string) => {
    if (result === 'failure' || result === 'denied') {
      return 'text-red-600';
    }
    
    switch (action) {
      case 'create_user':
      case 'login':
        return 'text-green-600';
      case 'update_user':
      case 'change_role':
      case 'reset_password':
        return 'text-blue-600';
      case 'delete_user':
        return 'text-red-600';
      case 'failed_login':
      case 'access_denied':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Success</Badge>;
      case 'failure':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Failed</Badge>;
      case 'denied':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">Denied</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = !searchTerm || 
      activity.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.resource.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = selectedAction === 'all' || activity.action === selectedAction;
    const matchesResult = selectedResult === 'all' || activity.result === selectedResult;
    
    return matchesSearch && matchesAction && matchesResult;
  });

  const uniqueActions = [...new Set(activities.map(a => a.action))].sort();

  // Pagination
  const totalPages = Math.ceil(filteredActivities.length / activitiesPerPage);
  const startIndex = (currentPage - 1) * activitiesPerPage;
  const endIndex = startIndex + activitiesPerPage;
  const currentPageActivities = filteredActivities.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Activity Log</h2>
          <p className="text-muted-foreground">
            Monitor user actions and system events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Log
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedResult} onValueChange={setSelectedResult}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="All Results" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failure">Failed</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activities ({filteredActivities.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPageActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="" />
                          <AvatarFallback className="text-xs">
                            {getInitials(activity.userName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">
                            {activity.userName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {activity.userEmail}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={getActionColor(activity.action, activity.result)}>
                          {getActionIcon(activity.action)}
                        </div>
                        <span className="text-sm">
                          {activity.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {activity.resource}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm max-w-xs truncate">
                        {Object.entries(activity.details).map(([key, value]) => (
                          <div key={key} className="flex gap-1">
                            <span className="text-muted-foreground">{key}:</span>
                            <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getResultBadge(activity.result)}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                        {activity.ipAddress}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {formatTimestamp(activity.timestamp)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Export Entry
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredActivities.length)} of {filteredActivities.length} activities
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


