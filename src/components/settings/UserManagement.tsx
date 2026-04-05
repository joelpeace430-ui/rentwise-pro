import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles, AppRole } from "@/hooks/useUserRoles";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Loader2, Search, ShieldCheck, Shield, Briefcase, Wrench, Calculator, UserCog } from "lucide-react";

interface UserWithRoles {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  roles: AppRole[];
}

const ROLE_CONFIG: { role: AppRole; label: string; description: string; icon: React.ElementType; colorClass: string }[] = [
  { role: "admin", label: "Admin", description: "Full system access", icon: ShieldCheck, colorClass: "text-destructive" },
  { role: "landlord", label: "Landlord", description: "Property & tenant management", icon: Briefcase, colorClass: "text-primary" },
  { role: "finance", label: "Finance", description: "Payments, invoices, reports", icon: Calculator, colorClass: "text-amber-600" },
  { role: "agent", label: "Agent", description: "Tenant & property operations", icon: UserCog, colorClass: "text-blue-600" },
  { role: "caretaker", label: "Caretaker", description: "Maintenance management", icon: Wrench, colorClass: "text-emerald-600" },
];

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  landlord: "bg-primary/10 text-primary border-primary/20",
  finance: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  agent: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  caretaker: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

const UserManagement = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRoles();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [togglingRole, setTogglingRole] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);

  const fetchUsers = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, first_name, last_name");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const userMap = new Map<string, UserWithRoles>();

      for (const profile of profiles || []) {
        userMap.set(profile.user_id, {
          user_id: profile.user_id,
          email: profile.email || "No email",
          first_name: profile.first_name,
          last_name: profile.last_name,
          roles: [],
        });
      }

      for (const role of roles || []) {
        const existing = userMap.get(role.user_id);
        if (existing) {
          existing.roles.push(role.role as AppRole);
        }
      }

      setUsers(Array.from(userMap.values()));
    } catch (err) {
      console.error("Error fetching users:", err);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [user]);

  const toggleRole = async (targetUser: UserWithRoles, role: AppRole) => {
    const key = `${targetUser.user_id}-${role}`;
    setTogglingRole(key);

    const hasRole = targetUser.roles.includes(role);

    if (hasRole) {
      // Remove role
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", targetUser.user_id)
        .eq("role", role);

      if (error) {
        toast({ title: "Error", description: "Failed to remove role", variant: "destructive" });
      } else {
        toast({ title: "Role Removed", description: `${role} removed from ${getName(targetUser)}` });
        // Update local state immediately
        setUsers(prev => prev.map(u =>
          u.user_id === targetUser.user_id
            ? { ...u, roles: u.roles.filter(r => r !== role) }
            : u
        ));
        if (selectedUser?.user_id === targetUser.user_id) {
          setSelectedUser(prev => prev ? { ...prev, roles: prev.roles.filter(r => r !== role) } : null);
        }
      }
    } else {
      // Add role
      const { error } = await supabase.from("user_roles").insert({
        user_id: targetUser.user_id,
        role,
        assigned_by: user?.id,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message.includes("duplicate") ? "User already has this role" : "Failed to assign role",
          variant: "destructive",
        });
      } else {
        toast({ title: "Role Assigned", description: `${role} assigned to ${getName(targetUser)}` });
        setUsers(prev => prev.map(u =>
          u.user_id === targetUser.user_id
            ? { ...u, roles: [...u.roles, role] }
            : u
        ));
        if (selectedUser?.user_id === targetUser.user_id) {
          setSelectedUser(prev => prev ? { ...prev, roles: [...prev.roles, role] } : null);
        }
      }
    }

    setTogglingRole(null);
  };

  const filteredUsers = users.filter((u) => {
    // Don't show current admin user (can't modify own roles)
    if (u.user_id === user?.id) return false;
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.first_name?.toLowerCase() || "").includes(q) ||
      (u.last_name?.toLowerCase() || "").includes(q)
    );
  });

  const getName = (u: UserWithRoles) => {
    if (u.first_name || u.last_name) return `${u.first_name || ""} ${u.last_name || ""}`.trim();
    return u.email;
  };

  if (!isAdmin()) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Admin Access Required</p>
          <p className="text-sm">Only administrators can manage user roles.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {ROLE_CONFIG.map(({ role, label, icon: Icon, colorClass }) => {
          const count = users.filter(u => u.roles.includes(role)).length;
          return (
            <Card key={role} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground">{label}s</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User List */}
        <Card className="shadow-md lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Team Members
            </CardTitle>
            <CardDescription>Select a user to manage their access permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No other users found
                  </div>
                ) : (
                  filteredUsers.map((u) => (
                    <button
                      key={u.user_id}
                      onClick={() => setSelectedUser(u)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                        selectedUser?.user_id === u.user_id
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted/50 border border-transparent"
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                        {(u.first_name?.charAt(0) || u.email.charAt(0)).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{getName(u)}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-1 shrink-0">
                        {u.roles.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">No access</span>
                        ) : (
                          u.roles.map((role) => (
                            <Badge key={role} variant="outline" className={`text-[10px] px-1.5 py-0 capitalize ${ROLE_COLORS[role]}`}>
                              {role}
                            </Badge>
                          ))
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Panel */}
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Access Control
            </CardTitle>
            <CardDescription>
              {selectedUser
                ? `Toggle permissions for ${getName(selectedUser)}`
                : "Select a user to manage roles"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedUser ? (
              <div className="text-center py-12">
                <UserCog className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Click on a user from the list to manage their roles</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Selected user info */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                    {(selectedUser.first_name?.charAt(0) || selectedUser.email.charAt(0)).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{getName(selectedUser)}</p>
                    <p className="text-xs text-muted-foreground truncate">{selectedUser.email}</p>
                  </div>
                </div>

                {/* Role toggles */}
                {ROLE_CONFIG.map(({ role, label, description, icon: Icon, colorClass }, index) => {
                  const hasRole = selectedUser.roles.includes(role);
                  const isToggling = togglingRole === `${selectedUser.user_id}-${role}`;

                  return (
                    <div key={role}>
                      <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-md bg-muted ${colorClass}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{label}</p>
                            <p className="text-xs text-muted-foreground">{description}</p>
                          </div>
                        </div>
                        <div className="relative">
                          {isToggling && (
                            <Loader2 className="h-4 w-4 animate-spin absolute -left-6 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          )}
                          <Switch
                            checked={hasRole}
                            onCheckedChange={() => toggleRole(selectedUser, role)}
                            disabled={isToggling}
                          />
                        </div>
                      </div>
                      {index < ROLE_CONFIG.length - 1 && <Separator />}
                    </div>
                  );
                })}

                <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> Users cannot modify their own roles. Only admins can change access permissions.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserManagement;
