import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Eye, 
  UserPlus, 
  Users,
  MapPin,
  DollarSign,
  Calendar,
  Percent
} from 'lucide-react';
import { usePayGroupEmployees } from '@/hooks/use-paygroup-employees';
import { getPayGroupTypeColor, getPayGroupTypeIconClass } from '@/lib/utils/paygroup-utils';
import type { PayGroup } from '@/lib/types/paygroups';

interface OptimizedPayGroupCardProps {
  group: PayGroup;
  onViewEmployees: (group: PayGroup) => void;
  onAssignEmployee: (group: PayGroup) => void;
  onEdit: (group: PayGroup) => void;
  onDelete: (group: PayGroup) => void;
}

export default function OptimizedPayGroupCard({
  group,
  onViewEmployees,
  onAssignEmployee,
  onEdit,
  onDelete
}: OptimizedPayGroupCardProps) {
  // Use optimized hook to get employee count with caching
  const { data: employeeCounts, isLoading: loadingCount } = usePayGroupEmployeeCounts([group.id]);
  const employeeCount = employeeCounts?.[group.id] || 0;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'regular': return <Users className="h-4 w-4" />;
      case 'expatriate': return <MapPin className="h-4 w-4" />;
      case 'contractor': return <DollarSign className="h-4 w-4" />;
      case 'intern': return <Calendar className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="h-full hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-lg ${getPayGroupTypeIconClass(group.type)}`}>
                {getTypeIcon(group.type)}
              </div>
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  {group.name}
                  <AnimatePresence mode="wait">
                    {!loadingCount && (
                      <motion.span
                        key={employeeCount}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        {employeeCount} {employeeCount === 1 ? 'employee' : 'employees'}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </CardTitle>
                <Badge 
                  variant="secondary" 
                  className={`mt-1 ${getPayGroupTypeColor(group.type)}`}
                >
                  {group.type.charAt(0).toUpperCase() + group.type.slice(1)}
                </Badge>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(group)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(group)}
                  className="text-red-600"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Key Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{group.country}</span>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{group.currency}</span>
              </div>
            </div>

            {/* Type-specific details */}
            {group.type === 'regular' && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{group.pay_frequency}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Percent className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{group.default_tax_percentage}%</span>
                </div>
              </div>
            )}

            {group.type === 'expatriate' && (
              <div className="text-sm">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">
                    Rate: {group.exchange_rate_to_local} {group.currency}/UGX
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewEmployees(group)}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAssignEmployee(group)}
                className="flex-1"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Created {new Date(group.created_at).toLocaleDateString()}</span>
              <Badge variant="outline" className="text-xs">
                {group.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
