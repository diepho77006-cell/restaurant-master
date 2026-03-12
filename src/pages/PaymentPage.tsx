import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { useRealtimeTables } from "@/hooks/useRealtimeTables";
import { useBills } from "@/hooks/useBills";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Receipt, CreditCard, Printer } from "lucide-react";
import { toast } from "sonner";
import BillReceipt from "@/components/BillReceipt";

interface BillData {
  id: string;
  tableNumber: number;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  paidAt: Date;
  staffName: string;
}

const PaymentPage = () => {
  const { user } = useAuth();
  const { tables } = useRealtimeTables(user?.restaurantId || null);
  const ordersHook = useRealtimeOrders(user?.restaurantId || null);
  const { processPayment } = useBills(user?.restaurantId || null);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [showBill, setShowBill] = useState(false);
  const [printBill, setPrintBill] = useState<BillData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const servingTables = tables.filter((t) => t.status === "serving" || t.status === "payment");
  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const order = selectedTableId ? ordersHook.getOrderForTable(selectedTableId) : undefined;

  const total = order?.items.reduce((sum, i) => sum + (i.menu_item?.price || 0) * i.quantity, 0) || 0;
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

  const handlePayment = async () => {
    if (!selectedTableId || !order || !selectedTable) return;

    const items = order.items.map((i) => ({
      name: i.menu_item?.name || "—",
      quantity: i.quantity,
      price: i.menu_item?.price || 0,
    }));

    try {
      await processPayment(
        order.id,
        selectedTable.table_number,
        items,
        total,
        user?.name || "Unknown",
        selectedTable.id
      );

      const bill: BillData = {
        id: `HD${Date.now()}`,
        tableNumber: selectedTable.table_number,
        items,
        total,
        paidAt: new Date(),
        staffName: user?.name || "Unknown",
      };

      setShowBill(false);
      setSelectedTableId("");
      setPrintBill(bill);
      toast.success("Thanh toán thành công!");
    } catch {
      toast.error("Lỗi khi thanh toán");
    }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Hóa đơn</title>
      <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; } .bill-receipt { padding: 20px; max-width: 300px; margin: 0 auto; } h2 { font-size: 16px; font-weight: bold; } h3 { font-size: 14px; font-weight: bold; } .dashed { border-top: 1px dashed #000; margin: 8px 0; } .row { display: flex; justify-content: space-between; } .center { text-align: center; } .right { text-align: right; } .bold { font-weight: bold; } .small { font-size: 10px; } @media print { body { margin: 0; } }</style>
      </head><body>${content.innerHTML}</body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const previewBill: BillData | null = order && selectedTable ? {
    id: "Xem trước",
    tableNumber: selectedTable.table_number,
    items: order.items.map((i) => ({ name: i.menu_item?.name || "—", quantity: i.quantity, price: i.menu_item?.price || 0 })),
    total,
    paidAt: new Date(),
    staffName: user?.name || "Unknown",
  } : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Thanh toán</h1>
        <p className="text-muted-foreground text-sm">{servingTables.length} bàn đang phục vụ</p>
      </div>

      <div className="max-w-sm space-y-2">
        <Label>Chọn bàn</Label>
        <Select value={selectedTableId} onValueChange={setSelectedTableId}>
          <SelectTrigger><SelectValue placeholder="Chọn bàn để thanh toán" /></SelectTrigger>
          <SelectContent>
            {servingTables.map((t) => (
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
                  <span className="text-right">{formatPrice((item.menu_item?.price || 0) * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xl font-bold pt-2 border-t">
              <span>Tổng cộng</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowBill(true)} className="flex-1">
                <Receipt className="h-4 w-4 mr-1" /> Xem bill
              </Button>
              <Button onClick={() => setShowBill(true)} className="flex-1">
                <CreditCard className="h-4 w-4 mr-1" /> Thanh toán
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showBill} onOpenChange={setShowBill}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Xác nhận thanh toán - Bàn #{selectedTable?.table_number}</DialogTitle></DialogHeader>
          {previewBill && (
            <div className="border rounded-lg bg-white">
              <BillReceipt bill={previewBill} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBill(false)}>Hủy</Button>
            <Button onClick={handlePayment}><CreditCard className="h-4 w-4 mr-1" /> Xác nhận thanh toán</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!printBill} onOpenChange={() => setPrintBill(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Thanh toán thành công!</DialogTitle></DialogHeader>
          {printBill && (
            <div ref={printRef} className="border rounded-lg bg-white">
              <BillReceipt bill={printBill} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintBill(null)}>Đóng</Button>
            <Button onClick={handlePrint}><Printer className="h-4 w-4 mr-1" /> In hóa đơn</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentPage;
