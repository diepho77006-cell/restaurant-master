import { useState } from "react";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { useRealtimeTables } from "@/hooks/useRealtimeTables";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Receipt, CreditCard, Eye } from "lucide-react";
import { toast } from "sonner";

/**
 * Payment page
 * Staff can preview bill and confirm payment
 */
const PaymentPage = () => {
  const { tables } = useRealtimeTables();
  const ordersHook = useRealtimeOrders();
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);

  const occupiedTables = tables.filter((t) => t.status !== "available");
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
      setShowPreview(false);
      toast.success("✅ Thanh toán thành công!");
    } catch { toast.error("Lỗi khi thanh toán"); }
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
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Hóa đơn Bàn #{selectedTable.table_number}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-xl divide-y">
              <div className="grid grid-cols-4 p-3 text-sm font-semibold bg-muted/50 rounded-t-xl">
                <span className="col-span-2">Món</span>
                <span className="text-center">SL</span>
                <span className="text-right">Thành tiền</span>
              </div>
              {order.items.map((item) => (
                <div key={item.id} className="grid grid-cols-4 p-3 text-sm">
                  <span className="col-span-2">{item.menu_item?.name || "—"}</span>
                  <span className="text-center">{item.quantity}</span>
                  <span className="text-right font-medium">{formatPrice(item.unit_price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xl font-bold pt-2 border-t">
              <span>Tổng cộng</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowPreview(true)}>
                <Eye className="h-4 w-4 mr-1" /> Preview Bill
              </Button>
              <Button className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700" onClick={() => setShowPreview(true)}>
                <CreditCard className="h-4 w-4 mr-1" /> Thanh toán
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bill preview + confirm dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Xác nhận thanh toán — Bàn #{selectedTable?.table_number}</DialogTitle></DialogHeader>
          {order && (
            <div className="bg-muted/30 rounded-xl p-6 font-mono text-sm space-y-3">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold">HÓA ĐƠN</h3>
                <p className="text-xs text-muted-foreground">Bàn #{selectedTable?.table_number}</p>
                <p className="text-xs text-muted-foreground">{new Date().toLocaleString("vi-VN")}</p>
              </div>
              <div className="border-t border-dashed pt-2 space-y-1">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="truncate flex-1">{item.menu_item?.name} x{item.quantity}</span>
                    <span className="font-medium ml-2">{formatPrice(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed pt-2 flex justify-between font-bold text-base">
                <span>TỔNG</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>Hủy</Button>
            <Button onClick={handlePayment} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
              <CreditCard className="h-4 w-4 mr-1" /> Xác nhận thanh toán
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentPage;
