import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2, Briefcase, Building2, Users, Sparkles, ArrowRight, Percent, ScanLine, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface TenantDraft {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  unit_number: string;
  monthly_rent: string;
}

const blankTenant = (): TenantDraft => ({
  first_name: "", last_name: "", email: "", phone: "", unit_number: "", monthly_rent: "",
});

const AgentOnboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  // Landlord
  const [llFirst, setLlFirst] = useState("");
  const [llLast, setLlLast] = useState("");
  const [llEmail, setLlEmail] = useState("");
  const [llPhone, setLlPhone] = useState("");
  const [llBusiness, setLlBusiness] = useState("");

  // Property
  const [propName, setPropName] = useState("");
  const [propAddress, setPropAddress] = useState("");
  const [propLocation, setPropLocation] = useState("");
  const [propUnits, setPropUnits] = useState("1");
  const [propRent, setPropRent] = useState("");

  // Commission
  const [commType, setCommType] = useState<"percentage" | "fixed">("percentage");
  const [commRate, setCommRate] = useState("10");

  // Tenants
  const [tenants, setTenants] = useState<TenantDraft[]>([blankTenant()]);

  const addTenant = () => setTenants([...tenants, blankTenant()]);
  const removeTenant = (i: number) => setTenants(tenants.filter((_, idx) => idx !== i));
  const updateTenant = (i: number, k: keyof TenantDraft, v: string) =>
    setTenants(tenants.map((t, idx) => (idx === i ? { ...t, [k]: v } : t)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!llFirst.trim() || !propName.trim() || !propAddress.trim()) {
      toast({ title: "Missing info", description: "Landlord name, property name and address are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // 1) Managed landlord
      const { data: ll, error: llErr } = await supabase
        .from("managed_landlords" as any)
        .insert({
          agent_user_id: user.id,
          first_name: llFirst.trim(),
          last_name: llLast.trim() || null,
          email: llEmail.trim() || null,
          phone: llPhone.trim() || null,
          business_name: llBusiness.trim() || null,
        } as any)
        .select()
        .single();
      if (llErr) throw llErr;

      // 2) Property (owned by agent, references managed landlord)
      const { data: prop, error: propErr } = await supabase
        .from("properties")
        .insert({
          user_id: user.id,
          name: propName.trim(),
          address: propAddress.trim(),
          location: propLocation.trim() || null,
          total_units: Number(propUnits) || 1,
          rent_per_unit: Number(propRent) || 0,
          managed_landlord_id: (ll as any).id,
        } as any)
        .select()
        .single();
      if (propErr) throw propErr;

      // 3) Commission row so agent earns on payments
      const { error: commErr } = await supabase
        .from("agent_commissions")
        .insert({
          property_id: prop.id,
          agent_user_id: user.id,
          landlord_user_id: user.id, // agent acts as landlord-of-record for RLS
          commission_type: commType,
          commission_rate: Number(commRate) || 0,
        });
      if (commErr) throw commErr;

      // 4) Tenants
      const validTenants = tenants.filter(t => t.first_name.trim() && t.last_name.trim() && t.unit_number.trim());
      if (validTenants.length > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const oneYear = new Date(); oneYear.setFullYear(oneYear.getFullYear() + 1);
        const { error: tErr } = await supabase.from("tenants").insert(
          validTenants.map(t => ({
            user_id: user.id,
            property_id: prop.id,
            first_name: t.first_name.trim(),
            last_name: t.last_name.trim(),
            email: t.email.trim() || `${t.first_name.toLowerCase()}@tenant.local`,
            phone: t.phone.trim() || null,
            unit_number: t.unit_number.trim(),
            monthly_rent: Number(t.monthly_rent) || Number(propRent) || 0,
            lease_start: today,
            lease_end: oneYear.toISOString().slice(0, 10),
          }))
        );
        if (tErr) throw tErr;
      }

      toast({ title: "Registered successfully", description: `${llFirst} · ${propName} · ${validTenants.length} tenant(s)` });
      navigate("/agent/landlords");
    } catch (err: any) {
      toast({ title: "Failed", description: err.message || "Could not complete registration", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Register Landlord" subtitle="Onboard a landlord, property and tenants in one step">
      <div className="glass-bg -m-4 sm:-m-6 p-4 sm:p-6 min-h-[calc(100vh-4rem)]">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
          {/* Landlord */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Briefcase className="h-5 w-5 text-primary" /> Landlord</CardTitle>
              <CardDescription>Owner contact details. They don't need an account.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div><Label>First name *</Label><Input value={llFirst} onChange={e => setLlFirst(e.target.value)} required /></div>
              <div><Label>Last name</Label><Input value={llLast} onChange={e => setLlLast(e.target.value)} /></div>
              <div><Label>Email</Label><Input type="email" value={llEmail} onChange={e => setLlEmail(e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={llPhone} onChange={e => setLlPhone(e.target.value)} placeholder="+254 7XX XXX XXX" /></div>
              <div className="sm:col-span-2"><Label>Business name</Label><Input value={llBusiness} onChange={e => setLlBusiness(e.target.value)} /></div>
            </CardContent>
          </Card>

          {/* Property */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-5 w-5 text-primary" /> Property</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div><Label>Property name *</Label><Input value={propName} onChange={e => setPropName(e.target.value)} required /></div>
              <div><Label>Location</Label><Input value={propLocation} onChange={e => setPropLocation(e.target.value)} placeholder="Westlands" /></div>
              <div className="sm:col-span-2"><Label>Address *</Label><Input value={propAddress} onChange={e => setPropAddress(e.target.value)} required /></div>
              <div><Label>Total units</Label><Input type="number" min="1" value={propUnits} onChange={e => setPropUnits(e.target.value)} /></div>
              <div><Label>Default rent (KSH)</Label><Input type="number" min="0" value={propRent} onChange={e => setPropRent(e.target.value)} /></div>
            </CardContent>
          </Card>

          {/* Commission */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Percent className="h-5 w-5 text-primary" /> Your commission</CardTitle>
              <CardDescription>How much you earn from each rent payment collected on this property.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Type</Label>
                <div className="flex gap-2 mt-2">
                  <Button type="button" variant={commType === "percentage" ? "default" : "outline"} size="sm" onClick={() => setCommType("percentage")}>Percentage</Button>
                  <Button type="button" variant={commType === "fixed" ? "default" : "outline"} size="sm" onClick={() => setCommType("fixed")}>Fixed</Button>
                </div>
              </div>
              <div>
                <Label>{commType === "percentage" ? "Rate (%)" : "Fixed amount (KSH)"}</Label>
                <Input type="number" min="0" value={commRate} onChange={e => setCommRate(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Tenants */}
          <Card className="glass-card border-0">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base"><Users className="h-5 w-5 text-primary" /> Tenants</CardTitle>
                <CardDescription>Add as many as you like. Skip if none yet.</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addTenant}><Plus className="h-4 w-4 mr-1" />Add</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {tenants.map((t, i) => (
                <div key={i} className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-medium text-muted-foreground">Tenant {i + 1}</p>
                    {tenants.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeTenant(i)}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input placeholder="First name" value={t.first_name} onChange={e => updateTenant(i, "first_name", e.target.value)} />
                    <Input placeholder="Last name" value={t.last_name} onChange={e => updateTenant(i, "last_name", e.target.value)} />
                    <Input placeholder="Email" type="email" value={t.email} onChange={e => updateTenant(i, "email", e.target.value)} />
                    <Input placeholder="Phone" value={t.phone} onChange={e => updateTenant(i, "phone", e.target.value)} />
                    <Input placeholder="Unit number" value={t.unit_number} onChange={e => updateTenant(i, "unit_number", e.target.value)} />
                    <Input placeholder="Monthly rent (KSH)" type="number" value={t.monthly_rent} onChange={e => updateTenant(i, "monthly_rent", e.target.value)} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pb-6">
            <Button type="button" variant="outline" onClick={() => navigate("/agent/dashboard")}>Cancel</Button>
            <Button type="submit" disabled={saving} className="min-w-[180px]">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Sparkles className="h-4 w-4 mr-2" />Complete registration<ArrowRight className="h-4 w-4 ml-2" /></>}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default AgentOnboard;
