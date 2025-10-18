import React, { useState } from 'react';
import {
  Users,
  FolderKanban,
  DollarSign,
  Globe,
  UserCheck,
  Briefcase,
  Clock3,
  GraduationCap,
  UserSquare,
  Timer,
  FileText,
  Settings,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export const NavigationSidebar: React.FC<SidebarProps> = ({ activeTab, onNavigate }) => {
  const [localOpen, setLocalOpen] = useState(false);

  const isActive = (tabId: string) => {
    if (activeTab === tabId) {
      return "bg-blue-50 text-blue-700 font-medium";
    }
    return "text-slate-700 hover:bg-slate-50 hover:text-blue-700";
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="tracking-wider text-xs font-semibold text-slate-500 uppercase px-3 mt-6 mb-1">
      {title}
    </div>
  );

  const handleNavigation = (tabId: string) => {
    onNavigate(tabId);
  };

  const handleLocalCategoryClick = (category: string) => {
    handleNavigation('payruns');
  };

  return (
    <div className="flex flex-col text-sm pb-10">
      {/* EMPLOYEES */}
      <SectionHeader title="Employees" />
      <motion.div whileHover={{ x: 4 }}>
        <button
          onClick={() => handleNavigation('employees')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md w-full text-left ${isActive('employees')}`}
        >
          <Users size={16} /> Employees
        </button>
      </motion.div>

      {/* PAY GROUPS */}
      <SectionHeader title="Pay Groups" />
      <motion.div whileHover={{ x: 4 }}>
        <button
          onClick={() => handleNavigation('paygroups')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md w-full text-left ${isActive('paygroups')}`}
        >
          <FolderKanban size={16} /> All Pay Groups
        </button>
      </motion.div>

      {/* PAY RUNS */}
      <SectionHeader title="Pay Runs" />
      <motion.div whileHover={{ x: 4 }}>
        <button
          onClick={() => handleNavigation('payruns')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md w-full text-left ${isActive('payruns')}`}
        >
          <DollarSign size={16} /> All Pay Runs
        </button>
      </motion.div>

      <motion.div whileHover={{ x: 4 }}>
        <button
          onClick={() => handleNavigation('payruns')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md w-full text-left ${isActive('payruns')}`}
        >
          <Globe size={16} /> Expatriate Payroll
        </button>
      </motion.div>

      {/* LOCAL PAYROLL DROPDOWN */}
      <button
        onClick={() => setLocalOpen(!localOpen)}
        className="flex items-center justify-between w-full px-3 py-2 rounded-md text-slate-700 hover:bg-slate-50"
      >
        <span className="flex items-center gap-2">
          <Users size={16} /> Local Payroll
        </span>
        <motion.div
          animate={{ rotate: localOpen ? 90 : 0 }}
          transition={{ duration: 0.25 }}
        >
          <ChevronRight size={14} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {localOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="ml-7 mt-1 space-y-0.5 overflow-hidden"
          >
            {[
              ["Permanent", "Permanent", <UserCheck size={15} />],
              ["On Contract", "On Contract", <Briefcase size={15} />],
              ["Temporary", "Temporary", <Clock3 size={15} />],
              ["Intern", "Intern", <GraduationCap size={15} />],
              ["Trainee", "Trainee", <UserSquare size={15} />],
              ["Casual", "Casual", <Timer size={15} />]
            ].map(([label, category, icon]) => (
              <motion.div key={label} whileHover={{ x: 4 }}>
                <button
                  onClick={() => handleLocalCategoryClick(category)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md w-full text-left ${isActive('payruns')}`}
                >
                  {icon} {label}
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* REPORTS */}
      <SectionHeader title="Reports" />
      <motion.div whileHover={{ x: 4 }}>
        <button
          onClick={() => handleNavigation('reports')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md w-full text-left ${isActive('reports')}`}
        >
          <FileText size={16} /> Reports
        </button>
      </motion.div>

      {/* SETTINGS */}
      <SectionHeader title="Settings" />
      <motion.div whileHover={{ x: 4 }}>
        <button
          onClick={() => handleNavigation('settings')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md w-full text-left ${isActive('settings')}`}
        >
          <Settings size={16} /> Settings
        </button>
      </motion.div>
    </div>
  );
};
