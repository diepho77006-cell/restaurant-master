import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getRestaurantMembers, deleteStaffAccount } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Enums } from "@/integrations/supabase/types";

type AppRole = Enums<"app_role">;

interface MemberProfile {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  role: AppRole | null;
}

const AccountsPage = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("staff");
  const [loading, setLoading] = useState(false);

  const fetchMembers = async () => {
    if (!user?.restaurantId) return;
    const data = await getRestaurantMembers(user.restaurantId);
    setMembers(data as MemberProfile[]);
  };

  useEffect(() => { fetchMembers(); }, [user?.restaurantId]);

  const handleAdd = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    if (password.length < 6) {
      toast.error("Mật khẩu phải ít nhất 6 ký tự");
      return;
    }
    if (!user?.restaurantId) return;

    setLoading(true);
    try {
      // Sign up new user
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim() }, emailRedirectTo: window.location.origin },
      });

      if (signupError) throw signupError;
      if (!authData.user) throw new Error("Không tạo được tài khoản");

      // Wait for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update profile with restaurant_id
      await supabase
        .from("profiles")
        .update({ restaurant_id: user.restaurantId, name: name.trim() })
        .eq("user_id", authData.user.id);

      // Assign role
      await supabase
        .from("user_roles")
        .insert({ user_id: authData.user.id, role });

      toast.success(`Đã tạo tài khoản "${name.trim()}"`);
      setName(""); setEmail(""); setPassword(""); setRole("staff");
      setOpen(false);
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi tạo tài khoản");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (userId === user?.id) {
      toast.error("Không thể xóa tài khoản đang đăng nhập");
      return;
    }
    try {
      await deleteStaffAccount(userId);
      toast.success(`Đã xóa tài khoản "${userName}"`);
      fetchMembers();
    } catch {
      toast.error("Lỗi khi xóa");
    }
  };

  const roleLabel: Record<string, string> = {
    admin: "Admin",
    staff: "Nhân viên",
    kitchen: "Đầu bếp",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý tài khoản</h1>
          <p className="text-muted-foreground text-sm">{members.length} tài khoản</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Tạo tài khoản</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo tài khoản mới</DialogTitle>
              <DialogDescription>Thêm nhân viên vào nhà hàng</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Họ tên</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nhanvien@resto.com" type="email" />
              </div>
              <div className="space-y-2">
                <Label>Mật khẩu</Label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ít nhất 6 ký tự" type="password" />
              </div>
              <div className="space-y-2">
                <Label>Vai trò</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Nhân viên</SelectItem>
                    <SelectItem value="kitchen">Đầu bếp</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
              <Button onClick={handleAdd} disabled={loading}>{loading ? "Đang tạo..." : "Tạo"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((acc) => (
          <Card key={acc.user_id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                {acc.name}
                <Badge variant="secondary" className="capitalize">
                  {acc.role ? roleLabel[acc.role] || acc.role : "—"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{acc.email}</p>
              {acc.user_id !== user?.id && (
                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDelete(acc.user_id, acc.name)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AccountsPage;
