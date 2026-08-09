ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS messages_recipient_created_idx
  ON public.messages (recipient_id, created_at DESC)
  WHERE recipient_id IS NOT NULL;

DROP POLICY IF EXISTS "Own messages" ON public.messages;
DROP POLICY IF EXISTS "Message participants can view" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Senders can update messages" ON public.messages;
DROP POLICY IF EXISTS "Senders can delete messages" ON public.messages;

CREATE POLICY "Message participants can view"
ON public.messages
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (recipient_id IS NULL OR recipient_id <> auth.uid())
);

CREATE POLICY "Senders can update messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Senders can delete messages"
ON public.messages
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);