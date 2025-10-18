import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  DollarSign, 
  Globe, 
  Users, 
  Briefcase, 
  GraduationCap, 
  Clock3, 
  UserCheck, 
  UserSquare, 
  Timer 
} from 'lucide-react';
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
  const [localOpen, setLocalOpen] = useState(false);

  const getEmployeeCategoryIcon = (category: string) => {
    switch (category) {
      case 'Permanent': return <UserCheck className="h-4 w-4" />;
      case 'On Contract': return <Briefcase className="h-4 w-4" />;
      case 'Temporary': return <Clock3 className="h-4 w-4" />;
      case 'Intern': return <GraduationCap className="h-4 w-4" />;
      case 'Trainee': return <UserSquare className="h-4 w-4" />;
      case 'Casual': return <Timer className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const handleAllPayRunsClick = () => {
    onNavigate('/payruns');
  };

  const handleExpatriateClick = () => {
    onNavigate('/payruns/expatriate', 'Expatriate');
  };

  const handleLocalCategoryClick = (category: string) => {
    onNavigate(`/payruns/local/${category.toLowerCase().replace(' ', '-')}`, 'Local', category);
  };

  const employeeCategories = [
    'Permanent',
    'On Contract', 
    'Temporary',
    'Intern',
    'Trainee',
    'Casual'
  ];

  const isActivePath = (path: string) => {
    // Simple active state logic - you can enhance this based on your routing
    return isActive && window.location.pathname.includes(path);
  };

  return (
    <div className="space-y-2 text-sm">
      {/* PAY RUNS SECTION */}
      <div className="font-semibold text-slate-500 uppercase px-3 mt-3">
        Pay Runs
      </div>

      {/* All Pay Runs */}
      <button
        onClick={handleAllPayRunsClick}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md transition-colors w-full text-sm",
          isActivePath("/payruns") && !isActivePath("/expatriate") && !isActivePath("/local")
            ? "bg-blue-50 text-blue-700 font-semibold"
            : "text-slate-700 hover:bg-slate-50"
        )}
      >
        <DollarSign size={16} /> All Pay Runs
      </button>

      {/* Expatriate Payroll */}
      <button
        onClick={handleExpatriateClick}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md transition-colors w-full text-sm",
          isActivePath("/expatriate")
            ? "bg-blue-50 text-blue-700 font-semibold"
            : "text-slate-700 hover:bg-slate-50"
        )}
      >
        <Globe size={16} /> Expatriate Payroll
      </button>

      {/* Local Payroll (Collapsible) */}
      <div className="mt-1">
        <button
          onClick={() => setLocalOpen(!localOpen)}
          className={cn(
            "flex items-center justify-between w-full px-4 py-2 rounded-md text-sm transition-colors",
            isActivePath("/local")
              ? "bg-blue-50 text-blue-700 font-semibold"
              : "text-slate-700 hover:bg-slate-50"
          )}
        >
          <span className="flex items-center gap-2">
            <Users size={16} /> Local Payroll
          </span>
          {localOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <AnimatePresence initial={false}>
          {localOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                height: { duration: 0.25, ease: "easeInOut" },
                opacity: { duration: 0.3, delay: 0.05 }
              }}
              className="ml-8 mt-1 space-y-1 overflow-hidden"
            >
              {employeeCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleLocalCategoryClick(category)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors w-full text-sm",
                    isActivePath(`/local/${category.toLowerCase().replace(' ', '-')}`)
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {getEmployeeCategoryIcon(category)} {category}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
