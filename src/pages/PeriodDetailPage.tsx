import { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBills } from "@/hooks/useBills";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, DollarSign, Receipt, CalendarDays } from "lucide-react";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

const formatDateTime = (date: Date) => {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(date);
};

const getPeriodKey = (d: Date, type: string) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (type === "day") return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  if (type === "week") {
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    return `T${week}/${d.getFullYear()}`;
  }
  if (type === "month") return `${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  return `${d.getFullYear()}`;
};

const PeriodDetailPage = () => {
  const [searchParams] = useSearchParams();
  const period = searchParams.get("period") || "";
  const type = searchParams.get("type") || "day";
  const { user } = useAuth();
  const { bills: rawBills } = useBills(user?.restaurantId || null);

  const bills = useMemo(() => rawBills.map(b => ({
    id: b.id,
    tableNumber: b.table_number,
    items: b.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
    total: b.total,
    paidAt: new Date(b.paid_at),
    staffName: b.staff_name,
  })), [rawBills]);

  const periodBills = useMemo(() => {
    return bills.filter((bill) => getPeriodKey(bill.paidAt, type) === period);
  }, [bills, period, type]);

  const totalRevenue = useMemo(() => periodBills.reduce((s, b) => s + b.total, 0), [periodBills]);
  const periodLabel = type === "day" ? "Ngày" : type === "week" ? "Tuần" : type === "month" ? "Tháng" : "Năm";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/history">
          <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Quay lại</Button>
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> Chi tiết doanh thu: {period}
          </h1>
          <p className="text-sm text-muted-foreground">Xem theo {periodLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatPrice(totalRevenue)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Số hóa đơn</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periodBills.length}</div>
            <p className="text-xs text-muted-foreground">TB: {periodBills.length > 0 ? formatPrice(totalRevenue / periodBills.length) : "—"}/HĐ</p>
          </CardContent>
        </Card>
      </div>

      {periodBills.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">Không có hóa đơn trong khoảng thời gian này</p>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
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
                      <TableCell>{formatDateTime(bill.paidAt)}</TableCell>
                      <TableCell className="font-semibold">{formatPrice(bill.total)}</TableCell>
                      <TableCell>{bill.staffName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PeriodDetailPage;
