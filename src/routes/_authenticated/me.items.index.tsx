import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ItemCard, type ItemCardData } from "@/components/item-card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/me/items/")({
  component: MyItems,
});

function MyItems() {
  const { user } = useAuth();
  const { data, refetch } = useQuery({
    queryKey: ["my-items", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id,title,category,estimated_worth_cents,city,swap_type,status,item_images(url)")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as (ItemCardData & { status: string })[];
    },
  });

  const remove = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      refetch();
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-4xl">Your items</h1>
        <Button asChild>
          <Link to="/me/items/new">Add item</Link>
        </Button>
      </div>
      {!data || data.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">You haven't listed anything yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.map((it) => (
            <div key={it.id} className="space-y-2">
              <ItemCard item={it} />
              <div className="flex gap-2 text-sm">
                <span className="px-2 py-1 rounded bg-secondary text-xs">{it.status}</span>
                <Link to="/me/items/$id/edit" params={{ id: it.id }} className="underline">
                  Edit
                </Link>
                <button onClick={() => remove(it.id)} className="text-destructive underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
