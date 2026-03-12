import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeTables } from "@/hooks/useRealtimeTables";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { useRealtimeMenu } from "@/hooks/useRealtimeMenu";
import type { Tables as DbTables, Enums } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowRightLeft, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import OrderPanel from "@/components/OrderPanel";
import { motion } from "framer-motion";

type RestaurantTable = DbTables<"restaurant_tables">;

const statusConfig = {
  available: { label: "Trống", class: "status-available", lightClass: "status-available-light" },
  serving: { label: "Đang phục vụ", class: "status-serving", lightClass: "status-serving-light" },
  payment: { label: "Chờ thanh toán", class: "status-payment", lightClass: "status-payment-light" },
};

const TablesPage = () => {
  const { user } = useAuth();
  const { tables, addTable, updateTable, deleteTable, updateTableStatus } = useRealtimeTables(user?.restaurantId || null);
  const ordersHook = useRealtimeOrders(user?.restaurantId || null);
  const menuHook = useRealtimeMenu(user?.restaurantId || null);

  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [editSeats, setEditSeats] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearConfirm, setClearConfirm] = useState("");
  const [newSeats, setNewSeats] = useState("4");
  const [transferFrom, setTransferFrom] = useState<string>("");
  const [transferTo, setTransferTo] = useState<string>("");

  const handleAddTable = async () => {
    try {
      await addTable(parseInt(newSeats) || 4);
      setShowAddDialog(false);
      setNewSeats("4");
      toast.success("Đã thêm bàn mới");
    } catch {
      toast.error("Lỗi khi thêm bàn");
    }
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
    const duplicate = tables.find((t) => t.table_number === newNumber && t.id !== editingTable.id);
    if (duplicate) {
      toast.error("Số bàn đã tồn tại");
      return;
    }
    try {
      await updateTable(editingTable.id, {
        seats: parseInt(editSeats) || editingTable.seats,
        table_number: newNumber || editingTable.table_number,
      });
      setShowEditDialog(false);
      setEditingTable(null);
      toast.success("Đã cập nhật thông tin bàn");
    } catch {
      toast.error("Lỗi khi cập nhật bàn");
    }
  };

  const handleClear = async (tableId: string) => {
    if (clearConfirm !== "YES") {
      toast.error("Vui lòng nhập YES để xác nhận");
      return;
    }
    try {
      await updateTableStatus(tableId, "available");
      setShowClearDialog(false);
      setClearConfirm("");
      setSelectedTable(null);
      toast.success("Đã dọn bàn");
    } catch {
      toast.error("Lỗi khi dọn bàn");
    }
  };

  const getOrderCount = (tableId: string) => {
    const order = ordersHook.getOrderForTable(tableId);
    return order?.items.length || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý bàn</h1>
          <p className="text-muted-foreground text-sm">
            {tables.filter((t) => t.status === "available").length} bàn trống / {tables.length} bàn
          </p>
        </div>
        <div className="flex gap-2">
          {user?.role === "admin" && (
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Thêm bàn
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        {Object.entries(statusConfig).map(([key, val]) => (
          <span key={key} className={`px-3 py-1 rounded-full text-xs font-semibold ${val.lightClass}`}>
            {val.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {tables.map((table, i) => (
          <motion.div
            key={table.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <button
              onClick={() => setSelectedTable(table)}
              className={`w-full aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 hover:shadow-lg ${
                table.status === "available"
                  ? "border-success/30 bg-success/5 hover:border-success/60"
                  : table.status === "serving"
                  ? "border-warning/30 bg-warning/5 hover:border-warning/60"
                  : "border-destructive/30 bg-destructive/5 hover:border-destructive/60"
              }`}
            >
              <span className="text-2xl font-bold">#{table.table_number}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusConfig[table.status].class}`}>
                {statusConfig[table.status].label}
              </span>
              <span className="text-xs text-muted-foreground">{table.seats} ghế</span>
              {getOrderCount(table.id) > 0 && (
                <span className="text-xs text-muted-foreground">
                  {getOrderCount(table.id)} món
                </span>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      {selectedTable && (
        <Dialog open={!!selectedTable} onOpenChange={() => setSelectedTable(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Bàn #{selectedTable.table_number}</span>
                <div className="flex gap-2">
                  {user?.role === "admin" && (
                    <Button variant="outline" size="sm" onClick={() => { openEditDialog(selectedTable); setSelectedTable(null); }}>
                      <Pencil className="h-4 w-4 mr-1" /> Sửa
                    </Button>
                  )}
                  {selectedTable.status !== "available" && (
                    <Button variant="outline" size="sm" onClick={() => setShowClearDialog(true)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Dọn bàn
                    </Button>
                  )}
                </div>
              </DialogTitle>
            </DialogHeader>
            <OrderPanel table={selectedTable} ordersHook={ordersHook} menuHook={menuHook} />
          </DialogContent>
        </Dialog>
      )}

      {/* Add Table Dialog */}
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

      {/* Edit Table Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sửa thông tin bàn #{editingTable?.table_number}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Số bàn</Label>
              <Input type="number" value={editNumber} onChange={(e) => setEditNumber(e.target.value)} min={1} />
            </div>
            <div className="space-y-2">
              <Label>Số ghế</Label>
              <Input type="number" value={editSeats} onChange={(e) => setEditSeats(e.target.value)} min={1} max={20} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Hủy</Button>
            <Button onClick={handleEditTable}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear confirmation */}
      <Dialog open={showClearDialog} onOpenChange={(open) => { setShowClearDialog(open); setClearConfirm(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xác nhận dọn bàn #{selectedTable?.table_number}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Nhập <span className="font-bold text-destructive">YES</span> để xác nhận.
          </p>
          <Input value={clearConfirm} onChange={(e) => setClearConfirm(e.target.value)} placeholder="Nhập YES" />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowClearDialog(false); setClearConfirm(""); }}>Hủy</Button>
            <Button variant="destructive" onClick={() => selectedTable && handleClear(selectedTable.id)} disabled={clearConfirm !== "YES"}>
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TablesPage;
