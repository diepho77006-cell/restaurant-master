import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/integrations/supabase/types";

type MenuCategory = Database["public"]["Enums"]["menu_category"];
type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];

const categoryLabels: Record<MenuCategory, string> = {
  appetizer: "Khai vị",
  main: "Món chính",
  dessert: "Tráng miệng",
  drink: "Đồ uống",
};

const defaultForm = { name: "", price: "", description: "", category: "main" as MenuCategory };

export default function Menu() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["menu"],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items").select("*").order("category").order("name");
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, price: parseFloat(form.price), description: form.description || null, category: form.category };
      if (editingId) {
        const { error } = await supabase.from("menu_items").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("menu_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      toast.success(editingId ? "Đã cập nhật" : "Đã thêm món mới");
      closeDialog();
    },
    onError: () => toast.error("Có lỗi xảy ra"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      toast.success("Đã xóa");
    },
  });

  const closeDialog = () => {
    setOpen(false);
    setForm(defaultForm);
    setEditingId(null);
  };

  const startEdit = (item: MenuItem) => {
    setForm({ name: item.name, price: item.price.toString(), description: item.description ?? "", category: item.category });
    setEditingId(item.id);
    setOpen(true);
  };

  if (isLoading) return <div className="text-muted-foreground">Đang tải...</div>;

  const grouped = Object.entries(categoryLabels).map(([key, label]) => ({
    category: key as MenuCategory,
    label,
    items: items?.filter((i) => i.category === key) ?? [],
  })).filter(g => g.items.length > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Thực đơn</h2>
        <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Thêm món</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Sửa món" : "Thêm món mới"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Tên món</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Giá (VND)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Danh mục</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as MenuCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Mô tả</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <Button onClick={() => upsert.mutate()} disabled={!form.name || !form.price}>
                {editingId ? "Cập nhật" : "Thêm"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {grouped.length === 0 && <p className="text-muted-foreground">Chưa có món nào. Hãy thêm món mới!</p>}

      {grouped.map((group) => (
        <div key={group.category} className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-3">{group.label}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4 flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-foreground">{item.name}</div>
                    {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                    <Badge variant="secondary" className="mt-2">{item.price.toLocaleString()}đ</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
