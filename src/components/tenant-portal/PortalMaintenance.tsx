import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wrench, Plus, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

interface PortalMaintenanceProps {
  tenantId: string;
  propertyId: string;
}

const PortalMaintenance = ({ tenantId, propertyId }: PortalMaintenanceProps) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("maintenance_requests")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    setRequests(data || []);
    setLoading(false);
  };

  const getPropertyOwner = async (): Promise<string | null> => {
    // Tenants can read their own tenant record which has the landlord's user_id
    const { data } = await supabase
      .from("tenants")
      .select("user_id")
      .eq("id", tenantId)
      .maybeSingle();
    return data?.user_id || null;
  };

  useEffect(() => {
    fetchRequests();
  }, [tenantId]);

  const handleSubmit = async () => {
    if (!title || !description) return;
    setSubmitting(true);

    const ownerId = await getPropertyOwner();
    if (!ownerId) {
      toast({ title: "Error", description: "Could not find property owner", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("maintenance_requests").insert({
      tenant_id: tenantId,
      property_id: propertyId,
      user_id: ownerId,
      title,
      description,
      category,
      priority,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to submit request", variant: "destructive" });
    } else {
      toast({ title: "Submitted", description: "Your maintenance request has been submitted" });
      setTitle("");
      setDescription("");
      setCategory("general");
      setPriority("medium");
      setDialogOpen(false);
      fetchRequests();
    }
    setSubmitting(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved": return <CheckCircle className="h-4 w-4 text-success" />;
      case "in_progress": return <Clock className="h-4 w-4 text-warning" />;
      default: return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved": return <Badge className="bg-success/10 text-success border-0">Resolved</Badge>;
      case "in_progress": return <Badge className="bg-warning/10 text-warning border-0">In Progress</Badge>;
      default: return <Badge className="bg-destructive/10 text-destructive border-0">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Maintenance Requests
          </CardTitle>
          <CardDescription>Submit and track repair requests</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Maintenance Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Leaky faucet in kitchen" />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue in detail..." rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="hvac">HVAC</SelectItem>
                      <SelectItem value="appliance">Appliance</SelectItem>
                      <SelectItem value="structural">Structural</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSubmit} disabled={submitting || !title || !description} className="w-full">
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Wrench className="mb-2 h-8 w-8" />
            <p>No maintenance requests yet</p>
            <p className="text-sm">Submit a request when something needs fixing</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="flex items-start gap-3 rounded-lg border p-4">
                <div className="mt-0.5">{getStatusIcon(req.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{req.title}</p>
                    {getStatusBadge(req.status)}
                    <Badge variant="outline" className="capitalize text-xs">{req.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Submitted {format(new Date(req.created_at), "MMM d, yyyy")}
                    {req.resolved_at && ` • Resolved ${format(new Date(req.resolved_at), "MMM d, yyyy")}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PortalMaintenance;
