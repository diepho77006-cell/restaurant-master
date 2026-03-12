import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/integrations/supabase/types";

type TableStatus = Database["public"]["Enums"]["table_status"];

const statusConfig: Record<TableStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  available: { label: "Trống", variant: "outline" },
  occupied: { label: "Đang dùng", variant: "destructive" },
  reserved: { label: "Đã đặt", variant: "secondary" },
};

export default function Tables() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [seats, setSeats] = useState("4");

  const { data: tables, isLoading } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => {
      const { data, error } = await supabase.from("restaurant_tables").select("*").order("table_number");
      if (error) throw error;
      return data;
    },
  });

  const addTable = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("restaurant_tables").insert({
        table_number: parseInt(tableNumber),
        seats: parseInt(seats),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast.success("Đã thêm bàn mới");
      setOpen(false);
      setTableNumber("");
      setSeats("4");
    },
    onError: () => toast.error("Lỗi khi thêm bàn"),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: TableStatus }) => {
      const next: TableStatus = currentStatus === "available" ? "occupied" : "available";
      const { error } = await supabase.from("restaurant_tables").update({ status: next }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tables"] }),
  });

  if (isLoading) return <div className="text-muted-foreground">Đang tải...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Quản lý bàn</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Thêm bàn</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Thêm bàn mới</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Số bàn</Label>
                <Input type="number" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder="VD: 1" />
              </div>
              <div className="grid gap-2">
                <Label>Số ghế</Label>
                <Input type="number" value={seats} onChange={(e) => setSeats(e.target.value)} placeholder="VD: 4" />
              </div>
              <Button onClick={() => addTable.mutate()} disabled={!tableNumber}>Thêm</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tables?.map((table) => {
          const config = statusConfig[table.status];
          return (
            <Card
              key={table.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => toggleStatus.mutate({ id: table.id, currentStatus: table.status })}
            >
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-foreground mb-2">Bàn {table.table_number}</div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-3">
                  <Users className="h-4 w-4" /> {table.seats} ghế
                </div>
                <Badge variant={config.variant}>{config.label}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
