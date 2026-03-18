import { supabase as _supabase } from "@/integrations/supabase/client";

// Re-export original client for auth, storage, realtime etc.
export { _supabase as supabase };

// Pre-cast client for database operations to avoid `never` type errors
// caused by empty auto-generated Supabase types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = _supabase as any;
