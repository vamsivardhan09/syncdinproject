import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { handleTwinReply, twinReplyInput } from "@/lib/twin-chat.server";

export const generateTwinReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => twinReplyInput.parse(input))
  .handler(async ({ data }) => handleTwinReply(data));
