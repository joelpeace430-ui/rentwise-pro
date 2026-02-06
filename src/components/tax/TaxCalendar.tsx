import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  DollarSign,
} from "lucide-react";

interface TaxCalendarProps {
  selectedYear: number;
}

interface TaxEvent {
  id: string;
  title: string;
  date: Date;
  type: "deadline" | "reminder" | "filing";
  description: string;
  status: "upcoming" | "due-soon" | "overdue" | "completed";
  icon: React.ComponentType<{ className?: string }>;
}

const TaxCalendar = ({ selectedYear }: TaxCalendarProps) => {
  const today = new Date();

  // KRA-specific tax events
  const generateTaxEvents = (): TaxEvent[] => {
    const events: TaxEvent[] = [
      {
        id: "inst-1",
        title: "1st Instalment Tax Due",
        date: new Date(selectedYear, 3, 20),
        type: "deadline",
        description: "First instalment tax payment to KRA (20th April)",
        status: "upcoming",
        icon: DollarSign,
      },
      {
        id: "inst-2",
        title: "2nd Instalment Tax Due",
        date: new Date(selectedYear, 5, 20),
        type: "deadline",
        description: "Second instalment tax payment to KRA (20th June)",
        status: "upcoming",
        icon: DollarSign,
      },
      {
        id: "inst-3",
        title: "3rd Instalment Tax Due",
        date: new Date(selectedYear, 8, 20),
        type: "deadline",
        description: "Third instalment tax payment to KRA (20th September)",
        status: "upcoming",
        icon: DollarSign,
      },
      {
        id: "inst-4",
        title: "4th Instalment Tax Due",
        date: new Date(selectedYear, 11, 20),
        type: "deadline",
        description: "Fourth instalment tax payment to KRA (20th December)",
        status: "upcoming",
        icon: DollarSign,
      },
      {
        id: "annual-return",
        title: "KRA Annual Return Due",
        date: new Date(selectedYear + 1, 5, 30),
        type: "filing",
        description: "Individual income tax return filing deadline on iTax",
        status: "upcoming",
        icon: FileText,
      },
      {
        id: "p9-forms",
        title: "P9 Forms Issued",
        date: new Date(selectedYear + 1, 1, 28),
        type: "reminder",
        description: "Employers issue P9 forms for PAYE deductions",
        status: "upcoming",
        icon: Bell,
      },
      {
        id: "rental-vat",
        title: "Monthly Rental VAT Due",
        date: new Date(selectedYear, today.getMonth(), 20),
        type: "reminder",
        description: "VAT on commercial rental income due by 20th monthly (if applicable)",
        status: "upcoming",
        icon: Bell,
      },
    ];

    // Update status based on current date
    return events.map((event) => {
      const daysUntil = Math.ceil((event.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let status: TaxEvent["status"] = "upcoming";
      if (daysUntil < 0) {
        status = "overdue";
      } else if (daysUntil <= 14) {
        status = "due-soon";
      }

      return { ...event, status };
    });
  };

  const events = generateTaxEvents();

  const upcomingEvents = events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const getStatusBadge = (status: TaxEvent["status"]) => {
    switch (status) {
      case "overdue":
        return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
      case "due-soon":
        return <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">Due Soon</Badge>;
      case "completed":
        return <Badge className="bg-success/20 text-success border-success/30 text-xs">Completed</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Upcoming</Badge>;
    }
  };

  const getStatusIcon = (status: TaxEvent["status"]) => {
    switch (status) {
      case "overdue":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "due-soon":
        return <Clock className="h-4 w-4 text-warning" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      default:
        return <Calendar className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-KE", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDaysUntil = (date: Date) => {
    const days = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return `${Math.abs(days)}d ago`;
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    return `${days}d`;
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          KRA Tax Calendar
        </CardTitle>
        <CardDescription>Important KRA dates and deadlines for {selectedYear}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upcoming Events */}
        <div className="space-y-3">
          {upcomingEvents.map((event) => (
            <div
              key={event.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                event.status === "due-soon"
                  ? "bg-warning/5 border border-warning/20"
                  : "bg-muted/30 hover:bg-muted/50"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  event.status === "due-soon"
                    ? "bg-warning/20"
                    : "bg-primary/10"
                }`}
              >
                <event.icon
                  className={`h-4 w-4 ${
                    event.status === "due-soon" ? "text-warning" : "text-primary"
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate">{event.title}</span>
                  {getStatusBadge(event.status)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(event.date)}</p>
              </div>
              <span
                className={`text-xs font-medium shrink-0 ${
                  event.status === "due-soon" ? "text-warning" : "text-muted-foreground"
                }`}
              >
                {getDaysUntil(event.date)}
              </span>
            </div>
          ))}
        </div>

        {/* Quick reminder */}
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Tip:</span> KRA instalment tax is due on the 20th of the 4th, 6th, 9th, and 12th month. File returns on{" "}
            <a href="https://itax.kra.go.ke" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              iTax portal
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaxCalendar;
