import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wallet } from "lucide-react";
import { useCommissions } from "@/hooks/useCommissions";
import { formatCurrency } from "@/lib/currency";

const Commissions = () => {
  const { entries, loading, markPaid } = useCommissions();
  const [tab, setTab] = useState<"all" | "pending" | "paid">("pending");

  const filtered = entries.filter(e => tab === "all" ? true : e.status === tab);
  const totalPending = entries.filter(e => e.status === "pending").reduce((s, e) => s + Number(e.commission_amount), 0);
  const totalPaid = entries.filter(e => e.status === "paid").reduce((s, e) => s + Number(e.commission_amount), 0);

  return (
    <DashboardLayout title="Commissions" subtitle="Agent and caretaker commission ledger">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card><CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Pending Payout</p><p className="text-2xl font-bold">{formatCurrency(totalPending)}</p></div>
            <Wallet className="h-6 w-6 text-warning" />
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Total Paid Out</p><p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p></div>
            <Wallet className="h-6 w-6 text-success" />
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
                      <div>
                        <p className="font-medium capitalize">{e.recipient_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.commission_type === "fixed" ? "Fixed" : `${e.commission_rate}%`} on {formatCurrency(e.payment_amount)} · {new Date(e.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(e.commission_amount)}</p>
                        <div className="flex items-center gap-2 mt-1 justify-end">
                          <Badge variant={e.status === "paid" ? "default" : "secondary"}>{e.status}</Badge>
                          {e.status === "pending" && (
                            <Button size="sm" variant="ghost" onClick={() => markPaid(e.id)}>Mark paid</Button>
                          )}
                        </div>
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

export default Commissions;
