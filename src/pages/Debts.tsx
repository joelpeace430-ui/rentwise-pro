import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle, Search, Loader2, Calculator, DollarSign, Clock, Ban,
} from "lucide-react";
import { useTenantDebts } from "@/hooks/useTenantDebts";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";

const Debts = () => {
  const {
    debts, loading, runPenaltyCalculation, totalOutstanding, totalPenalties, overdueCount,
  } = useTenantDebts();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [calculating, setCalculating] = useState(false);

  const filteredDebts = debts.filter((d) => {
    const name = `${d.tenant?.first_name} ${d.tenant?.last_name}`.toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCalculate = async () => {
    setCalculating(true);
    await runPenaltyCalculation();
    setCalculating(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="default" className="bg-success text-success-foreground">Paid</Badge>;
      case "unpaid":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Unpaid</Badge>;
      case "overdue":
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout title="Debt & Penalties" subtitle="Track tenant debts and automatically apply late payment penalties">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <DollarSign className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Outstanding</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Penalties</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalPenalties)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <Ban className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Overdue Tenants</p>
                  <p className="text-2xl font-bold">{overdueCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by tenant name..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCalculate} disabled={calculating} className="gap-2">
            {calculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            Calculate Penalties
          </Button>
        </div>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-sm text-muted-foreground">
            <p>
              <strong>How it works:</strong> Penalties are automatically calculated based on each property's
              configured penalty rate and grace period. Unpaid rent after the grace period triggers a penalty.
              Configure penalty settings in <strong>Properties → Edit Property</strong>.
            </p>
          </CardContent>
        </Card>

        {/* Debts Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDebts.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-1">No debt records</h3>
                <p className="text-muted-foreground mb-4">
                  Click "Calculate Penalties" to generate debt records for the current month.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Rent</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Penalty</TableHead>
                    <TableHead>Total Owed</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDebts.map((debt) => (
                    <TableRow key={debt.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {debt.tenant?.first_name} {debt.tenant?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {debt.tenant?.property?.name} · {debt.tenant?.unit_number}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{debt.month_year}</TableCell>
                      <TableCell>{formatCurrency(debt.rent_amount)}</TableCell>
                      <TableCell className="text-success">{formatCurrency(debt.amount_paid)}</TableCell>
                      <TableCell className={debt.penalty_amount > 0 ? "text-destructive font-semibold" : ""}>
                        {debt.penalty_amount > 0 ? formatCurrency(debt.penalty_amount) : "—"}
                      </TableCell>
                      <TableCell className="font-bold">
                        {debt.total_owed > 0 ? formatCurrency(debt.total_owed) : "—"}
                      </TableCell>
                      <TableCell>{getStatusBadge(debt.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Debts;
