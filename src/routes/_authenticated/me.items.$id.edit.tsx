import { createFileRoute } from "@tanstack/react-router";
import { ItemForm } from "@/components/item-form";

export const Route = createFileRoute("/_authenticated/me/items/$id/edit")({
  component: EditItem,
});

function EditItem() {
  const { id } = Route.useParams();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-serif text-4xl mb-6">Edit item</h1>
      <ItemForm itemId={id} />
    </div>
  );
}
