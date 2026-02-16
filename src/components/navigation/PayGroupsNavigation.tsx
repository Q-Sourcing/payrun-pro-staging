import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Users, Globe2, Briefcase, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PayGroupType, PAYGROUP_TYPES } from '@/lib/types/paygroups';

interface PayGroupsNavigationProps {
  isActive: boolean;
  onNavigate: (path: string, type?: PayGroupType) => void;
}

export const PayGroupsNavigation: React.FC<PayGroupsNavigationProps> = ({
  isActive,
  onNavigate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getTypeIcon = (type: PayGroupType) => {
    switch (type) {
      case 'regular': return <Users className="h-4 w-4" />;
      case 'expatriate': return <Globe2 className="h-4 w-4" />;
      case 'piece_rate': return <Briefcase className="h-4 w-4" />;
      case 'intern': return <GraduationCap className="h-4 w-4" />;
    }
  };

  const handlePayGroupTypeClick = (type: PayGroupType) => {
    onNavigate(`/paygroups?type=${type}`, type);
  };

  const handleMainClick = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      onNavigate('/paygroups');
    }
  };

  return (
    <div className="space-y-1">
      {/* Main Pay Groups Item */}
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
          <Users className="h-4 w-4" />
          <span>Pay Groups</span>
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
              {/* All Pay Groups */}
              <button
                onClick={() => onNavigate('/paygroups')}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors w-full text-sm text-muted-foreground hover:text-foreground",
                  isActive && window.location.search === ''
                    ? "bg-muted text-foreground"
                    : ""
                )}
              >
                <Users className="h-4 w-4" />
                <span>All Pay Groups</span>
              </button>

              {/* Individual Pay Group Types */}
              {Object.values(PAYGROUP_TYPES).map((type) => (
                <motion.button
                  key={type.id}
                  onClick={() => handlePayGroupTypeClick(type.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors w-full text-sm text-muted-foreground hover:text-foreground",
                    isActive && window.location.search.includes(`type=${type.id}`)
                      ? "bg-muted text-foreground"
                      : ""
                  )}
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.1 }}
                >
                  {getTypeIcon(type.id)}
                  <span>{type.name}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
