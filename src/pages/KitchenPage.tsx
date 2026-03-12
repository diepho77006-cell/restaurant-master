import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, CheckCircle, Clock, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const formatTime = (date?: string) => {
  if (!date) return "";
  return new Date(date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

/**
 * Kitchen dashboard for chefs
 * Shows pending and preparing items from all orders
 */
const KitchenPage = () => {
  const { getKitchenOrders, updateOrderItemStatus } = useRealtimeOrders();
  const kitchenOrders = getKitchenOrders();

  const preparingItems = kitchenOrders.filter((o) => o.item.status === "preparing");
  const pendingItems = kitchenOrders.filter((o) => o.item.status === "pending");

  const handleDone = async (itemId: string, itemName: string, tableNumber: number) => {
    try {
      await updateOrderItemStatus(itemId, "served");
      toast.success(`✅ ${itemName} (Bàn #${tableNumber}) đã hoàn thành!`);
    } catch { toast.error("Lỗi cập nhật"); }
  };

  const handleStartCooking = async (itemId: string, itemName: string) => {
    try {
      await updateOrderItemStatus(itemId, "preparing");
      toast.info(`🔥 Bắt đầu nấu: ${itemName}`);
    } catch { toast.error("Lỗi cập nhật"); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🔥 Dashboard Bếp</h1>
        <p className="text-muted-foreground text-sm">
          {preparingItems.length} đang nấu · {pendingItems.length} chờ xử lý
        </p>
      </div>

      {/* Preparing items */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Flame className="h-5 w-5 text-amber-500" /> Đang nấu ({preparingItems.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {preparingItems.map((order) => (
              <motion.div key={order.item.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="truncate">{order.item.menu_item?.name || "—"}</span>
                      <Badge className="bg-amber-100 text-amber-700 border-amber-300 shrink-0">Bàn #{order.tableNumber}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">Số lượng: <span className="font-bold text-lg">{order.item.quantity}</span></p>
                    {order.item.notes && (
                      <p className="text-xs bg-background rounded-lg px-3 py-2 flex items-start gap-1.5 border">
                        <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" /> {order.item.notes}
                      </p>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatTime(order.item.created_at)}
                    </span>
                    <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleDone(order.item.id, order.item.menu_item?.name || "", order.tableNumber)}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Hoàn thành
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
          {preparingItems.length === 0 && <p className="text-muted-foreground text-sm col-span-full">Không có món đang nấu</p>}
        </div>
      </div>

      {/* Pending items */}
      <div>
        <h2 className="text-lg font-semibold mb-3">📋 Món mới từ Staff ({pendingItems.length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {pendingItems.map((order) => (
              <motion.div key={order.item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <Card className="border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="truncate">{order.item.menu_item?.name || "—"}</span>
                      <Badge variant="secondary" className="shrink-0">Bàn #{order.tableNumber}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">Số lượng: <span className="font-bold text-lg">{order.item.quantity}</span></p>
                    {order.item.notes && (
                      <p className="text-xs bg-background rounded-lg px-3 py-2 flex items-start gap-1.5 border">
                        <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" /> {order.item.notes}
                      </p>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatTime(order.item.created_at)}
                    </span>
                    <Button size="sm" variant="outline" className="w-full border-amber-400 text-amber-600 hover:bg-amber-50"
                      onClick={() => handleStartCooking(order.item.id, order.item.menu_item?.name || "")}>
                      <Flame className="h-4 w-4 mr-1" /> Bắt đầu nấu
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
          {pendingItems.length === 0 && <p className="text-muted-foreground text-sm col-span-full">Không có món mới</p>}
        </div>
      </div>
    </div>
  );
};

export default KitchenPage;
