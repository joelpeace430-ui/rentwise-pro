import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, MoreHorizontal, Building2, MapPin } from "lucide-react";

const properties = [
  {
    id: 1,
    name: "Maple Street Apartments",
    address: "123 Maple Street, New York, NY 10001",
    units: 12,
    occupiedUnits: 10,
    monthlyRevenue: "$18,500",
    status: "active",
  },
  {
    id: 2,
    name: "Oak Ridge Condos",
    address: "456 Oak Ridge Blvd, Brooklyn, NY 11201",
    units: 8,
    occupiedUnits: 8,
    monthlyRevenue: "$16,800",
    status: "active",
  },
  {
    id: 3,
    name: "Sunset Villas",
    address: "789 Sunset Ave, Queens, NY 11375",
    units: 6,
    occupiedUnits: 5,
    monthlyRevenue: "$10,800",
    status: "active",
  },
  {
    id: 4,
    name: "Downtown Lofts",
    address: "321 Main Street, Manhattan, NY 10013",
    units: 15,
    occupiedUnits: 12,
    monthlyRevenue: "$37,500",
    status: "active",
  },
  {
    id: 5,
    name: "Riverfront Suites",
    address: "654 River Road, Bronx, NY 10451",
    units: 10,
    occupiedUnits: 7,
    monthlyRevenue: "$13,650",
    status: "maintenance",
  },
];

const Properties = () => {
  return (
    <DashboardLayout
      title="Properties"
      subtitle="Manage your rental properties and units"
    >
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search properties..."
              className="pl-9"
            />
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        </div>

        {/* Properties Table */}
        <Card className="shadow-md">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px]">Property</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead>Occupancy</TableHead>
                  <TableHead>Monthly Revenue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((property) => (
                  <TableRow key={property.id} className="table-row-hover">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {property.name}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {property.address}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{property.units}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[100px]">
                          <div
                            className="h-full bg-success rounded-full"
                            style={{
                              width: `${(property.occupiedUnits / property.units) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {property.occupiedUnits}/{property.units}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {property.monthlyRevenue}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          property.status === "active"
                            ? "badge-success"
                            : "badge-warning"
                        }
                      >
                        {property.status === "active" ? "Active" : "Maintenance"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Edit Property</DropdownMenuItem>
                          <DropdownMenuItem>Manage Units</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Properties;
