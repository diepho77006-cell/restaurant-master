import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import SetupRestaurantPage from "@/pages/SetupRestaurantPage";
import TablesPage from "@/pages/TablesPage";
import MenuPage from "@/pages/MenuPage";
import KitchenPage from "@/pages/KitchenPage";
import PaymentPage from "@/pages/PaymentPage";
import HistoryPage from "@/pages/HistoryPage";
import PeriodDetailPage from "@/pages/PeriodDetailPage";
import AccountsPage from "@/pages/AccountsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // If user has no restaurant, redirect to setup
  if (!user.restaurantId) return <Navigate to="/setup" replace />;

  // Role-based access
  if (allowedRoles && user.role && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  if (user) {
    if (!user.restaurantId && !user.role) return <Navigate to="/setup" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const SetupRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.restaurantId) return <Navigate to="/" replace />;

  return <SetupRestaurantPage />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
    <Route path="/setup" element={<SetupRoute />} />
    <Route path="/" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><TablesPage /></ProtectedRoute>} />
    <Route path="/menu" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><MenuPage /></ProtectedRoute>} />
    <Route path="/kitchen" element={<ProtectedRoute allowedRoles={["admin", "kitchen"]}><KitchenPage /></ProtectedRoute>} />
    <Route path="/payment" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><PaymentPage /></ProtectedRoute>} />
    <Route path="/history" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><HistoryPage /></ProtectedRoute>} />
    <Route path="/history/period" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><PeriodDetailPage /></ProtectedRoute>} />
    <Route path="/accounts" element={<ProtectedRoute allowedRoles={["admin"]}><AccountsPage /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
