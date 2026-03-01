import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wrench, Clock, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  created_at: string;
  resolved_at: string | null;
  tenant_id: string;
  tenant?: { first_name: string; last_name: string; unit_number: string; property?: { name: string } } | null;
}

const priorityColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const Maintenance = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchRequests = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("*, tenant:tenants(first_name, last_name, unit_number, property:properties(name))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests((data as any) || []);
    } catch (error) {
      toast.error("Failed to load maintenance requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user?.id]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "resolved") updates.resolved_at = new Date().toISOString();

      const { error } = await supabase
        .from("maintenance_requests")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      toast.success(`Status updated to ${newStatus}`);
      fetchRequests();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const filtered = statusFilter === "all" ? requests : requests.filter((r) => r.status === statusFilter);
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const inProgressCount = requests.filter((r) => r.status === "in_progress").length;
  const resolvedCount = requests.filter((r) => r.status === "resolved").length;

  if (loading) {
    return (
      <DashboardLayout title="Maintenance" subtitle="Manage repair requests">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Maintenance" subtitle="Track and manage maintenance requests">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Wrench className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold">{inProgressCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className="text-2xl font-bold">{resolvedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter & Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Maintenance Requests ({filtered.length})</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No maintenance requests {statusFilter !== "all" ? `with status "${statusFilter}"` : "yet"}</p>
                <p className="text-sm mt-1">Tenants can submit requests from their portal</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="text-sm">
                        {format(new Date(req.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {req.tenant ? `${req.tenant.first_name} ${req.tenant.last_name}` : "Unknown"}
                        {req.tenant?.unit_number && (
                          <span className="text-muted-foreground ml-1">• Unit {req.tenant.unit_number}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{req.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{req.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[req.priority] || ""}`}>
                          {req.priority}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[req.status] || ""}`}>
                          {req.status.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        {req.status !== "resolved" && req.status !== "cancelled" && (
                          <Select
                            value={req.status}
                            onValueChange={(val) => updateStatus(req.id, val)}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Maintenance;
