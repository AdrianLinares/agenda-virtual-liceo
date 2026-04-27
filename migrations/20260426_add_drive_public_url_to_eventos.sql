ALTER TABLE public.eventos
ADD COLUMN IF NOT EXISTS drive_public_url text;
