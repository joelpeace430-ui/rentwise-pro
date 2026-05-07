import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Loader2, Wrench, Phone, Mail, MoreHorizontal, ArrowLeft, Coins } from "lucide-react";
import { useCaretakers, Caretaker } from "@/hooks/useCaretakers";
import CaretakerDialog from "@/components/caretakers/CaretakerDialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";

const Caretakers = () => {
  const { caretakers, loading, createCaretaker, updateCaretaker, deleteCaretaker } = useCaretakers();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Caretaker | null>(null);
  const [selected, setSelected] = useState<Caretaker | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [groups, setGroups] = useState<Array<{ landlord_user_id: string; landlord_name: string; pending: number; paid: number; entries: any[] }>>([]);

  useEffect(() => {
    const load = async () => {
      if (!selected) return;
      setDetailLoading(true);
      const { data } = await supabase
        .from("commission_ledger" as any)
        .select("*")
        .eq("recipient_type", "caretaker")
        .eq("caretaker_id", selected.id)
        .order("created_at", { ascending: false });
      const list = (data || []) as any[];
      const landlordIds = Array.from(new Set(list.map((e: any) => e.landlord_user_id)));
      const propIds = Array.from(new Set(list.map((e: any) => e.property_id)));
      const [{ data: profs }, { data: props }] = await Promise.all([
        landlordIds.length ? supabase.from("profiles").select("user_id, email, first_name, last_name").in("user_id", landlordIds) : Promise.resolve({ data: [] } as any),
        propIds.length ? supabase.from("properties").select("id, name").in("id", propIds) : Promise.resolve({ data: [] } as any),
      ]);
      const profMap = Object.fromEntries((profs || []).map((p: any) => [p.user_id, p]));
      const propMap = Object.fromEntries((props || []).map((p: any) => [p.id, p.name]));
      const byLandlord: Record<string, any> = {};
      list.forEach((e: any) => {
        const key = e.landlord_user_id;
        if (!byLandlord[key]) {
          const p = profMap[key];
          byLandlord[key] = {
            landlord_user_id: key,
            landlord_name: p ? (`${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email) : "Unknown",
            pending: 0, paid: 0, entries: [],
          };
        }
        byLandlord[key].entries.push({ ...e, property_name: propMap[e.property_id] || "—" });
        if (e.status === "paid") byLandlord[key].paid += Number(e.commission_amount);
        else byLandlord[key].pending += Number(e.commission_amount);
      });
      setGroups(Object.values(byLandlord));
      setDetailLoading(false);
    };
    load();
  }, [selected]);

  const filtered = caretakers.filter(c =>
    `${c.first_name} ${c.last_name} ${c.phone || ""} ${c.email || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (input: any) => {
    if (editing) return updateCaretaker(editing.id, input);
    return createCaretaker(input);
  };

  if (selected) {
    const totalPending = groups.reduce((s, g) => s + g.pending, 0);
    const totalPaid = groups.reduce((s, g) => s + g.paid, 0);
    return (
      <DashboardLayout title={`${selected.first_name} ${selected.last_name}`} subtitle="Commission earnings by landlord">
        <div className="space-y-6">
          <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to caretakers
          </Button>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card><CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold">{formatCurrency(totalPending)}</p></div>
              <Coins className="h-6 w-6 text-warning" />
            </CardContent></Card>
            <Card><CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Paid</p><p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p></div>
              <Coins className="h-6 w-6 text-success" />
            </CardContent></Card>
          </div>

          {detailLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : groups.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">No commission entries yet.</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {groups.map(g => (
                <Card key={g.landlord_user_id}>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between p-4 border-b">
                      <div>
                        <p className="font-semibold">{g.landlord_name}</p>
                        <p className="text-xs text-muted-foreground">{g.entries.length} payment{g.entries.length === 1 ? "" : "s"}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p>Pending: <span className="font-semibold">{formatCurrency(g.pending)}</span></p>
                        <p className="text-muted-foreground">Paid: {formatCurrency(g.paid)}</p>
                      </div>
                    </div>
                    <div className="divide-y">
                      {g.entries.map((e: any) => (
                        <div key={e.id} className="flex items-center justify-between p-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{e.property_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {e.commission_type === "fixed" ? "Fixed" : `${e.commission_rate}%`} on {formatCurrency(e.payment_amount)} · {new Date(e.created_at).toLocaleDateString("en-KE")}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold">{formatCurrency(Number(e.commission_amount))}</p>
                            <Badge variant={e.status === "paid" ? "default" : "secondary"} className="mt-1">{e.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Caretakers" subtitle="Manage caretakers and property assignments">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search caretakers..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Caretaker
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <Wrench className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold">No caretakers yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add caretakers to assign them to properties.</p>
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Caretaker</Button>
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(c)}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold">{c.first_name} {c.last_name}</p>
                      <Badge variant={c.status === "active" ? "default" : "secondary"} className="mt-1">{c.status}</Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => { setEditing(c); setOpen(true); }}>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteCaretaker(c.id)}>Remove</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {c.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{c.phone}</div>}
                    {c.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{c.email}</div>}
                    <div className="pt-2 text-xs">Assigned to <span className="font-semibold text-foreground">{c.assignment_count}</span> {c.assignment_count === 1 ? "property" : "properties"}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CaretakerDialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}
        caretaker={editing}
        onSave={handleSave}
      />
    </DashboardLayout>
  );
};

export default Caretakers;
