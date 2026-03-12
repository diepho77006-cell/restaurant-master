import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Order = Tables<"orders">;
type OrderItem = Tables<"order_items">;
type MenuItem = Tables<"menu_items">;
type OrderStatus = Enums<"order_status">;

export interface OrderItemWithMenu extends OrderItem {
  menu_item: MenuItem;
}

export interface OrderWithItems extends Order {
  items: OrderItemWithMenu[];
  table_number?: number;
}

export const useRealtimeOrders = () => {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        items:order_items(*, menu_item:menu_items(*)),
        table:restaurant_tables(table_number)
      `)
      .neq("status", "paid")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data.map((o: any) => ({
        ...o,
        table_number: o.table?.table_number,
        items: o.items || [],
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrders())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => fetchOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  const createOrder = async (tableId: string) => {
    const { data, error } = await supabase
      .from("orders")
      .insert({ table_id: tableId, status: "pending" as OrderStatus })
      .select()
      .single();
    if (error) throw error;

    // Mark table as occupied
    await supabase.from("restaurant_tables").update({ status: "occupied" as any }).eq("id", tableId);
    return data;
  };

  const addOrderItem = async (orderId: string, menuItemId: string, quantity: number, unitPrice: number) => {
    const { error } = await supabase
      .from("order_items")
      .insert({ order_id: orderId, menu_item_id: menuItemId, quantity, unit_price: unitPrice, status: "pending" as OrderStatus });
    if (error) throw error;
  };

  const updateOrderItemQuantity = async (itemId: string, quantity: number) => {
    const { error } = await supabase.from("order_items").update({ quantity }).eq("id", itemId);
    if (error) throw error;
  };

  const updateOrderItemStatus = async (itemId: string, status: OrderStatus) => {
    const { error } = await supabase.from("order_items").update({ status }).eq("id", itemId);
    if (error) throw error;
  };

  const updateOrderItemNotes = async (itemId: string, notes: string) => {
    const { error } = await supabase.from("order_items").update({ notes }).eq("id", itemId);
    if (error) throw error;
  };

  const removeOrderItem = async (itemId: string) => {
    const { error } = await supabase.from("order_items").delete().eq("id", itemId);
    if (error) throw error;
  };

  const submitOrder = async (orderId: string) => {
    // Update pending items to preparing
    await supabase
      .from("order_items")
      .update({ status: "preparing" as OrderStatus })
      .eq("order_id", orderId)
      .eq("status", "pending");

    await supabase.from("orders").update({ status: "preparing" as OrderStatus }).eq("id", orderId);
  };

  const getOrderForTable = (tableId: string) => {
    return orders.find(o => o.table_id === tableId);
  };

  const getKitchenOrders = () => {
    return orders
      .filter(o => o.status === "preparing" || o.status === "pending")
      .flatMap(o =>
        o.items
          .filter(i => i.status === "preparing" || i.status === "pending")
          .map(item => ({
            orderId: o.id,
            tableId: o.table_id,
            tableNumber: o.table_number || 0,
            item,
          }))
      );
  };

  const payOrder = async (orderId: string, totalAmount: number, tableId: string) => {
    await supabase.from("orders").update({ status: "paid" as OrderStatus, total_amount: totalAmount }).eq("id", orderId);
    await supabase.from("order_items").update({ status: "paid" as OrderStatus }).eq("order_id", orderId);
    await supabase.from("restaurant_tables").update({ status: "available" as any }).eq("id", tableId);
  };

  return {
    orders,
    loading,
    createOrder,
    addOrderItem,
    updateOrderItemQuantity,
    updateOrderItemStatus,
    updateOrderItemNotes,
    removeOrderItem,
    submitOrder,
    getOrderForTable,
    getKitchenOrders,
    payOrder,
    refetch: fetchOrders,
  };
};
