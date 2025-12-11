import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, AlertCircle } from "lucide-react";

const upcomingPayments = [
  {
    id: 1,
    tenant: "Robert Martinez",
    property: "Pine Grove #108",
    amount: "$1,600.00",
    dueDate: "Dec 15, 2024",
    daysUntil: 4,
  },
  {
    id: 2,
    tenant: "Lisa Thompson",
    property: "Harbor View #405",
    amount: "$2,200.00",
    dueDate: "Dec 18, 2024",
    daysUntil: 7,
  },
  {
    id: 3,
    tenant: "David Kim",
    property: "Mountain Vista #201",
    amount: "$1,850.00",
    dueDate: "Dec 20, 2024",
    daysUntil: 9,
  },
];

const overduePayments = [
  {
    id: 1,
    tenant: "Chris Brown",
    property: "City Center #903",
    amount: "$2,350.00",
    dueDate: "Dec 1, 2024",
    daysOverdue: 10,
  },
  {
    id: 2,
    tenant: "Nancy White",
    property: "Lakeside #102",
    amount: "$1,700.00",
    dueDate: "Nov 28, 2024",
    daysOverdue: 13,
  },
];

const UpcomingPayments = () => {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Payment Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overdue Section */}
        {overduePayments.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                Overdue ({overduePayments.length})
              </span>
            </div>
            <div className="space-y-3">
              {overduePayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {payment.tenant}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.property}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {payment.amount}
                    </p>
                    <p className="text-xs text-destructive">
                      {payment.daysOverdue} days overdue
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Upcoming
            </span>
          </div>
          <div className="space-y-3">
            {upcomingPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {payment.tenant}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payment.property}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {payment.amount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Due in {payment.daysUntil} days
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UpcomingPayments;
