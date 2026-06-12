import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/** The signed-in member's Lettuce Leaves balance (RLS: own account only). */
export function useLeavesBalance() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["leaves-balance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leaves_accounts")
        .select("balance")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.balance ?? 0;
    },
  });
  return { balance: query.data ?? 0, ...query };
}
