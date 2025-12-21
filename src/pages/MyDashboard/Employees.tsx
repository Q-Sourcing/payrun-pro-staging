import React, { useEffect, useState, useCallback } from 'react';
import { useOrg } from '@/lib/tenant/OrgContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, UserPlus } from 'lucide-react';
import { PaginatedTable, ColumnDef } from '@/components/common/PaginatedTable';
import { usePagination } from '@/hooks/usePagination';
import { Badge } from '@/components/ui/badge';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_number: string;
  company_id: string;
  pay_group_id: string;
  employee_type: any;
  pay_type: string;
  base_rate: number;
  currency: string;
  status: string;
  _company_name?: string;
  _pay_group_name?: string;
  _type_name?: string;
  _full_name?: string;
}

export default function EmployeesOverview() {
  const { organizationId } = useOrg();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<Employee | null>(null);
  const [editRow, setEditRow] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);

  // Pagination
  const pagination = usePagination({
    context: 'employees',
    syncWithUrl: true,
  });

  // Fetch companies for filter
  useEffect(() => {
    if (!organizationId) return;

    const fetchCompanies = async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name');

      setCompanies(data || []);
    };

    fetchCompanies();
  }, [organizationId]);

  // Fetch employees with pagination
  const fetchEmployees = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      // Build base query
      let query = supabase
        .from('employees')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId);

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (companyFilter !== 'all') {
        query = query.eq('company_id', companyFilter);
      }

      // Apply search
      if (searchTerm) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,employee_number.ilike.%${searchTerm}%`);
      }

      // Get total count
      const { count } = await query;
      pagination.setTotal(count || 0);

      // Apply pagination
      const from = (pagination.page - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;

      const { data, error: fetchError } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Enrich employee data
      const employeeData = data || [];
      const companyIds = [...new Set(employeeData.map((e) => e.company_id).filter(Boolean))];
      const payGroupIds = [...new Set(employeeData.map((e) => e.pay_group_id).filter(Boolean))];

      let companyMap = new Map<string, string>();
      if (companyIds.length) {
        const { data: companiesData } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', companyIds as string[]);
        if (companiesData) companiesData.forEach((c) => companyMap.set(c.id, c.name));
      }

      let payGroupMap = new Map<string, string>();
      if (payGroupIds.length) {
        const { data: pgs } = await supabase
          .from('pay_groups')
          .select('id, name')
          .in('id', payGroupIds as string[]);
        if (pgs) pgs.forEach((p) => payGroupMap.set(p.id, p.name));
      }

      const enriched = employeeData.map((e) => ({
        ...e,
        _company_name: companyMap.get(e.company_id) || '-',
        _pay_group_name: payGroupMap.get(e.pay_group_id) || '-',
        _type_name: e.employee_type?.name || e.employee_type || '-',
        _full_name: [e.first_name, e.last_name].filter(Boolean).join(' '),
      }));

      setEmployees(enriched);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Failed to load employees. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [organizationId, pagination.page, pagination.pageSize, searchTerm, statusFilter, companyFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      pagination.setSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle delete
  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await supabase.from('employees').delete().eq('id', id);
    if (res.error) {
      await supabase.from('employee_master').delete().eq('id', id);
    }
    setDeletingId(null);
    await fetchEmployees();
  }

  // Format helpers
  const fmtPayType = (v: any) => {
    if (!v) return '-';
    const s = String(v);
    if (s === 'piece_rate') return 'Piece Rate';
    if (s === 'daily_rate') return 'Daily Rate';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const fmtCurrency = (n: number, code?: string) => {
    const c = code || 'USD';
    return (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: c });
  };

  // Table columns
  const columns: ColumnDef<Employee>[] = [
    {
      header: 'Employee Name',
      accessor: (row) => (
        <div>
          <div className="font-medium">{row._full_name || row.first_name || row.email}</div>
          <div className="text-sm text-muted-foreground">{row.email}</div>
        </div>
      ),
    },
    {
      header: 'Employee Number',
      accessor: (row) => (
        <span className="font-mono text-sm">{row.employee_number || row.id?.slice(0, 8)}</span>
      ),
    },
    {
      header: 'Company',
      accessor: (row) => row._company_name,
    },
    {
      header: 'Pay Group',
      accessor: (row) => row._pay_group_name,
    },
    {
      header: 'Employment Type',
      accessor: (row) => row._type_name,
    },
    {
      header: 'Status',
      accessor: (row) => (
        <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewRow(row)}>
            View
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditRow(row)}>
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={deletingId === row.id}
            onClick={() => handleDelete(row.id)}
          >
            {deletingId === row.id ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  const total = employees.length > 0 ? pagination.total : 0;
  const active = employees.filter((r) => String(r.status).toLowerCase() === 'active').length;

  return (
    <div className="space-y-6 px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Employees Overview</h1>
        <p className="text-sm text-muted-foreground">Employees in your organization</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <MetricCard label="Total Employees" value={total} loading={loading} />
        <MetricCard label="Active" value={active} loading={loading} />
        <MetricCard label="Inactive" value={total - active} loading={loading} />
        <MetricCard
          label="Avg Base Rate"
          value={
            employees.length > 0
              ? fmtCurrency(
                employees.reduce((sum, e) => sum + (Number(e.base_rate) || 0), 0) /
                employees.length,
                'USD'
              )
              : '-'
          }
          loading={loading}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or employee number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Company Filter */}
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Paginated Table */}
      <PaginatedTable
        data={employees}
        columns={columns}
        currentPage={pagination.page}
        pageSize={pagination.pageSize}
        total={pagination.total}
        onPageChange={pagination.goToPage}
        onPageSizeChange={pagination.changePageSize}
        isLoading={loading}
        error={error}
        emptyMessage="No employees found"
        emptyAction={
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        }
        getRowKey={(row) => row.id}
      />

      {/* View Dialog */}
      <Dialog open={!!viewRow} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {viewRow && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Name" value={viewRow._full_name || viewRow.first_name} />
              <Field label="Email" value={viewRow.email} />
              <Field label="Employee ID" value={viewRow.employee_number || viewRow.id} />
              <Field label="Company" value={viewRow._company_name} />
              <Field label="Type" value={viewRow._type_name} />
              <Field label="Pay Group" value={viewRow._pay_group_name} />
              <Field label="Pay Type" value={fmtPayType(viewRow.pay_type)} />
              <Field label="Base Rate" value={fmtCurrency(viewRow.base_rate || 0, viewRow.currency)} />
              <Field label="Status" value={viewRow.status} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          {editRow && (
            <div className="space-y-3 text-sm">
              <div>Name: {editRow._full_name}</div>
              <div>Status: {editRow.status}</div>
              <div className="text-muted-foreground">
                For full editing, use the Employees page. Basic changes coming soon.
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setEditRow(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ label, value, loading }: { label: string; value: any; loading: boolean }) {
  return (
    <Card className="flex flex-col items-center justify-center py-6">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-sm">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-xl font-semibold">{loading ? '—' : value}</CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value || '-'}</div>
    </div>
  );
}
