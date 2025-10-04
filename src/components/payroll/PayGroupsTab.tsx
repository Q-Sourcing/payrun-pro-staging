import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AddPayGroupDialog from "./AddPayGroupDialog";
import PayGroupDetailsDialog from "./PayGroupDetailsDialog";

interface PayGroup {
  id: string;
  name: string;
  country: string;
  pay_frequency: string;
  default_tax_percentage: number;
  description?: string;
  employee_count?: number;
}

const PayGroupsTab = () => {
  const [payGroups, setPayGroups] = useState<PayGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedPayGroupId, setSelectedPayGroupId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPayGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("pay_groups")
        .select(`
          *,
          employees(count)
        `)
        .order("name");

      if (error) throw error;
      
      const payGroupsWithCount = data?.map(group => ({
        ...group,
        employee_count: group.employees?.[0]?.count || 0
      })) || [];
      
      setPayGroups(payGroupsWithCount);
    } catch (error) {
      console.error("Error fetching pay groups:", error);
      toast({
        title: "Error",
        description: "Failed to fetch pay groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayGroups();
  }, []);

  const formatFrequency = (frequency: string) => {
    switch (frequency) {
      case "bi_weekly":
        return "Bi-Weekly";
      default:
        return frequency.charAt(0).toUpperCase() + frequency.slice(1);
    }
  };

  const getFrequencyBadgeColor = (frequency: string) => {
    switch (frequency) {
      case "weekly":
        return "bg-blue-100 text-blue-800";
      case "bi_weekly":
        return "bg-green-100 text-green-800";
      case "monthly":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewPayGroup = (groupId: string) => {
    setSelectedPayGroupId(groupId);
    setShowDetailsDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading pay groups...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Pay Groups</h3>
          <p className="text-sm text-muted-foreground">
            Configure pay frequencies and tax settings by country
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Pay Group
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pay Groups</CardTitle>
          <CardDescription>
            Organize employees into groups with specific pay frequencies and tax rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payGroups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No pay groups found</p>
              <Button onClick={() => setShowAddDialog(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Pay Group
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Tax Rate</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payGroups.map((group) => (
                  <TableRow 
                    key={group.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewPayGroup(group.id)}
                  >
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>{group.country}</TableCell>
                    <TableCell>
                      <Badge className={getFrequencyBadgeColor(group.pay_frequency)}>
                        {formatFrequency(group.pay_frequency)}
                      </Badge>
                    </TableCell>
                    <TableCell>{group.default_tax_percentage}%</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {group.employee_count} employees
                      </Badge>
                    </TableCell>
                    <TableCell>{group.description || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddPayGroupDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
        onPayGroupAdded={fetchPayGroups}
      />

      <PayGroupDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        payGroupId={selectedPayGroupId}
        onEditPayGroup={() => {
          toast({
            title: "Coming Soon",
            description: "Edit pay group functionality will be available soon",
          });
        }}
        onRunPayroll={() => {
          toast({
            title: "Coming Soon",
            description: "Run payroll functionality will be available soon",
          });
        }}
      />
    </div>
  );
};

export default PayGroupsTab;