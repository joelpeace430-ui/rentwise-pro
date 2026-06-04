import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Smartphone, CheckCircle2, Copy, AlertCircle } from "lucide-react";

interface MpesaSettings {
  id: string;
  shortcode: string;
  shortcode_type: "paybill" | "till";
  consumer_key: string;
  consumer_secret: string;
  passkey: string | null;
  environment: "sandbox" | "production";
  callback_secret: string;
  is_active: boolean;
  last_registered_at: string | null;
}

const MpesaSettingsTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [settings, setSettings] = useState<MpesaSettings | null>(null);

  const [shortcode, setShortcode] = useState("");
  const [shortcodeType, setShortcodeType] = useState<"paybill" | "till">("paybill");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [passkey, setPasskey] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("mpesa_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const s = data as MpesaSettings;
        setSettings(s);
        setShortcode(s.shortcode);
        setShortcodeType(s.shortcode_type);
        setConsumerKey(s.consumer_key);
        setConsumerSecret(s.consumer_secret);
        setPasskey(s.passkey || "");
        setEnvironment(s.environment);
        setIsActive(s.is_active);
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!shortcode || !consumerKey || !consumerSecret) {
      toast({ title: "Missing fields", description: "Shortcode, Consumer Key and Secret are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      shortcode: shortcode.trim(),
      shortcode_type: shortcodeType,
      consumer_key: consumerKey.trim(),
      consumer_secret: consumerSecret.trim(),
      passkey: passkey.trim() || null,
      environment,
      is_active: isActive,
    };
    const { data, error } = await supabase
      .from("mpesa_settings")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setSettings(data as MpesaSettings);
    toast({ title: "Saved", description: "M-Pesa settings updated." });
  };

  const handleRegister = async () => {
    setRegistering(true);
    const { data, error } = await supabase.functions.invoke("mpesa-register-c2b");
    setRegistering(false);
    if (error || (data as any)?.error) {
      toast({
        title: "Registration failed",
        description: (data as any)?.error || error?.message || "Could not register URLs with Safaricom.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Registered", description: "Callback URLs registered with Safaricom." });
    // refresh
    if (user) {
      const { data: refreshed } = await supabase
        .from("mpesa_settings").select("*").eq("user_id", user.id).maybeSingle();
      if (refreshed) setSettings(refreshed as MpesaSettings);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied" });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const callbackUrl = settings
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mpesa-c2b-callback?shortcode=${settings.shortcode}&secret=${settings.callback_secret}`
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            M-Pesa Paybill / Till
          </CardTitle>
          <CardDescription>
            Save your Daraja API credentials so customer payments to your Paybill or Till are
            automatically recorded in this system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Shortcode Type</Label>
              <Select value={shortcodeType} onValueChange={(v: any) => setShortcodeType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paybill">Paybill</SelectItem>
                  <SelectItem value="till">Till / Buy Goods</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Shortcode (Paybill / Till No.)</Label>
              <Input value={shortcode} onChange={(e) => setShortcode(e.target.value)} placeholder="e.g. 247247" />
            </div>
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select value={environment} onValueChange={(v: any) => setEnvironment(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (test)</SelectItem>
                  <SelectItem value="production">Production (live)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex flex-col">
              <Label>Status</Label>
              <div className="flex items-center gap-3 h-10">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <span className="text-sm text-muted-foreground">{isActive ? "Active" : "Disabled"}</span>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Consumer Key</Label>
              <Input value={consumerKey} onChange={(e) => setConsumerKey(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Consumer Secret</Label>
              <Input type="password" value={consumerSecret} onChange={(e) => setConsumerSecret(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Passkey (optional, for STK Push)</Label>
              <Input type="password" value={passkey} onChange={(e) => setPasskey(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Credentials
            </Button>
          </div>
        </CardContent>
      </Card>

      {settings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Auto-Reconciliation Setup
            </CardTitle>
            <CardDescription>
              Register your callback URL with Safaricom so every Paybill / Till payment is sent here
              instantly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Your Confirmation URL</Label>
              <div className="flex gap-2">
                <Input readOnly value={callbackUrl ?? ""} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={() => callbackUrl && copy(callbackUrl)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Safaricom will POST to this URL whenever a customer pays your shortcode.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button onClick={handleRegister} disabled={registering}>
                {registering && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Register URLs with Safaricom
              </Button>
              {settings.last_registered_at && (
                <Badge variant="secondary">
                  Last registered {new Date(settings.last_registered_at).toLocaleString()}
                </Badge>
              )}
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-sm flex gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
              <div className="space-y-1">
                <p><strong>How tenants pay:</strong> Lipa na M-Pesa → Pay Bill → Business No. <strong>{settings.shortcode}</strong> → Account No. = their <strong>unit number</strong> or <strong>phone number</strong>.</p>
                <p>Payments are auto-matched to the tenant and their oldest unpaid invoice. A receipt is generated automatically.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MpesaSettingsTab;
