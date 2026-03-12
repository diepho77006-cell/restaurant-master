import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { useRealtimeMenu } from "@/hooks/useRealtimeMenu";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, Send, Search, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type RestaurantTable = Tables<"restaurant_tables">;

interface OrderPanelProps {
  table: RestaurantTable;
  ordersHook: ReturnType<typeof useRealtimeOrders>;
  menuHook: ReturnType<typeof useRealtimeMenu>;
}

/**
 * Order panel shown when clicking a table
 * - Shows current order items with status
 * - Allows adding/removing items (only pending items)
 * - Submit order to kitchen
 */
const OrderPanel = ({ table, ordersHook, menuHook }: OrderPanelProps) => {
  const { user } = useAuth();
  const { menu } = menuHook;
  const {
    getOrderForTable, createOrder, addOrderItem, removeOrderItem,
    updateOrderItemQuantity, updateOrderItemNotes, submitOrder,
  } = ordersHook;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const order = getOrderForTable(table.id);
  const categories = ["all", ...Array.from(new Set(menu.map((m) => m.category)))];
  const filteredMenu = menu
    .filter((m) => selectedCategory === "all" || m.category === selectedCategory)
    .filter((m) => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const total = order?.items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0) || 0;
  const hasPendingItems = order?.items.some((i) => i.status === "pending");

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

  const handleAddItem = async (menuItem: Tables<"menu_items">) => {
    try {
      let orderId = order?.id;
      if (!orderId) {
        const newOrder = await createOrder(table.id);
        orderId = newOrder.id;
      }
      await addOrderItem(orderId, menuItem.id, 1, menuItem.price);
      toast.success(`Đã thêm ${menuItem.name}`);
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi thêm món");
    }
  };

  const handleSubmitOrder = async () => {
    if (!hasPendingItems || !order) {
      toast.info("Không có món mới để gửi bếp");
      return;
    }
    try {
      await submitOrder(order.id);
      toast.success("🔥 Đã gửi order sang bếp!");
    } catch { toast.error("Lỗi khi gửi order"); }
  };

  const categoryLabel: Record<string, string> = {
    all: "Tất cả", appetizer: "Khai vị", main: "Món chính", dessert: "Tráng miệng", drink: "Đồ uống",
  };

  return (
    <div className="space-y-4">
      {/* Current order items */}
      {order && order.items.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Đơn hàng hiện tại</h3>
          <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
            {order.items.map((item) => (
              <div key={item.id} className="p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{item.menu_item?.name || "—"}</span>
                    {item.status === "preparing" && <Badge className="ml-2 text-xs bg-amber-100 text-amber-700 border-amber-300">🔥 Đang làm</Badge>}
                    {item.status === "served" && <Badge className="ml-2 text-xs bg-emerald-100 text-emerald-700 border-emerald-300">✅ Xong</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Only pending items can be edited */}
                    {item.status === "pending" ? (
                      <>
                        <Button variant="outline" size="icon" className="h-7 w-7"
                          onClick={async () => {
                            if (item.quantity === 1) await removeOrderItem(item.id);
                            else await updateOrderItemQuantity(item.id, item.quantity - 1);
                          }}
                        ><Minus className="h-3 w-3" /></Button>
                        <span className="w-6 text-center font-semibold">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7"
                          onClick={() => updateOrderItemQuantity(item.id, item.quantity + 1)}
                        ><Plus className="h-3 w-3" /></Button>
                      </>
                    ) : (
                      <span className="font-medium text-muted-foreground">x{item.quantity}</span>
                    )}
                    <span className="w-24 text-right font-medium">{formatPrice(item.unit_price * item.quantity)}</span>
                  </div>
                </div>
                {/* Notes */}
                {item.notes && editingNoteId !== item.id && (
                  <p className="text-xs text-muted-foreground italic ml-1 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> {item.notes}
                    {item.status === "pending" && (
                      <button className="underline ml-1" onClick={() => { setEditingNoteId(item.id); setNoteText(item.notes || ""); }}>sửa</button>
                    )}
                  </p>
                )}
                {item.status === "pending" && editingNoteId !== item.id && !item.notes && (
                  <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    onClick={() => { setEditingNoteId(item.id); setNoteText(""); }}
                  ><MessageSquare className="h-3 w-3" /> Thêm ghi chú</button>
                )}
                {editingNoteId === item.id && (
                  <div className="flex gap-1 mt-1">
                    <Input value={noteText} onChange={(e) => setNoteText(e.target.value)}
                      placeholder="VD: ít cay, không hành..." className="h-7 text-xs" autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") { updateOrderItemNotes(item.id, noteText); setEditingNoteId(null); } }}
                    />
                    <Button size="sm" className="h-7 text-xs" onClick={() => { updateOrderItemNotes(item.id, noteText); setEditingNoteId(null); }}>OK</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between font-bold text-lg pt-2">
            <span>Tổng</span>
            <span className="text-primary">{formatPrice(total)}</span>
          </div>
          {hasPendingItems && (
            <Button onClick={handleSubmitOrder} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
              <Send className="h-4 w-4 mr-2" /> Gửi bếp
            </Button>
          )}
        </div>
      )}

      {/* Menu for adding items */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Thêm món</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm món nhanh..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >{categoryLabel[cat] || cat}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
          {filteredMenu.map((item) => (
            <button key={item.id} disabled={!item.is_available}
              onClick={() => item.is_available && handleAddItem(item)}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                !item.is_available ? "opacity-40 cursor-not-allowed" : "hover:border-primary/50 hover:shadow-sm cursor-pointer"
              }`}
            >
              <div>
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-muted-foreground">{categoryLabel[item.category] || item.category}</p>
                {!item.is_available && <p className="text-xs text-destructive font-medium">Hết món</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-primary">{formatPrice(item.price)}</span>
                {item.is_available && <Plus className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderPanel;
