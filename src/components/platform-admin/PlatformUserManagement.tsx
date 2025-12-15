import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Settings, Loader2 } from 'lucide-react';
import { PlatformAdminService } from '@/lib/services/platform-admin.service';
import { useToast } from '@/hooks/use-toast';
import { PlatformUserWizard } from './user-creation/PlatformUserWizard'; // Will create this next
import { Dialog, DialogContent } from '@/components/ui/dialog';

export function PlatformUserManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showWizard, setShowWizard] = useState(false);
    const { toast } = useToast();

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await PlatformAdminService.getAllUsers();
            setUsers(data);
        } catch (error: any) {
            toast({
                title: 'Error loading users',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const filteredUsers = users.filter(user =>
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Platform Users</h2>
                    <p className="text-muted-foreground">
                        Manage users across all organizations
                    </p>
                </div>
                <Button onClick={() => setShowWizard(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create User
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle>All Users</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Organization</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No users found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">
                                                {user.first_name} {user.last_name}
                                            </TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                {user.organization?.name || <span className="text-muted-foreground italic">None (Platform Only)</span>}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{user.role}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm">
                                                    <Settings className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showWizard} onOpenChange={setShowWizard}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    {/* We will implement PlatformUserWizard separately */}
                    <div className="p-4">
                        <h2 className="text-xl font-bold mb-4">Create Platform User</h2>
                        <PlatformUserWizard onComplete={() => {
                            setShowWizard(false);
                            loadUsers();
                        }} onCancel={() => setShowWizard(false)} />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
