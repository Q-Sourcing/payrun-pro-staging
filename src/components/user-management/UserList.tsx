import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  UserX, 
  UserCheck, 
  Mail, 
  Eye,
  Shield,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  Download
} from 'lucide-react';
import { User, UserRole } from '@/lib/types/roles';
import { ROLE_DEFINITIONS } from '@/lib/types/roles';

interface UserListProps {
  users: User[];
  isLoading: boolean;
  onEditUser: (user: User) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedRole: string;
  onRoleChange: (role: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
}

export function UserList({
  users,
  isLoading,
  onEditUser,
  searchTerm,
  onSearchChange,
  selectedRole,
  onRoleChange,
  selectedStatus,
  onStatusChange,
}: UserListProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(currentPageUsers.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleBulkAction = (action: string) => {
    console.log(`Bulk action: ${action} on users:`, selectedUsers);
    // Implement bulk actions here
    setSelectedUsers([]);
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      console.log('Deleting user:', userToDelete.id);
      // Implement delete logic here
      setShowDeleteDialog(false);
      setUserToDelete(null);
    }
  };

  const handleToggleUserStatus = (user: User) => {
    console.log(`Toggling status for user: ${user.id}`);
    // Implement status toggle logic here
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'organization_admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ceo_executive':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'payroll_manager':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'hr_business_partner':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'finance_controller':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'employee':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    
    const now = new Date();
    const loginDate = new Date(lastLogin);
    const diffInHours = Math.floor((now.getTime() - loginDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return loginDate.toLocaleDateString();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Pagination
  const totalPages = Math.ceil(users.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentPageUsers = users.slice(startIndex, endIndex);

  const allSelected = selectedUsers.length === currentPageUsers.length && currentPageUsers.length > 0;
  const someSelected = selectedUsers.length > 0 && selectedUsers.length < currentPageUsers.length;

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
      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={selectedRole} onValueChange={onRoleChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="organization_admin">Org Admin</SelectItem>
                  <SelectItem value="ceo_executive">CEO/Executive</SelectItem>
                  <SelectItem value="payroll_manager">Payroll Manager</SelectItem>
                  <SelectItem value="hr_business_partner">HR Partner</SelectItem>
                  <SelectItem value="finance_controller">Finance Controller</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={onStatusChange}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Bulk Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkAction('activate')}>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Activate Users
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction('deactivate')}>
                      <UserX className="h-4 w-4 mr-2" />
                      Deactivate Users
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBulkAction('export')}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUsers([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      ref={(el) => {
                        if (el && 'indeterminate' in el) {
                          (el as any).indeterminate = someSelected;
                        }
                      }}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Security</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPageUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => 
                          handleSelectUser(user.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="" />
                          <AvatarFallback className="text-xs">
                            {getInitials(user.firstName, user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={getRoleBadgeColor(user.role)}
                      >
                        {ROLE_DEFINITIONS[user.role].name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.isActive ? "default" : "secondary"}
                        className={user.isActive 
                          ? "bg-green-100 text-green-800 border-green-200" 
                          : "bg-gray-100 text-gray-800 border-gray-200"
                        }
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {formatLastLogin(user.lastLogin)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {user.twoFactorEnabled && (
                          <Badge variant="outline" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            2FA
                          </Badge>
                        )}
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
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onEditUser(user)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleToggleUserStatus(user)}
                          >
                            {user.isActive ? (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete User
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
                Showing {startIndex + 1} to {Math.min(endIndex, users.length)} of {users.length} users
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong>?
              This action cannot be undone and will permanently remove the user from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
