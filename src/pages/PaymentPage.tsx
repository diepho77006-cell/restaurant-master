import { useState } from "react";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { useRealtimeTables } from "@/hooks/useRealtimeTables";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Receipt, CreditCard } from "lucide-react";
import { toast } from "sonner";

const PaymentPage = () => {
  const { tables } = useRealtimeTables();
  const ordersHook = useRealtimeOrders();
  const [selectedTableId, setSelectedTableId] = useState<string>("");

  const occupiedTables = tables.filter((t) => t.status === "occupied");
  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const order = selectedTableId ? ordersHook.getOrderForTable(selectedTableId) : undefined;

  const total = order?.items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0) || 0;
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

  const handlePayment = async () => {
    if (!order || !selectedTable) return;
    try {
      await ordersHook.payOrder(order.id, total, selectedTable.id);
      setSelectedTableId("");
      toast.success("Thanh toán thành công!");
    } catch {
      toast.error("Lỗi khi thanh toán");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Thanh toán</h1>
        <p className="text-muted-foreground text-sm">{occupiedTables.length} bàn đang phục vụ</p>
      </div>

      <div className="max-w-sm space-y-2">
        <Label>Chọn bàn</Label>
        <Select value={selectedTableId} onValueChange={setSelectedTableId}>
          <SelectTrigger><SelectValue placeholder="Chọn bàn để thanh toán" /></SelectTrigger>
          <SelectContent>
            {occupiedTables.map((t) => (
              <SelectItem key={t.id} value={t.id}>Bàn #{t.table_number}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {order && selectedTable && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Hóa đơn Bàn #{selectedTable.table_number}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg divide-y">
              <div className="grid grid-cols-4 p-3 text-sm font-semibold bg-muted/50">
                <span className="col-span-2">Món</span>
                <span className="text-center">SL</span>
                <span className="text-right">Thành tiền</span>
              </div>
              {order.items.map((item) => (
                <div key={item.id} className="grid grid-cols-4 p-3 text-sm">
                  <span className="col-span-2">{item.menu_item?.name || "—"}</span>
                  <span className="text-center">{item.quantity}</span>
                  <span className="text-right">{formatPrice(item.unit_price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xl font-bold pt-2 border-t">
              <span>Tổng cộng</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>
            <Button onClick={handlePayment} className="w-full" size="lg">
              <CreditCard className="h-4 w-4 mr-2" /> Xác nhận thanh toán
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PaymentPage;
