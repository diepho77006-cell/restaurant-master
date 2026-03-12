import { supabase } from "@/integrations/supabase/client";
import type { Tables, Enums } from "@/integrations/supabase/types";

type AppRole = Enums<"app_role">;

export const createRestaurant = async (name: string, userId: string) => {
  // 1. Create restaurant
  const { data: restaurant, error: restError } = await supabase
    .from("restaurants")
    .insert({ name, owner_id: userId })
    .select()
    .single();

  if (restError || !restaurant) throw new Error(restError?.message || "Failed to create restaurant");

  // 2. Update profile with restaurant_id
  await supabase
    .from("profiles")
    .update({ restaurant_id: restaurant.id })
    .eq("user_id", userId);

  // 3. Assign admin role
  await supabase
    .from("user_roles")
    .insert({ user_id: userId, role: "admin" as AppRole });

  return restaurant;
};

export const createStaffAccount = async (
  email: string,
  password: string,
  name: string,
  role: AppRole,
  restaurantId: string
) => {
  // 1. Create auth user via edge function or direct signup
  const { data: authData, error: signupError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: window.location.origin,
    },
  });

  if (signupError || !authData.user) {
    throw new Error(signupError?.message || "Failed to create user");
  }

  const userId = authData.user.id;

  // 2. Update profile with restaurant_id and name
  // The trigger will auto-create the profile, but we need to update it
  // Wait a moment for the trigger
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await supabase
    .from("profiles")
    .update({ restaurant_id: restaurantId, name })
    .eq("user_id", userId);

  // 3. Assign role
  await supabase
    .from("user_roles")
    .insert({ user_id: userId, role });

  return { userId, email, name, role };
};

export const getRestaurantMembers = async (restaurantId: string) => {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("restaurant_id", restaurantId);

  if (!profiles) return [];

  // Fetch roles for all members
  const userIds = profiles.map(p => p.user_id);
  const { data: roles } = await supabase
    .from("user_roles")
    .select("*")
    .in("user_id", userIds);

  return profiles.map(profile => ({
    ...profile,
    role: roles?.find(r => r.user_id === profile.user_id)?.role || null,
  }));
};

export const deleteStaffAccount = async (userId: string) => {
  // Delete role (cascading from auth.users would be ideal, but we do role first)
  await supabase.from("user_roles").delete().eq("user_id", userId);
  // Note: We can't delete auth.users from client side. 
  // We remove the profile's restaurant association instead
  await supabase
    .from("profiles")
    .update({ restaurant_id: null })
    .eq("user_id", userId);
};
