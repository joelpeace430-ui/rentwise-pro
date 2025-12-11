import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import RecentPayments from "@/components/dashboard/RecentPayments";
import PaymentStatusChart from "@/components/dashboard/PaymentStatusChart";
import RevenueChart from "@/components/dashboard/RevenueChart";
import UpcomingPayments from "@/components/dashboard/UpcomingPayments";
import { DollarSign, Building2, Users, FileText } from "lucide-react";

const Index = () => {
  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Welcome back, John. Here's your portfolio overview."
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value="$72,450"
            change={{ value: "+12.5%", trend: "up" }}
            icon={DollarSign}
            variant="accent"
            className="animate-slide-up opacity-0 stagger-1"
          />
          <StatCard
            title="Properties"
            value="24"
            change={{ value: "+2", trend: "up" }}
            icon={Building2}
            className="animate-slide-up opacity-0 stagger-2"
          />
          <StatCard
            title="Active Tenants"
            value="42"
            change={{ value: "+5", trend: "up" }}
            icon={Users}
            className="animate-slide-up opacity-0 stagger-3"
          />
          <StatCard
            title="Pending Invoices"
            value="8"
            change={{ value: "-3", trend: "down" }}
            icon={FileText}
            className="animate-slide-up opacity-0 stagger-4"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 animate-fade-in opacity-0 stagger-2">
            <RevenueChart />
          </div>
          <div className="animate-fade-in opacity-0 stagger-3">
            <PaymentStatusChart />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="animate-fade-in opacity-0 stagger-3">
            <RecentPayments />
          </div>
          <div className="animate-fade-in opacity-0 stagger-4">
            <UpcomingPayments />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
