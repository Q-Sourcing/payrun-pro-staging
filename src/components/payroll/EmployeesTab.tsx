import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddEmployeeDialog from "./AddEmployeeDialog";

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  pay_type: string;
  pay_rate: number;
  country: string;
  status: string;
  pay_groups?: { name: string };
}

const EmployeesTab = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [payTypeFilter, setPayTypeFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select(`
          *,
          pay_groups (
            name
          )
        `)
        .order("name");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
    const matchesPayType = payTypeFilter === "all" || employee.pay_type === payTypeFilter;
    
    return matchesSearch && matchesStatus && matchesPayType;
  });

  const formatPayType = (payType: string) => {
    switch (payType) {
      case "piece_rate":
        return "Piece Rate";
      default:
        return payType.charAt(0).toUpperCase() + payType.slice(1);
    }
  };

  const formatPayRate = (rate: number, payType: string) => {
    switch (payType) {
      case "hourly":
        return `$${rate}/hr`;
      case "salary":
        return `$${rate.toLocaleString()}/yr`;
      case "piece_rate":
        return `$${rate}/piece`;
      default:
        return `$${rate}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading employees...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={payTypeFilter} onValueChange={setPayTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Pay Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="salary">Salary</SelectItem>
              <SelectItem value="piece_rate">Piece Rate</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={() => setShowAddDialog(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
          <CardDescription>
            Manage your employee information and pay rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No employees found</p>
              <Button onClick={() => setShowAddDialog(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Employee
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Pay Type</TableHead>
                  <TableHead>Pay Rate</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Pay Group</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{formatPayType(employee.pay_type)}</TableCell>
                    <TableCell>{formatPayRate(employee.pay_rate, employee.pay_type)}</TableCell>
                    <TableCell>{employee.country}</TableCell>
                    <TableCell>{employee.pay_groups?.name || "Unassigned"}</TableCell>
                    <TableCell>
                      <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                        {employee.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddEmployeeDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
        onEmployeeAdded={fetchEmployees}
      />
    </div>
  );
};

export default EmployeesTab;