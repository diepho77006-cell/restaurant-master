import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Enums } from "@/integrations/supabase/types";

type MenuItem = Tables<"menu_items">;
type MenuCategory = Enums<"menu_category">;

export const useRealtimeMenu = () => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMenu = useCallback(async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("category")
      .order("name");
    if (!error && data) setMenu(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMenu();

    const channel = supabase
      .channel("menu-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => fetchMenu())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMenu]);

  const addMenuItem = async (item: { name: string; price: number; category: MenuCategory }) => {
    const { error } = await supabase.from("menu_items").insert(item);
    if (error) throw error;
  };

  const updateMenuItem = async (id: string, data: Partial<Pick<MenuItem, "name" | "price" | "category" | "is_available" | "description" | "image_url">>) => {
    const { error } = await supabase.from("menu_items").update(data).eq("id", id);
    if (error) throw error;
  };

  const deleteMenuItem = async (id: string) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) throw error;
  };

  return { menu, loading, addMenuItem, updateMenuItem, deleteMenuItem, refetch: fetchMenu };
};
