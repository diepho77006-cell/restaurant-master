import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import TablesPage from "@/pages/TablesPage";
import MenuPage from "@/pages/MenuPage";
import KitchenPage from "@/pages/KitchenPage";
import PaymentPage from "@/pages/PaymentPage";
import HistoryPage from "@/pages/HistoryPage";
import AccountsPage from "@/pages/AccountsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * Protected route wrapper with role-based access control
 */
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground text-sm">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Role-based access check
  if (allowedRoles && user.role && !allowedRoles.includes(user.role)) {
    // Redirect based on role
    if (user.role === "kitchen") return <Navigate to="/kitchen" replace />;
    return <Navigate to="/" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
};

/**
 * Public route - redirects authenticated users to dashboard
 */
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    if (user.role === "kitchen") return <Navigate to="/kitchen" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

/**
 * Main application routes
 */
const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

    {/* Admin + Staff */}
    <Route path="/" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><TablesPage /></ProtectedRoute>} />
    <Route path="/menu" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><MenuPage /></ProtectedRoute>} />
    <Route path="/payment" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><PaymentPage /></ProtectedRoute>} />
    <Route path="/history" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><HistoryPage /></ProtectedRoute>} />

    {/* Admin + Kitchen */}
    <Route path="/kitchen" element={<ProtectedRoute allowedRoles={["admin", "kitchen"]}><KitchenPage /></ProtectedRoute>} />

    {/* Admin only */}
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
