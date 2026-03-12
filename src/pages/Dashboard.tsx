import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed, ChefHat, ClipboardList, DollarSign } from "lucide-react";

export default function Dashboard() {
  const { data: tables } = useQuery({
    queryKey: ["tables-count"],
    queryFn: async () => {
      const { data } = await supabase.from("restaurant_tables").select("status");
      return data ?? [];
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["orders-today"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("orders")
        .select("status, total_amount")
        .gte("created_at", today);
      return data ?? [];
    },
  });

  const { data: menuCount } = useQuery({
    queryKey: ["menu-count"],
    queryFn: async () => {
      const { count } = await supabase.from("menu_items").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const occupiedTables = tables?.filter((t) => t.status === "occupied").length ?? 0;
  const totalTables = tables?.length ?? 0;
  const todayRevenue = orders?.filter((o) => o.status === "paid").reduce((sum, o) => sum + o.total_amount, 0) ?? 0;
  const pendingOrders = orders?.filter((o) => o.status === "pending" || o.status === "preparing").length ?? 0;

  const stats = [
    { label: "Bàn đang dùng", value: `${occupiedTables}/${totalTables}`, icon: UtensilsCrossed, color: "text-primary" },
    { label: "Món trong thực đơn", value: menuCount, icon: ChefHat, color: "text-accent" },
    { label: "Đơn đang xử lý", value: pendingOrders, icon: ClipboardList, color: "text-warning" },
    { label: "Doanh thu hôm nay", value: `${todayRevenue.toLocaleString()}đ`, icon: DollarSign, color: "text-success" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-6">Tổng quan</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
