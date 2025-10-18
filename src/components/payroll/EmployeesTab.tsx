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
import PageHeader from "@/components/PageHeader";
import TableWrapper from "@/components/TableWrapper";
import LoadingSkeleton from "@/components/LoadingSkeleton";

interface Employee {
  id: string;
  employee_number?: string;
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
  const [prefixFilter, setPrefixFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name"); // name | employee_number
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
    const matchesSearch = (
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.employee_number || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
    const matchesPayType = payTypeFilter === "all" || employee.pay_type === payTypeFilter;
    const matchesPrefix = prefixFilter === "all" || (employee.employee_number || "").startsWith(prefixFilter + "-");
    
    return matchesSearch && matchesStatus && matchesPayType && matchesPrefix;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (sortBy === "employee_number") {
      return (a.employee_number || "").localeCompare(b.employee_number || "");
    }
    return getFullName(a).localeCompare(getFullName(b));
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

  const generateEmployeeNumbers = async () => {
    try {
      setLoading(true);
      // Get all employees without employee numbers
      const { data: employeesWithoutNumbers, error: fetchError } = await supabase
        .from("employees")
        .select("id, department, country, employee_type, pay_group_id")
        .is("employee_number", null);

      if (fetchError) throw fetchError;

      if (employeesWithoutNumbers && employeesWithoutNumbers.length > 0) {
        // Generate employee numbers for each employee
        for (const employee of employeesWithoutNumbers) {
          const { error: updateError } = await supabase
            .from("employees")
            .update({
              employee_number: `EMP-${String(employee.id).slice(-6).toUpperCase()}`
            })
            .eq("id", employee.id);

          if (updateError) {
            console.error(`Error updating employee ${employee.id}:`, updateError);
          }
        }

        toast({
          title: "Employee Numbers Generated",
          description: `Generated employee numbers for ${employeesWithoutNumbers.length} employees.`,
        });
      } else {
        toast({
          title: "No Action Needed",
          description: "All employees already have employee numbers.",
        });
      }
      
      // Refresh the employee list
      fetchEmployees();
    } catch (error: any) {
      toast({
        title: "Error generating employee numbers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Directory"
        subtitle={`${filteredEmployees.length} employee${filteredEmployees.length !== 1 ? 's' : ''} found`}
        actions={
          <>
            <Button 
              onClick={generateEmployeeNumbers} 
              variant="outline"
              disabled={loading}
            >
              <Globe className="h-4 w-4 mr-2" />
              Fix Employee IDs
            </Button>
            <Button 
              onClick={() => setShowBulkUploadDialog(true)} 
              variant="outline"
            >
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </Button>
            <Button 
              onClick={() => setShowAddDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </>
        }
        filters={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={payTypeFilter} onValueChange={setPayTypeFilter}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Pay Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="salary">Salary</SelectItem>
                <SelectItem value="piece_rate">Piece Rate</SelectItem>
              </SelectContent>
            </Select>

            <Select value={prefixFilter} onValueChange={setPrefixFilter}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Prefix" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prefixes</SelectItem>
                <SelectItem value="EMP">EMP</SelectItem>
                <SelectItem value="UG">UG</SelectItem>
                <SelectItem value="KE">KE</SelectItem>
                <SelectItem value="TZ">TZ</SelectItem>
                <SelectItem value="ENG">ENG</SelectItem>
                <SelectItem value="SAL">SAL</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee_number">Employee ID</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Employees Table */}
      {filteredEmployees.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
            <Search className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No employees found</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'all' || payTypeFilter !== 'all' || prefixFilter !== 'all'
              ? 'Try adjusting your search criteria to find employees.'
              : 'Get started by adding your first employee to the system.'
            }
          </p>
          <Button 
            onClick={() => setShowAddDialog(true)} 
            className="h-11 px-6 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Employee
          </Button>
        </div>
      ) : (
        <TableWrapper>
          <Table>
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Employee ID</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Name</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Type</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Email</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Pay Type</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Pay Rate</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Country</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Currency</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Pay Group</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Status</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.map((employee, index) => (
                <tr 
                  key={employee.id}
                  className="hover:bg-slate-50 border-b border-slate-100"
                >
                  <td className="px-4 py-2 text-sm">
                    <div className="font-medium text-slate-900">
                      {employee.employee_number || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <div className="font-medium text-slate-900">
                      {getFullName(employee)}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {employee.employee_type === 'expatriate' ? (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-medium px-3 py-1 border border-blue-200">
                        <Globe className="h-3 w-3 mr-1" />
                        Expat
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-medium px-3 py-1">
                        <Flag className="h-3 w-3 mr-1" />
                        Local
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-600">{employee.email}</td>
                  <td className="px-4 py-2 text-sm">
                    <div className="font-medium text-slate-900">{formatPayType(employee.pay_type)}</div>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <div className="font-medium text-slate-900">{formatPayRate(employee.pay_rate, employee.pay_type, employee.currency)}</div>
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-600">{employee.country}</td>
                  <td className="px-4 py-2 text-sm text-slate-600">{employee.currency}</td>
                  <td className="px-4 py-2 text-sm text-slate-600">{employee.pay_groups?.name || "Unassigned"}</td>
                  <td className="px-4 py-2 text-sm">
                    <Badge 
                      variant={employee.status === "active" ? "default" : "secondary"}
                      className={`font-medium px-3 py-1 ${
                        employee.status === "active" 
                          ? "bg-green-100 text-green-800 border border-green-200" 
                          : "bg-gray-100 text-gray-800 border border-gray-200"
                      }`}
                    >
                      {employee.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                      onClick={() => handleEditEmployee(employee)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      )}

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