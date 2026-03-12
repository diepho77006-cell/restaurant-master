import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createRestaurant } from "@/hooks/useRestaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Store } from "lucide-react";

const SetupRestaurantPage = () => {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;

    setLoading(true);
    try {
      await createRestaurant(name.trim(), user.id);
      await refreshProfile();
      toast.success("Tạo quán thành công!");
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi tạo quán");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Store className="w-12 h-12 mx-auto mb-2 text-primary" />
          <CardTitle className="text-2xl font-bold">Tạo nhà hàng</CardTitle>
          <CardDescription>
            Chào {user?.name}! Hãy tạo nhà hàng đầu tiên của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên nhà hàng</Label>
              <Input
                id="name"
                placeholder="VD: Nhà hàng Phở Hà Nội"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
              {loading ? "Đang tạo..." : "Tạo nhà hàng"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupRestaurantPage;
