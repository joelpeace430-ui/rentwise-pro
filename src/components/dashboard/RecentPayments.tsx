import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const payments = [
  {
    id: 1,
    tenant: "Sarah Johnson",
    initials: "SJ",
    property: "Maple Street Apartments #204",
    amount: "$1,450.00",
    date: "Dec 10, 2024",
    status: "completed",
  },
  {
    id: 2,
    tenant: "Michael Chen",
    initials: "MC",
    property: "Oak Ridge Condos #512",
    amount: "$2,100.00",
    date: "Dec 9, 2024",
    status: "completed",
  },
  {
    id: 3,
    tenant: "Emily Davis",
    initials: "ED",
    property: "Sunset Villas #103",
    amount: "$1,800.00",
    date: "Dec 8, 2024",
    status: "completed",
  },
  {
    id: 4,
    tenant: "James Wilson",
    initials: "JW",
    property: "Downtown Lofts #701",
    amount: "$2,500.00",
    date: "Dec 7, 2024",
    status: "pending",
  },
  {
    id: 5,
    tenant: "Amanda Lee",
    initials: "AL",
    property: "Riverfront Suites #302",
    amount: "$1,950.00",
    date: "Dec 5, 2024",
    status: "completed",
  },
];

const RecentPayments = () => {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Recent Payments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="flex items-center justify-between py-2 border-b border-border last:border-0"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {payment.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {payment.tenant}
                </p>
                <p className="text-xs text-muted-foreground">
                  {payment.property}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">
                {payment.amount}
              </p>
              <p className="text-xs text-muted-foreground">{payment.date}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default RecentPayments;
