import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, Users, Globe2, Briefcase, GraduationCap, Grid3X3, List, ChevronRight, ChevronDown, Building2, FolderTree } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { PayGroupsService } from '@/lib/services/paygroups.service';
import { 
  PayGroup, 
  PayGroupSummary, 
  PayGroupType, 
  PAYGROUP_TYPES,
  getCurrencySymbol,
  formatCurrency,
  PayGroupCategory,
  HeadOfficeSubType,
  ProjectsSubType,
  ManpowerFrequency
} from '@/lib/types/paygroups';
import { PayGroupCard } from '@/components/paygroups/PayGroupCard';
import { PayGroupsListView } from '@/components/paygroups/PayGroupsListView';
import { CreatePayGroupModal } from '@/components/paygroups/CreatePayGroupModal';
import { AssignEmployeeModal } from '@/components/paygroups/AssignEmployeeModal';
import { cn } from '@/lib/utils';

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
  
  // Hierarchical expansion state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    head_office: true,
    projects: true
  });
  const [expandedSubTypes, setExpandedSubTypes] = useState<Record<string, boolean>>({
    'projects.manpower': true,
    'projects.ippms': true
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

  // Filter pay groups based on search
  const filteredPayGroups = payGroups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.country.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Group pay groups hierarchically
  const groupedPayGroups = filteredPayGroups.reduce((acc, group) => {
    const category = group.category || 'head_office';
    const subType = group.sub_type || 'regular';
    
    if (!acc[category]) {
      acc[category] = {};
    }
    
    if (category === 'projects' && subType === 'manpower') {
      const freq = group.pay_frequency || 'monthly';
      if (!acc[category][subType]) {
        acc[category][subType] = { daily: [], bi_weekly: [], monthly: [] };
      }
      acc[category][subType][freq as ManpowerFrequency].push(group);
    } else {
      if (!acc[category][subType]) {
        acc[category][subType] = [];
      }
      acc[category][subType].push(group);
    }
    
    return acc;
  }, {} as Record<PayGroupCategory, Record<string, PayGroup[] | { daily: PayGroup[]; bi_weekly: PayGroup[]; monthly: PayGroup[] }>>);

  const toggleCategory = (category: PayGroupCategory) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const toggleSubType = (key: string) => {
    setExpandedSubTypes(prev => ({ ...prev, [key]: !prev[key] }));
  };

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

  // Get icon for category/sub_type
  const getCategoryIcon = (category: PayGroupCategory) => {
    return category === 'head_office' ? <Building2 className="h-4 w-4" /> : <FolderTree className="h-4 w-4" />;
  };

  const getSubTypeLabel = (subType: string): string => {
    const labels: Record<string, string> = {
      'regular': 'Regular',
      'expatriate': 'Expatriate',
      'interns': 'Interns',
      'manpower': 'Manpower',
      'ippms': 'IPPMS',
      'daily': 'Daily',
      'bi_weekly': 'Bi-weekly',
      'monthly': 'Monthly',
      'piece_rate': 'Piece Rate'
    };
    return labels[subType] || subType;
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
        </CardContent>
      </Card>

      {/* Hierarchical Pay Groups Display */}
      <div className="space-y-4">
        {/* Head Office Category */}
        <Card>
          <CardHeader>
            <button
              onClick={() => toggleCategory('head_office')}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                {expandedCategories.head_office ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
                {getCategoryIcon('head_office')}
                <CardTitle>Head Office</CardTitle>
                <Badge variant="secondary">
                  {(groupedPayGroups.head_office?.regular?.length || 0) +
                   (Array.isArray(groupedPayGroups.head_office?.expatriate) ? groupedPayGroups.head_office.expatriate.length : 0) +
                   (Array.isArray(groupedPayGroups.head_office?.interns) ? groupedPayGroups.head_office.interns.length : 0)} groups
                </Badge>
              </div>
            </button>
          </CardHeader>
          <AnimatePresence>
            {expandedCategories.head_office && (
              <CardContent className="space-y-4">
                {/* Regular */}
                {Array.isArray(groupedPayGroups.head_office?.regular) && groupedPayGroups.head_office.regular.length > 0 && (
                  <div className="ml-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <h4 className="font-semibold">Regular</h4>
                      <Badge variant="outline">{groupedPayGroups.head_office.regular.length}</Badge>
                    </div>
                    {viewMode === 'cards' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-6">
                        {groupedPayGroups.head_office.regular.map((group) => (
                          <PayGroupCard 
                            key={group.id}
                            group={group} 
                            onUpdate={loadPayGroups}
                            onAssignEmployee={handleOpenAssignModal}
                          />
                        ))}
                      </div>
                    ) : (
                      <PayGroupsListView
                        payGroups={groupedPayGroups.head_office.regular}
                        onUpdate={loadPayGroups}
                        onAssignEmployee={handleOpenAssignModal}
                      />
                    )}
                  </div>
                )}

                {/* Expatriate */}
                {Array.isArray(groupedPayGroups.head_office?.expatriate) && groupedPayGroups.head_office.expatriate.length > 0 && (
                  <div className="ml-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <Globe2 className="h-4 w-4 text-emerald-500" />
                      <h4 className="font-semibold">Expatriate</h4>
                      <Badge variant="outline">{groupedPayGroups.head_office.expatriate.length}</Badge>
                    </div>
                    {viewMode === 'cards' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-6">
                        {groupedPayGroups.head_office.expatriate.map((group) => (
                          <PayGroupCard 
                            key={group.id}
                            group={group} 
                            onUpdate={loadPayGroups}
                            onAssignEmployee={handleOpenAssignModal}
                          />
                        ))}
                      </div>
                    ) : (
                      <PayGroupsListView
                        payGroups={groupedPayGroups.head_office.expatriate}
                        onUpdate={loadPayGroups}
                        onAssignEmployee={handleOpenAssignModal}
                      />
                    )}
                  </div>
                )}

                {/* Interns */}
                {Array.isArray(groupedPayGroups.head_office?.interns) && groupedPayGroups.head_office.interns.length > 0 && (
                  <div className="ml-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-purple-500" />
                      <h4 className="font-semibold">Interns</h4>
                      <Badge variant="outline">{groupedPayGroups.head_office.interns.length}</Badge>
                    </div>
                    {viewMode === 'cards' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-6">
                        {groupedPayGroups.head_office.interns.map((group) => (
                          <PayGroupCard 
                            key={group.id}
                            group={group} 
                            onUpdate={loadPayGroups}
                            onAssignEmployee={handleOpenAssignModal}
                          />
                        ))}
                      </div>
                    ) : (
                      <PayGroupsListView
                        payGroups={groupedPayGroups.head_office.interns}
                        onUpdate={loadPayGroups}
                        onAssignEmployee={handleOpenAssignModal}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            )}
          </AnimatePresence>
        </Card>

        {/* Projects Category */}
        <Card>
          <CardHeader>
            <button
              onClick={() => toggleCategory('projects')}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                {expandedCategories.projects ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
                {getCategoryIcon('projects')}
                <CardTitle>Projects</CardTitle>
                <Badge variant="secondary">
                  {(groupedPayGroups.projects?.manpower && typeof groupedPayGroups.projects.manpower === 'object' 
                    ? (groupedPayGroups.projects.manpower.daily.length + groupedPayGroups.projects.manpower.bi_weekly.length + groupedPayGroups.projects.manpower.monthly.length)
                    : 0) +
                   (Array.isArray(groupedPayGroups.projects?.ippms) ? groupedPayGroups.projects.ippms.length : 0) +
                   (Array.isArray(groupedPayGroups.projects?.expatriate) ? groupedPayGroups.projects.expatriate.length : 0)} groups
                </Badge>
              </div>
            </button>
          </CardHeader>
          <AnimatePresence>
            {expandedCategories.projects && (
              <CardContent className="space-y-4">
                {/* Manpower */}
                {groupedPayGroups.projects?.manpower && typeof groupedPayGroups.projects.manpower === 'object' && (
                  <div className="ml-6 space-y-3">
                    <button
                      onClick={() => toggleSubType('projects.manpower')}
                      className="flex items-center gap-2 w-full text-left"
                    >
                      {expandedSubTypes['projects.manpower'] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <Briefcase className="h-4 w-4 text-orange-500" />
                      <h4 className="font-semibold">Manpower</h4>
                      <Badge variant="outline">
                        {groupedPayGroups.projects.manpower.daily.length + 
                         groupedPayGroups.projects.manpower.bi_weekly.length + 
                         groupedPayGroups.projects.manpower.monthly.length}
                      </Badge>
                    </button>
                    <AnimatePresence>
                      {expandedSubTypes['projects.manpower'] && (
                        <div className="ml-6 space-y-4">
                          {/* Daily */}
                          {groupedPayGroups.projects.manpower.daily.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Daily</span>
                                <Badge variant="outline" className="text-xs">
                                  {groupedPayGroups.projects.manpower.daily.length}
                                </Badge>
                              </div>
                              {viewMode === 'cards' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-4">
                                  {groupedPayGroups.projects.manpower.daily.map((group) => (
                                    <PayGroupCard 
                                      key={group.id}
                                      group={group} 
                                      onUpdate={loadPayGroups}
                                      onAssignEmployee={handleOpenAssignModal}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <PayGroupsListView
                                  payGroups={groupedPayGroups.projects.manpower.daily}
                                  onUpdate={loadPayGroups}
                                  onAssignEmployee={handleOpenAssignModal}
                                />
                              )}
                            </div>
                          )}

                          {/* Bi-weekly */}
                          {groupedPayGroups.projects.manpower.bi_weekly.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Bi-weekly</span>
                                <Badge variant="outline" className="text-xs">
                                  {groupedPayGroups.projects.manpower.bi_weekly.length}
                                </Badge>
                              </div>
                              {viewMode === 'cards' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-4">
                                  {groupedPayGroups.projects.manpower.bi_weekly.map((group) => (
                                    <PayGroupCard 
                                      key={group.id}
                                      group={group} 
                                      onUpdate={loadPayGroups}
                                      onAssignEmployee={handleOpenAssignModal}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <PayGroupsListView
                                  payGroups={groupedPayGroups.projects.manpower.bi_weekly}
                                  onUpdate={loadPayGroups}
                                  onAssignEmployee={handleOpenAssignModal}
                                />
                              )}
                            </div>
                          )}

                          {/* Monthly */}
                          {groupedPayGroups.projects.manpower.monthly.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Monthly</span>
                                <Badge variant="outline" className="text-xs">
                                  {groupedPayGroups.projects.manpower.monthly.length}
                                </Badge>
                              </div>
                              {viewMode === 'cards' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-4">
                                  {groupedPayGroups.projects.manpower.monthly.map((group) => (
                                    <PayGroupCard 
                                      key={group.id}
                                      group={group} 
                                      onUpdate={loadPayGroups}
                                      onAssignEmployee={handleOpenAssignModal}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <PayGroupsListView
                                  payGroups={groupedPayGroups.projects.manpower.monthly}
                                  onUpdate={loadPayGroups}
                                  onAssignEmployee={handleOpenAssignModal}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* IPPMS */}
                {Array.isArray(groupedPayGroups.projects?.ippms) && groupedPayGroups.projects.ippms.length > 0 && (
                  <div className="ml-6 space-y-3">
                    <button
                      onClick={() => toggleSubType('projects.ippms')}
                      className="flex items-center gap-2 w-full text-left"
                    >
                      {expandedSubTypes['projects.ippms'] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <Briefcase className="h-4 w-4 text-green-500" />
                      <h4 className="font-semibold">IPPMS</h4>
                      <Badge variant="outline">{groupedPayGroups.projects.ippms.length}</Badge>
                    </button>
                    <AnimatePresence>
                      {expandedSubTypes['projects.ippms'] && (
                        <div className="ml-6 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Piece Rate</span>
                          </div>
                          {viewMode === 'cards' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-4">
                              {groupedPayGroups.projects.ippms.map((group) => (
                                <PayGroupCard 
                                  key={group.id}
                                  group={group} 
                                  onUpdate={loadPayGroups}
                                  onAssignEmployee={handleOpenAssignModal}
                                />
                              ))}
                            </div>
                          ) : (
                            <PayGroupsListView
                              payGroups={groupedPayGroups.projects.ippms}
                              onUpdate={loadPayGroups}
                              onAssignEmployee={handleOpenAssignModal}
                            />
                          )}
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Projects Expatriate */}
                {Array.isArray(groupedPayGroups.projects?.expatriate) && groupedPayGroups.projects.expatriate.length > 0 && (
                  <div className="ml-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <Globe2 className="h-4 w-4 text-emerald-500" />
                      <h4 className="font-semibold">Expatriate</h4>
                      <Badge variant="outline">{groupedPayGroups.projects.expatriate.length}</Badge>
                    </div>
                    {viewMode === 'cards' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-6">
                        {groupedPayGroups.projects.expatriate.map((group) => (
                          <PayGroupCard 
                            key={group.id}
                            group={group} 
                            onUpdate={loadPayGroups}
                            onAssignEmployee={handleOpenAssignModal}
                          />
                        ))}
                      </div>
                    ) : (
                      <PayGroupsListView
                        payGroups={groupedPayGroups.projects.expatriate}
                        onUpdate={loadPayGroups}
                        onAssignEmployee={handleOpenAssignModal}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            )}
          </AnimatePresence>
        </Card>

        {/* Empty State */}
        {filteredPayGroups.length === 0 && (
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
      </div>

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
