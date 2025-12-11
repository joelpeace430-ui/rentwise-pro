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
import { Plus, Search, MoreHorizontal, Mail, Phone } from "lucide-react";

const tenants = [
  {
    id: 1,
    name: "Sarah Johnson",
    initials: "SJ",
    email: "sarah.johnson@email.com",
    phone: "(555) 123-4567",
    property: "Maple Street Apartments",
    unit: "#204",
    leaseEnd: "Jun 30, 2025",
    rentStatus: "paid",
    monthlyRent: "$1,450",
  },
  {
    id: 2,
    name: "Michael Chen",
    initials: "MC",
    email: "michael.chen@email.com",
    phone: "(555) 234-5678",
    property: "Oak Ridge Condos",
    unit: "#512",
    leaseEnd: "Aug 15, 2025",
    rentStatus: "paid",
    monthlyRent: "$2,100",
  },
  {
    id: 3,
    name: "Emily Davis",
    initials: "ED",
    email: "emily.davis@email.com",
    phone: "(555) 345-6789",
    property: "Sunset Villas",
    unit: "#103",
    leaseEnd: "Mar 31, 2025",
    rentStatus: "pending",
    monthlyRent: "$1,800",
  },
  {
    id: 4,
    name: "James Wilson",
    initials: "JW",
    email: "james.wilson@email.com",
    phone: "(555) 456-7890",
    property: "Downtown Lofts",
    unit: "#701",
    leaseEnd: "Dec 31, 2024",
    rentStatus: "overdue",
    monthlyRent: "$2,500",
  },
  {
    id: 5,
    name: "Amanda Lee",
    initials: "AL",
    email: "amanda.lee@email.com",
    phone: "(555) 567-8901",
    property: "Riverfront Suites",
    unit: "#302",
    leaseEnd: "Sep 30, 2025",
    rentStatus: "paid",
    monthlyRent: "$1,950",
  },
];

const Tenants = () => {
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
            />
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Tenant
          </Button>
        </div>

        {/* Tenants Table */}
        <Card className="shadow-md">
          <CardContent className="p-0">
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
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id} className="table-row-hover">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                            {tenant.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {tenant.name}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {tenant.email}
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm text-foreground">{tenant.property}</p>
                        <p className="text-xs text-muted-foreground">
                          Unit {tenant.unit}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {tenant.monthlyRent}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tenant.leaseEnd}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          tenant.rentStatus === "paid"
                            ? "badge-success"
                            : tenant.rentStatus === "pending"
                            ? "badge-warning"
                            : "badge-destructive"
                        }
                      >
                        {tenant.rentStatus === "paid"
                          ? "Paid"
                          : tenant.rentStatus === "pending"
                          ? "Pending"
                          : "Overdue"}
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
                          <DropdownMenuItem>View Profile</DropdownMenuItem>
                          <DropdownMenuItem>Edit Details</DropdownMenuItem>
                          <DropdownMenuItem>Send Invoice</DropdownMenuItem>
                          <DropdownMenuItem>View Lease</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Remove Tenant
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

export default Tenants;
