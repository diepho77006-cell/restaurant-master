import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Enums } from "@/integrations/supabase/types";

type RestaurantTable = Tables<"restaurant_tables">;
type TableStatus = Enums<"table_status">;

export const useRealtimeTables = (restaurantId: string | null) => {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTables = useCallback(async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from("restaurant_tables")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("table_number");
    if (!error && data) setTables(data);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    fetchTables();
    if (!restaurantId) return;

    const channel = supabase
      .channel("tables-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurant_tables", filter: `restaurant_id=eq.${restaurantId}` },
        () => fetchTables()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, fetchTables]);

  const addTable = async (seats: number) => {
    if (!restaurantId) return;
    const maxNum = tables.reduce((max, t) => Math.max(max, t.table_number), 0);
    const { error } = await supabase
      .from("restaurant_tables")
      .insert({ restaurant_id: restaurantId, table_number: maxNum + 1, seats });
    if (error) throw error;
  };

  const updateTable = async (id: string, data: Partial<Pick<RestaurantTable, "table_number" | "seats" | "status">>) => {
    const { error } = await supabase
      .from("restaurant_tables")
      .update(data)
      .eq("id", id);
    if (error) throw error;
  };

  const deleteTable = async (id: string) => {
    const { error } = await supabase
      .from("restaurant_tables")
      .delete()
      .eq("id", id);
    if (error) throw error;
  };

  const updateTableStatus = async (id: string, status: TableStatus) => {
    const { error } = await supabase
      .from("restaurant_tables")
      .update({ status })
      .eq("id", id);
    if (error) throw error;
  };

  return { tables, loading, addTable, updateTable, deleteTable, updateTableStatus, refetch: fetchTables };
};
