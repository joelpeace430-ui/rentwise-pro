import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import Expenses from "./pages/Expenses";
import Maintenance from "./pages/Maintenance";
import Reports from "./pages/Reports";
import TaxCenter from "./pages/TaxCenter";
import Settings from "./pages/Settings";
import TenantLogin from "./pages/TenantLogin";
import TenantPortal from "./pages/TenantPortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
                        <Payments />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/expenses"
                    element={
                      <ProtectedRoute>
                        <Expenses />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/maintenance"
                    element={
                      <ProtectedRoute>
                        <Maintenance />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <ProtectedRoute>
                        <Reports />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/tax"
                    element={
                      <ProtectedRoute>
                        <TaxCenter />
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
);

export default App;
