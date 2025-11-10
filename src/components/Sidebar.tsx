import {
  Users, FolderKanban, DollarSign, Globe, Briefcase, Clock3,
  GraduationCap, UserSquare, Timer, FileText, Settings, ChevronRight, BarChart3,
  Building2, FolderTree, Calendar, Package
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface SidebarPayGroupType {
  id: string;
  name: string;
  type: string;
  description: string;
  icon: string;
}

interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  collapsed?: boolean;
}

export const NavigationSidebar: React.FC<SidebarProps> = ({ activeTab, onNavigate, collapsed = false }) => {
  const [localOpen, setLocalOpen] = useState(false);
  const [payGroupsOpen, setPayGroupsOpen] = useState(false);
  const [headOfficeOpen, setHeadOfficeOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [manpowerOpen, setManpowerOpen] = useState(false);
  const [ippmsOpen, setIppmsOpen] = useState(false);
  // Separate state for Pay Runs sections
  const [payRunsHeadOfficeOpen, setPayRunsHeadOfficeOpen] = useState(false);
  const [payRunsProjectsOpen, setPayRunsProjectsOpen] = useState(false);
  const [payRunsManpowerOpen, setPayRunsManpowerOpen] = useState(false);
  const [payGroupTypes, setPayGroupTypes] = useState<SidebarPayGroupType[]>([]);
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path
      ? "bg-blue-50 text-blue-700 font-semibold"
      : "text-slate-700 hover:bg-slate-50 hover:text-blue-700";

  const SectionHeader = ({ title }: { title: string }) => {
    if (collapsed) return null;
    return (
      <div className="tracking-wider text-xs font-semibold text-slate-500 uppercase px-4 mt-6 mb-1">
        {title}
      </div>
    );
  };

  const NavItem = ({ to, icon, label }: { to: string; icon: JSX.Element; label: string }) => (
    <motion.div whileHover={{ x: collapsed ? 0 : 4 }}>
      <Link 
        to={to} 
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-md ${isActive(to)} ${collapsed ? 'justify-center' : ''}`}
        title={collapsed ? label : undefined}
      >
        {icon} 
        {!collapsed && <span>{label}</span>}
      </Link>
    </motion.div>
  );

  // Load pay group types for dropdown
  useEffect(() => {
    const loadPayGroupTypes = async () => {
      try {
        // Define the pay group types we want to show
        const payGroupTypes = [
          {
            id: 'regular',
            name: 'Regular',
            type: 'regular',
            description: 'Standard payroll groups for local employees',
            icon: 'Users'
          },
          {
            id: 'expatriate', 
            name: 'Expatriate',
            type: 'expatriate',
            description: 'Payroll groups for employees paid in foreign currencies',
            icon: 'Globe'
          },
          {
            id: 'contractor',
            name: 'Contractor', 
            type: 'contractor',
            description: 'Payroll groups for contract workers and freelancers',
            icon: 'Briefcase'
          },
          {
            id: 'intern',
            name: 'Intern',
            type: 'intern', 
            description: 'Payroll groups for interns and trainees',
            icon: 'GraduationCap'
          }
        ];

        setPayGroupTypes(payGroupTypes);
      } catch (error) {
        console.error('Error loading pay group types:', error);
      }
    };

    loadPayGroupTypes();
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
      <NavItem to="/dashboard" icon={<BarChart3 size={16} />} label="Overview" />
      <NavItem to="/my/employees" icon={<Users size={16} />} label="My Employees" />
      <NavItem to="/my/paygroups" icon={<FolderKanban size={16} />} label="My Pay Groups" />
      <NavItem to="/my/payruns" icon={<DollarSign size={16} />} label="My Pay Runs" />

      {/* EMPLOYEES */}
      <SectionHeader title="Employees" />
      <NavItem to="/employees" icon={<Users size={16} />} label="Employees" />

      {/* PAY GROUPS */}
      <SectionHeader title="Pay Groups" />
      
      {/* All Pay Groups */}
      <NavItem to="/paygroups" icon={<FolderKanban size={16} />} label="All Pay Groups" />
      
      {/* Head Office */}
      {collapsed ? (
        <NavItem to="/paygroups/head-office/regular" icon={<Building2 size={16} />} label="Head Office" />
      ) : (
        <>
          <button
            onClick={() => setHeadOfficeOpen(!headOfficeOpen)}
            className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-md text-slate-700 hover:bg-slate-50"
          >
            <span className="flex items-center gap-2">
              <Building2 size={16} /> Head Office
            </span>
            <motion.div animate={{ rotate: headOfficeOpen ? 90 : 0 }} transition={{ duration: 0.25 }}>
              <ChevronRight size={14} />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {headOfficeOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="mt-1 space-y-0.5 overflow-hidden"
              >
                <motion.div whileHover={{ x: 4 }}>
                  <Link to="/paygroups/head-office/regular" className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-md ${isActive("/paygroups/head-office/regular")}`}>
                    <Users size={15} /> Regular
                  </Link>
                </motion.div>
                <motion.div whileHover={{ x: 4 }}>
                  <Link to="/paygroups/head-office/expatriate" className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-md ${isActive("/paygroups/head-office/expatriate")}`}>
                    <Globe size={15} /> Expatriate
                  </Link>
                </motion.div>
                <motion.div whileHover={{ x: 4 }}>
                  <Link to="/paygroups/head-office/interns" className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-md ${isActive("/paygroups/head-office/interns")}`}>
                    <GraduationCap size={15} /> Interns
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Projects */}
      {collapsed ? (
        <NavItem to="/paygroups/projects/expatriate" icon={<FolderTree size={16} />} label="Projects" />
      ) : (
        <>
          <button
            onClick={() => setProjectsOpen(!projectsOpen)}
            className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-md text-slate-700 hover:bg-slate-50"
          >
            <span className="flex items-center gap-2">
              <FolderTree size={16} /> Projects
            </span>
            <motion.div animate={{ rotate: projectsOpen ? 90 : 0 }} transition={{ duration: 0.25 }}>
              <ChevronRight size={14} />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {projectsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="mt-1 space-y-0.5 overflow-hidden"
              >
                {/* Manpower */}
                <button
                  onClick={() => setManpowerOpen(!manpowerOpen)}
                  className="flex items-center justify-between w-full pl-7 pr-3 py-1.5 rounded-md text-slate-700 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <Briefcase size={15} /> Manpower
                  </span>
                  <motion.div animate={{ rotate: manpowerOpen ? 90 : 0 }} transition={{ duration: 0.25 }}>
                    <ChevronRight size={12} />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {manpowerOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="mt-1 space-y-0.5 overflow-hidden"
                    >
                      <motion.div whileHover={{ x: 4 }}>
                        <Link to="/paygroups/projects/manpower/daily" className={`flex items-center gap-2 pl-11 pr-3 py-1.5 rounded-md ${isActive("/paygroups/projects/manpower/daily")}`}>
                          <Calendar size={14} /> Daily
                        </Link>
                      </motion.div>
                      <motion.div whileHover={{ x: 4 }}>
                        <Link to="/paygroups/projects/manpower/bi-weekly" className={`flex items-center gap-2 pl-11 pr-3 py-1.5 rounded-md ${isActive("/paygroups/projects/manpower/bi-weekly")}`}>
                          <Calendar size={14} /> Bi-weekly
                        </Link>
                      </motion.div>
                      <motion.div whileHover={{ x: 4 }}>
                        <Link to="/paygroups/projects/manpower/monthly" className={`flex items-center gap-2 pl-11 pr-3 py-1.5 rounded-md ${isActive("/paygroups/projects/manpower/monthly")}`}>
                          <Calendar size={14} /> Monthly
                        </Link>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* IPPMS */}
                <button
                  onClick={() => setIppmsOpen(!ippmsOpen)}
                  className="flex items-center justify-between w-full pl-7 pr-3 py-1.5 rounded-md text-slate-700 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <Package size={15} /> IPPMS
                  </span>
                  <motion.div animate={{ rotate: ippmsOpen ? 90 : 0 }} transition={{ duration: 0.25 }}>
                    <ChevronRight size={12} />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {ippmsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="mt-1 space-y-0.5 overflow-hidden"
                    >
                      <motion.div whileHover={{ x: 4 }}>
                        <Link to="/paygroups/projects/ippms/piece-rate" className={`flex items-center gap-2 pl-11 pr-3 py-1.5 rounded-md ${isActive("/paygroups/projects/ippms/piece-rate")}`}>
                          <Package size={14} /> Piece Rate
                        </Link>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Projects Expatriate */}
                <motion.div whileHover={{ x: 4 }}>
                  <Link to="/paygroups/projects/expatriate" className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-md ${isActive("/paygroups/projects/expatriate")}`}>
                    <Globe size={15} /> Expatriate
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* PAY RUNS */}
      <SectionHeader title="Pay Runs" />
      <NavItem to="/payruns" icon={<DollarSign size={16} />} label="All Pay Runs" />
      
      {/* Head Office Pay Runs */}
      {collapsed ? (
        <NavItem to="/payruns/head-office/regular" icon={<Building2 size={16} />} label="Head Office" />
      ) : (
        <>
          <button
            onClick={() => setPayRunsHeadOfficeOpen(!payRunsHeadOfficeOpen)}
            className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-md text-slate-700 hover:bg-slate-50"
          >
            <span className="flex items-center gap-2">
              <Building2 size={16} /> Head Office
            </span>
            <motion.div animate={{ rotate: payRunsHeadOfficeOpen ? 90 : 0 }} transition={{ duration: 0.25 }}>
              <ChevronRight size={14} />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
            {payRunsHeadOfficeOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="mt-1 space-y-0.5 overflow-hidden"
              >
                <NavItem to="/payruns/head-office/regular" icon={<Users size={15} />} label="Regular" />
                <NavItem to="/payruns/head-office/expatriate" icon={<Globe size={15} />} label="Expatriate" />
                <NavItem to="/payruns/head-office/interns" icon={<GraduationCap size={15} />} label="Interns" />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Projects Pay Runs */}
      {collapsed ? (
        <NavItem to="/payruns/projects/expatriate" icon={<FolderTree size={16} />} label="Projects" />
      ) : (
        <>
          <button
            onClick={() => setPayRunsProjectsOpen(!payRunsProjectsOpen)}
            className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-md text-slate-700 hover:bg-slate-50"
          >
            <span className="flex items-center gap-2">
              <FolderTree size={16} /> Projects
            </span>
            <motion.div animate={{ rotate: payRunsProjectsOpen ? 90 : 0 }} transition={{ duration: 0.25 }}>
              <ChevronRight size={14} />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
            {payRunsProjectsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="mt-1 space-y-0.5 overflow-hidden"
              >
                {/* Manpower Pay Runs */}
                <button
                  onClick={() => setPayRunsManpowerOpen(!payRunsManpowerOpen)}
                  className="flex items-center justify-between w-full pl-7 pr-3 py-1.5 rounded-md text-slate-700 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <Briefcase size={15} /> Manpower
                  </span>
                  <motion.div animate={{ rotate: payRunsManpowerOpen ? 90 : 0 }} transition={{ duration: 0.25 }}>
                    <ChevronRight size={12} />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {payRunsManpowerOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="mt-1 space-y-0.5 overflow-hidden"
                    >
                      <NavItem to="/payruns/projects/manpower/daily" icon={<Calendar size={14} />} label="Daily" />
                      <NavItem to="/payruns/projects/manpower/bi-weekly" icon={<Calendar size={14} />} label="Bi-weekly" />
                      <NavItem to="/payruns/projects/manpower/monthly" icon={<Calendar size={14} />} label="Monthly" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <NavItem to="/payruns/projects/ippms" icon={<Package size={15} />} label="IPPMS" />
                <NavItem to="/payruns/projects/expatriate" icon={<Globe size={15} />} label="Expatriate" />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* LOCAL PAYROLL */}
      {collapsed ? (
        <NavItem to="/payruns/local/monthly" icon={<Users size={16} />} label="Local" />
      ) : (
        <>
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
        </>
      )}

      {/* REPORTS */}
      <SectionHeader title="Reports" />
      <NavItem to="/reports" icon={<FileText size={16} />} label="Reports" />

      {/* SETTINGS */}
      <SectionHeader title="Settings" />
      <NavItem to="/settings" icon={<Settings size={16} />} label="Settings" />
    </div>
  );
};