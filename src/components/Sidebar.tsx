import {
  Users, FolderKanban, DollarSign, Globe, Briefcase, Clock3,
  GraduationCap, UserSquare, Timer, FileText, Settings, ChevronRight, BarChart3,
  Building2, FolderTree, Calendar, Package, CheckSquare, AlarmClock, UserCog,
  ShieldAlert, AlertTriangle, ClipboardCheck, Shield, ListChecks, FileSearch,
  HardHat, KeyRound, Leaf, Siren, Scale
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { RBACService } from "@/lib/services/auth/rbac";

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
  onSettingsClick?: () => void;
}

export const NavigationSidebar: React.FC<SidebarProps> = ({ activeTab, onNavigate, collapsed = false, onSettingsClick }) => {
  const [localOpen, setLocalOpen] = useState(false);
  const [payGroupsOpen, setPayGroupsOpen] = useState(false);
  const [headOfficeOpen, setHeadOfficeOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  // Separate state for Pay Runs sections
  const [payRunsHeadOfficeOpen, setPayRunsHeadOfficeOpen] = useState(false);
  const [payRunsProjectsOpen, setPayRunsProjectsOpen] = useState(false);
  const [payGroupTypes, setPayGroupTypes] = useState<SidebarPayGroupType[]>([]);
  
  // Collapsible section states
  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sidebar_sections');
      return saved ? JSON.parse(saved) : { dashboard: true, employees: true, projects: true, paygroups: true, payruns: true, ehs: true, reports: true, settings: true };
    } catch { return { dashboard: true, employees: true, projects: true, paygroups: true, payruns: true, ehs: true, reports: true, settings: true }; }
  });
  
  const toggleSection = (key: string) => {
    setSectionOpen(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('sidebar_sections', JSON.stringify(next));
      return next;
    });
  };
  const location = useLocation();

  const { userContext } = useSupabaseAuth();

  const permissions = useMemo(() => {
    if (!userContext) return {
      canViewEmployees: false,
      canViewProjects: false,
      canViewPayGroups: false,
      canViewPayGroupsHeadOffice: false,
      canViewPayGroupsProjects: false,
      canViewPayRuns: false,
      canViewPayRunsHeadOffice: false,
      canViewPayRunsProjects: false,
      canViewReports: false,
      canViewSettings: false,
      canViewEhs: false,
    };

    return {
      canViewEmployees: RBACService.hasPermission('people.view'),
      canViewProjects: RBACService.hasPermission('projects.view'),
      canViewPayGroups: RBACService.hasPermission('paygroups.view'),
      canViewPayGroupsHeadOffice: RBACService.hasScopedPermission('people.view', 'ORGANIZATION'),
      canViewPayGroupsProjects: RBACService.hasScopedPermission('people.view', 'PROJECT'),
      canViewPayRuns: RBACService.hasPermission('payroll.view'),
      canViewPayRunsHeadOffice: RBACService.hasScopedPermission('payroll.view', 'ORGANIZATION'),
      canViewPayRunsProjects: RBACService.hasScopedPermission('payroll.view', 'PROJECT'),
      canViewReports: RBACService.hasPermission('reports.view'),
      canViewSettings: RBACService.isPlatformAdmin() || RBACService.isOrgAdmin(),
      canViewEhs: RBACService.hasPermission('ehs.view_dashboard') || RBACService.isPlatformAdmin() || RBACService.isOrgAdmin(),
    };
  }, [userContext]);

  const isActive = (path: string) =>
    location.pathname === path
      ? "bg-blue-50 text-blue-700 font-semibold"
      : "text-slate-700 hover:bg-slate-50 hover:text-blue-700";

  const SectionHeader = ({ title, sectionKey }: { title: string; sectionKey: string }) => {
    if (collapsed) return null;
    const isOpen = sectionOpen[sectionKey] !== false;
    return (
      <button
        onClick={() => toggleSection(sectionKey)}
        className="flex items-center justify-between w-full tracking-wider text-xs font-semibold text-slate-500 uppercase px-4 mt-6 mb-1 hover:text-slate-700 transition-colors"
      >
        <span>{title}</span>
        <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight size={12} />
        </motion.div>
      </button>
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
            id: 'piece_rate',
            name: 'Piece Rate',
            type: 'piece_rate',
            description: 'Payroll groups for employees paid per piece/unit completed',
            icon: 'Package'
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

  // Helper function to get type icon (keeping checks for safety, though unused if strict)
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'regular': return <Users size={14} />;
      case 'expatriate': return <Globe size={14} />;
      case 'piece_rate': return <Package size={14} />;
      case 'intern': return <GraduationCap size={14} />;
      default: return <Users size={14} />;
    }
  };

  return (
    <div className="flex flex-col text-sm pb-10 pl-4 pr-2">
      {/* ========================================
          MY DASHBOARD SECTION - UNIVERSAL
          ========================================
          These navigation items are available to ALL authenticated users.
          This is self-service data scoped to the current user.
          
          Access Pattern: User authentication only (no role/permission checks)
          Data Security: RLS policies scope data to current user's context
          ======================================== */}
      <SectionHeader title="My Dashboard" sectionKey="dashboard" />
      <AnimatePresence initial={false}>
        {sectionOpen.dashboard !== false && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <NavItem to="/dashboard" icon={<BarChart3 size={16} />} label="Overview" />
            <NavItem to="/dashboard/employees" icon={<Users size={16} />} label="My Employees" />
            <NavItem to="/dashboard/paygroups" icon={<FolderKanban size={16} />} label="My Pay Groups" />
            <NavItem to="/dashboard/payruns" icon={<DollarSign size={16} />} label="My Pay Runs" />
            <NavItem to="/my/approvals" icon={<CheckSquare size={16} />} label="My Approvals" />
            <NavItem to="/timesheets" icon={<AlarmClock size={16} />} label="My Timesheets" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* EMPLOYEES */}
      {permissions.canViewEmployees && (
        <>
          <SectionHeader title="Employees" sectionKey="employees" />
          <AnimatePresence initial={false}>
            {sectionOpen.employees !== false && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <NavItem to="/employees" icon={<Users size={16} />} label="Employees" />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* PROJECTS */}
      {permissions.canViewProjects && (
        <>
          <SectionHeader title="Projects" sectionKey="projects" />
          <AnimatePresence initial={false}>
            {sectionOpen.projects !== false && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <NavItem to="/projects" icon={<FolderKanban size={16} />} label="Projects" />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* PAY GROUPS */}
      {permissions.canViewPayGroups && (
        <>
          <SectionHeader title="Pay Groups" sectionKey="paygroups" />
          <AnimatePresence initial={false}>
            {sectionOpen.paygroups !== false && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <NavItem to="/paygroups" icon={<FolderKanban size={16} />} label="All Pay Groups" />

                {/* Head Office */}
                {permissions.canViewPayGroupsHeadOffice && (
                  collapsed ? (
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
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="mt-1 space-y-0.5 overflow-hidden">
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
                  )
                )}

                {/* Projects */}
                {permissions.canViewPayGroupsProjects && (
                  collapsed ? (
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
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="mt-1 space-y-0.5 overflow-hidden">
                            <motion.div whileHover={{ x: 4 }}>
                              <Link to="/paygroups/projects/manpower/daily" className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-md ${isActive("/paygroups/projects/manpower/daily")}`}>
                                <Briefcase size={15} /> Manpower
                              </Link>
                            </motion.div>
                            <motion.div whileHover={{ x: 4 }}>
                              <Link to="/paygroups/projects/ippms/piece-rate" className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-md ${isActive("/paygroups/projects/ippms/piece-rate")}`}>
                                <Package size={15} /> IPPMS
                              </Link>
                            </motion.div>
                            <motion.div whileHover={{ x: 4 }}>
                              <Link to="/paygroups/projects/expatriate" className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-md ${isActive("/paygroups/projects/expatriate")}`}>
                                <Globe size={15} /> Expatriate
                              </Link>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* PAY RUNS */}
      {permissions.canViewPayRuns && (
        <>
          <SectionHeader title="Pay Runs" sectionKey="payruns" />
          <AnimatePresence initial={false}>
            {sectionOpen.payruns !== false && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <NavItem to="/payruns" icon={<DollarSign size={16} />} label="All Pay Runs" />

                {/* Head Office Pay Runs */}
                {permissions.canViewPayRunsHeadOffice && (
                  collapsed ? (
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
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="mt-1 space-y-0.5 overflow-hidden">
                            <NavItem to="/payruns/head-office/regular" icon={<Users size={15} />} label="Regular" />
                            <NavItem to="/payruns/head-office/expatriate" icon={<Globe size={15} />} label="Expatriate" />
                            <NavItem to="/payruns/head-office/interns" icon={<GraduationCap size={15} />} label="Interns" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )
                )}

                {/* Projects Pay Runs */}
                {permissions.canViewPayRunsProjects && (
                  collapsed ? (
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
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="mt-1 space-y-0.5 overflow-hidden">
                            <motion.div whileHover={{ x: 4 }}>
                              <Link to="/payruns/projects/manpower/daily" className={`flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-md ${isActive("/payruns/projects/manpower/daily")}`}>
                                <Briefcase size={15} /> Manpower
                              </Link>
                            </motion.div>
                            <NavItem to="/payruns/projects/ippms" icon={<Package size={15} />} label="IPPMS" />
                            <NavItem to="/payruns/projects/expatriate" icon={<Globe size={15} />} label="Expatriate" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* EHS - Environment, Health & Safety */}
      {permissions.canViewEhs && (
        <>
          <SectionHeader title="EHS" sectionKey="ehs" />
          <AnimatePresence initial={false}>
            {sectionOpen.ehs !== false && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <NavItem to="/ehs" icon={<Shield size={16} />} label="Dashboard" />
                <NavItem to="/ehs/incidents" icon={<AlertTriangle size={16} />} label="Incidents" />
                <NavItem to="/ehs/hazards" icon={<ShieldAlert size={16} />} label="Hazards" />
                <NavItem to="/ehs/inspections" icon={<ClipboardCheck size={16} />} label="Inspections" />
                <NavItem to="/ehs/training" icon={<GraduationCap size={16} />} label="Training" />
                <NavItem to="/ehs/corrective-actions" icon={<ListChecks size={16} />} label="Corrective Actions" />
                <NavItem to="/ehs/risk-assessments" icon={<FileSearch size={16} />} label="Risk Assessments" />
                <NavItem to="/ehs/ppe" icon={<HardHat size={16} />} label="PPE Management" />
                <NavItem to="/ehs/permits" icon={<KeyRound size={16} />} label="Permits to Work" />
                <NavItem to="/ehs/environmental" icon={<Leaf size={16} />} label="Environmental" />
                <NavItem to="/ehs/emergency-drills" icon={<Siren size={16} />} label="Emergency Drills" />
                <NavItem to="/ehs/compliance" icon={<Scale size={16} />} label="Compliance" />
                <NavItem to="/ehs/reports" icon={<BarChart3 size={16} />} label="Reports" />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* REPORTS */}
      {permissions.canViewReports && (
        <>
          <SectionHeader title="Reports" sectionKey="reports" />
          <AnimatePresence initial={false}>
            {sectionOpen.reports !== false && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <NavItem to="/reports" icon={<FileText size={16} />} label="Reports" />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* SETTINGS */}
      {permissions.canViewSettings && (
        <>
          <SectionHeader title="Settings" sectionKey="settings" />
          <AnimatePresence initial={false}>
            {sectionOpen.settings !== false && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <motion.div whileHover={{ x: collapsed ? 0 : 4 }}>
                  <button
                    onClick={onSettingsClick}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-md w-full text-slate-700 hover:bg-slate-50 hover:text-blue-700 ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? "Settings" : undefined}
                  >
                    <Settings size={16} />
                    {!collapsed && <span>Settings</span>}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};