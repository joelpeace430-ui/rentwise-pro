import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Loader2, Wrench, Phone, Mail, MoreHorizontal } from "lucide-react";
import { useCaretakers, Caretaker } from "@/hooks/useCaretakers";
import CaretakerDialog from "@/components/caretakers/CaretakerDialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Caretakers = () => {
  const { caretakers, loading, createCaretaker, updateCaretaker, deleteCaretaker } = useCaretakers();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Caretaker | null>(null);

  const filtered = caretakers.filter(c =>
    `${c.first_name} ${c.last_name} ${c.phone || ""} ${c.email || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (input: any) => {
    if (editing) return updateCaretaker(editing.id, input);
    return createCaretaker(input);
  };

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
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold">{c.first_name} {c.last_name}</p>
                      <Badge variant={c.status === "active" ? "default" : "secondary"} className="mt-1">{c.status}</Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
