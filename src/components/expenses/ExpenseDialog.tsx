import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useExpenses, EXPENSE_CATEGORIES, CreateExpenseInput, Expense } from "@/hooks/useExpenses";
import { useProperties } from "@/hooks/useProperties";
import { format } from "date-fns";

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
}

export const ExpenseDialog = ({ open, onOpenChange, expense }: ExpenseDialogProps) => {
  const { createExpense, updateExpense } = useExpenses();
  const { properties } = useProperties();
  const isEditing = !!expense;

  const [formData, setFormData] = useState<CreateExpenseInput>({
    property_id: expense?.property_id || null,
    category: expense?.category || "",
    description: expense?.description || "",
    amount: expense?.amount || 0,
    expense_date: expense?.expense_date || format(new Date(), "yyyy-MM-dd"),
    vendor: expense?.vendor || "",
    is_tax_deductible: expense?.is_tax_deductible ?? true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (isEditing && expense) {
      await updateExpense(expense.id, formData);
    } else {
      await createExpense(formData);
    }

    setIsSubmitting(false);
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      property_id: null,
      category: "",
      description: "",
      amount: 0,
      expense_date: format(new Date(), "yyyy-MM-dd"),
      vendor: "",
      is_tax_deductible: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Expense" : "Add New Expense"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount || ""}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense_date">Date *</Label>
              <Input
                id="expense_date"
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="property">Property (Optional)</Label>
              <Select
                value={formData.property_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, property_id: value === "none" ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific property</SelectItem>
                  {properties.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor</Label>
            <Input
              id="vendor"
              value={formData.vendor || ""}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              placeholder="e.g., Home Depot, ABC Plumbing"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Details about this expense..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_tax_deductible" className="cursor-pointer">
              Tax Deductible
            </Label>
            <Switch
              id="is_tax_deductible"
              checked={formData.is_tax_deductible}
              onCheckedChange={(checked) => setFormData({ ...formData, is_tax_deductible: checked })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.category || !formData.amount}>
              {isSubmitting ? "Saving..." : isEditing ? "Update" : "Add Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
