import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantAuthProvider } from "@/contexts/TenantAuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Properties from "./pages/Properties";
import Tenants from "./pages/Tenants";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import Debts from "./pages/Debts";
import Expenses from "./pages/Expenses";
import Maintenance from "./pages/Maintenance";
import Reports from "./pages/Reports";

import Settings from "./pages/Settings";
import TenantLogin from "./pages/TenantLogin";
import TenantPortal from "./pages/TenantPortal";
import AgentDashboard from "./pages/AgentDashboard";
import AgentProperties from "./pages/AgentProperties";
import AgentTenants from "./pages/AgentTenants";
import AgentPayments from "./pages/AgentPayments";
import AgentLandlords from "./pages/AgentLandlords";
import AgentCommissions from "./pages/AgentCommissions";
import AgentOnboard from "./pages/AgentOnboard";
import PropertyDetail from "./pages/PropertyDetail";
import Caretakers from "./pages/Caretakers";
import Landlords from "./pages/Landlords";
import UtilityBilling from "./pages/UtilityBilling";
import Commissions from "./pages/Commissions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Tenant Portal Routes */}
          <Route
            path="/tenant/login"
            element={
              <TenantAuthProvider>
                <TenantLogin />
              </TenantAuthProvider>
            }
          />
          <Route
            path="/tenant/portal"
            element={
              <TenantAuthProvider>
                <TenantPortal />
              </TenantAuthProvider>
            }
          />
          
          {/* Landlord Routes */}
          <Route
            path="/*"
            element={
              <AuthProvider>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route
                    path="/agent/dashboard"
                    element={<ProtectedRoute><AgentDashboard /></ProtectedRoute>}
                  />
                  <Route
                    path="/agent/properties"
                    element={<ProtectedRoute><AgentProperties /></ProtectedRoute>}
                  />
                  <Route
                    path="/agent/tenants"
                    element={<ProtectedRoute><AgentTenants /></ProtectedRoute>}
                  />
                  <Route
                    path="/agent/payments"
                    element={<ProtectedRoute><AgentPayments /></ProtectedRoute>}
                  />
                  <Route
                    path="/agent/landlords"
                    element={<ProtectedRoute><AgentLandlords /></ProtectedRoute>}
                  />
                  <Route
                    path="/agent/commissions"
                    element={<ProtectedRoute><AgentCommissions /></ProtectedRoute>}
                  />
                  <Route
                    path="/agent/onboard"
                    element={<ProtectedRoute><AgentOnboard /></ProtectedRoute>}
                  />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Index />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/properties"
                    element={
                      <ProtectedRoute>
                        <Properties />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/properties/:id"
                    element={
                      <ProtectedRoute>
                        <PropertyDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/caretakers"
                    element={<ProtectedRoute><Caretakers /></ProtectedRoute>}
                  />
                  <Route
                    path="/landlords"
                    element={<ProtectedRoute><Landlords /></ProtectedRoute>}
                  />
                  <Route
                    path="/utilities"
                    element={<ProtectedRoute><UtilityBilling /></ProtectedRoute>}
                  />
                  <Route
                    path="/commissions"
                    element={<ProtectedRoute><FeatureGate feature="finance"><Commissions /></FeatureGate></ProtectedRoute>}
                  />
                  <Route
                    path="/tenants"
                    element={
                      <ProtectedRoute>
                        <Tenants />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/invoices"
                    element={
                      <ProtectedRoute>
                        <Invoices />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/payments"
                    element={
                      <ProtectedRoute>
                        <FeatureGate feature="finance"><Payments /></FeatureGate>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/debts"
                    element={
                      <ProtectedRoute>
                        <FeatureGate feature="finance"><Debts /></FeatureGate>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/expenses"
                    element={
                      <ProtectedRoute>
                        <FeatureGate feature="expenses"><Expenses /></FeatureGate>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/maintenance"
                    element={
                      <ProtectedRoute>
                        <FeatureGate feature="maintenance"><Maintenance /></FeatureGate>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <ProtectedRoute>
                        <FeatureGate feature="reports"><Reports /></FeatureGate>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/tax"
                    element={
                      <ProtectedRoute>
                        <FeatureGate feature="tax"><TaxCenter /></FeatureGate>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AuthProvider>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
