import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Caretaker, CaretakerInput } from "@/hooks/useCaretakers";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caretaker: Caretaker | null;
  onSave: (input: CaretakerInput) => Promise<{ error: any }>;
}

const CaretakerDialog = ({ open, onOpenChange, caretaker, onSave }: Props) => {
  const [form, setForm] = useState<CaretakerInput>({ first_name: "", last_name: "", phone: "", email: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (caretaker) {
      setForm({
        first_name: caretaker.first_name,
        last_name: caretaker.last_name,
        phone: caretaker.phone || "",
        email: caretaker.email || "",
        notes: caretaker.notes || "",
      });
    } else {
      setForm({ first_name: "", last_name: "", phone: "", email: "", notes: "" });
    }
  }, [caretaker, open]);

  const submit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) return;
    setSaving(true);
    const { error } = await onSave(form);
    setSaving(false);
    if (!error) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{caretaker ? "Edit Caretaker" : "Add Caretaker"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First Name</Label>
              <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254 7XX XXX XXX" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CaretakerDialog;
