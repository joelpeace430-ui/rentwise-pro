import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wallet, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/currency";

const AgentCommissions = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "pending" | "paid">("pending");

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const { data } = await supabase
        .from("commission_ledger" as any)
        .select("*")
        .eq("recipient_type", "agent")
        .eq("recipient_user_id", user.id)
        .order("created_at", { ascending: false });
      const list = (data || []) as any[];
      const propIds = Array.from(new Set(list.map((e: any) => e.property_id)));
      const landlordIds = Array.from(new Set(list.map((e: any) => e.landlord_user_id)));
      const [{ data: props }, { data: profs }] = await Promise.all([
        propIds.length ? supabase.from("properties").select("id, name").in("id", propIds) : Promise.resolve({ data: [] } as any),
        landlordIds.length ? supabase.from("profiles").select("user_id, email, first_name, last_name").in("user_id", landlordIds) : Promise.resolve({ data: [] } as any),
      ]);
      const propMap = Object.fromEntries((props || []).map((p: any) => [p.id, p.name]));
      const profMap = Object.fromEntries((profs || []).map((p: any) => [p.user_id, p]));
      setEntries(list.map((e: any) => ({
        ...e,
        property_name: propMap[e.property_id] || "—",
        landlord_name: profMap[e.landlord_user_id] ? `${profMap[e.landlord_user_id].first_name || ""} ${profMap[e.landlord_user_id].last_name || ""}`.trim() || profMap[e.landlord_user_id].email : "—",
      })));
      setLoading(false);
    };
    load();
  }, [user]);

  const filtered = entries.filter(e => tab === "all" ? true : e.status === tab);
  const totalPending = entries.filter(e => e.status === "pending").reduce((s, e) => s + Number(e.commission_amount), 0);
  const totalPaid = entries.filter(e => e.status === "paid").reduce((s, e) => s + Number(e.commission_amount), 0);

  return (
    <DashboardLayout title="My Commissions" subtitle="Commission earned on payments you helped collect">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card><CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold">{formatCurrency(totalPending)}</p></div>
            <Wallet className="h-6 w-6 text-warning" />
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Paid</p><p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p></div>
            <Coins className="h-6 w-6 text-success" />
          </CardContent></Card>
        </div>

        <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          <TabsContent value={tab}>
            <Card><CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : filtered.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">No entries.</div>
              ) : (
                <div className="divide-y">
                  {filtered.map(e => (
                    <div key={e.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{e.property_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Landlord: {e.landlord_name} · {e.commission_type === "fixed" ? "Fixed" : `${e.commission_rate}%`} on {formatCurrency(e.payment_amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString("en-KE")}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold">{formatCurrency(Number(e.commission_amount))}</p>
                        <Badge variant={e.status === "paid" ? "default" : "secondary"} className="mt-1">{e.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AgentCommissions;
