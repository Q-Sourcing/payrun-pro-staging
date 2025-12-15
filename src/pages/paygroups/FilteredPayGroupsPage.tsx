import React, { useState, useEffect, useCallback } from 'react';
import { PayGroupsService } from '@/lib/services/paygroups.service';
import { PayGroup, PayGroupType, PayGroupCategory, HeadOfficeSubType, ProjectsSubType, ManpowerFrequency } from '@/lib/types/paygroups';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PayGroupCard } from '@/components/paygroups/PayGroupCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, UserPlus } from 'lucide-react';
import { CreatePayGroupModal } from '@/components/paygroups/CreatePayGroupModal';
import { AssignEmployeeModal } from '@/components/paygroups/AssignEmployeeModal';
import { useToast } from '@/hooks/use-toast';
import { PaginatedTable, ColumnDef } from '@/components/common/PaginatedTable';
import { PaginationControls } from '@/components/common/PaginationControls';
import { ViewToggle } from '@/components/common/ViewToggle';
import { usePagination } from '@/hooks/usePagination';
import { ViewMode } from '@/lib/types/pagination';
import { getViewMode, setViewMode as saveViewMode } from '@/lib/utils/localStorage';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface FilteredPayGroupsPageProps {
  category: PayGroupCategory;
  employeeType?: HeadOfficeSubType | ProjectsSubType;
  payFrequency?: ManpowerFrequency;
  title: string;
  description: string;
}

// Helper function to map employeeType to PayGroupType
const getPayGroupTypeFromEmployeeType = (employeeType?: string): PayGroupType | undefined => {
  if (!employeeType) return undefined;
  const mapping: Record<string, PayGroupType> = {
    'regular': 'regular',
    'expatriate': 'expatriate',
    'interns': 'intern',
    'ippms': 'piece_rate',
  };
  return mapping[employeeType.toLowerCase()];
};

