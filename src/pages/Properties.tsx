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
  TrendingUp,
  ArrowUpRight,
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
  const vacantUnits = totalUnits - totalOccupied;
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

  const statCards = [
    {
      label: "Total Properties",
      value: properties.length,
      icon: Building2,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      accentBg: "bg-primary/5",
    },
    {
      label: "Total Units",
      value: totalUnits,
      icon: Home,
      iconBg: "bg-accent/10",
      iconColor: "text-accent",
      accentBg: "bg-accent/5",
    },
    {
      label: "Occupied",
      value: totalOccupied,
      suffix: `/ ${totalUnits}`,
      icon: Users,
      iconBg: "bg-success/10",
      iconColor: "text-success",
      accentBg: "bg-success/5",
    },
    {
      label: "Occupancy Rate",
      value: `${occupancyRate.toFixed(0)}%`,
      icon: TrendingUp,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      accentBg: "bg-primary/5",
      progress: occupancyRate,
    },
  ];

  return (
    <DashboardLayout
      title="Properties"
      subtitle="Manage your rental properties and units"
    >
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card
              key={stat.label}
              className="shadow-md border-0 relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 ${stat.accentBg} rounded-bl-[5rem] -mr-4 -mt-4 transition-transform duration-300 group-hover:scale-110`} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between relative">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                      {stat.suffix && (
                        <span className="text-sm text-muted-foreground font-medium">{stat.suffix}</span>
                      )}
                    </div>
                    {stat.progress !== undefined && (
                      <Progress value={stat.progress} className="h-1.5 mt-2 w-24" />
                    )}
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg} shadow-sm`}>
                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search properties by name or address..."
              className="pl-9 h-11"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            className="gap-2 shadow-md h-11 px-6"
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
            <CardContent className="py-20">
              <div className="text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 mx-auto mb-5">
                  <Building2 className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {search ? "No properties found" : "No properties yet"}
                </h3>
                <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                  {search
                    ? "Try adjusting your search terms"
                    : "Add your first property to start managing your portfolio"}
                </p>
                {!search && (
                  <Button onClick={() => setDialogOpen(true)} className="shadow-md px-6 h-11">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Property
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProperties.map((property, index) => {
              const occupancy = property.total_units > 0
                ? ((property.occupied_units || 0) / property.total_units) * 100
                : 0;
              const vacant = property.total_units - (property.occupied_units || 0);
              const occupancyColor = occupancy >= 80 ? "text-success" : occupancy >= 50 ? "text-warning" : "text-destructive";
              const occupancyBg = occupancy >= 80 ? "bg-success" : occupancy >= 50 ? "bg-warning" : "bg-destructive";

              return (
                <Card
                  key={property.id}
                  className="shadow-md border-0 hover:shadow-xl transition-all duration-300 group relative overflow-hidden hover:-translate-y-1"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* Top accent bar with gradient */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/80 to-accent" />

                  <CardContent className="p-0">
                    {/* Header section */}
                    <div className="p-5 pb-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm ring-1 ring-primary/10">
                            <Building2 className="h-6 w-6 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground text-lg leading-tight truncate">
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
                              className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
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

                      {/* Occupancy visual */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Occupancy</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${occupancyColor}`}>
                              {occupancy.toFixed(0)}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({property.occupied_units || 0}/{property.total_units})
                            </span>
                          </div>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full rounded-full ${occupancyBg} transition-all duration-500 ease-out`}
                            style={{ width: `${occupancy}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer section */}
                    <div className="flex items-center justify-between px-5 py-3.5 bg-muted/30 border-t border-border/50">
                      <Badge
                        variant="secondary"
                        className={
                          property.status === "active"
                            ? "bg-success/10 text-success border-success/20 gap-1.5 px-3 py-1"
                            : "bg-warning/10 text-warning border-warning/20 gap-1.5 px-3 py-1"
                        }
                      >
                        {property.status === "active" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Wrench className="h-3 w-3" />
                        )}
                        {property.status === "active" ? "Active" : "Maintenance"}
                      </Badge>
                      {vacant > 0 ? (
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                          {vacant} vacant
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-success bg-success/10 px-2.5 py-1 rounded-full">
                          Fully occupied
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
