import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Upload, Globe, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurrencyByCode } from "@/lib/constants/countries";
import AddEmployeeDialog from "./AddEmployeeDialog";
import EditEmployeeDialog from "./EditEmployeeDialog";
import BulkUploadEmployeesDialog from "./BulkUploadEmployeesDialog";

interface Employee {
  id: string;
  first_name: string;
  middle_name?: string | null;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  pay_type: string;
  pay_rate: number;
  country: string;
  currency: string;
  status: string;
  employee_type: string;
  pay_groups?: { name: string };
}

const EmployeesTab = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [payTypeFilter, setPayTypeFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
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
        .order("first_name");

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

  const getFullName = (employee: Employee) => {
    const parts = [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean);
    return parts.join(" ");
  };

  const filteredEmployees = employees.filter((employee) => {
    const fullName = getFullName(employee);
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const formatPayRate = (rate: number, payType: string, currencyCode: string) => {
    const currency = getCurrencyByCode(currencyCode);
    const symbol = currency?.symbol || currencyCode;
    const decimals = currency?.decimalPlaces ?? 2;
    
    const formattedRate = rate.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    
    switch (payType) {
      case "hourly":
        return `${symbol}${formattedRate}/hr`;
      case "salary":
        return `${symbol}${formattedRate}/mo`;
      case "piece_rate":
        return `${symbol}${formattedRate}/piece`;
      default:
        return `${symbol}${formattedRate}`;
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowEditDialog(true);
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
        
        <div className="flex gap-2 shrink-0">
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
          <Button onClick={() => setShowBulkUploadDialog(true)} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
        </div>
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
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Pay Type</TableHead>
                  <TableHead>Pay Rate</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Pay Group</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{getFullName(employee)}</TableCell>
                    <TableCell>
                      {employee.employee_type === 'expatriate' ? (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                          <Globe className="h-3 w-3 mr-1" />
                          Expat
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-100">
                          <Flag className="h-3 w-3 mr-1" />
                          Local
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{formatPayType(employee.pay_type)}</TableCell>
                    <TableCell>{formatPayRate(employee.pay_rate, employee.pay_type, employee.currency)}</TableCell>
                    <TableCell>{employee.country}</TableCell>
                    <TableCell>{employee.currency}</TableCell>
                    <TableCell>{employee.pay_groups?.name || "Unassigned"}</TableCell>
                    <TableCell>
                      <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                        {employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditEmployee(employee)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
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
      
      <EditEmployeeDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onEmployeeUpdated={fetchEmployees}
        employee={selectedEmployee}
      />

      <BulkUploadEmployeesDialog
        open={showBulkUploadDialog}
        onOpenChange={setShowBulkUploadDialog}
        onEmployeesAdded={fetchEmployees}
      />
    </div>
  );
};

export default EmployeesTab;