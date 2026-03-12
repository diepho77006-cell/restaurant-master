
-- ============================================
-- OrderMaster POS - Full Database Schema
-- ============================================

-- 1. ENUM TYPES
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'kitchen');
CREATE TYPE public.table_status AS ENUM ('available', 'serving', 'payment');
CREATE TYPE public.order_status AS ENUM ('pending', 'cooking', 'done', 'paid');
CREATE TYPE public.menu_item_status AS ENUM ('available', 'unavailable');

-- 2. RESTAURANTS TABLE
CREATE TABLE public.restaurants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- 3. PROFILES TABLE (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. USER ROLES TABLE (separate from profiles per security guidelines)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. TABLES (restaurant tables)
CREATE TABLE public.restaurant_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number INT NOT NULL,
  seats INT NOT NULL DEFAULT 4,
  status table_status NOT NULL DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, table_number)
);

ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- 6. MENU ITEMS
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INT NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Khác',
  status menu_item_status NOT NULL DEFAULT 'available',
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- 7. ORDERS
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  status order_status NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 8. ORDER ITEMS
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id),
  quantity INT NOT NULL DEFAULT 1,
  status order_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 9. BILLS (payment history)
CREATE TABLE public.bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  table_number INT NOT NULL,
  total INT NOT NULL DEFAULT 0,
  staff_name TEXT NOT NULL DEFAULT '',
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- 10. BILL ITEMS (denormalized for history)
CREATE TABLE public.bill_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price INT NOT NULL DEFAULT 0
);

ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================

-- Function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's restaurant_id
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Function to check same restaurant
CREATE OR REPLACE FUNCTION public.is_same_restaurant(_user_id UUID, _restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND restaurant_id = _restaurant_id
  )
$$;

-- ============================================
-- RLS POLICIES
-- ============================================

-- RESTAURANTS: members can view their restaurant, owner can update
CREATE POLICY "Members can view their restaurant"
  ON public.restaurants FOR SELECT TO authenticated
  USING (public.is_same_restaurant(auth.uid(), id));

CREATE POLICY "Authenticated users can create restaurant"
  ON public.restaurants FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner can update restaurant"
  ON public.restaurants FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

-- PROFILES: same restaurant can view, user can update own
CREATE POLICY "Same restaurant members can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    restaurant_id IS NULL
    OR public.is_same_restaurant(auth.uid(), restaurant_id)
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can update profiles in their restaurant"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND public.is_same_restaurant(auth.uid(), restaurant_id)
  );

-- USER ROLES: same restaurant can view, admins can manage
CREATE POLICY "Same restaurant can view roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.restaurant_id = p2.restaurant_id
      WHERE p1.user_id = auth.uid() AND p2.user_id = public.user_roles.user_id
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND user_id != auth.uid()
  );

-- RESTAURANT TABLES: same restaurant access
CREATE POLICY "Members can view tables"
  ON public.restaurant_tables FOR SELECT TO authenticated
  USING (public.is_same_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Admins can manage tables"
  ON public.restaurant_tables FOR INSERT TO authenticated
  WITH CHECK (
    public.is_same_restaurant(auth.uid(), restaurant_id)
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update tables"
  ON public.restaurant_tables FOR UPDATE TO authenticated
  USING (
    public.is_same_restaurant(auth.uid(), restaurant_id)
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Members can update table status"
  ON public.restaurant_tables FOR UPDATE TO authenticated
  USING (public.is_same_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Admins can delete tables"
  ON public.restaurant_tables FOR DELETE TO authenticated
  USING (
    public.is_same_restaurant(auth.uid(), restaurant_id)
    AND public.has_role(auth.uid(), 'admin')
  );

-- MENU ITEMS: same restaurant access
CREATE POLICY "Members can view menu"
  ON public.menu_items FOR SELECT TO authenticated
  USING (public.is_same_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Admins can manage menu"
  ON public.menu_items FOR ALL TO authenticated
  USING (
    public.is_same_restaurant(auth.uid(), restaurant_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'kitchen'))
  );

-- ORDERS: same restaurant access
CREATE POLICY "Members can view orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.is_same_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Staff and admin can create orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (
    public.is_same_restaurant(auth.uid(), restaurant_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  );

CREATE POLICY "Members can update orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.is_same_restaurant(auth.uid(), restaurant_id));

-- ORDER ITEMS: same restaurant via order
CREATE POLICY "Members can view order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND public.is_same_restaurant(auth.uid(), o.restaurant_id)
    )
  );

CREATE POLICY "Staff and admin can create order items"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND public.is_same_restaurant(auth.uid(), o.restaurant_id)
    )
  );

CREATE POLICY "Members can update order items"
  ON public.order_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND public.is_same_restaurant(auth.uid(), o.restaurant_id)
    )
  );

CREATE POLICY "Members can delete order items"
  ON public.order_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND public.is_same_restaurant(auth.uid(), o.restaurant_id)
    )
  );

-- BILLS: same restaurant access
CREATE POLICY "Members can view bills"
  ON public.bills FOR SELECT TO authenticated
  USING (public.is_same_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Staff and admin can create bills"
  ON public.bills FOR INSERT TO authenticated
  WITH CHECK (public.is_same_restaurant(auth.uid(), restaurant_id));

-- BILL ITEMS: via bill
CREATE POLICY "Members can view bill items"
  ON public.bill_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_items.bill_id
      AND public.is_same_restaurant(auth.uid(), b.restaurant_id)
    )
  );

CREATE POLICY "Members can insert bill items"
  ON public.bill_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_items.bill_id
      AND public.is_same_restaurant(auth.uid(), b.restaurant_id)
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
