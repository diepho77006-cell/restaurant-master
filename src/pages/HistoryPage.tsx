import { useState, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBills, BillWithItems } from "@/hooks/useBills";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Printer, Search, TrendingUp, Receipt, DollarSign, CalendarDays } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import BillReceipt from "@/components/BillReceipt";

interface BillData {
  id: string;
  tableNumber: number;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  paidAt: Date;
  staffName: string;
}

const HistoryPage = () => {
  const { user } = useAuth();
  const { bills: rawBills } = useBills(user?.restaurantId || null);
  const [selectedBill, setSelectedBill] = useState<BillData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [periodTab, setPeriodTab] = useState("day");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Map DB bills to display format
  const bills: BillData[] = useMemo(() => rawBills.map(b => ({
    id: b.id,
    tableNumber: b.table_number,
    items: b.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
    total: b.total,
    paidAt: new Date(b.paid_at),
    staffName: b.staff_name,
  })), [rawBills]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(date);
  };

  const filteredBills = useMemo(() => {
    if (!searchQuery.trim()) return bills;
    const q = searchQuery.toLowerCase().trim();
    return bills.filter((bill) =>
      bill.id.toLowerCase().includes(q) ||
      `#${bill.tableNumber}`.includes(q) ||
      bill.staffName.toLowerCase().includes(q)
    );
  }, [bills, searchQuery]);

  const getPeriodKey = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    if (periodTab === "day") return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    if (periodTab === "week") {
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
      return `T${week}/${d.getFullYear()}`;
    }
    if (periodTab === "month") return `${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    return `${d.getFullYear()}`;
  };

  const revenueData = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number }>();
    bills.forEach((bill) => {
      const key = getPeriodKey(bill.paidAt);
      const entry = map.get(key) || { revenue: 0, count: 0 };
      entry.revenue += bill.total;
      entry.count += 1;
      map.set(key, entry);
    });
    return Array.from(map.entries()).map(([label, data]) => ({ label, ...data })).reverse();
  }, [bills, periodTab]);

  const periodBills = useMemo(() => {
    if (!selectedPeriod) return [];
    return bills.filter((bill) => getPeriodKey(bill.paidAt) === selectedPeriod);
  }, [bills, selectedPeriod, periodTab]);

  const periodTotal = useMemo(() => periodBills.reduce((s, b) => s + b.total, 0), [periodBills]);
  const totalRevenue = useMemo(() => bills.reduce((s, b) => s + b.total, 0), [bills]);
  const todayRevenue = useMemo(() => {
    const today = new Date();
    return bills.reduce((s, b) => b.paidAt.toDateString() === today.toDateString() ? s + b.total : s, 0);
  }, [bills]);
  const todayBills = useMemo(() => {
    const today = new Date();
    return bills.filter((b) => b.paidAt.toDateString() === today.toDateString()).length;
  }, [bills]);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Hóa đơn</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; } .bill-receipt { padding: 20px; max-width: 300px; margin: 0 auto; } @media print { body { margin: 0; } }</style></head><body>${content.innerHTML}</body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-primary">{formatPrice(payload[0].value)}</p>
        <p className="text-muted-foreground">{payload[0].payload.count} hóa đơn</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lịch sử & Doanh thu</h1>
        <p className="text-muted-foreground text-sm">{bills.length} hóa đơn</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">{bills.length} hóa đơn</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu hôm nay</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(todayRevenue)}</div>
            <p className="text-xs text-muted-foreground">{todayBills} hóa đơn hôm nay</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trung bình/HĐ</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bills.length > 0 ? formatPrice(totalRevenue / bills.length) : "—"}</div>
            <p className="text-xs text-muted-foreground">Giá trị trung bình</p>
          </CardContent>
        </Card>
      </div>

      {bills.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-5 w-5" /> Biểu đồ doanh thu
              </CardTitle>
              <Tabs value={periodTab} onValueChange={setPeriodTab}>
                <TabsList>
                  <TabsTrigger value="day">Ngày</TabsTrigger>
                  <TabsTrigger value="week">Tuần</TabsTrigger>
                  <TabsTrigger value="month">Tháng</TabsTrigger>
                  <TabsTrigger value="year">Năm</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} onClick={(e) => { if (e?.activeLabel) setSelectedPeriod(e.activeLabel); }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Danh sách hóa đơn</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm mã HĐ, bàn, nhân viên..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredBills.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">{searchQuery ? "Không tìm thấy kết quả" : "Chưa có hóa đơn nào"}</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bàn</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Tổng tiền</TableHead>
                    <TableHead>Nhân viên</TableHead>
                    <TableHead className="text-right">Chi tiết</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell>#{bill.tableNumber}</TableCell>
                      <TableCell>{formatDate(bill.paidAt)}</TableCell>
                      <TableCell className="font-semibold">{formatPrice(bill.total)}</TableCell>
                      <TableCell>{bill.staffName}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedBill(bill)}><Eye className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedBill} onOpenChange={() => setSelectedBill(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Chi tiết hóa đơn</DialogTitle></DialogHeader>
          {selectedBill && (
            <div ref={printRef} className="border rounded-lg bg-white">
              <BillReceipt bill={selectedBill} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedBill(null)}>Đóng</Button>
            <Button onClick={handlePrint}><Printer className="h-4 w-4 mr-1" /> In hóa đơn</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedPeriod} onOpenChange={() => setSelectedPeriod(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" /> Chi tiết doanh thu — {selectedPeriod}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{periodBills.length} hóa đơn</p>
            <p className="text-lg font-bold text-primary">{formatPrice(periodTotal)}</p>
          </div>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bàn</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Tổng tiền</TableHead>
                  <TableHead>Nhân viên</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodBills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>#{bill.tableNumber}</TableCell>
                    <TableCell>{formatDate(bill.paidAt)}</TableCell>
                    <TableCell className="font-semibold">{formatPrice(bill.total)}</TableCell>
                    <TableCell>{bill.staffName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HistoryPage;
