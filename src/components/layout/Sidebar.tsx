import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Properties", href: "/properties", icon: Building2 },
  { name: "Tenants", href: "/tenants", icon: Users },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Tax Center", href: "/tax", icon: Receipt },
];

const Sidebar = () => {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  // Get user initials
  const getInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
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
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={isActive ? "nav-item-active" : "nav-item"}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          {/* User info */}
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-sm font-medium">
              {getInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
          
          <Link to="/settings" className="nav-item">
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
    </aside>
  );
};

export default Sidebar;