const FilteredPayGroupsPage: React.FC<FilteredPayGroupsPageProps> = ({
  category,
  employeeType,
  payFrequency,
  title,
  description
}) => {
  const [payGroups, setPayGroups] = useState<PayGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PayGroup | undefined>();
  const [ippmsPayType, setIppmsPayType] = useState<'piece_rate' | 'daily_rate'>('piece_rate');
  const { toast } = useToast();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);

  // View mode
  const contextKey = `paygroups-${category}-${employeeType || 'all'}`;
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    return getViewMode(contextKey) || 'card';
  });

  // Pagination
  const pagination = usePagination({
    context: contextKey,
    syncWithUrl: true,
  });

  // Determine pay group type from employeeType
  const defaultType = getPayGroupTypeFromEmployeeType(employeeType);

  // Handle view mode change
  const handleViewModeChange = (mode: ViewMode) => {
    setViewModeState(mode);
    saveViewMode(contextKey, mode);
  };

  // Fetch companies for filter
  useEffect(() => {
    const fetchCompanies = async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      setCompanies(data || []);
    };

    fetchCompanies();
  }, []);

  // Fetch pay groups with pagination
  const loadPayGroups = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build base query
      let query = supabase
        .from('pay_groups')
        .select('*', { count: 'exact' })
        .eq('category', category);

      // Apply employee type filter
      if (employeeType) {
        query = query.eq('employee_type', employeeType);
      }

      // Apply pay frequency filter
      if (payFrequency) {
        query = query.eq('pay_frequency', payFrequency);
      }

      // Apply company filter
      if (companyFilter !== 'all') {
        query = query.eq('company_id', companyFilter);
      }

      // Apply search
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,paygroup_id.ilike.%${searchTerm}%`);
      }

      // IPPMS pay type filter
      if (employeeType === 'ippms') {
        query = query.eq('pay_type', ippmsPayType);
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

      setPayGroups(data || []);
    } catch (err) {
      console.error('Error loading pay groups:', err);
      setError('Failed to load pay groups. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load pay groups',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [category, employeeType, payFrequency, pagination.page, pagination.pageSize, searchTerm, companyFilter, ippmsPayType]);

  useEffect(() => {
    loadPayGroups();
  }, [loadPayGroups]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      pagination.setSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    loadPayGroups();
    toast({
      title: 'Success',
      description: 'Pay group created successfully',
    });
  };

  const handleAssignSuccess = () => {
    setShowAssignModal(false);
    setSelectedGroup(undefined);
    loadPayGroups();
    toast({
      title: 'Success',
      description: 'Employee assigned successfully',
    });
  };

  // Table columns for table view
  const columns: ColumnDef<PayGroup>[] = [
    {
      header: 'Pay Group Name',
      accessor: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-sm text-muted-foreground font-mono">{row.paygroup_id}</div>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: (row) => (
        <Badge className={getTypeColor(row.type)}>
          {row.type}
        </Badge>
      ),
    },
    {
      header: 'Company/Project',
      accessor: (row) => row.country || '-',
    },
    {
      header: 'Currency',
      accessor: (row) => <span className="font-medium">{row.currency}</span>,
    },
    {
      header: 'Employees',
      accessor: (row) => (
        <div className="flex items-center gap-1">
          <UserPlus className="h-4 w-4 text-muted-foreground" />
          <span>{row.employee_count || 0}</span>
        </div>
      ),
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedGroup(row);
              setShowAssignModal(true);
            }}
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Assign
          </Button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  // Helper functions
  const getTypeColor = (type: PayGroupType) => {
    switch (type) {
      case 'regular': return 'bg-blue-100 text-blue-800 border-0';
      case 'expatriate': return 'bg-emerald-100 text-emerald-800 border-0';
      case 'piece_rate': return 'bg-amber-100 text-amber-800 border-0';
      case 'intern': return 'bg-purple-100 text-purple-800 border-0';
      default: return 'bg-gray-100 text-gray-800 border-0';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle view={viewMode} onViewChange={handleViewModeChange} />
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Pay Group
          </Button>
        </div>
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
                placeholder="Search by name or ID..."
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

            {/* IPPMS Pay Type Toggle */}
            {employeeType === 'ippms' && (
              <div className="flex items-center gap-2">
                <Button
                  variant={ippmsPayType === 'piece_rate' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIppmsPayType('piece_rate')}
                >
                  Piece Rate
                </Button>
                <Button
                  variant={ippmsPayType === 'daily_rate' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIppmsPayType('daily_rate')}
                >
                  Daily Rate
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content - Table or Card View */}
      {viewMode === 'table' ? (
        <PaginatedTable
          data={payGroups}
          columns={columns}
          currentPage={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={pagination.goToPage}
          onPageSizeChange={pagination.changePageSize}
          isLoading={loading}
          error={error}
          emptyMessage="No pay groups found for this category"
          emptyAction={
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Pay Group
            </Button>
          }
          getRowKey={(row) => row.id}
        />
      ) : (
        <>
          {payGroups.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {payGroups.map((group) => (
                  <PayGroupCard
                    key={group.id}
                    group={group}
                    onUpdate={loadPayGroups}
                    onAssignEmployee={(group) => {
                      setSelectedGroup(group);
                      setShowAssignModal(true);
                    }}
                  />
                ))}
              </div>
              <PaginationControls
                currentPage={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                onPageChange={pagination.goToPage}
                onPageSizeChange={pagination.changePageSize}
                isLoading={loading}
              />
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 text-4xl">📋</div>
                <h3 className="mb-2 text-lg font-medium">No pay groups found</h3>
                <p className="mb-4 text-muted-foreground">
                  {searchTerm || companyFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first pay group to get started'}
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Pay Group
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Modals */}
      <CreatePayGroupModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleCreateSuccess}
        defaultType={defaultType}
        defaultCategory={category}
        defaultEmployeeType={employeeType}
        defaultPayFrequency={payFrequency}
      />

      <AssignEmployeeModal
        open={showAssignModal}
        onOpenChange={setShowAssignModal}
        onSuccess={handleAssignSuccess}
        presetGroup={selectedGroup}
      />
    </div>
  );
};

// Head Office Pages
export const HeadOfficeRegularPage = () => (
  <FilteredPayGroupsPage
    category="head_office"
    employeeType="regular"
    title="Head Office - Regular Pay Groups"
    description="Manage regular payroll groups for head office employees"
  />
);

export const HeadOfficeExpatriatePage = () => (
  <FilteredPayGroupsPage
    category="head_office"
    employeeType="expatriate"
    title="Head Office - Expatriate Pay Groups"
    description="Manage expatriate payroll groups for head office"
  />
);

export const HeadOfficeInternsPage = () => (
  <FilteredPayGroupsPage
    category="head_office"
    employeeType="interns"
    title="Head Office - Interns Pay Groups"
    description="Manage intern payroll groups for head office"
  />
);

// Projects Pages
export const ProjectsManpowerDailyPage = () => (
  <FilteredPayGroupsPage
    category="projects"
    employeeType="manpower"
    payFrequency="daily"
    title="Projects - Manpower Daily Pay Groups"
    description="Manage daily manpower payroll groups for projects"
  />
);

export const ProjectsManpowerBiWeeklyPage = () => (
  <FilteredPayGroupsPage
    category="projects"
    employeeType="manpower"
    payFrequency="bi_weekly"
    title="Projects - Manpower Bi-weekly Pay Groups"
    description="Manage bi-weekly manpower payroll groups for projects"
  />
);

export const ProjectsManpowerMonthlyPage = () => (
  <FilteredPayGroupsPage
    category="projects"
    employeeType="manpower"
    payFrequency="monthly"
    title="Projects - Manpower Monthly Pay Groups"
    description="Manage monthly manpower payroll groups for projects"
  />
);

export const ProjectsIppmsPage = () => (
  <FilteredPayGroupsPage
    category="projects"
    employeeType="ippms"
    title="Projects - IPPMS Pay Groups"
    description="Manage IPPMS (piece rate) payroll groups for projects"
  />
);

export const ProjectsExpatriatePage = () => (
  <FilteredPayGroupsPage
    category="projects"
    employeeType="expatriate"
    title="Projects - Expatriate Pay Groups"
    description="Manage expatriate payroll groups for projects"
  />
);

