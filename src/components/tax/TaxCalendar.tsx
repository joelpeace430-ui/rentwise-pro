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
  DollarSign
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
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const today = new Date();

  // Generate tax events for the year
  const generateTaxEvents = (): TaxEvent[] => {
    const events: TaxEvent[] = [
      // Q1 estimated tax
      {
        id: "q1-est",
        title: "Q1 Estimated Tax Due",
        date: new Date(selectedYear, 3, 15),
        type: "deadline",
        description: "First quarter estimated tax payment deadline",
        status: "upcoming",
        icon: DollarSign,
      },
      // Q2 estimated tax
      {
        id: "q2-est",
        title: "Q2 Estimated Tax Due",
        date: new Date(selectedYear, 5, 15),
        type: "deadline",
        description: "Second quarter estimated tax payment deadline",
        status: "upcoming",
        icon: DollarSign,
      },
      // Q3 estimated tax
      {
        id: "q3-est",
        title: "Q3 Estimated Tax Due",
        date: new Date(selectedYear, 8, 15),
        type: "deadline",
        description: "Third quarter estimated tax payment deadline",
        status: "upcoming",
        icon: DollarSign,
      },
      // Q4 estimated tax (next year)
      {
        id: "q4-est",
        title: "Q4 Estimated Tax Due",
        date: new Date(selectedYear + 1, 0, 15),
        type: "deadline",
        description: "Fourth quarter estimated tax payment deadline",
        status: "upcoming",
        icon: DollarSign,
      },
      // Annual tax filing
      {
        id: "annual",
        title: "Annual Tax Return Due",
        date: new Date(selectedYear + 1, 3, 15),
        type: "filing",
        description: "Federal income tax return filing deadline",
        status: "upcoming",
        icon: FileText,
      },
      // Extension deadline
      {
        id: "extension",
        title: "Extension Deadline",
        date: new Date(selectedYear + 1, 9, 15),
        type: "deadline",
        description: "Extended tax return filing deadline (if filed for extension)",
        status: "upcoming",
        icon: FileText,
      },
      // Reminder events
      {
        id: "w2-1099",
        title: "W-2s and 1099s Available",
        date: new Date(selectedYear + 1, 0, 31),
        type: "reminder",
        description: "Employers must send W-2s and 1099s by this date",
        status: "upcoming",
        icon: Bell,
      },
      {
        id: "docs-review",
        title: "Review Tax Documents",
        date: new Date(selectedYear + 1, 1, 15),
        type: "reminder",
        description: "Review all received tax documents for accuracy",
        status: "upcoming",
        icon: Bell,
      },
    ];

    // Update status based on current date
    return events.map(event => {
      const daysUntil = Math.ceil((event.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let status: TaxEvent["status"] = "upcoming";
      if (daysUntil < 0) {
        status = "overdue";
      } else if (daysUntil <= 14) {
        status = "due-soon";
      } else if (event.date < today) {
        status = "completed";
      }
      
      return { ...event, status };
    });
  };

  const events = generateTaxEvents();

  const getMonthEvents = (month: number) => {
    return events.filter(e => e.date.getMonth() === month);
  };

  const currentMonthEvents = getMonthEvents(currentMonth);
  
  const upcomingEvents = events
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

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
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      year: date.getFullYear() !== selectedYear ? "numeric" : undefined
    });
  };

  const getDaysUntil = (date: Date) => {
    const days = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return `${Math.abs(days)} days ago`;
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    return `${days} days`;
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Tax Calendar
            </CardTitle>
            <CardDescription>Important tax dates and deadlines</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setCurrentMonth(m => m === 0 ? 11 : m - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-24 text-center">
              {months[currentMonth]}
            </span>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setCurrentMonth(m => m === 11 ? 0 : m + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Month Events */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            {months[currentMonth]} {currentMonth >= today.getMonth() ? selectedYear : selectedYear + 1}
          </h4>
          {currentMonthEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No tax events this month</p>
          ) : (
            currentMonthEvents.map(event => (
              <div 
                key={event.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <event.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{event.title}</span>
                    {getStatusBadge(event.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(event.date)}</p>
                </div>
                {getStatusIcon(event.status)}
              </div>
            ))
          )}
        </div>

        {/* Upcoming Events */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Upcoming Deadlines</h4>
          <div className="space-y-2">
            {upcomingEvents.map(event => (
              <div 
                key={event.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(event.status)}
                  <span className="truncate">{event.title}</span>
                </div>
                <span className={`text-xs ${
                  event.status === "due-soon" ? "text-warning font-medium" : "text-muted-foreground"
                }`}>
                  {getDaysUntil(event.date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaxCalendar;
