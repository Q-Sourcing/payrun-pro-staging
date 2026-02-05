import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Upload, Globe, Flag, ChevronDown, UserPlus, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getCurrencyByCode } from "@/lib/constants/countries";
import { format } from "date-fns";
import AddEmployeeDialog from "./AddEmployeeDialog";
import EditEmployeeDialog from "./EditEmployeeDialog";
import BulkUploadEmployeesDialog from "./BulkUploadEmployeesDialog";
import { ColumnVisibilityDialog } from "./ColumnVisibilityDialog";
import PageHeader from "@/components/PageHeader";
import TableWrapper from "@/components/TableWrapper";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { Settings2 } from "lucide-react";

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
  employee_type_id?: string | null;
  employee_type_name?: string; // resolved from employee_types
  pay_groups?: { name: string };
  created_at?: string; // Date added timestamp
  sub_department?: string | null;
}

const EmployeesTab = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [payTypeFilter, setPayTypeFilter] = useState("all");
  const [prefixFilter, setPrefixFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [sortBy, setSortBy] = useState("name"); // name | employee_number
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState<string | null>(null);

  // Column visibility state
  const availableColumns = [
    { key: 'employee_number', label: 'Employee ID' },
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'email', label: 'Email' },
    { key: 'pay_type', label: 'Pay Type' },
    { key: 'pay_rate', label: 'Pay Rate' },
    { key: 'country', label: 'Country' },
    { key: 'currency', label: 'Currency' },
    { key: 'pay_group', label: 'Pay Group' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Date Added' },
    { key: 'actions', label: 'Actions' },
  ];

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('employee_directory_columns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // If parsing fails, use defaults
      }
    }
    // Default: all columns visible
    const defaults: Record<string, boolean> = {};
    availableColumns.forEach(col => {
      defaults[col.key] = true;
    });
    return defaults;
  });

  const [showColumnVisibilityDialog, setShowColumnVisibilityDialog] = useState(false);

  // Save column visibility to localStorage
  useEffect(() => {
    localStorage.setItem('employee_directory_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Get unique values for filter dropdowns
  // Filter out empty strings, null, and undefined values to prevent SelectItem errors
  const uniqueCountries = [...new Set(employees.map(e => e.country).filter(v => v && v.trim() !== ''))].sort();
  const uniqueCurrencies = [...new Set(employees.map(e => e.currency).filter(v => v && v.trim() !== ''))].sort();
  const uniqueEmployeeTypes = [...new Set(employees.map(e => e.employee_type_name || e.employee_type).filter(v => v && v.trim() !== ''))].sort();

  const fetchEmployees = async () => {
    try {
      // Load company/org context (best-effort)
      const { data: cs } = await (supabase as any)
        .from('company_settings')
        .select('company_name')
        .maybeSingle();
      setCompanyName(cs?.company_name || null);

      // Fetch all employees
      const { data: employeesData, error } = await (supabase as any)
        .from("employees")
        .select("*")
        .order("first_name");

      if (error) throw error;

      if (!employeesData || employeesData.length === 0) {
        setEmployees([]);
        return;
      }

      const employeeIds = employeesData.map(e => e.id);
      const typeIds = [...new Set((employeesData as any[]).map(e => e.employee_type_id).filter(Boolean))] as string[];

      // Load employee types for FK resolution
      let typeMap = new Map<string, string>();
      if (typeIds.length > 0) {
        const { data: types } = await (supabase as any)
          .from('employee_types')
          .select('id, name')
          .in('id', typeIds);
        typeMap = new Map(((types as any[]) || []).map(t => [t.id, t.name]));
      }

      // Simple fetch of employees with their assigned pay groups
      const { data: employeesWithGroups, error: groupsError } = await (supabase as any)
        .from("employees")
        .select("id, pay_group_id")
        .in('id', employeeIds)
        .not('pay_group_id', 'is', null);

      if (groupsError) {
        console.error("Error fetching pay groups:", groupsError);
      }

      // Get unique pay group IDs
      const payGroupIds = [...new Set((employeesWithGroups || []).map(e => e.pay_group_id).filter(Boolean))];

      // Fetch pay group names if we have any
      let payGroupMap = new Map();
      if (payGroupIds.length > 0) {
        const { data: payGroups } = await supabase
          .from("pay_groups")
          .select("id, name")
          .in('id', payGroupIds as string[]);

        payGroupMap = new Map((payGroups || []).map(pg => [pg.id, pg]));
      }

      // Merge pay group info and resolve employee type from table
      const enrichedEmployees = employeesData.map((emp: any) => {
        const empGroup = employeesWithGroups?.find(e => e.id === emp.id);
        const payGroup = empGroup?.pay_group_id ? payGroupMap.get(empGroup.pay_group_id) : null;
        const resolvedTypeName = emp.employee_type_id ? (typeMap.get(emp.employee_type_id) || null) : null;

        return {
          ...emp,
          pay_groups: payGroup || null,
          employee_type_name: resolvedTypeName || emp.employee_type
        };
      });

      setEmployees(enrichedEmployees);
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
      (employee.employee_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.phone || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((employee as any).sub_department || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
    const matchesPayType = payTypeFilter === "all" || employee.pay_type === payTypeFilter;
    const matchesPrefix = prefixFilter === "all" || (employee.employee_number || "").startsWith(prefixFilter + "-");
    const matchesCountry = countryFilter === "all" || employee.country === countryFilter;
    const matchesCurrency = currencyFilter === "all" || employee.currency === currencyFilter;
    const matchesEmployeeType = employeeTypeFilter === "all" ||
      (employee.employee_type_name || employee.employee_type) === employeeTypeFilter;

    // Date range filter
    let matchesDateRange = true;
    if (dateFromFilter || dateToFilter) {
      if (employee.created_at) {
        const createdDate = new Date(employee.created_at);
        if (dateFromFilter && createdDate < new Date(dateFromFilter)) {
          matchesDateRange = false;
        }
        if (dateToFilter && createdDate > new Date(dateToFilter + 'T23:59:59')) {
          matchesDateRange = false;
        }
      } else {
        matchesDateRange = false;
      }
    }

    return matchesSearch && matchesStatus && matchesPayType && matchesPrefix &&
      matchesCountry && matchesCurrency && matchesEmployeeType && matchesDateRange;
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
      case "daily_rate":
        return "Daily Rate";
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
      const { data: employeesWithoutNumbers, error: fetchError } = await (supabase as any)
        .from("employees")
        .select("id, sub_department, country, employee_type, pay_group_id")
        .is("employee_number", null);

      if (fetchError) throw fetchError;

      if (employeesWithoutNumbers && employeesWithoutNumbers.length > 0) {
        // Generate employee numbers for each employee
        for (const employee of employeesWithoutNumbers) {
          const { error: updateError } = await (supabase as any)
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
        subtitle={`${filteredEmployees.length} employee${filteredEmployees.length !== 1 ? 's' : ''} found${companyName ? ` • ${companyName}` : ''}`}
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
              variant="outline"
              size="sm"
              onClick={() => setShowColumnVisibilityDialog(true)}
              className="h-9 px-3"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Columns
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 h-9 px-3 text-sm">
                  Add Employee
                  <ChevronDown className="h-3 w-3 ml-1.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowAddDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Single Employee
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowBulkUploadDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Upload
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        filters={
          <div className="space-y-4">
            {/* Main search and quick filters */}
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
                  <SelectItem value="daily_rate">Daily Rate</SelectItem>
                </SelectContent>
              </Select>

              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {uniqueCountries.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Currencies</SelectItem>
                  {uniqueCurrencies.map(currency => (
                    <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Additional filters row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Select value={employeeTypeFilter} onValueChange={setEmployeeTypeFilter}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Employee Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueEmployeeTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
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

              <Input
                type="date"
                placeholder="Date From"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="h-11"
              />

              <Input
                type="date"
                placeholder="Date To"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="h-11"
              />

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

            {/* Clear filters button */}
            {(searchTerm || statusFilter !== 'all' || payTypeFilter !== 'all' || prefixFilter !== 'all' ||
              countryFilter !== 'all' || currencyFilter !== 'all' || employeeTypeFilter !== 'all' ||
              dateFromFilter || dateToFilter) && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setPayTypeFilter("all");
                      setPrefixFilter("all");
                      setCountryFilter("all");
                      setCurrencyFilter("all");
                      setEmployeeTypeFilter("all");
                      setDateFromFilter("");
                      setDateToFilter("");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
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
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr>
              {visibleColumns.employee_number !== false && (
                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Employee ID</th>
              )}
              {visibleColumns.name !== false && (
                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Name</th>
              )}
              {visibleColumns.type !== false && (
                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Type</th>
              )}
              {visibleColumns.email !== false && (
                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Email</th>
              )}
              {visibleColumns.pay_type !== false && (
                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Pay Type</th>
              )}
              {visibleColumns.pay_rate !== false && (
                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Pay Rate</th>
              )}
              {visibleColumns.country !== false && (
                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Country</th>
              )}
              {visibleColumns.currency !== false && (
                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Currency</th>
              )}
              {visibleColumns.pay_group !== false && (
                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Pay Group</th>
              )}
              {visibleColumns.status !== false && (
                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Status</th>
              )}
              {visibleColumns.created_at !== false && (
                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Date Added</th>
              )}
              {visibleColumns.actions !== false && (
                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedEmployees.map((employee, index) => (
              <tr
                key={employee.id}
                className="hover:bg-muted/50 border-b border-border"
              >
                {visibleColumns.employee_number !== false && (
                  <td className="px-4 py-2 text-sm">
                    <div className="font-medium text-foreground">
                      {employee.employee_number || "—"}
                    </div>
                  </td>
                )}
                {visibleColumns.name !== false && (
                  <td className="px-4 py-2 text-sm">
                    <div className="font-medium text-foreground">
                      {getFullName(employee)}
                    </div>
                  </td>
                )}
                {visibleColumns.type !== false && (
                  <td className="px-4 py-2 text-sm">
                    {String((employee.employee_type_name || employee.employee_type || '')).toLowerCase().includes('expat') ? (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-medium px-3 py-1 border border-blue-200 dark:border-blue-800">
                        <Globe className="h-3 w-3 mr-1" />
                        {employee.employee_type_name || 'Expatriate'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800 font-medium px-3 py-1">
                        <Flag className="h-3 w-3 mr-1" />
                        {employee.employee_type_name || 'Local'}
                      </Badge>
                    )}
                  </td>
                )}
                {visibleColumns.email !== false && (
                  <td className="px-4 py-2 text-sm text-muted-foreground">{employee.email}</td>
                )}
                {visibleColumns.pay_type !== false && (
                  <td className="px-4 py-2 text-sm">
                    <div className="font-medium text-foreground">{formatPayType(employee.pay_type)}</div>
                  </td>
                )}
                {visibleColumns.pay_rate !== false && (
                  <td className="px-4 py-2 text-sm">
                    <div className="font-medium text-foreground">{formatPayRate(employee.pay_rate, employee.pay_type, employee.currency)}</div>
                  </td>
                )}
                {visibleColumns.country !== false && (
                  <td className="px-4 py-2 text-sm text-muted-foreground">{employee.country}</td>
                )}
                {visibleColumns.currency !== false && (
                  <td className="px-4 py-2 text-sm text-muted-foreground">{employee.currency}</td>
                )}
                {visibleColumns.pay_group !== false && (
                  <td className="px-4 py-2 text-sm text-muted-foreground">{employee.pay_groups?.name || "Unassigned"}</td>
                )}
                {visibleColumns.status !== false && (
                  <td className="px-4 py-2 text-sm">
                    <Badge
                      variant={employee.status === "active" ? "default" : "secondary"}
                      className={`font-medium px-3 py-1 ${employee.status === "active"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                        }`}
                    >
                      {employee.status}
                    </Badge>
                  </td>
                )}
                {visibleColumns.created_at !== false && (
                  <td className="px-4 py-2 text-sm text-muted-foreground">
                    {employee.created_at ? format(new Date(employee.created_at), 'MMM dd, yyyy') : '—'}
                  </td>
                )}
                {visibleColumns.actions !== false && (
                  <td className="px-4 py-2 text-sm">
                    <div className="flex items-center gap-1">
                      {(employee as any).project_id && (
                        <Link to={`/projects/${(employee as any).project_id}`} className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="View Project">
                          <LinkIcon className="h-4 w-4" />
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-muted hover:text-foreground"
                        onClick={() => handleEditEmployee(employee)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
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

      <ColumnVisibilityDialog
        open={showColumnVisibilityDialog}
        onOpenChange={setShowColumnVisibilityDialog}
        columns={availableColumns}
        visibleColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
      />
    </div>
  );
};

export default EmployeesTab;