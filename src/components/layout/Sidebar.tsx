import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  CreditCard,
  BarChart3,
  Receipt,
  Settings,
  LogOut,
  Wallet,
  Wrench,
  AlertTriangle,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  landlord: "Landlord",
  finance: "Finance",
  agent: "Agent",
  caretaker: "Caretaker",
};

interface SidebarContentProps {
  onNavigate?: () => void;
}

export const SidebarContent = ({ onNavigate }: SidebarContentProps) => {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const {
    roles,
    loading,
    isAdmin,
    isAgent,
    isLandlord,
    canManageProperties,
    canManageTenants,
    canViewMaintenance,
  } = useUserRoles();
  const { isFeatureEnabled } = useFeatureToggles();

  const agentNavigation = [
    { name: "Dashboard", href: "/agent/dashboard", icon: LayoutDashboard, show: true },
    { name: "Properties", href: "/agent/properties", icon: Building2, show: true },
    { name: "Tenants", href: "/agent/tenants", icon: Users, show: true },
    { name: "Payments", href: "/agent/payments", icon: CreditCard, show: isFeatureEnabled("finance") },
    { name: "Expenses", href: "/expenses", icon: Wallet, show: isFeatureEnabled("expenses") },
    { name: "Reports", href: "/reports", icon: BarChart3, show: isFeatureEnabled("reports") },
    { name: "Maintenance", href: "/maintenance", icon: Wrench, show: isFeatureEnabled("maintenance") },
  ];

  const landlordNavigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, show: true },
    { name: "Properties", href: "/properties", icon: Building2, show: canManageProperties() },
    { name: "Tenants", href: "/tenants", icon: Users, show: canManageTenants() },
    { name: "Invoices", href: "/invoices", icon: FileText, show: isFeatureEnabled("finance") },
    { name: "Payments", href: "/payments", icon: CreditCard, show: isFeatureEnabled("finance") },
    { name: "Debts", href: "/debts", icon: AlertTriangle, show: isFeatureEnabled("finance") },
    { name: "Expenses", href: "/expenses", icon: Wallet, show: isFeatureEnabled("expenses") },
    { name: "Maintenance", href: "/maintenance", icon: Wrench, show: canViewMaintenance() && isFeatureEnabled("maintenance") },
    { name: "Reports", href: "/reports", icon: BarChart3, show: isFeatureEnabled("reports") },
    { name: "Tax Center", href: "/tax", icon: Receipt, show: isFeatureEnabled("tax") },
  ];

  // Use agent nav if user is agent-only (not admin/landlord)
  const isAgentOnly = isAgent() && !isAdmin() && !isLandlord();
  const allNavigation = isAgentOnly ? agentNavigation : landlordNavigation;

  const navigation = allNavigation.filter((item) => item.show);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  const getInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  const primaryRole = roles.length > 0 ? roles[0] : null;

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <span className="text-lg font-semibold text-sidebar-foreground">
          RentFlow
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {loading ? (
          <div className="space-y-2 px-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : roles.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No role assigned.</p>
            <p className="text-xs text-muted-foreground mt-1">Contact your admin to get access.</p>
          </div>
        ) : (
          navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onNavigate}
                className={isActive ? "nav-item-active" : "nav-item"}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-sm font-medium">
            {getInitials()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.email}
            </p>
            {primaryRole && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5 capitalize border-sidebar-primary/30 text-sidebar-primary">
                {ROLE_LABELS[primaryRole] || primaryRole}
              </Badge>
            )}
          </div>
        </div>

        <Link
          to="/settings"
          onClick={onNavigate}
          className={location.pathname === "/settings" ? "nav-item-active" : "nav-item"}
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="nav-item w-full text-left"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

const Sidebar = () => {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border hidden lg:block">
      <SidebarContent />
    </aside>
  );
};

export default Sidebar;
