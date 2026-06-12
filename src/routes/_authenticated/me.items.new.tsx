import { createFileRoute } from "@tanstack/react-router";
import { ItemForm } from "@/components/item-form";

export const Route = createFileRoute("/_authenticated/me/items/new")({
  component: NewItem,
});

function NewItem() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-serif text-4xl mb-6">List a new item</h1>
      <ItemForm />
    </div>
  );
}
