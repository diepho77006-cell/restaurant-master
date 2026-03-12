import { forwardRef } from "react";

interface BillData {
  id: string;
  tableNumber: number;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  paidAt: Date;
  staffName: string;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(date);
};

const BillReceipt = forwardRef<HTMLDivElement, { bill: BillData }>(({ bill }, ref) => {
  return (
    <div ref={ref} className="bill-receipt p-6 bg-white text-black max-w-[300px] mx-auto font-mono text-xs">
      <div className="text-center mb-4">
        <h2 className="text-base font-bold">NHÀ HÀNG</h2>
        <p className="text-[10px] mt-1">Địa chỉ: 123 Đường ABC, TP.HCM</p>
        <p className="text-[10px]">ĐT: 0123 456 789</p>
      </div>
      <div className="border-t border-dashed border-black my-2" />
      <div className="text-center mb-2">
        <h3 className="text-sm font-bold">HÓA ĐƠN THANH TOÁN</h3>
      </div>
      <div className="space-y-0.5 mb-2">
        <div className="flex justify-between"><span>Bàn:</span><span>#{bill.tableNumber}</span></div>
        <div className="flex justify-between"><span>Thời gian:</span><span>{formatDate(bill.paidAt)}</span></div>
        <div className="flex justify-between"><span>Thu ngân:</span><span>{bill.staffName}</span></div>
      </div>
      <div className="border-t border-dashed border-black my-2" />
      <div className="flex justify-between font-bold mb-1">
        <span className="flex-1">Món</span>
        <span className="w-8 text-center">SL</span>
        <span className="w-20 text-right">T.Tiền</span>
      </div>
      <div className="border-t border-dashed border-black my-1" />
      {bill.items.map((item, i) => (
        <div key={i} className="flex justify-between py-0.5">
          <span className="flex-1 break-words pr-1">{item.name}</span>
          <span className="w-8 text-center">{item.quantity}</span>
          <span className="w-20 text-right">{formatPrice(item.price * item.quantity)}</span>
        </div>
      ))}
      <div className="border-t border-dashed border-black my-2" />
      <div className="flex justify-between font-bold text-sm">
        <span>TỔNG CỘNG</span>
        <span>{formatPrice(bill.total)}</span>
      </div>
      <div className="border-t border-dashed border-black my-2" />
      <div className="text-center mt-4 space-y-1">
        <p>Cảm ơn quý khách!</p>
        <p>Hẹn gặp lại</p>
        <p className="text-[10px] mt-2">*** {formatDate(bill.paidAt)} ***</p>
      </div>
    </div>
  );
});

BillReceipt.displayName = "BillReceipt";

export default BillReceipt;
