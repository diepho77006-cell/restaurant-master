import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import TablesPage from "@/pages/TablesPage";
import MenuPage from "@/pages/MenuPage";
import KitchenPage from "@/pages/KitchenPage";
import PaymentPage from "@/pages/PaymentPage";
import HistoryPage from "@/pages/HistoryPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout><TablesPage /></AppLayout>} />
          <Route path="/menu" element={<AppLayout><MenuPage /></AppLayout>} />
          <Route path="/kitchen" element={<AppLayout><KitchenPage /></AppLayout>} />
          <Route path="/payment" element={<AppLayout><PaymentPage /></AppLayout>} />
          <Route path="/history" element={<AppLayout><HistoryPage /></AppLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
