import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Order = Tables<"orders">;
type OrderItem = Tables<"order_items">;
type MenuItem = Tables<"menu_items">;
type OrderStatus = Enums<"order_status">;

export interface OrderWithItems extends Order {
  items: (OrderItem & { menu_item: MenuItem })[];
  table_number?: number;
}

export const useRealtimeOrders = (restaurantId: string | null) => {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!restaurantId) return;
    
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        items:order_items(*, menu_item:menu_items(*)),
        table:restaurant_tables(table_number)
      `)
      .eq("restaurant_id", restaurantId)
      .neq("status", "paid")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data.map((o: any) => ({
        ...o,
        table_number: o.table?.table_number,
        items: o.items || [],
      })));
    }
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    fetchOrders();

    if (!restaurantId) return;

    // Realtime subscription for orders
    const ordersChannel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        () => fetchOrders()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [restaurantId, fetchOrders]);

  const createOrder = async (tableId: string, userId: string) => {
    if (!restaurantId) throw new Error("No restaurant");
    const { data, error } = await supabase
      .from("orders")
      .insert({
        restaurant_id: restaurantId,
        table_id: tableId,
        created_by: userId,
        status: "pending" as OrderStatus,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  const addOrderItem = async (orderId: string, menuItemId: string, quantity: number, notes?: string) => {
    const { error } = await supabase
      .from("order_items")
      .insert({
        order_id: orderId,
        menu_item_id: menuItemId,
        quantity,
        notes,
        status: "pending" as OrderStatus,
      });
    if (error) throw error;
  };

  const updateOrderItemQuantity = async (itemId: string, quantity: number) => {
    const { error } = await supabase
      .from("order_items")
      .update({ quantity })
      .eq("id", itemId);
    if (error) throw error;
  };

  const updateOrderItemStatus = async (itemId: string, status: OrderStatus) => {
    const { error } = await supabase
      .from("order_items")
      .update({ status })
      .eq("id", itemId);
    if (error) throw error;
  };

  const updateOrderItemNotes = async (itemId: string, notes: string) => {
    const { error } = await supabase
      .from("order_items")
      .update({ notes })
      .eq("id", itemId);
    if (error) throw error;
  };

  const removeOrderItem = async (itemId: string) => {
    const { error } = await supabase
      .from("order_items")
      .delete()
      .eq("id", itemId);
    if (error) throw error;
  };

  const submitOrder = async (orderId: string) => {
    // Update all pending items to cooking
    const { error: itemsError } = await supabase
      .from("order_items")
      .update({ status: "cooking" as OrderStatus })
      .eq("order_id", orderId)
      .eq("status", "pending");
    if (itemsError) throw itemsError;

    // Update order status
    const { error } = await supabase
      .from("orders")
      .update({ status: "cooking" as OrderStatus })
      .eq("id", orderId);
    if (error) throw error;
  };

  const getOrderForTable = (tableId: string) => {
    return orders.find(o => o.table_id === tableId && o.status !== "paid");
  };

  const getKitchenOrders = () => {
    return orders.filter(o => o.status === "cooking" || o.status === "pending")
      .flatMap(o => 
        o.items
          .filter(i => i.status === "cooking" || i.status === "pending")
          .map(item => ({
            orderId: o.id,
            tableId: o.table_id,
            tableNumber: o.table_number || 0,
            item,
          }))
      );
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
    refetch: fetchOrders,
  };
};
