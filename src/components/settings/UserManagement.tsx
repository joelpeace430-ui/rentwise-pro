import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles, AppRole } from "@/hooks/useUserRoles";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, UserPlus, Trash2, Loader2, Search, ShieldCheck } from "lucide-react";

interface UserWithRoles {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  roles: AppRole[];
}

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  landlord: "bg-primary/10 text-primary border-primary/20",
  finance: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  agent: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  caretaker: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

const ASSIGNABLE_ROLES: AppRole[] = ["finance", "agent", "caretaker"];

const UserManagement = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRoles();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | "">("");
  const [assigning, setAssigning] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [roleToRemove, setRoleToRemove] = useState<{ userId: string; role: AppRole; userName: string } | null>(null);

  const fetchUsers = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, first_name, last_name");

      if (profilesError) throw profilesError;

      // Get all roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Merge profiles with roles
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
        } else {
          userMap.set(role.user_id, {
            user_id: role.user_id,
            email: "Unknown",
            first_name: null,
            last_name: null,
            roles: [role.role as AppRole],
          });
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

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) return;
    setAssigning(true);

    const { error } = await supabase.from("user_roles").insert({
      user_id: selectedUser.user_id,
      role: selectedRole as AppRole,
      assigned_by: user?.id,
    });

    setAssigning(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message.includes("duplicate")
          ? "User already has this role"
          : "Failed to assign role",
        variant: "destructive",
      });
    } else {
      toast({ title: "Role Assigned", description: `${selectedRole} role assigned to ${selectedUser.first_name || selectedUser.email}` });
      setAssignDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole("");
      fetchUsers();
    }
  };

  const handleRemoveRole = async () => {
    if (!roleToRemove) return;
    setAssigning(true);

    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", roleToRemove.userId)
      .eq("role", roleToRemove.role);

    setAssigning(false);

    if (error) {
      toast({ title: "Error", description: "Failed to remove role", variant: "destructive" });
    } else {
      toast({ title: "Role Removed", description: `${roleToRemove.role} role removed from ${roleToRemove.userName}` });
      setRemoveDialogOpen(false);
      setRoleToRemove(null);
      fetchUsers();
    }
  };

  const filteredUsers = users.filter((u) => {
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
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                User Management
              </CardTitle>
              <CardDescription>Assign and manage roles for your team members</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                              {(u.first_name?.charAt(0) || u.email.charAt(0)).toUpperCase()}
                            </div>
                            <span>{getName(u)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {u.roles.length === 0 ? (
                              <span className="text-sm text-muted-foreground italic">No roles</span>
                            ) : (
                              u.roles.map((role) => (
                                <Badge
                                  key={role}
                                  variant="outline"
                                  className={`capitalize ${ROLE_COLORS[role] || ""}`}
                                >
                                  {role}
                                  {role !== "admin" && role !== "landlord" && (
                                    <button
                                      onClick={() => {
                                        setRoleToRemove({ userId: u.user_id, role, userName: getName(u) });
                                        setRemoveDialogOpen(true);
                                      }}
                                      className="ml-1.5 hover:text-destructive transition-colors"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(u);
                              setSelectedRole("");
                              setAssignDialogOpen(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4 mr-1.5" />
                            Assign Role
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Role Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Assign a new role to {selectedUser ? getName(selectedUser) : "this user"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select a role to assign" />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.filter(
                  (r) => !selectedUser?.roles.includes(r)
                ).map((role) => (
                  <SelectItem key={role} value={role} className="capitalize">
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignRole} disabled={!selectedRole || assigning}>
              {assigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Role Confirmation */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the <strong className="capitalize">{roleToRemove?.role}</strong> role from {roleToRemove?.userName}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveRole} disabled={assigning}>
              {assigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
