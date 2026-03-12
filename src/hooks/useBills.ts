import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Bill = Tables<"bills">;
type BillItem = Tables<"bill_items">;

export interface BillWithItems extends Bill {
  items: BillItem[];
}

export const useBills = (restaurantId: string | null) => {
  const [bills, setBills] = useState<BillWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBills = useCallback(async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from("bills")
      .select("*, items:bill_items(*)")
      .eq("restaurant_id", restaurantId)
      .order("paid_at", { ascending: false });
    if (!error && data) {
      setBills(data as BillWithItems[]);
    }
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const processPayment = async (
    orderId: string,
    tableNumber: number,
    items: { name: string; quantity: number; price: number }[],
    total: number,
    staffName: string,
    tableId: string
  ) => {
    if (!restaurantId) throw new Error("No restaurant");

    // 1. Create bill
    const { data: bill, error: billError } = await supabase
      .from("bills")
      .insert({
        restaurant_id: restaurantId,
        order_id: orderId,
        table_number: tableNumber,
        total,
        staff_name: staffName,
      })
      .select()
      .single();

    if (billError || !bill) throw billError;

    // 2. Create bill items
    const billItems = items.map(item => ({
      bill_id: bill.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

    await supabase.from("bill_items").insert(billItems);

    // 3. Update order status to paid
    await supabase
      .from("orders")
      .update({ status: "paid" as const })
      .eq("id", orderId);

    // 4. Update all order items to paid
    await supabase
      .from("order_items")
      .update({ status: "paid" as const })
      .eq("order_id", orderId);

    // 5. Reset table status
    await supabase
      .from("restaurant_tables")
      .update({ status: "available" as const })
      .eq("id", tableId);

    await fetchBills();
    return bill;
  };

  return { bills, loading, processPayment, refetch: fetchBills };
};
