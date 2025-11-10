import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SecurityService, type LockedUser } from '@/lib/services/security/security-service';
import { toast } from '@/hooks/use-toast';
import { Unlock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface LockedUsersListProps {
  orgId?: string;
  onUnlock?: () => void;
}

export function LockedUsersList({ orgId, onUnlock }: LockedUsersListProps) {
  const [lockedUsers, setLockedUsers] = useState<LockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const loadLockedUsers = async () => {
    try {
      setIsLoading(true);
      const users = await SecurityService.getLockedUsers(orgId);
      setLockedUsers(users);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load locked users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLockedUsers();
  }, [orgId]);

  const handleUnlock = async (userId: string, userName: string) => {
    try {
      setUnlockingId(userId);
      await SecurityService.unlockUser({
        user_id: userId,
        reason: `Unlocked by administrator`,
      });

      toast({
        title: 'Success',
        description: `Account for ${userName} has been unlocked`,
      });

      // Reload list
      await loadLockedUsers();

      // Notify parent
      if (onUnlock) {
        onUnlock();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to unlock account',
        variant: 'destructive',
      });
    } finally {
      setUnlockingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Locked Users</CardTitle>
          <CardDescription>Users with locked accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (lockedUsers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Locked Users</CardTitle>
          <CardDescription>Users with locked accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No locked accounts
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Locked Users</CardTitle>
        <CardDescription>
          {lockedUsers.length} account{lockedUsers.length !== 1 ? 's' : ''} currently locked
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Locked At</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Failed Attempts</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lockedUsers.map((user) => {
              const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{userName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.locked_at
                      ? formatDistanceToNow(new Date(user.locked_at), { addSuffix: true })
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {user.lockout_reason || 'N/A'}
                  </TableCell>
                  <TableCell>{user.failed_login_attempts}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={unlockingId === user.id}
                        >
                          {unlockingId === user.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Unlocking...
                            </>
                          ) : (
                            <>
                              <Unlock className="mr-2 h-4 w-4" />
                              Unlock
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Unlock Account</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to unlock the account for{' '}
                            <strong>{userName}</strong> ({user.email})?
                            <br />
                            <br />
                            This will reset their failed login attempts and allow them to log in again.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleUnlock(user.id, userName)}
                            className="bg-primary"
                          >
                            Unlock Account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

