import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Droplet, Zap, Trash, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";

const UTILITY_LABELS: Record<string, { label: string; icon: any }> = {
  water: { label: "Water", icon: Droplet },
  electricity: { label: "Electricity", icon: Zap },
  garbage: { label: "Garbage", icon: Trash },
};

const UtilityBilling = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bills, setBills] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    tenant_id: "", utility_type: "water",
    usage_amount: "", unit_cost: "", total_amount: "",
    billing_period: new Date().toISOString().slice(0, 7),
    due_date: "",
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: b }, { data: t }] = await Promise.all([
      supabase.from("utility_bills" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("tenants").select("id, first_name, last_name, property_id, unit_number"),
    ]);
    setBills((b || []) as any[]);
    setTenants((t || []) as any[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const submit = async () => {
    if (!user || !form.tenant_id) return;
    const tenant = tenants.find(t => t.id === form.tenant_id);
    if (!tenant) return;
    const usage = Number(form.usage_amount) || 0;
    const unit = Number(form.unit_cost) || 0;
    const total = Number(form.total_amount) || (usage * unit);
    const { error } = await supabase.from("utility_bills" as any).insert({
      user_id: user.id,
      tenant_id: form.tenant_id,
      property_id: tenant.property_id,
      utility_type: form.utility_type,
      usage_amount: usage,
      unit_cost: unit,
      total_amount: total,
      billing_period: form.billing_period,
      due_date: form.due_date || null,
      status: "pending",
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Bill created" });
    setOpen(false);
    setForm({ ...form, tenant_id: "", usage_amount: "", unit_cost: "", total_amount: "" });
    load();
  };

  const markPaid = async (id: string) => {
    await supabase.from("utility_bills" as any).update({ status: "paid" } as any).eq("id", id);
    load();
  };

  const tenantName = (id: string) => {
    const t = tenants.find(x => x.id === id);
    return t ? `${t.first_name} ${t.last_name} · Unit ${t.unit_number}` : "—";
  };

  return (
    <DashboardLayout title="Utility Bills" subtitle="Water, electricity, and garbage usage billing">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Bill</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : bills.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <Droplet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold">No utility bills yet</p>
            <p className="text-sm text-muted-foreground mb-4">Record water, electricity, or garbage usage per tenant.</p>
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Bill</Button>
          </CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <div className="divide-y">
              {bills.map((b: any) => {
                const u = UTILITY_LABELS[b.utility_type] || { label: b.utility_type, icon: Droplet };
                const Icon = u.icon;
                return (
                  <div key={b.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="h-5 w-5 text-primary" /></div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{tenantName(b.tenant_id)}</p>
                        <p className="text-xs text-muted-foreground">{u.label} · {b.billing_period}{b.usage_amount ? ` · ${b.usage_amount} units` : ""}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(b.total_amount)}</p>
                      <div className="flex items-center gap-2 mt-1 justify-end">
                        <Badge variant={b.status === "paid" ? "default" : "secondary"}>{b.status}</Badge>
                        {b.status !== "paid" && (
                          <Button size="sm" variant="ghost" onClick={() => markPaid(b.id)}>Mark paid</Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Utility Bill</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Tenant</Label>
              <Select value={form.tenant_id} onValueChange={(v) => setForm({ ...form, tenant_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select tenant..." /></SelectTrigger>
                <SelectContent>
                  {tenants.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name} · Unit {t.unit_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Utility</Label>
                <Select value={form.utility_type} onValueChange={(v) => setForm({ ...form, utility_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="water">Water</SelectItem>
                    <SelectItem value="electricity">Electricity</SelectItem>
                    <SelectItem value="garbage">Garbage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing Period (YYYY-MM)</Label>
                <Input value={form.billing_period} onChange={(e) => setForm({ ...form, billing_period: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Usage</Label>
                <Input type="number" value={form.usage_amount} onChange={(e) => setForm({ ...form, usage_amount: e.target.value })} />
              </div>
              <div>
                <Label>Unit cost</Label>
                <Input type="number" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
              </div>
              <div>
                <Label>Total (KSH)</Label>
                <Input type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default UtilityBilling;
