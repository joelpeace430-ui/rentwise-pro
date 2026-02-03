import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Plus, Search, MoreHorizontal, Mail, Users, Loader2, MessageSquare, FileUp } from "lucide-react";
import { useTenants, Tenant } from "@/hooks/useTenants";
import { useProperties } from "@/hooks/useProperties";
import TenantDialog from "@/components/tenants/TenantDialog";
import InviteTenantButton from "@/components/tenants/InviteTenantButton";
import TenantMessagesDialog from "@/components/tenants/TenantMessagesDialog";
import UploadDocumentDialog from "@/components/tenants/UploadDocumentDialog";
import { format } from "date-fns";

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

  const filteredTenants = tenants.filter(
    (t) =>
      `${t.first_name} ${t.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase())
  );

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
    }).format(amount);
  };

  return (
    <DashboardLayout
      title="Tenants"
      subtitle="Manage your tenant directory and lease information"
    >
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tenants..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            className="gap-2"
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

        {properties.length === 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="p-4">
              <p className="text-sm text-warning">
                You need to add a property before you can add tenants.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tenants Table */}
        <Card className="shadow-md">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {search ? "No tenants found" : "No tenants yet"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {search
                    ? "Try adjusting your search"
                    : "Add your first tenant to get started"}
                </p>
                {!search && properties.length > 0 && (
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tenant
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[250px]">Tenant</TableHead>
                    <TableHead>Property / Unit</TableHead>
                    <TableHead>Monthly Rent</TableHead>
                    <TableHead>Lease End</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id} className="table-row-hover">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                              {getInitials(tenant.first_name, tenant.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">
                              {tenant.first_name} {tenant.last_name}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {tenant.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm text-foreground">
                            {tenant.property?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Unit {tenant.unit_number}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(tenant.monthly_rent)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(tenant.lease_end), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            tenant.rent_status === "paid"
                              ? "badge-success"
                              : tenant.rent_status === "pending"
                              ? "badge-warning"
                              : "badge-destructive"
                          }
                        >
                          {tenant.rent_status === "paid"
                            ? "Paid"
                            : tenant.rent_status === "pending"
                            ? "Pending"
                            : "Overdue"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <InviteTenantButton
                            tenantId={tenant.id}
                            tenantEmail={tenant.email}
                            tenantName={`${tenant.first_name} ${tenant.last_name}`}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedTenant(tenant);
                                setMessagesDialogOpen(true);
                              }}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Messages
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedTenant(tenant);
                                setDocumentDialogOpen(true);
                              }}>
                                <FileUp className="mr-2 h-4 w-4" />
                                Upload Document
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
              {tenantToDelete ? `${tenantToDelete.first_name} ${tenantToDelete.last_name}` : "this tenant"}?
              This will also delete all associated invoices and payments.
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
    </DashboardLayout>
  );
};

export default Tenants;
