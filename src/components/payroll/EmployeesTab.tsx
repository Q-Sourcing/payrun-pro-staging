import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Upload, Globe, Flag, ChevronDown, UserPlus, Link as LinkIcon, Filter, Settings2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useOrg } from "@/lib/tenant/OrgContext";
import { getCurrencyByCode } from "@/lib/constants/countries";
import { format } from "date-fns";
import AddEmployeeDialog from "./AddEmployeeDialog";
import EditEmployeeDialog from "./EditEmployeeDialog";
import BulkImportChoiceDialog from "./BulkImportChoiceDialog";
import { ColumnVisibilityDialog } from "./ColumnVisibilityDialog";
import PageHeader from "@/components/PageHeader";
import TableWrapper from "@/components/TableWrapper";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { PaginationControls } from "@/components/common/PaginationControls";
import { PageSize, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/types/pagination";

interface Employee {
  id: string;
  employee_number?: string;
  first_name: string;
  middle_name?: string | null;
  last_name?: string | null;
  email: string;
  personal_email?: string | null;
  phone?: string | null;
  work_phone?: string | null;
  pay_type: string;
  pay_rate: number;
  country: string;
  currency: string;
  status: string;
  employment_status?: string | null;
  employee_type: string;
  engagement_type?: "Permanent" | "Contract" | "Temporary" | "Casual" | "Trainee" | "Intern" | null;
  employee_type_id?: string | null;
  employee_type_name?: string;
  pay_groups?: { name: string };
  created_at?: string;
  sub_department?: string | null;
  nationality?: string | null;
  citizenship?: string | null;
  designation?: string | null;
  work_location?: string | null;
  probation_status?: "on_probation" | "confirmed" | "extended" | null;
  probation_end_date?: string | null;
}

const EmployeesTab = () => {
  const { organizationId, companyId } = useOrg();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [sortBy, setSortBy] = useState("created_at_desc");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(() => {
    const saved = localStorage.getItem('payrun-pro:pageSize:employees');
    if (saved) {
      const n = parseInt(saved, 10);
      if (PAGE_SIZE_OPTIONS.includes(n as PageSize)) return n as PageSize;
    }
    return DEFAULT_PAGE_SIZE;
  });

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
      try { return JSON.parse(saved); } catch { /* use defaults */ }
    }
    const defaults: Record<string, boolean> = {};
    availableColumns.forEach(col => { defaults[col.key] = true; });
    return defaults;
  });

  const [showColumnVisibilityDialog, setShowColumnVisibilityDialog] = useState(false);

  useEffect(() => {
    localStorage.setItem('employee_directory_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const uniqueCountries = [...new Set(employees.map(e => e.country).filter(v => v && v.trim() !== ''))].sort();
  const uniqueCurrencies = [...new Set(employees.map(e => e.currency).filter(v => v && v.trim() !== ''))].sort();
  const uniqueEmployeeTypes = [...new Set(employees.map(e => e.employee_type_name || e.employee_type).filter(v => v && v.trim() !== ''))].sort();

  const fetchEmployees = async () => {
    try {
      const { data: cs } = await (supabase as any)
        .from('company_settings')
        .select('company_name')
        .maybeSingle();
      setCompanyName(cs?.company_name || null);

      let empQuery = (supabase as any)
        .from("employees")
        .select("*");

      if (organizationId) empQuery = empQuery.eq('organization_id', organizationId);
      if (companyId) empQuery = empQuery.eq('company_id', companyId);

      const { data: employeesData, error } = await empQuery.order("first_name");
      if (error) throw error;

      if (!employeesData || employeesData.length === 0) {
        setEmployees([]);
        return;
      }

      const employeeIds = employeesData.map(e => e.id);
      const typeIds = [...new Set((employeesData as any[]).map(e => e.employee_type_id).filter(Boolean))] as string[];

      let typeMap = new Map<string, string>();
      if (typeIds.length > 0) {
        const { data: types } = await (supabase as any)
          .from('employee_types')
          .select('id, name')
          .in('id', typeIds);
        typeMap = new Map(((types as any[]) || []).map(t => [t.id, t.name]));
      }

      const { data: employeesWithGroups, error: groupsError } = await (supabase as any)
        .from("employees")
        .select("id, pay_group_id")
        .in('id', employeeIds)
        .not('pay_group_id', 'is', null);

      if (groupsError) console.error("Error fetching pay groups:", groupsError);

      const payGroupIds = [...new Set((employeesWithGroups || []).map(e => e.pay_group_id).filter(Boolean))];

      let payGroupMap = new Map();
      if (payGroupIds.length > 0) {
        const { data: payGroups } = await supabase
          .from("pay_groups")
          .select("id, name")
          .in('id', payGroupIds as string[]);
        payGroupMap = new Map((payGroups || []).map(pg => [pg.id, pg]));
      }

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
      toast({ title: "Error", description: "Failed to fetch employees", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, [organizationId, companyId]);

  useEffect(() => {
    const action = searchParams.get("action");
    if (action !== "create") return;
    setShowAddDialog(true);
    const next = new URLSearchParams(searchParams);
    next.delete("action");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const getFullName = (employee: Employee) => {
    return [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(" ");
  };

  const getDisplayStatus = (employee: Employee) =>
    (employee.employment_status && employee.employment_status.trim()) ||
    (employee.status ? employee.status.charAt(0).toUpperCase() + employee.status.slice(1) : "Active");

  const uniqueStatusOptions = [...new Set(employees.map((e) => getDisplayStatus(e)).filter(Boolean))].sort();

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (payTypeFilter !== 'all') count++;
    if (prefixFilter !== 'all') count++;
    if (countryFilter !== 'all') count++;
    if (currencyFilter !== 'all') count++;
    if (employeeTypeFilter !== 'all') count++;
    if (dateFromFilter) count++;
    if (dateToFilter) count++;
    return count;
  }, [statusFilter, payTypeFilter, prefixFilter, countryFilter, currencyFilter, employeeTypeFilter, dateFromFilter, dateToFilter]);

  const filteredEmployees = employees.filter((employee) => {
    const fullName = getFullName(employee);
    const matchesSearch = (
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.employee_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.phone || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((employee as any).sub_department || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesStatus = statusFilter === "all" || getDisplayStatus(employee) === statusFilter;
    const matchesPayType = payTypeFilter === "all" || employee.pay_type === payTypeFilter;
    const matchesPrefix = prefixFilter === "all" || (employee.employee_number || "").startsWith(prefixFilter + "-");
    const matchesCountry = countryFilter === "all" || employee.country === countryFilter;
    const matchesCurrency = currencyFilter === "all" || employee.currency === currencyFilter;
    const matchesEmployeeType = employeeTypeFilter === "all" ||
      (employee.employee_type_name || employee.employee_type) === employeeTypeFilter;

    let matchesDateRange = true;
    if (dateFromFilter || dateToFilter) {
      if (employee.created_at) {
        const createdDate = new Date(employee.created_at);
        if (dateFromFilter && createdDate < new Date(dateFromFilter)) matchesDateRange = false;
        if (dateToFilter && createdDate > new Date(dateToFilter + 'T23:59:59')) matchesDateRange = false;
      } else {
        matchesDateRange = false;
      }
    }

    return matchesSearch && matchesStatus && matchesPayType && matchesPrefix &&
      matchesCountry && matchesCurrency && matchesEmployeeType && matchesDateRange;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (sortBy === "employee_number") return (a.employee_number || "").localeCompare(b.employee_number || "");
    return getFullName(a).localeCompare(getFullName(b));
  });

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, payTypeFilter, prefixFilter, countryFilter, currencyFilter, employeeTypeFilter, dateFromFilter, dateToFilter]);

  // Paginated slice
  const totalItems = sortedEmployees.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedEmployees = sortedEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Clamp page if out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const handlePageSizeChange = (size: PageSize) => {
    setPageSize(size);
    setCurrentPage(1);
    localStorage.setItem('payrun-pro:pageSize:employees', String(size));
  };

  const formatPayType = (payType: string) => {
    switch (payType) {
      case "piece_rate": return "Piece Rate";
      case "daily_rate": return "Daily Rate";
      default: return payType.charAt(0).toUpperCase() + payType.slice(1);
    }
  };

  const formatPayRate = (rate: number, payType: string, currencyCode: string) => {
    const currency = getCurrencyByCode(currencyCode);
    const symbol = currency?.symbol || currencyCode;
    const decimals = currency?.decimalPlaces ?? 2;
    const formattedRate = rate.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    switch (payType) {
      case "hourly": return `${symbol}${formattedRate}/hr`;
      case "salary": return `${symbol}${formattedRate}/mo`;
      case "piece_rate": return `${symbol}${formattedRate}/piece`;
      default: return `${symbol}${formattedRate}`;
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowEditDialog(true);
  };

  const generateEmployeeNumbers = async () => {
    try {
      setLoading(true);
      const { data: employeesWithoutNumbers, error: fetchError } = await (supabase as any)
        .from("employees")
        .select("id, sub_department, country, employee_type, pay_group_id")
        .is("employee_number", null);
      if (fetchError) throw fetchError;

      if (employeesWithoutNumbers && employeesWithoutNumbers.length > 0) {
        for (const employee of employeesWithoutNumbers) {
          const { error: updateError } = await (supabase as any)
            .from("employees")
            .update({ employee_number: `EMP-${String(employee.id).slice(-6).toUpperCase()}` })
            .eq("id", employee.id);
          if (updateError) console.error(`Error updating employee ${employee.id}:`, updateError);
        }
        toast({ title: "Employee Numbers Generated", description: `Generated employee numbers for ${employeesWithoutNumbers.length} employees.` });
      } else {
        toast({ title: "No Action Needed", description: "All employees already have employee numbers." });
      }
      fetchEmployees();
    } catch (error: any) {
      toast({ title: "Error generating employee numbers", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPayTypeFilter("all");
    setPrefixFilter("all");
    setCountryFilter("all");
    setCurrencyFilter("all");
    setEmployeeTypeFilter("all");
    setDateFromFilter("");
    setDateToFilter("");
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Employee Directory"
        subtitle={`${filteredEmployees.length} employee${filteredEmployees.length !== 1 ? 's' : ''} found${companyName ? ` • ${companyName}` : ''}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={generateEmployeeNumbers} variant="outline" size="sm" disabled={loading} className="shrink-0 h-9">
              <Globe className="h-4 w-4 mr-2" />
              Fix Employee IDs
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={() => setShowColumnVisibilityDialog(true)}>
                  <Settings2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Column Visibility</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showFilters ? "secondary" : "outline"}
                  size="icon"
                  className="shrink-0 h-9 w-9 relative"
                  onClick={() => setShowFilters(v => !v)}
                >
                  <Filter className="h-4 w-4" />
                  {activeFilterCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Filters</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="shrink-0 h-9 px-3 text-sm">
                  Add Employee
                  <ChevronDown className="h-3 w-3 ml-1.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowAddDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Single Employee
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowBulkImportDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Import
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
        filters={
          <div className="space-y-4">
            {/* Search always visible */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            {/* Collapsible filters */}
            {showFilters && (
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {uniqueStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select value={payTypeFilter} onValueChange={setPayTypeFilter}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Pay Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="salary">Salary</SelectItem>
                      <SelectItem value="piece_rate">Piece Rate</SelectItem>
                      <SelectItem value="daily_rate">Daily Rate</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Country" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {uniqueCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Currency" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Currencies</SelectItem>
                      {uniqueCurrencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select value={employeeTypeFilter} onValueChange={setEmployeeTypeFilter}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Employee Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {uniqueEmployeeTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <Select value={prefixFilter} onValueChange={setPrefixFilter}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Prefix" /></SelectTrigger>
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

                  <Input type="date" placeholder="Date From" value={dateFromFilter} onChange={(e) => setDateFromFilter(e.target.value)} className="h-10" />
                  <Input type="date" placeholder="Date To" value={dateToFilter} onChange={(e) => setDateToFilter(e.target.value)} className="h-10" />

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Sort by" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee_number">Employee ID</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                    </SelectContent>
                  </Select>

                  {activeFilterCount > 0 && (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="h-10">
                      Clear Filters
                    </Button>
                  )}
                </div>
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
            {searchTerm || activeFilterCount > 0
              ? 'Try adjusting your search criteria to find employees.'
              : 'Get started by adding your first employee to the system.'
            }
          </p>
          <Button onClick={() => setShowAddDialog(true)} className="h-11 px-6">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Employee
          </Button>
        </div>
      ) : (
        <>
          <div className="min-w-0">
            <TableWrapper containerClassName="w-full">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr>
                  {visibleColumns.employee_number !== false && <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Employee ID</th>}
                  {visibleColumns.name !== false && <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Name</th>}
                  {visibleColumns.type !== false && <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Type</th>}
                  {visibleColumns.email !== false && <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Email</th>}
                  {visibleColumns.pay_type !== false && <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Pay Type</th>}
                  {visibleColumns.pay_rate !== false && <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Pay Rate</th>}
                  {visibleColumns.country !== false && <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Country</th>}
                  {visibleColumns.currency !== false && <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Currency</th>}
                  {visibleColumns.pay_group !== false && <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Pay Group</th>}
                  {visibleColumns.status !== false && <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Status</th>}
                  {visibleColumns.created_at !== false && <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Date Added</th>}
                  {visibleColumns.actions !== false && <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-muted/50 border-b border-border">
                    {visibleColumns.employee_number !== false && (
                      <td className="px-4 py-2 text-sm"><div className="font-medium text-foreground">{employee.employee_number || "—"}</div></td>
                    )}
                    {visibleColumns.name !== false && (
                      <td className="px-4 py-2 text-sm">
                        <Link to={`/employees/${employee.id}`} className="font-medium text-primary hover:underline whitespace-nowrap">{getFullName(employee)}</Link>
                      </td>
                    )}
                    {visibleColumns.type !== false && (
                      <td className="px-4 py-2 text-sm">
                        {String((employee.employee_type_name || employee.employee_type || '')).toLowerCase().includes('expat') ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-medium px-3 py-1 border border-blue-200 dark:border-blue-800">
                            <Globe className="h-3 w-3 mr-1" />{employee.employee_type_name || 'Expatriate'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800 font-medium px-3 py-1">
                            <Flag className="h-3 w-3 mr-1" />{employee.employee_type_name || 'Local'}
                          </Badge>
                        )}
                      </td>
                    )}
                    {visibleColumns.email !== false && <td className="px-4 py-2 text-sm text-muted-foreground">{employee.email}</td>}
                    {visibleColumns.pay_type !== false && <td className="px-4 py-2 text-sm"><div className="font-medium text-foreground">{formatPayType(employee.pay_type)}</div></td>}
                    {visibleColumns.pay_rate !== false && <td className="px-4 py-2 text-sm"><div className="font-medium text-foreground">{formatPayRate(employee.pay_rate, employee.pay_type, employee.currency)}</div></td>}
                    {visibleColumns.country !== false && <td className="px-4 py-2 text-sm text-muted-foreground">{employee.country}</td>}
                    {visibleColumns.currency !== false && <td className="px-4 py-2 text-sm text-muted-foreground">{employee.currency}</td>}
                    {visibleColumns.pay_group !== false && <td className="px-4 py-2 text-sm text-muted-foreground">{employee.pay_groups?.name || "Unassigned"}</td>}
                    {visibleColumns.status !== false && (
                      <td className="px-4 py-2 text-sm">
                        {(() => {
                          const statusLabel = getDisplayStatus(employee);
                          const isInactive = ["inactive", "terminated", "resigned", "deceased"].includes(statusLabel.toLowerCase());
                          return (
                            <Badge
                              variant={isInactive ? "secondary" : "default"}
                              className={`font-medium px-3 py-1 ${isInactive
                                ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                                : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800"
                                }`}
                            >
                              {statusLabel}
                            </Badge>
                          );
                        })()}
                      </td>
                    )}
                    {visibleColumns.created_at !== false && (
                      <td className="px-4 py-2 text-sm text-muted-foreground">{employee.created_at ? format(new Date(employee.created_at), 'MMM dd, yyyy') : '—'}</td>
                    )}
                    {visibleColumns.actions !== false && (
                      <td className="px-4 py-2 text-sm">
                        <div className="flex items-center gap-1">
                          {(employee as any).project_id && (
                            <Link to={`/projects/${(employee as any).project_id}`} className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="View Project">
                              <LinkIcon className="h-4 w-4" />
                            </Link>
                          )}
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted hover:text-foreground" onClick={() => handleEditEmployee(employee)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </TableWrapper>
          </div>

          {/* Pagination */}
          <PaginationControls
            currentPage={currentPage}
            pageSize={pageSize}
            total={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
            className="pt-2"
          />
        </>
      )}

      <AddEmployeeDialog open={showAddDialog} onOpenChange={setShowAddDialog} onEmployeeAdded={fetchEmployees} />
      <EditEmployeeDialog open={showEditDialog} onOpenChange={setShowEditDialog} onEmployeeUpdated={fetchEmployees} employee={selectedEmployee} />
      <BulkImportChoiceDialog open={showBulkImportDialog} onOpenChange={setShowBulkImportDialog} onEmployeesAdded={fetchEmployees} />
      <ColumnVisibilityDialog open={showColumnVisibilityDialog} onOpenChange={setShowColumnVisibilityDialog} columns={availableColumns} visibleColumns={visibleColumns} onColumnsChange={setVisibleColumns} />
    </div>
  );
};

export default EmployeesTab;
