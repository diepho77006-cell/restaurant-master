import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type AppRole = "admin" | "staff" | "kitchen";

interface Member {
  user_id: string;
  name: string;
  role: AppRole | null;
}

const roleLabels: Record<AppRole, string> = {
  admin: "Admin",
  staff: "Nhân viên",
  kitchen: "Đầu bếp",
};

/**
 * Account management page (Admin only)
 * Create staff/chef accounts and assign roles
 */
const AccountsPage = () => {
  const { user, refreshUser } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("staff");
  const [loading, setLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    // Get all profiles
    const { data: profiles } = await supabase.from("profiles").select("user_id, name");
    if (!profiles) return;

    // Get all roles
    const userIds = profiles.map((p) => p.user_id);
    const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);

    setMembers(
      profiles.map((p) => ({
        user_id: p.user_id,
        name: p.name,
        role: (roles?.find((r) => r.user_id === p.user_id)?.role as AppRole) || null,
      }))
    );
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleAdd = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    if (password.length < 6) {
      toast.error("Mật khẩu phải ít nhất 6 ký tự");
      return;
    }

    setLoading(true);
    try {
      // Sign up new user
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim() } },
      });

      if (signupError) throw signupError;
      if (!authData.user) throw new Error("Không tạo được tài khoản");

      // Wait for trigger to create profile
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update profile name
      await supabase.from("profiles").update({ name: name.trim() }).eq("user_id", authData.user.id);

      // Assign role
      await supabase.from("user_roles").insert({ user_id: authData.user.id, role });

      toast.success(`Đã tạo tài khoản "${name.trim()}" (${roleLabels[role]})`);
      setName(""); setEmail(""); setPassword(""); setRole("staff");
      setOpen(false);
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi tạo tài khoản");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (userId: string, userName: string) => {
    if (userId === user?.id) {
      toast.error("Không thể xóa tài khoản đang đăng nhập");
      return;
    }
    try {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      toast.success(`Đã xóa quyền của "${userName}"`);
      fetchMembers();
    } catch { toast.error("Lỗi khi xóa"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý tài khoản</h1>
          <p className="text-muted-foreground text-sm">{members.length} tài khoản</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
            <Plus className="w-4 h-4 mr-2" />Tạo tài khoản
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo tài khoản mới</DialogTitle>
              <DialogDescription>Thêm nhân viên mới vào hệ thống</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Họ tên</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nhanvien@resto.com" type="email" /></div>
              <div className="space-y-2"><Label>Mật khẩu</Label><Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ít nhất 6 ký tự" type="password" /></div>
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
                <span className="truncate">{acc.name || "Chưa đặt tên"}</span>
                <Badge variant="secondary" className="capitalize shrink-0">
                  {acc.role ? roleLabels[acc.role] : "Chưa gán"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground truncate">{acc.user_id.slice(0, 8)}...</p>
              {acc.user_id !== user?.id && acc.role && (
                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDeleteRole(acc.user_id, acc.name)}>
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
