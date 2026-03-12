import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const statusFlow: OrderStatus[] = ["pending", "preparing", "served", "paid"];
const statusLabels: Record<OrderStatus, string> = {
  pending: "Chờ xử lý",
  preparing: "Đang làm",
  served: "Đã phục vụ",
  paid: "Đã thanh toán",
  cancelled: "Đã hủy",
};
const statusVariant: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "destructive",
  preparing: "default",
  served: "secondary",
  paid: "outline",
  cancelled: "destructive",
};

export default function Orders() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedItems, setSelectedItems] = useState<{ menuItemId: string; quantity: number; price: number }[]>([]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, restaurant_tables(table_number), order_items(*, menu_items(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: tables } = useQuery({
    queryKey: ["available-tables"],
    queryFn: async () => {
      const { data } = await supabase.from("restaurant_tables").select("*").order("table_number");
      return data ?? [];
    },
  });

  const { data: menuItems } = useQuery({
    queryKey: ["menu-for-order"],
    queryFn: async () => {
      const { data } = await supabase.from("menu_items").select("*").eq("is_available", true).order("name");
      return data ?? [];
    },
  });

  const createOrder = useMutation({
    mutationFn: async () => {
      const total = selectedItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const { data: order, error } = await supabase
        .from("orders")
        .insert({ table_id: selectedTable || null, total_amount: total })
        .select()
        .single();
      if (error) throw error;

      const items = selectedItems.map((i) => ({
        order_id: order.id,
        menu_item_id: i.menuItemId,
        quantity: i.quantity,
        unit_price: i.price,
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(items);
      if (itemsError) throw itemsError;

      if (selectedTable) {
        await supabase.from("restaurant_tables").update({ status: "occupied" as const }).eq("id", selectedTable);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast.success("Đã tạo đơn hàng");
      setOpen(false);
      setSelectedTable("");
      setSelectedItems([]);
    },
    onError: () => toast.error("Lỗi khi tạo đơn"),
  });

  const advanceStatus = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: OrderStatus }) => {
      const idx = statusFlow.indexOf(current);
      if (idx < 0 || idx >= statusFlow.length - 1) return;
      const next = statusFlow[idx + 1];
      const { error } = await supabase.from("orders").update({ status: next }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const addItem = (menuItemId: string) => {
    const item = menuItems?.find((m) => m.id === menuItemId);
    if (!item) return;
    const existing = selectedItems.find((i) => i.menuItemId === menuItemId);
    if (existing) {
      setSelectedItems(selectedItems.map((i) => i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setSelectedItems([...selectedItems, { menuItemId, quantity: 1, price: item.price }]);
    }
  };

  if (isLoading) return <div className="text-muted-foreground">Đang tải...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Đơn hàng</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Tạo đơn</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Tạo đơn hàng mới</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Chọn bàn</Label>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger><SelectValue placeholder="Chọn bàn..." /></SelectTrigger>
                  <SelectContent>
                    {tables?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>Bàn {t.table_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Thêm món</Label>
                <Select onValueChange={addItem}>
                  <SelectTrigger><SelectValue placeholder="Chọn món..." /></SelectTrigger>
                  <SelectContent>
                    {menuItems?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name} - {m.price.toLocaleString()}đ</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedItems.length > 0 && (
                <div className="border rounded-lg p-3 space-y-2">
                  {selectedItems.map((item) => {
                    const menu = menuItems?.find((m) => m.id === item.menuItemId);
                    return (
                      <div key={item.menuItemId} className="flex justify-between items-center text-sm">
                        <span className="text-foreground">{menu?.name}</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            className="w-16 h-8"
                            value={item.quantity}
                            onChange={(e) => setSelectedItems(selectedItems.map((i) =>
                              i.menuItemId === item.menuItemId ? { ...i, quantity: parseInt(e.target.value) || 1 } : i
                            ))}
                          />
                          <span className="text-muted-foreground w-24 text-right">{(item.price * item.quantity).toLocaleString()}đ</span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="border-t pt-2 flex justify-between font-semibold text-foreground">
                    <span>Tổng</span>
                    <span>{selectedItems.reduce((s, i) => s + i.price * i.quantity, 0).toLocaleString()}đ</span>
                  </div>
                </div>
              )}
              <Button onClick={() => createOrder.mutate()} disabled={selectedItems.length === 0}>
                Tạo đơn
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {orders?.map((order) => (
          <Card key={order.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">
                {order.restaurant_tables ? `Bàn ${order.restaurant_tables.table_number}` : "Mang về"}
                <span className="text-muted-foreground text-sm font-normal ml-2">
                  {new Date(order.created_at).toLocaleTimeString("vi-VN")}
                </span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant[order.status]}>{statusLabels[order.status]}</Badge>
                {statusFlow.indexOf(order.status) < statusFlow.length - 1 && order.status !== "cancelled" && (
                  <Button size="sm" variant="outline" onClick={() => advanceStatus.mutate({ id: order.id, current: order.status })}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1">
                {order.order_items?.map((oi: any) => (
                  <div key={oi.id} className="flex justify-between text-muted-foreground">
                    <span>{oi.menu_items?.name} x{oi.quantity}</span>
                    <span>{(oi.unit_price * oi.quantity).toLocaleString()}đ</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t flex justify-between font-semibold text-foreground">
                <span>Tổng cộng</span>
                <span>{order.total_amount.toLocaleString()}đ</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {orders?.length === 0 && <p className="text-muted-foreground">Chưa có đơn hàng nào.</p>}
      </div>
    </div>
  );
}
