import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeTables } from "@/hooks/useRealtimeTables";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { useRealtimeMenu } from "@/hooks/useRealtimeMenu";
import type { Tables as DbTables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import OrderPanel from "@/components/OrderPanel";
import { motion } from "framer-motion";

type RestaurantTable = DbTables<"restaurant_tables">;

/** Color-coded table status configuration */
const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  available: { label: "Trống", color: "text-emerald-700", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-300 dark:border-emerald-700" },
  occupied: { label: "Đang phục vụ", color: "text-amber-700", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-300 dark:border-amber-700" },
  reserved: { label: "Chờ thanh toán", color: "text-rose-700", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-300 dark:border-rose-700" },
};

const TablesPage = () => {
  const { user } = useAuth();
  const { tables, addTable, updateTable, deleteTable, updateTableStatus } = useRealtimeTables();
  const ordersHook = useRealtimeOrders();
  const menuHook = useRealtimeMenu();

  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [editSeats, setEditSeats] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [newSeats, setNewSeats] = useState("4");
  // Clear table
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearConfirm, setClearConfirm] = useState("");
  // Transfer table
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferTo, setTransferTo] = useState("");

  const isAdmin = user?.role === "admin";

  const handleAddTable = async () => {
    try {
      await addTable(parseInt(newSeats) || 4);
      setShowAddDialog(false);
      setNewSeats("4");
      toast.success("Đã thêm bàn mới");
    } catch { toast.error("Lỗi khi thêm bàn"); }
  };

  const openEditDialog = (table: RestaurantTable) => {
    setEditingTable(table);
    setEditSeats(String(table.seats));
    setEditNumber(String(table.table_number));
    setShowEditDialog(true);
  };

  const handleEditTable = async () => {
    if (!editingTable) return;
    const newNumber = parseInt(editNumber);
    if (tables.find((t) => t.table_number === newNumber && t.id !== editingTable.id)) {
      toast.error("Số bàn đã tồn tại");
      return;
    }
    try {
      await updateTable(editingTable.id, {
        seats: parseInt(editSeats) || editingTable.seats,
        table_number: newNumber || editingTable.table_number,
      });
      setShowEditDialog(false);
      toast.success("Đã cập nhật bàn");
    } catch { toast.error("Lỗi khi cập nhật"); }
  };

  /** Clear table with YES confirmation */
  const handleClearTable = async () => {
    if (clearConfirm !== "YES") {
      toast.error("Vui lòng nhập YES để xác nhận");
      return;
    }
    if (!selectedTable) return;
    try {
      await updateTableStatus(selectedTable.id, "available");
      setShowClearDialog(false);
      setClearConfirm("");
      setSelectedTable(null);
      toast.success("Đã dọn bàn");
    } catch { toast.error("Lỗi khi dọn bàn"); }
  };

  /** Transfer all orders from selected table to another */
  const handleTransferTable = async () => {
    if (!selectedTable || !transferTo) return;
    const order = ordersHook.getOrderForTable(selectedTable.id);
    if (!order) {
      toast.error("Bàn này không có order để chuyển");
      return;
    }
    try {
      // Update order's table_id
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("orders").update({ table_id: transferTo }).eq("id", order.id);
      // Update table statuses
      await updateTableStatus(selectedTable.id, "available");
      await updateTableStatus(transferTo, "occupied");
      setShowTransferDialog(false);
      setTransferTo("");
      setSelectedTable(null);
      toast.success("Đã chuyển bàn thành công");
    } catch { toast.error("Lỗi khi chuyển bàn"); }
  };

  const getOrderCount = (tableId: string) => ordersHook.getOrderForTable(tableId)?.items.length || 0;

  const availableTablesForTransfer = tables.filter(
    (t) => t.status === "available" && t.id !== selectedTable?.id
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý bàn</h1>
          <p className="text-muted-foreground text-sm">
            {tables.filter((t) => t.status === "available").length} bàn trống / {tables.length} bàn
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
            <Plus className="h-4 w-4 mr-1" /> Thêm bàn
          </Button>
        )}
      </div>

      {/* Status legend */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(statusConfig).map(([key, val]) => (
          <span key={key} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${val.bg} ${val.border} ${val.color}`}>
            {val.label}
          </span>
        ))}
      </div>

      {/* Table grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {tables.map((table, i) => {
          const cfg = statusConfig[table.status] || statusConfig.available;
          const orderCount = getOrderCount(table.id);
          return (
            <motion.div key={table.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <button
                onClick={() => setSelectedTable(table)}
                className={`w-full aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 hover:shadow-xl ${cfg.border} ${cfg.bg}`}
              >
                <span className="text-3xl font-bold">#{table.table_number}</span>
                <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                <span className="text-xs text-muted-foreground">{table.seats} ghế</span>
                {orderCount > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    {orderCount} món
                  </span>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Order panel dialog */}
      {selectedTable && (
        <Dialog open={!!selectedTable} onOpenChange={() => setSelectedTable(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xl">Bàn #{selectedTable.table_number}</span>
                <div className="flex gap-2 flex-wrap">
                  {isAdmin && (
                    <Button variant="outline" size="sm" onClick={() => { openEditDialog(selectedTable); setSelectedTable(null); }}>
                      <Pencil className="h-4 w-4 mr-1" /> Sửa
                    </Button>
                  )}
                  {selectedTable.status !== "available" && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setShowTransferDialog(true)}>
                        <ArrowRightLeft className="h-4 w-4 mr-1" /> Chuyển bàn
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setShowClearDialog(true)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Dọn bàn
                      </Button>
                    </>
                  )}
                </div>
              </DialogTitle>
            </DialogHeader>
            <OrderPanel table={selectedTable} ordersHook={ordersHook} menuHook={menuHook} />
          </DialogContent>
        </Dialog>
      )}

      {/* Add table dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm bàn mới</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Số ghế</Label>
              <Input type="number" value={newSeats} onChange={(e) => setNewSeats(e.target.value)} min={1} max={20} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Hủy</Button>
            <Button onClick={handleAddTable}>Thêm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit table dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sửa bàn #{editingTable?.table_number}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Số bàn</Label><Input type="number" value={editNumber} onChange={(e) => setEditNumber(e.target.value)} min={1} /></div>
            <div className="space-y-2"><Label>Số ghế</Label><Input type="number" value={editSeats} onChange={(e) => setEditSeats(e.target.value)} min={1} max={20} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Hủy</Button>
            <Button onClick={handleEditTable}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear table confirmation */}
      <Dialog open={showClearDialog} onOpenChange={(open) => { setShowClearDialog(open); setClearConfirm(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xác nhận dọn bàn #{selectedTable?.table_number}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Nhập <span className="font-bold text-destructive">YES</span> để xác nhận xóa toàn bộ dữ liệu bàn.
          </p>
          <Input value={clearConfirm} onChange={(e) => setClearConfirm(e.target.value)} placeholder="Type YES to confirm" />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowClearDialog(false); setClearConfirm(""); }}>Hủy</Button>
            <Button variant="destructive" onClick={handleClearTable} disabled={clearConfirm !== "YES"}>Xác nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer table dialog */}
      <Dialog open={showTransferDialog} onOpenChange={(open) => { setShowTransferDialog(open); setTransferTo(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Chuyển bàn #{selectedTable?.table_number}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Chọn bàn trống để chuyển toàn bộ order sang.</p>
          <Select value={transferTo} onValueChange={setTransferTo}>
            <SelectTrigger><SelectValue placeholder="Chọn bàn đích" /></SelectTrigger>
            <SelectContent>
              {availableTablesForTransfer.map((t) => (
                <SelectItem key={t.id} value={t.id}>Bàn #{t.table_number} ({t.seats} ghế)</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {availableTablesForTransfer.length === 0 && (
            <p className="text-sm text-destructive">Không có bàn trống để chuyển</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Hủy</Button>
            <Button onClick={handleTransferTable} disabled={!transferTo}>Chuyển</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TablesPage;
