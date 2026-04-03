import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Bell, Zap, Clock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Schedule {
  id?: string;
  invoice_day: number;
  reminder_days: number[];
  is_active: boolean;
  auto_generate_invoices: boolean;
  auto_send_reminders: boolean;
  reminder_message_template: string;
  last_invoice_generated_at: string | null;
  last_reminder_sent_at: string | null;
}

const DEFAULT_TEMPLATE =
  "Hi {tenant_name}, this is a reminder that your rent of KES {amount} (Invoice: {invoice_number}) is due by {due_date}. Please make payment promptly. Thank you! - RentFlow";

const InvoiceScheduleSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<Schedule>({
    invoice_day: 1,
    reminder_days: [5, 10],
    is_active: true,
    auto_generate_invoices: true,
    auto_send_reminders: true,
    reminder_message_template: DEFAULT_TEMPLATE,
    last_invoice_generated_at: null,
    last_reminder_sent_at: null,
  });

  useEffect(() => {
    if (user) fetchSchedule();
  }, [user]);

  const fetchSchedule = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoice_schedules")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (data) {
      setSchedule({
        id: data.id,
        invoice_day: data.invoice_day,
        reminder_days: data.reminder_days,
        is_active: data.is_active,
        auto_generate_invoices: data.auto_generate_invoices,
        auto_send_reminders: data.auto_send_reminders,
        reminder_message_template: data.reminder_message_template || DEFAULT_TEMPLATE,
        last_invoice_generated_at: data.last_invoice_generated_at,
        last_reminder_sent_at: data.last_reminder_sent_at,
      });
    }
    setLoading(false);
  };

  const saveSchedule = async () => {
    if (!user) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      invoice_day: schedule.invoice_day,
      reminder_days: schedule.reminder_days,
      is_active: schedule.is_active,
      auto_generate_invoices: schedule.auto_generate_invoices,
      auto_send_reminders: schedule.auto_send_reminders,
      reminder_message_template: schedule.reminder_message_template,
    };

    let error;
    if (schedule.id) {
      ({ error } = await supabase
        .from("invoice_schedules")
        .update(payload)
        .eq("id", schedule.id));
    } else {
      ({ error } = await supabase
        .from("invoice_schedules")
        .insert(payload)
        .select()
        .single());
    }

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: "Failed to save schedule", variant: "destructive" });
    } else {
      toast({ title: "Saved!", description: "Invoice automation schedule updated successfully" });
      fetchSchedule();
    }
  };

  const addReminderDay = (day: string) => {
    const d = parseInt(day);
    if (!schedule.reminder_days.includes(d)) {
      setSchedule(prev => ({ ...prev, reminder_days: [...prev.reminder_days, d].sort((a, b) => a - b) }));
    }
  };

  const removeReminderDay = (day: number) => {
    setSchedule(prev => ({
      ...prev,
      reminder_days: prev.reminder_days.filter(d => d !== day),
    }));
  };

  const dayOptions = Array.from({ length: 28 }, (_, i) => i + 1);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-primary/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Invoice Automation
            </CardTitle>
            <CardDescription>
              Set it and forget it — invoices are generated and reminders sent automatically
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="automation-active" className="text-sm font-medium">
              {schedule.is_active ? "Active" : "Inactive"}
            </Label>
            <Switch
              id="automation-active"
              checked={schedule.is_active}
              onCheckedChange={(checked) => setSchedule(prev => ({ ...prev, is_active: checked }))}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invoice Generation */}
        <div className="space-y-3 p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <Label className="font-medium">Auto-Generate Invoices</Label>
            </div>
            <Switch
              checked={schedule.auto_generate_invoices}
              onCheckedChange={(checked) => setSchedule(prev => ({ ...prev, auto_generate_invoices: checked }))}
            />
          </div>
          {schedule.auto_generate_invoices && (
            <div className="flex items-center gap-3 pl-6">
              <span className="text-sm text-muted-foreground">Generate on day</span>
              <Select
                value={String(schedule.invoice_day)}
                onValueChange={(v) => setSchedule(prev => ({ ...prev, invoice_day: parseInt(v) }))}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map(d => (
                    <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">of every month</span>
            </div>
          )}
          {schedule.last_invoice_generated_at && (
            <p className="text-xs text-muted-foreground pl-6 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last generated: {new Date(schedule.last_invoice_generated_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Reminder Settings */}
        <div className="space-y-3 p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <Label className="font-medium">Auto-Send Reminders</Label>
            </div>
            <Switch
              checked={schedule.auto_send_reminders}
              onCheckedChange={(checked) => setSchedule(prev => ({ ...prev, auto_send_reminders: checked }))}
            />
          </div>
          {schedule.auto_send_reminders && (
            <>
              <div className="pl-6 space-y-2">
                <span className="text-sm text-muted-foreground">Send reminders on these days:</span>
                <div className="flex flex-wrap items-center gap-2">
                  {schedule.reminder_days.map(day => (
                    <Badge key={day} variant="secondary" className="gap-1">
                      Day {day}
                      <button onClick={() => removeReminderDay(day)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Select onValueChange={addReminderDay}>
                    <SelectTrigger className="w-[100px] h-7 text-xs">
                      <SelectValue placeholder="+ Add day" />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOptions.filter(d => !schedule.reminder_days.includes(d)).map(d => (
                        <SelectItem key={d} value={String(d)}>Day {d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="pl-6 space-y-2">
                <Label className="text-sm">SMS Template</Label>
                <Textarea
                  value={schedule.reminder_message_template}
                  onChange={(e) => setSchedule(prev => ({ ...prev, reminder_message_template: e.target.value }))}
                  className="text-sm min-h-[80px]"
                  placeholder="Use {tenant_name}, {amount}, {invoice_number}, {due_date}"
                />
                <p className="text-xs text-muted-foreground">
                  Variables: {"{tenant_name}"}, {"{amount}"}, {"{invoice_number}"}, {"{due_date}"}
                </p>
              </div>
            </>
          )}
          {schedule.last_reminder_sent_at && (
            <p className="text-xs text-muted-foreground pl-6 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last sent: {new Date(schedule.last_reminder_sent_at).toLocaleDateString()}
            </p>
          )}
        </div>

        <Button onClick={saveSchedule} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Automation Settings"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default InvoiceScheduleSettings;
