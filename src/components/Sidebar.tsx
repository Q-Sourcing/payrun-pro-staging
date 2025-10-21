import {
  Users, FolderKanban, DollarSign, Globe, Briefcase, Clock3,
  GraduationCap, UserSquare, Timer, FileText, Settings, ChevronRight
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from '@/integrations/supabase/client';

interface SidebarPayGroup {
  id: string;
  name: string;
  type: string;
  country: string;
  paygroup_id: string;
  created_at: string;
}

interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export const NavigationSidebar: React.FC<SidebarProps> = ({ activeTab, onNavigate }) => {
  const [localOpen, setLocalOpen] = useState(false);
  const [payGroupsOpen, setPayGroupsOpen] = useState(false);
  const [payGroups, setPayGroups] = useState<SidebarPayGroup[]>([]);
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

  // Load pay groups for dropdown
  useEffect(() => {
    const loadPayGroups = async () => {
      try {
        // Load regular pay groups
        const { data: regularGroups, error: regularError } = await supabase
          .from('pay_groups')
          .select('id, name, type, country, created_at')
          .order('name', { ascending: true });

        // Load expatriate pay groups
        const { data: expatriateGroups, error: expatriateError } = await supabase
          .from('expatriate_pay_groups')
          .select('id, name, paygroup_id, country, currency, created_at')
          .order('name', { ascending: true });

        if (regularError) {
          console.error('Error loading regular pay groups:', regularError);
        }
        if (expatriateError) {
          console.error('Error loading expatriate pay groups:', expatriateError);
        }

        // Combine and format the data
        const allGroups = [
          ...(regularGroups || []).map(group => ({
            ...group,
            type: group.type || 'regular',
            paygroup_id: group.id // Use id as paygroup_id for regular groups
          })),
          ...(expatriateGroups || []).map(group => ({
            ...group,
            type: 'expatriate',
            paygroup_id: group.paygroup_id || group.id
          }))
        ];

        setPayGroups(allGroups);
      } catch (error) {
        console.error('Error loading pay groups:', error);
      }
    };

    loadPayGroups();
  }, []);

  // Helper function to get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'regular': return <Users size={14} />;
      case 'expatriate': return <Globe size={14} />;
      case 'contractor': return <Briefcase size={14} />;
      case 'intern': return <GraduationCap size={14} />;
      default: return <Users size={14} />;
    }
  };

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
      
      {/* All Pay Groups with dropdown */}
      <button
        onClick={() => setPayGroupsOpen(!payGroupsOpen)}
        className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-md text-slate-700 hover:bg-slate-50"
      >
        <span className="flex items-center gap-2">
          <FolderKanban size={16} /> All Pay Groups
        </span>
        <motion.div animate={{ rotate: payGroupsOpen ? 90 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronRight size={14} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {payGroupsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="mt-1 space-y-0.5 overflow-hidden"
          >
            <motion.div whileHover={{ x: 4 }}>
              <Link to="/paygroups" className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-md ${isActive("/paygroups")}`}>
                <FolderKanban size={15} /> All Pay Groups
              </Link>
            </motion.div>
            {payGroups.map((group) => (
              <motion.div key={group.id} whileHover={{ x: 4 }}>
                <Link 
                  to={`/paygroups/${group.id}`} 
                  className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-md ${isActive(`/paygroups/${group.id}`)}`}
                >
                  {getTypeIcon(group.type)}
                  <span className="truncate">{group.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">({group.type})</span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

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