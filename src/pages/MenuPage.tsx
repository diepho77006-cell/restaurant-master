import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeMenu } from "@/hooks/useRealtimeMenu";
import type { Tables as DbTables, Enums } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

type MenuItem = DbTables<"menu_items">;
type MenuCategory = Enums<"menu_category">;

const categoryLabels: Record<MenuCategory, string> = {
  appetizer: "Khai vị",
  main: "Món chính",
  dessert: "Tráng miệng",
  drink: "Đồ uống",
};

/**
 * Menu management page
 * Admin and Staff can add/edit/delete menu items
 */
const MenuPage = () => {
  const { user } = useAuth();
  const { menu, addMenuItem, updateMenuItem, deleteMenuItem } = useRealtimeMenu();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({ name: "", price: "", category: "main" as MenuCategory });

  const filteredMenu = menu.filter((m) => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const formatPrice = (price: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

  const openAdd = () => { setEditing(null); setForm({ name: "", price: "", category: "main" }); setShowDialog(true); };
  const openEdit = (item: MenuItem) => { setEditing(item); setForm({ name: item.name, price: item.price.toString(), category: item.category }); setShowDialog(true); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) { toast.error("Vui lòng điền đầy đủ thông tin"); return; }
    const price = parseFloat(form.price);
    if (isNaN(price) || price <= 0) { toast.error("Giá không hợp lệ"); return; }
    try {
      if (editing) {
        await updateMenuItem(editing.id, { name: form.name, price, category: form.category });
        toast.success("Đã cập nhật món");
      } else {
        await addMenuItem({ name: form.name, price, category: form.category });
        toast.success("Đã thêm món mới");
      }
      setShowDialog(false);
    } catch { toast.error("Lỗi khi lưu"); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteMenuItem(id); toast.success("Đã xóa món"); }
    catch { toast.error("Lỗi khi xóa"); }
  };

  const handleToggle = async (item: MenuItem) => {
    try {
      await updateMenuItem(item.id, { is_available: !item.is_available });
      toast.success(item.is_available ? "Đã đánh dấu hết món" : "Đã mở lại món");
    } catch { toast.error("Lỗi"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Thực đơn</h1>
          <p className="text-muted-foreground text-sm">{menu.length} món · {menu.filter(m => m.is_available).length} có sẵn</p>
        </div>
        <Button size="sm" onClick={openAdd} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
          <Plus className="h-4 w-4 mr-1" /> Thêm món
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Tìm món nhanh..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      <div className="border rounded-xl overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên món</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead>Giá</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMenu.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell><Badge variant="outline">{categoryLabels[item.category] || item.category}</Badge></TableCell>
                <TableCell className="font-semibold">{formatPrice(item.price)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch checked={item.is_available} onCheckedChange={() => handleToggle(item)} />
                    <span className={`text-xs font-medium ${item.is_available ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {item.is_available ? "Có sẵn" : "Hết"}
                    </span>
                  </div>
                </TableCell>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Sửa món" : "Thêm món mới"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Tên món</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Phở Bò" /></div>
            <div className="space-y-2"><Label>Giá (VND)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="55000" /></div>
            <div className="space-y-2">
              <Label>Danh mục</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as MenuCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
