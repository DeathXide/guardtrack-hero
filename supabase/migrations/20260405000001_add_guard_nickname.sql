-- Add nickname column to guards table
ALTER TABLE public.guards ADD COLUMN IF NOT EXISTS nickname TEXT;
