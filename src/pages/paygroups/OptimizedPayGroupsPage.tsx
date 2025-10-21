import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Grid3X3, List, Search, Plus, Users, Building2, DollarSign } from 'lucide-react';
import { usePayGroups, usePayGroupSummary } from '@/hooks/use-paygroups';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import OptimizedPayGroupCard from '@/components/paygroups/OptimizedPayGroupCard';
import type { PayGroupType } from '@/lib/types/paygroups';

export default function OptimizedPayGroupsPage() {
  const [viewMode, setViewMode] = useState<'cards' | 'list'>(() => {
    const saved = localStorage.getItem('paygroups-view-mode');
    return (saved as 'cards' | 'list') || 'cards';
  });
  const [selectedType, setSelectedType] = useState<PayGroupType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Save view mode to localStorage
  React.useEffect(() => {
    localStorage.setItem('paygroups-view-mode', viewMode);
  }, [viewMode]);

  // Use optimized hooks with caching
  const { data: payGroupsData, isLoading, error } = usePayGroups({
    type: selectedType,
    include_employee_count: true
  });

  const { data: summary } = usePayGroupSummary();

  // Debounced search to reduce API calls
  const { results: searchResults, loading: searchLoading } = useDebouncedSearch(
    async (term: string) => {
      // This would call the search service
      return payGroupsData?.data.filter(group =>
        group.name.toLowerCase().includes(term.toLowerCase()) ||
        group.country.toLowerCase().includes(term.toLowerCase())
      ) || [];
    },
    300, // 300ms delay
    2 // minimum 2 characters
  );

  // Memoized filtered data
  const filteredPayGroups = useMemo(() => {
    if (searchTerm.length >= 2) {
      return searchResults || [];
    }
    return payGroupsData?.data || [];
  }, [searchTerm, searchResults, payGroupsData]);

  // Group pay groups by type for better organization
  const groupedPayGroups = useMemo(() => {
    const groups = filteredPayGroups.reduce((acc, group) => {
      if (!acc[group.type]) {
        acc[group.type] = [];
      }
      acc[group.type].push(group);
      return acc;
    }, {} as Record<string, typeof filteredPayGroups>);

    return groups;
  }, [filteredPayGroups]);

  const handleCreatePayGroup = () => {
    // Open create pay group dialog
    console.log('Create pay group');
  };

  const handleViewEmployees = (group: any) => {
    // Open view employees dialog
    console.log('View employees for:', group.name);
  };

  const handleAssignEmployee = (group: any) => {
    // Open assign employee dialog
    console.log('Assign employee to:', group.name);
  };

  const handleEdit = (group: any) => {
    // Open edit dialog
    console.log('Edit:', group.name);
  };

  const handleDelete = (group: any) => {
    // Open delete confirmation
    console.log('Delete:', group.name);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load pay groups</p>
          <p className="text-sm text-gray-500">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pay Groups</h1>
          <p className="text-gray-600">Manage employee pay groups and assignments</p>
        </div>
        <Button onClick={handleCreatePayGroup} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Pay Group
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalGroups}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Groups</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.activeGroups}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalEmployees}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Currencies</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.currencies.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search pay groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={selectedType} onValueChange={(value) => setSelectedType(value as PayGroupType | 'all')}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="regular">Regular</SelectItem>
            <SelectItem value="expatriate">Expatriate</SelectItem>
            <SelectItem value="contractor">Contractor</SelectItem>
            <SelectItem value="intern">Intern</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">View as:</span>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4 mr-1" />
              Cards
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {isLoading ? 'Loading...' : `${filteredPayGroups.length} pay groups`}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading pay groups...</p>
          </div>
        </div>
      ) : filteredPayGroups.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No pay groups found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first pay group'}
          </p>
          {!searchTerm && (
            <Button onClick={handleCreatePayGroup}>
              <Plus className="h-4 w-4 mr-2" />
              Create Pay Group
            </Button>
          )}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === 'cards' ? (
            <motion.div
              key="cards"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Grouped by type */}
              {Object.entries(groupedPayGroups).map(([type, groups]) => (
                <div key={type} className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold capitalize flex items-center gap-2">
                      {type} Pay Groups
                      <Badge variant="secondary">{groups.length}</Badge>
                    </h2>
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-muted-foreground">View as:</span>
                      <div className="flex border rounded-md">
                        <Button
                          variant={viewMode === 'cards' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('cards')}
                          className="rounded-r-none"
                        >
                          <Grid3X3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          className="rounded-l-none"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map((group) => (
                      <OptimizedPayGroupCard
                        key={group.id}
                        group={group}
                        onViewEmployees={handleViewEmployees}
                        onAssignEmployee={handleAssignEmployee}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* List view implementation would go here */}
              <div className="bg-white rounded-lg border">
                <div className="p-4">
                  <p className="text-gray-500">List view implementation coming soon...</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
