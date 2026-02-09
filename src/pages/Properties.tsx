import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Building2,
  MapPin,
  Loader2,
  Sparkles,
  Home,
  Users,
} from "lucide-react";
import { useProperties, Property } from "@/hooks/useProperties";
import PropertyDialog from "@/components/properties/PropertyDialog";
import { SmartPricingCard } from "@/components/ai/SmartPricingCard";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const Properties = () => {
  const { properties, loading, createProperty, updateProperty, deleteProperty } = useProperties();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [pricingSheetOpen, setPricingSheetOpen] = useState(false);
  const [pricingProperty, setPricingProperty] = useState<Property | null>(null);

  const filteredProperties = properties.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnits = properties.reduce((sum, p) => sum + p.total_units, 0);
  const totalOccupied = properties.reduce((sum, p) => sum + (p.occupied_units || 0), 0);
  const occupancyRate = totalUnits > 0 ? ((totalOccupied / totalUnits) * 100).toFixed(0) : "0";

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setDialogOpen(true);
  };

  const handleDelete = (property: Property) => {
    setPropertyToDelete(property);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (propertyToDelete) {
      await deleteProperty(propertyToDelete.id);
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
    }
  };

  const handleSave = async (data: any) => {
    if (editingProperty) {
      return updateProperty(editingProperty.id, data);
    }
    return createProperty(data);
  };

  return (
    <DashboardLayout
      title="Properties"
      subtitle="Manage your rental properties and units"
    >
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Properties</p>
                  <p className="text-2xl font-bold">{properties.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Home className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Units</p>
                  <p className="text-2xl font-bold">{totalUnits}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <Users className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Occupied</p>
                  <p className="text-2xl font-bold">{totalOccupied} <span className="text-sm text-muted-foreground font-normal">/ {totalUnits}</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Occupancy Rate</p>
                  <p className="text-2xl font-bold">{occupancyRate}%</p>
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
              placeholder="Search properties..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            className="gap-2"
            onClick={() => {
              setEditingProperty(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        </div>

        {/* Properties Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProperties.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-1">
                  {search ? "No properties found" : "No properties yet"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {search
                    ? "Try adjusting your search terms"
                    : "Add your first property to get started"}
                </p>
                {!search && (
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Property
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProperties.map((property) => {
              const occupied = property.occupied_units || 0;
              const vacant = property.total_units - occupied;

              return (
                <Card key={property.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">
                            {property.name}
                          </CardTitle>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{property.address}</span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(property)}>
                            Edit Property
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setPricingProperty(property);
                              setPricingSheetOpen(true);
                            }}
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            AI Pricing
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(property)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {occupied}/{property.total_units} units occupied
                        {vacant > 0 && (
                          <span className="text-warning"> · {vacant} vacant</span>
                        )}
                      </div>
                      <Badge
                        variant={property.status === "active" ? "default" : "secondary"}
                      >
                        {property.status === "active" ? "Active" : "Maintenance"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <PropertyDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingProperty(null);
        }}
        property={editingProperty}
        onSave={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{propertyToDelete?.name}"? This action
              cannot be undone. All associated tenants must be removed first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={pricingSheetOpen} onOpenChange={setPricingSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>AI Pricing Suggestions</SheetTitle>
          </SheetHeader>
          {pricingProperty && (
            <div className="mt-6">
              <SmartPricingCard
                propertyId={pricingProperty.id}
                propertyName={pricingProperty.name}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

export default Properties;
