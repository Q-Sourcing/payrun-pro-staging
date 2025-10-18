import {
  Users, FolderKanban, DollarSign, Globe, Briefcase, Clock3,
  GraduationCap, UserSquare, Timer, FileText, Settings, ChevronRight
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export const NavigationSidebar: React.FC<SidebarProps> = ({ activeTab, onNavigate }) => {
  const [localOpen, setLocalOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path
      ? "bg-blue-50 text-blue-700 font-semibold"
      : "text-slate-700 hover:bg-slate-50 hover:text-blue-700";

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="tracking-wider text-xs font-semibold text-slate-500 uppercase px-4 mt-6 mb-1">
      {title}
    </div>
  );

  const NavItem = ({ to, icon, label }: { to: string; icon: JSX.Element; label: string }) => (
    <motion.div whileHover={{ x: 4 }}>
      <Link to={to} className={`flex items-center gap-2 px-3.5 py-2.5 rounded-md ${isActive(to)}`}>
        {icon} {label}
      </Link>
    </motion.div>
  );

  return (
    <div className="flex flex-col text-sm pb-10 pl-4 pr-2">
      {/* MY SECTIONS (for future roles) */}
      <SectionHeader title="My Dashboard" />
      <NavItem to="/my/employees" icon={<Users size={16} />} label="My Employees" />
      <NavItem to="/my/paygroups" icon={<FolderKanban size={16} />} label="My Pay Groups" />
      <NavItem to="/my/payruns" icon={<DollarSign size={16} />} label="My Pay Runs" />

      {/* EMPLOYEES */}
      <SectionHeader title="Employees" />
      <NavItem to="/employees" icon={<Users size={16} />} label="Employees" />

      {/* PAY GROUPS */}
      <SectionHeader title="Pay Groups" />
      <NavItem to="/paygroups" icon={<FolderKanban size={16} />} label="All Pay Groups" />

      {/* PAY RUNS */}
      <SectionHeader title="Pay Runs" />
      <NavItem to="/payruns" icon={<DollarSign size={16} />} label="All Pay Runs" />
      <NavItem to="/payruns/expatriate" icon={<Globe size={16} />} label="Expatriate Payroll" />

      {/* LOCAL PAYROLL */}
      <button
        onClick={() => setLocalOpen(!localOpen)}
        className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-md text-slate-700 hover:bg-slate-50"
      >
        <span className="flex items-center gap-2">
          <Users size={16} /> Local Payroll
        </span>
        <motion.div animate={{ rotate: localOpen ? 90 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronRight size={14} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {localOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="mt-1 space-y-0.5 overflow-hidden"
          >
            <motion.div whileHover={{ x: 4 }}>
              <Link to="/payruns/local/monthly" className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-md ${isActive("/payruns/local/monthly")}`}>
                <Briefcase size={15} /> Monthly Payroll
              </Link>
            </motion.div>
            <motion.div whileHover={{ x: 4 }}>
              <Link to="/payruns/local/temporary" className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-md ${isActive("/payruns/local/temporary")}`}>
                <Clock3 size={15} /> Temporary
              </Link>
            </motion.div>
            <motion.div whileHover={{ x: 4 }}>
              <Link to="/payruns/local/intern" className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-md ${isActive("/payruns/local/intern")}`}>
                <GraduationCap size={15} /> Intern
              </Link>
            </motion.div>
            <motion.div whileHover={{ x: 4 }}>
              <Link to="/payruns/local/trainee" className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-md ${isActive("/payruns/local/trainee")}`}>
                <UserSquare size={15} /> Trainee
              </Link>
            </motion.div>
            <motion.div whileHover={{ x: 4 }}>
              <Link to="/payruns/local/casual" className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-md ${isActive("/payruns/local/casual")}`}>
                <Timer size={15} /> Casual
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REPORTS */}
      <SectionHeader title="Reports" />
      <NavItem to="/reports" icon={<FileText size={16} />} label="Reports" />

      {/* SETTINGS */}
      <SectionHeader title="Settings" />
      <NavItem to="/settings" icon={<Settings size={16} />} label="Settings" />
    </div>
  );
};