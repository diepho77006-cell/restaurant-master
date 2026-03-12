import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeMenu } from "@/hooks/useRealtimeMenu";
import type { Tables as DbTables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

type MenuItem = DbTables<"menu_items">;
const categories = ["Món chính", "Khai vị", "Đồ uống", "Tráng miệng", "Khác"];

const MenuPage = () => {
  const { user } = useAuth();
  const { menu, addMenuItem, updateMenuItem, deleteMenuItem } = useRealtimeMenu(user?.restaurantId || null);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({ name: "", price: "", category: "Món chính", status: "available" as "available" | "unavailable" });

  const filteredMenu = menu.filter((m) => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const formatPrice = (price: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

  const openAdd = () => { setEditing(null); setForm({ name: "", price: "", category: "Món chính", status: "available" }); setShowDialog(true); };
  const openEdit = (item: MenuItem) => { setEditing(item); setForm({ name: item.name, price: item.price.toString(), category: item.category, status: item.status }); setShowDialog(true); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) { toast.error("Vui lòng điền đầy đủ thông tin"); return; }
    const price = parseInt(form.price);
    if (isNaN(price) || price <= 0) { toast.error("Giá không hợp lệ"); return; }
    try {
      if (editing) {
        await updateMenuItem(editing.id, { name: form.name, price, category: form.category, status: form.status });
        toast.success("Đã cập nhật món");
      } else {
        await addMenuItem({ name: form.name, price, category: form.category, status: form.status });
        toast.success("Đã thêm món mới");
      }
      setShowDialog(false);
    } catch { toast.error("Lỗi khi lưu"); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteMenuItem(id); toast.success("Đã xóa món"); }
    catch { toast.error("Lỗi khi xóa"); }
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Thực đơn</h1>
          <p className="text-muted-foreground text-sm">{menu.length} món</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Thêm món
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Tìm món..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên món</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead>Giá</TableHead>
              <TableHead>Trạng thái</TableHead>
              {isAdmin && <TableHead className="text-right">Thao tác</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMenu.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{formatPrice(item.price)}</TableCell>
                <TableCell>
                  <Badge variant={item.status === "available" ? "default" : "secondary"}>
                    {item.status === "available" ? "Có sẵn" : "Hết"}
                  </Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Sửa món" : "Thêm món mới"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Tên món</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Giá (VND)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Danh mục</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "available" | "unavailable" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Có sẵn</SelectItem>
                  <SelectItem value="unavailable">Hết</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Hủy</Button>
            <Button onClick={handleSave}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuPage;
