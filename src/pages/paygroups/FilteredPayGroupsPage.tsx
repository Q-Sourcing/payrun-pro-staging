import React, { useState, useEffect } from 'react';
import { PayGroupsService } from '@/lib/services/paygroups.service';
import { PayGroup, PayGroupType, PayGroupCategory, HeadOfficeSubType, ProjectsSubType, ManpowerFrequency } from '@/lib/types/paygroups';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PayGroupCard } from '@/components/paygroups/PayGroupCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CreatePayGroupModal } from '@/components/paygroups/CreatePayGroupModal';
import { AssignEmployeeModal } from '@/components/paygroups/AssignEmployeeModal';
import { useToast } from '@/hooks/use-toast';

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PayGroup | undefined>();
  // IPPMS pay type toggle
  const [ippmsPayType, setIppmsPayType] = useState<'piece_rate' | 'daily_rate'>('piece_rate');
  const { toast } = useToast();

  // Determine pay group type from employeeType
  const defaultType = getPayGroupTypeFromEmployeeType(employeeType);

  useEffect(() => {
    loadPayGroups();
  }, [category, employeeType, payFrequency]);

  const loadPayGroups = async () => {
    setLoading(true);
    try {
      const groups = await PayGroupsService.getPayGroupsByCategory(category, employeeType, payFrequency);
      // If IPPMS, filter by selected pay_type
      if (employeeType === 'ippms') {
        setPayGroups(groups.filter(g => (g as any).pay_type ? (g as any).pay_type === ippmsPayType : true));
      } else {
        setPayGroups(groups);
      }
    } catch (error) {
      console.error('Error loading pay groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pay groups',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading pay groups...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Pay Group
        </Button>
      </div>

      {/* IPPMS Pay Type Toggle */}
      {employeeType === 'ippms' && (
        <div className="flex items-center gap-2">
          <Button
            variant={ippmsPayType === 'piece_rate' ? 'default' : 'outline'}
            onClick={() => { setIppmsPayType('piece_rate'); loadPayGroups(); }}
          >
            Piece Rate
          </Button>
          <Button
            variant={ippmsPayType === 'daily_rate' ? 'default' : 'outline'}
            onClick={() => { setIppmsPayType('daily_rate'); loadPayGroups(); }}
          >
            Daily Rate
          </Button>
        </div>
      )}

      {payGroups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No pay groups found for this category.</p>
            <Button onClick={() => setShowCreateModal(true)} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Pay Group
            </Button>
          </CardContent>
        </Card>
      )}

      <CreatePayGroupModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleCreateSuccess}
        defaultType={defaultType}
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

