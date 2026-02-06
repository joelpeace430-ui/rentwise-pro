import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  CheckCircle2,
  Wrench,
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
  const activeCount = properties.filter((p) => p.status === "active").length;
  const occupancyRate = totalUnits > 0 ? (totalOccupied / totalUnits) * 100 : 0;

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-md border-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-[3rem]" />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{properties.length}</p>
                  <p className="text-xs text-muted-foreground">Properties</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md border-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-accent/5 rounded-bl-[3rem]" />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                  <Home className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalUnits}</p>
                  <p className="text-xs text-muted-foreground">Total Units</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md border-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-success/5 rounded-bl-[3rem]" />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                  <Users className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalOccupied}</p>
                  <p className="text-xs text-muted-foreground">Occupied Units</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md border-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-[3rem]" />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{occupancyRate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Occupancy Rate</p>
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
              placeholder="Search properties by name or address..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            className="gap-2 shadow-md"
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
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProperties.length === 0 ? (
          <Card className="shadow-lg border-0">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {search ? "No properties found" : "No properties yet"}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  {search
                    ? "Try adjusting your search terms"
                    : "Add your first property to start managing your portfolio"}
                </p>
                {!search && (
                  <Button onClick={() => setDialogOpen(true)} className="shadow-md">
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
              const occupancy = property.total_units > 0
                ? ((property.occupied_units || 0) / property.total_units) * 100
                : 0;
              const vacant = property.total_units - (property.occupied_units || 0);

              return (
                <Card
                  key={property.id}
                  className="shadow-lg border-0 hover:shadow-xl transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-accent" />
                  <CardContent className="p-5 pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 shadow-sm">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-lg leading-tight">
                            {property.name}
                          </h3>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{property.address}</span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
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

                    {/* Occupancy */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Occupancy</span>
                        <span className="font-medium text-foreground">
                          {property.occupied_units || 0}/{property.total_units} units
                        </span>
                      </div>
                      <Progress value={occupancy} className="h-2" />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <Badge
                        variant="secondary"
                        className={
                          property.status === "active"
                            ? "bg-success/10 text-success border-success/20 gap-1"
                            : "bg-warning/10 text-warning border-warning/20 gap-1"
                        }
                      >
                        {property.status === "active" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Wrench className="h-3 w-3" />
                        )}
                        {property.status === "active" ? "Active" : "Maintenance"}
                      </Badge>
                      {vacant > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {vacant} vacant {vacant === 1 ? "unit" : "units"}
                        </span>
                      )}
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
