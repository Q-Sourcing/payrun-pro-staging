import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Filter, Users, Globe2, Briefcase, GraduationCap, Grid3X3, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { PayGroupsService } from '@/lib/services/paygroups.service';
import { 
  PayGroup, 
  PayGroupSummary, 
  PayGroupType, 
  PAYGROUP_TYPES,
  getCurrencySymbol,
  formatCurrency 
} from '@/lib/types/paygroups';
import { PayGroupCard } from '@/components/paygroups/PayGroupCard';
import { PayGroupsListView } from '@/components/paygroups/PayGroupsListView';
import { CreatePayGroupModal } from '@/components/paygroups/CreatePayGroupModal';
import { AssignEmployeeModal } from '@/components/paygroups/AssignEmployeeModal';

export const PayGroupsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [payGroups, setPayGroups] = useState<PayGroup[]>([]);
  const [summary, setSummary] = useState<PayGroupSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<PayGroupType | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalDefaultType, setCreateModalDefaultType] = useState<PayGroupType | undefined>(undefined);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedGroupForAssignment, setSelectedGroupForAssignment] = useState<PayGroup | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>(() => {
    const saved = localStorage.getItem('paygroups-view-mode');
    return (saved as 'cards' | 'list') || 'cards';
  });
  const { toast } = useToast();

  // Load pay groups and summary
  const loadPayGroups = async () => {
    setLoading(true);
    try {
      const [groupsData, summaryData] = await Promise.all([
        PayGroupsService.getPayGroups(),
        PayGroupsService.getPayGroupSummary()
      ]);
      
      setPayGroups(groupsData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading pay groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pay groups. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayGroups();
  }, []);

  // Handle URL parameters for type filtering
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam && Object.keys(PAYGROUP_TYPES).includes(typeParam)) {
      setSelectedType(typeParam as PayGroupType);
    } else {
      setSelectedType('all');
    }
  }, [searchParams]);

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem('paygroups-view-mode', viewMode);
  }, [viewMode]);

  // Filter pay groups based on search and type
  const filteredPayGroups = payGroups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.country.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || group.type === selectedType;
    return matchesSearch && matchesType;
  });

  // Group pay groups by type for display
  const groupedPayGroups = filteredPayGroups.reduce((acc, group) => {
    if (!acc[group.type]) {
      acc[group.type] = [];
    }
    acc[group.type].push(group);
    return acc;
  }, {} as Record<PayGroupType, PayGroup[]>);

  // Handle create pay group success
  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    setCreateModalDefaultType(undefined);
    loadPayGroups();
    toast({
      title: 'Success',
      description: `${createModalDefaultType ? PAYGROUP_TYPES[createModalDefaultType].name : 'Pay group'} created successfully!`,
    });
  };

  // Handle opening create modal with specific type
  const handleOpenCreateModal = (type?: PayGroupType) => {
    setCreateModalDefaultType(type);
    setShowCreateModal(true);
  };

  // Handle opening assign employee modal
  const handleOpenAssignModal = (group: PayGroup) => {
    setSelectedGroupForAssignment(group);
    setShowAssignModal(true);
  };

  // Handle assign employee success
  const handleAssignSuccess = () => {
    setShowAssignModal(false);
    setSelectedGroupForAssignment(undefined);
    loadPayGroups(); // Refresh to update employee counts
    toast({
      title: 'Success',
      description: 'Employee assigned to pay group successfully',
    });
  };

  // Get icon for pay group type
  const getTypeIcon = (type: PayGroupType) => {
    switch (type) {
      case 'regular': return <Users className="h-4 w-4" />;
      case 'expatriate': return <Globe2 className="h-4 w-4" />;
      case 'contractor': return <Briefcase className="h-4 w-4" />;
      case 'intern': return <GraduationCap className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
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
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pay Groups</h1>
          <p className="text-muted-foreground">
            Manage different types of pay groups for your organization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => handleOpenCreateModal()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Pay Group
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pay Groups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalGroups}</div>
              <p className="text-xs text-muted-foreground">
                {summary.activeGroups} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">
                Across all pay groups
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Currencies</CardTitle>
              <Globe2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.currencies.length}</div>
              <p className="text-xs text-muted-foreground">
                {summary.currencies.join(', ')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pay Group Types</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.types.length}</div>
              <p className="text-xs text-muted-foreground">
                Different types active
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pay groups by name or country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedType} onValueChange={(value: PayGroupType | 'all') => {
              setSelectedType(value);
              // Update URL parameters
              if (value === 'all') {
                setSearchParams({});
              } else {
                setSearchParams({ type: value });
              }
            }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.values(PAYGROUP_TYPES).map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pay Groups Display */}
      {selectedType === 'all' ? (
        // Show all types in tabs
        <Tabs defaultValue={Object.keys(PAYGROUP_TYPES)[0]} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {Object.values(PAYGROUP_TYPES).map(type => (
              <TabsTrigger key={type.id} value={type.id} className="flex items-center gap-2">
                {getTypeIcon(type.id)}
                <span className="hidden sm:inline">{type.name.split(' ')[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.values(PAYGROUP_TYPES).map(type => (
            <TabsContent key={type.id} value={type.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {getTypeIcon(type.id)}
                    {type.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">
                    {groupedPayGroups[type.id]?.length || 0} groups
                  </Badge>
                  {/* View Toggle */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <span className="text-xs text-gray-500 mr-2">View as:</span>
                    <Button
                      variant={viewMode === 'cards' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('cards')}
                      className="h-7 px-2 text-xs"
                    >
                      <Grid3X3 className="h-3 w-3 mr-1" />
                      Cards
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="h-7 px-2 text-xs"
                    >
                      <List className="h-3 w-3 mr-1" />
                      List
                    </Button>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {groupedPayGroups[type.id]?.length > 0 ? (
                  viewMode === 'cards' ? (
                    <motion.div 
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {groupedPayGroups[type.id].map((group, index) => (
                        <motion.div
                          key={group.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <PayGroupCard 
                            group={group} 
                            onUpdate={loadPayGroups}
                            onAssignEmployee={handleOpenAssignModal}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <PayGroupsListView
                        payGroups={groupedPayGroups[type.id]}
                        onUpdate={loadPayGroups}
                        onAssignEmployee={handleOpenAssignModal}
                      />
                    </motion.div>
                  )
                ) : (
                  <motion.div 
                    className="flex flex-col items-center justify-center py-16 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="mb-4">
                      {getTypeIcon(type.id)}
                    </div>
                    <h3 className="text-lg font-medium mb-2">No {type.name.toLowerCase()} found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {type.description}
                    </p>
                    <Button 
                      onClick={() => handleOpenCreateModal(type.id)}
                      variant="default"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create {type.name.split(' ')[0]} Pay Group
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        // Show filtered results
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {getTypeIcon(selectedType)}
                {PAYGROUP_TYPES[selectedType].name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {filteredPayGroups.length} pay groups found
              </p>
            </div>
          </div>

          <AnimatePresence>
            {filteredPayGroups.length > 0 ? (
              viewMode === 'cards' ? (
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {filteredPayGroups.map((group, index) => (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <PayGroupCard 
                        group={group} 
                        onUpdate={loadPayGroups}
                        onAssignEmployee={handleOpenAssignModal}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <PayGroupsListView
                    payGroups={filteredPayGroups}
                    onUpdate={loadPayGroups}
                    onAssignEmployee={handleOpenAssignModal}
                  />
                </motion.div>
              )
            ) : (
              <motion.div 
                className="text-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-medium mb-2">No pay groups found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search criteria or create a new pay group.
                </p>
                <Button 
                  onClick={() => handleOpenCreateModal()}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Pay Group
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Create Pay Group Modal */}
      <CreatePayGroupModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleCreateSuccess}
        defaultType={createModalDefaultType}
      />

      {/* Assign Employee Modal */}
      <AssignEmployeeModal
        open={showAssignModal}
        onOpenChange={setShowAssignModal}
        onSuccess={handleAssignSuccess}
        presetGroup={selectedGroupForAssignment}
      />
    </div>
  );
};
