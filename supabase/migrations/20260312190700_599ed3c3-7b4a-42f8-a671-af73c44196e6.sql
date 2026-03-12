
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS status public.order_status NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS notes text;
