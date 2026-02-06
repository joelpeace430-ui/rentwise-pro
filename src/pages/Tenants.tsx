import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  MoreHorizontal,
  Mail,
  Users,
  Loader2,
  MessageSquare,
  FileUp,
  Brain,
  Phone,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import { useTenants, Tenant } from "@/hooks/useTenants";
import { useProperties } from "@/hooks/useProperties";
import TenantDialog from "@/components/tenants/TenantDialog";
import InviteTenantButton from "@/components/tenants/InviteTenantButton";
import TenantMessagesDialog from "@/components/tenants/TenantMessagesDialog";
import UploadDocumentDialog from "@/components/tenants/UploadDocumentDialog";
import { PaymentScoreCard } from "@/components/ai/PaymentScoreCard";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const Tenants = () => {
  const { tenants, loading, createTenant, updateTenant, deleteTenant } = useTenants();
  const { properties } = useProperties();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [messagesDialogOpen, setMessagesDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [scoreSheetOpen, setScoreSheetOpen] = useState(false);
  const [scoringTenant, setScoringTenant] = useState<Tenant | null>(null);

  const filteredTenants = tenants.filter(
    (t) =>
      `${t.first_name} ${t.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase())
  );

  const paidCount = tenants.filter((t) => t.rent_status === "paid").length;
  const pendingCount = tenants.filter((t) => t.rent_status === "pending").length;
  const overdueCount = tenants.filter((t) => t.rent_status === "overdue").length;
  const totalMonthlyRent = tenants.reduce((sum, t) => sum + t.monthly_rent, 0);

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setDialogOpen(true);
  };

  const handleDelete = (tenant: Tenant) => {
    setTenantToDelete(tenant);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (tenantToDelete) {
      await deleteTenant(tenantToDelete.id);
      setDeleteDialogOpen(false);
      setTenantToDelete(null);
    }
  };

  const handleSave = async (data: any) => {
    if (editingTenant) {
      return updateTenant(editingTenant.id, data);
    }
    return createTenant(data);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <DashboardLayout
      title="Tenants"
      subtitle="Manage your tenant directory and lease information"
    >
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-md border-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-[3rem]" />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{tenants.length}</p>
                  <p className="text-xs text-muted-foreground">Total Tenants</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md border-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-success/5 rounded-bl-[3rem]" />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{paidCount}</p>
                  <p className="text-xs text-muted-foreground">Rent Paid</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md border-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-warning/5 rounded-bl-[3rem]" />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md border-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-destructive/5 rounded-bl-[3rem]" />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{overdueCount}</p>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tenants by name or email..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-sm text-muted-foreground">
              Monthly Revenue: <span className="font-semibold text-foreground">{formatCurrency(totalMonthlyRent)}</span>
            </div>
            <Button
              className="gap-2 shadow-md"
              onClick={() => {
                setEditingTenant(null);
                setDialogOpen(true);
              }}
              disabled={properties.length === 0}
            >
              <Plus className="h-4 w-4" />
              Add Tenant
            </Button>
          </div>
        </div>

        {properties.length === 0 && (
          <Card className="border-warning/50 bg-warning/5 border-0 shadow-md">
            <CardContent className="p-4">
              <p className="text-sm text-warning">
                You need to add a property before you can add tenants.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tenants Table */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="text-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {search ? "No tenants found" : "No tenants yet"}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  {search
                    ? "Try adjusting your search terms"
                    : "Add your first tenant to start managing leases and collecting rent"}
                </p>
                {!search && properties.length > 0 && (
                  <Button onClick={() => setDialogOpen(true)} className="shadow-md">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tenant
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/30">
                    <TableHead className="w-[250px]">Tenant</TableHead>
                    <TableHead>Property / Unit</TableHead>
                    <TableHead>Monthly Rent</TableHead>
                    <TableHead>Lease End</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id} className="table-row-hover group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm font-semibold">
                              {getInitials(tenant.first_name, tenant.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">
                              {tenant.first_name} {tenant.last_name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[160px]">{tenant.email}</span>
                            </div>
                            {tenant.phone && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {tenant.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {tenant.property?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Unit {tenant.unit_number}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(tenant.monthly_rent)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(tenant.lease_end), "MMM d, yyyy")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            tenant.rent_status === "paid"
                              ? "bg-success/10 text-success border-success/20"
                              : tenant.rent_status === "pending"
                              ? "bg-warning/10 text-warning border-warning/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          }
                        >
                          {tenant.rent_status === "paid" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {tenant.rent_status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                          {tenant.rent_status === "overdue" && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {tenant.rent_status === "paid"
                            ? "Paid"
                            : tenant.rent_status === "pending"
                            ? "Pending"
                            : "Overdue"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <InviteTenantButton
                            tenantId={tenant.id}
                            tenantEmail={tenant.email}
                            tenantName={`${tenant.first_name} ${tenant.last_name}`}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedTenant(tenant);
                                  setMessagesDialogOpen(true);
                                }}
                              >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Messages
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedTenant(tenant);
                                  setDocumentDialogOpen(true);
                                }}
                              >
                                <FileUp className="mr-2 h-4 w-4" />
                                Upload Document
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setScoringTenant(tenant);
                                  setScoreSheetOpen(true);
                                }}
                              >
                                <Brain className="mr-2 h-4 w-4" />
                                AI Payment Score
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(tenant)}>
                                Edit Tenant
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(tenant)}
                              >
                                Remove Tenant
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <TenantDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTenant(null);
        }}
        tenant={editingTenant}
        properties={properties}
        onSave={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              {tenantToDelete
                ? `${tenantToDelete.first_name} ${tenantToDelete.last_name}`
                : "this tenant"}
              ? This will also delete all associated invoices and payments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedTenant && (
        <>
          <TenantMessagesDialog
            open={messagesDialogOpen}
            onOpenChange={setMessagesDialogOpen}
            tenantId={selectedTenant.id}
            tenantName={`${selectedTenant.first_name} ${selectedTenant.last_name}`}
          />
          <UploadDocumentDialog
            open={documentDialogOpen}
            onOpenChange={setDocumentDialogOpen}
            tenantId={selectedTenant.id}
            tenantName={`${selectedTenant.first_name} ${selectedTenant.last_name}`}
          />
        </>
      )}

      <Sheet open={scoreSheetOpen} onOpenChange={setScoreSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>AI Payment Analysis</SheetTitle>
          </SheetHeader>
          {scoringTenant && (
            <div className="mt-6">
              <PaymentScoreCard
                tenantId={scoringTenant.id}
                tenantName={`${scoringTenant.first_name} ${scoringTenant.last_name}`}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

export default Tenants;
