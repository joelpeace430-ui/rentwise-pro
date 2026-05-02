import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCaretakers } from "@/hooks/useCaretakers";
import { formatCurrency } from "@/lib/currency";

interface Props {
  propertyId: string;
}

interface AgentRow {
  id: string;
  agent_user_id: string;
  commission_type: string;
  commission_rate: number;
  email?: string;
}

interface CaretakerRow {
  id: string;
  caretaker_id: string;
  commission_type: string;
  commission_rate: number;
  caretaker_name?: string;
}

export const AssignmentManager = ({ propertyId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { caretakers } = useCaretakers();

  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [caretakerAssigns, setCaretakerAssigns] = useState<CaretakerRow[]>([]);
  const [agentEmail, setAgentEmail] = useState("");
  const [agentType, setAgentType] = useState<"percentage" | "fixed">("percentage");
  const [agentRate, setAgentRate] = useState("10");
  const [selCaretaker, setSelCaretaker] = useState("");
  const [careType, setCareType] = useState<"percentage" | "fixed">("percentage");
  const [careRate, setCareRate] = useState("5");

  const load = async () => {
    const { data: a } = await supabase
      .from("agent_commissions")
      .select("id, agent_user_id, commission_type, commission_rate")
      .eq("property_id", propertyId);
    const agentList = (a || []) as AgentRow[];
    // Get profile emails
    if (agentList.length) {
      const ids = agentList.map(x => x.agent_user_id);
      const { data: profs } = await supabase.from("profiles").select("user_id, email").in("user_id", ids);
      agentList.forEach(x => { x.email = profs?.find(p => p.user_id === x.agent_user_id)?.email || x.agent_user_id; });
    }
    setAgents(agentList);

    const { data: c } = await supabase
      .from("caretaker_assignments" as any)
      .select("id, caretaker_id, commission_type, commission_rate")
      .eq("property_id", propertyId);
    setCaretakerAssigns(((c || []) as any) as CaretakerRow[]);
  };

  useEffect(() => { load(); }, [propertyId, caretakers.length]);

  const addAgent = async () => {
    if (!user || !agentEmail.trim()) return;
    const { data: prof } = await supabase
      .from("profiles").select("user_id").eq("email", agentEmail.trim()).maybeSingle();
    if (!prof) {
      toast({ title: "Agent not found", description: "No user with that email.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("agent_commissions").insert({
      agent_user_id: prof.user_id,
      property_id: propertyId,
      landlord_user_id: user.id,
      commission_type: agentType,
      commission_rate: Number(agentRate) || 0,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Agent assigned" });
    setAgentEmail(""); setAgentRate("10");
    load();
  };

  const removeAgent = async (id: string) => {
    await supabase.from("agent_commissions").delete().eq("id", id);
    load();
  };

  const addCaretaker = async () => {
    if (!user || !selCaretaker) return;
    const { error } = await supabase.from("caretaker_assignments" as any).insert({
      caretaker_id: selCaretaker,
      property_id: propertyId,
      landlord_user_id: user.id,
      commission_type: careType,
      commission_rate: Number(careRate) || 0,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Caretaker assigned" });
    setSelCaretaker(""); setCareRate("5");
    load();
  };

  const removeCaretaker = async (id: string) => {
    await supabase.from("caretaker_assignments" as any).delete().eq("id", id);
    load();
  };

  const renderRate = (type: string, rate: number) =>
    type === "fixed" ? formatCurrency(rate) + "/payment" : `${rate}%`;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Agents */}
      <Card>
        <CardHeader><CardTitle className="text-base">Agents</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {agents.length === 0 && <p className="text-sm text-muted-foreground">No agents assigned.</p>}
            {agents.map(a => (
              <div key={a.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <p className="text-sm font-medium">{a.email}</p>
                  <Badge variant="outline" className="mt-1">{renderRate(a.commission_type, a.commission_rate)}</Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeAgent(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 space-y-3">
            <div>
              <Label>Agent email</Label>
              <Input value={agentEmail} onChange={(e) => setAgentEmail(e.target.value)} placeholder="agent@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Type</Label>
                <Select value={agentType} onValueChange={(v: any) => setAgentType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed (KSH)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{agentType === "percentage" ? "Rate (%)" : "Amount (KSH)"}</Label>
                <Input type="number" value={agentRate} onChange={(e) => setAgentRate(e.target.value)} />
              </div>
            </div>
            <Button onClick={addAgent} className="w-full gap-2"><UserPlus className="h-4 w-4" /> Assign Agent</Button>
          </div>
        </CardContent>
      </Card>

      {/* Caretakers */}
      <Card>
        <CardHeader><CardTitle className="text-base">Caretakers</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {caretakerAssigns.length === 0 && <p className="text-sm text-muted-foreground">No caretakers assigned.</p>}
            {caretakerAssigns.map(c => {
              const ct = caretakers.find(x => x.id === c.caretaker_id);
              return (
                <div key={c.id} className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <p className="text-sm font-medium">{ct ? `${ct.first_name} ${ct.last_name}` : "Unknown"}</p>
                    <Badge variant="outline" className="mt-1">{renderRate(c.commission_type, c.commission_rate)}</Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeCaretaker(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              );
            })}
          </div>
          <div className="border-t pt-4 space-y-3">
            <div>
              <Label>Caretaker</Label>
              <Select value={selCaretaker} onValueChange={setSelCaretaker}>
                <SelectTrigger><SelectValue placeholder="Select caretaker..." /></SelectTrigger>
                <SelectContent>
                  {caretakers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Type</Label>
                <Select value={careType} onValueChange={(v: any) => setCareType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed (KSH)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{careType === "percentage" ? "Rate (%)" : "Amount (KSH)"}</Label>
                <Input type="number" value={careRate} onChange={(e) => setCareRate(e.target.value)} />
              </div>
            </div>
            <Button onClick={addCaretaker} className="w-full gap-2" disabled={!selCaretaker}>
              <UserPlus className="h-4 w-4" /> Assign Caretaker
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssignmentManager;
