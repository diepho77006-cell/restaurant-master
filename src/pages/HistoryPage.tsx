import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, DollarSign, TrendingUp, Receipt } from "lucide-react";

interface PaidOrder {
  id: string;
  table_number: number;
  total_amount: number;
  updated_at: string;
  items: { name: string; quantity: number; unit_price: number }[];
}

const HistoryPage = () => {
  const [orders, setOrders] = useState<PaidOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPaidOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id, total_amount, updated_at,
        table:restaurant_tables(table_number),
        items:order_items(quantity, unit_price, menu_item:menu_items(name))
      `)
      .eq("status", "paid")
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setOrders(data.map((o: any) => ({
        id: o.id,
        table_number: o.table?.table_number || 0,
        total_amount: o.total_amount,
        updated_at: o.updated_at,
        items: (o.items || []).map((i: any) => ({
          name: i.menu_item?.name || "—",
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
      })));
    }
  }, []);

  useEffect(() => { fetchPaidOrders(); }, [fetchPaidOrders]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date));

  const totalRevenue = useMemo(() => orders.reduce((s, b) => s + b.total_amount, 0), [orders]);
  const todayOrders = useMemo(() => {
    const today = new Date().toDateString();
    return orders.filter((o) => new Date(o.updated_at).toDateString() === today);
  }, [orders]);
  const todayRevenue = useMemo(() => todayOrders.reduce((s, o) => s + o.total_amount, 0), [todayOrders]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter((o) => `#${o.table_number}`.includes(q) || o.id.toLowerCase().includes(q));
  }, [orders, searchQuery]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lịch sử & Doanh thu</h1>
        <p className="text-muted-foreground text-sm">{orders.length} hóa đơn</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">{orders.length} hóa đơn</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Hôm nay</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(todayRevenue)}</div>
            <p className="text-xs text-muted-foreground">{todayOrders.length} hóa đơn</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">TB/HĐ</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length > 0 ? formatPrice(totalRevenue / orders.length) : "—"}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Danh sách hóa đơn</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm bàn..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">Chưa có hóa đơn nào</p>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bàn</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Tổng tiền</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>#{order.table_number}</TableCell>
                      <TableCell>{formatDate(order.updated_at)}</TableCell>
                      <TableCell className="font-semibold">{formatPrice(order.total_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HistoryPage;
