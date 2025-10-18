import React, { useState } from 'react';
import { ChevronDown, ChevronRight, DollarSign, Globe2, Users, Briefcase, GraduationCap, Clock, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PayRunsNavigationProps {
  isActive: boolean;
  onNavigate: (path: string, payrollType?: string, employeeCategory?: string) => void;
}

export const PayRunsNavigation: React.FC<PayRunsNavigationProps> = ({
  isActive,
  onNavigate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPayrollTypeIcon = (type: string) => {
    switch (type) {
      case 'Expatriate': return <Globe2 className="h-4 w-4" />;
      case 'Local': return <Users className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getEmployeeCategoryIcon = (category: string) => {
    switch (category) {
      case 'Permanent': return <UserCheck className="h-4 w-4" />;
      case 'On Contract': return <Briefcase className="h-4 w-4" />;
      case 'Temporary': return <Clock className="h-4 w-4" />;
      case 'Intern': return <GraduationCap className="h-4 w-4" />;
      case 'Trainee': return <GraduationCap className="h-4 w-4" />;
      case 'Casual': return <Clock className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const handleMainClick = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      onNavigate('/payruns');
    }
  };

  const handlePayrollTypeClick = (payrollType: string) => {
    onNavigate(`/payruns?type=${payrollType}`, payrollType);
  };

  const handleEmployeeCategoryClick = (payrollType: string, category: string) => {
    onNavigate(`/payruns?type=${payrollType}&category=${category}`, payrollType, category);
  };

  const employeeCategories = [
    'Permanent',
    'On Contract', 
    'Temporary',
    'Intern',
    'Trainee',
    'Casual'
  ];

  return (
    <div className="space-y-1">
      {/* Main Pay Runs Item */}
      <button
        onClick={handleMainClick}
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-colors",
          isActive
            ? "bg-blue-100 text-blue-700"
            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        )}
      >
        <div className="flex items-center gap-3">
          <DollarSign className="h-4 w-4" />
          <span>Pay Runs</span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="h-4 w-4" />
        </motion.div>
      </button>

      {/* Sub-items */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-6 space-y-1">
              {/* All Pay Runs */}
              <button
                onClick={() => onNavigate('/payruns')}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors w-full text-sm text-muted-foreground hover:text-foreground",
                  isActive && window.location.search === ''
                    ? "bg-muted text-foreground"
                    : ""
                )}
              >
                <DollarSign className="h-4 w-4" />
                <span>All Pay Runs</span>
              </button>

              {/* Expatriate Payroll */}
              <motion.button
                onClick={() => handlePayrollTypeClick('Expatriate')}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors w-full text-sm text-muted-foreground hover:text-foreground",
                  isActive && window.location.search.includes('type=Expatriate')
                    ? "bg-muted text-foreground"
                    : ""
                )}
                whileHover={{ x: 2 }}
                transition={{ duration: 0.1 }}
              >
                <Globe2 className="h-4 w-4" />
                <span>Expatriate Payroll</span>
              </motion.button>

              {/* Local Payroll */}
              <div className="ml-4 space-y-1">
                <motion.button
                  onClick={() => handlePayrollTypeClick('Local')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors w-full text-sm text-muted-foreground hover:text-foreground",
                    isActive && window.location.search.includes('type=Local') && !window.location.search.includes('category=')
                      ? "bg-muted text-foreground"
                      : ""
                  )}
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.1 }}
                >
                  <Users className="h-4 w-4" />
                  <span>Local Payroll</span>
                </motion.button>

                {/* Local Employee Categories */}
                <div className="ml-4 space-y-1">
                  {employeeCategories.map((category) => (
                    <motion.button
                      key={category}
                      onClick={() => handleEmployeeCategoryClick('Local', category)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted transition-colors w-full text-xs text-muted-foreground hover:text-foreground",
                        isActive && window.location.search.includes(`type=Local&category=${category}`)
                          ? "bg-muted text-foreground"
                          : ""
                      )}
                      whileHover={{ x: 2 }}
                      transition={{ duration: 0.1 }}
                    >
                      {getEmployeeCategoryIcon(category)}
                      <span>{category}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
