import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Enums } from "@/integrations/supabase/types";

type MenuItem = Tables<"menu_items">;
type MenuItemStatus = Enums<"menu_item_status">;

export const useRealtimeMenu = (restaurantId: string | null) => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMenu = useCallback(async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("category")
      .order("name");
    if (!error && data) setMenu(data);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    fetchMenu();
    if (!restaurantId) return;

    const channel = supabase
      .channel("menu-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items", filter: `restaurant_id=eq.${restaurantId}` },
        () => fetchMenu()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, fetchMenu]);

  const addMenuItem = async (item: { name: string; price: number; category: string; status?: MenuItemStatus }) => {
    if (!restaurantId) return;
    const { error } = await supabase
      .from("menu_items")
      .insert({ ...item, restaurant_id: restaurantId });
    if (error) throw error;
  };

  const updateMenuItem = async (id: string, data: Partial<Pick<MenuItem, "name" | "price" | "category" | "status" | "image">>) => {
    const { error } = await supabase
      .from("menu_items")
      .update(data)
      .eq("id", id);
    if (error) throw error;
  };

  const deleteMenuItem = async (id: string) => {
    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", id);
    if (error) throw error;
  };

  return { menu, loading, addMenuItem, updateMenuItem, deleteMenuItem, refetch: fetchMenu };
};
