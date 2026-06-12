import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CATEGORIES, type CategoryValue } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { X } from "lucide-react";

type Props = { itemId?: string };

export function ItemForm({ itemId }: Props) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "house_garden" as CategoryValue,
    estimated_worth: "",
    swap_type: "definitive" as "definitive" | "temporary",
    wanted_categories: [] as CategoryValue[],
    city: "",
  });
  const [images, setImages] = useState<{ id?: string; url: string; file?: File }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    (async () => {
      const { data } = await supabase
        .from("items")
        .select("*, item_images(id, url, sort_order)")
        .eq("id", itemId)
        .maybeSingle();
      if (!data) return;
      setForm({
        title: data.title,
        description: data.description ?? "",
        category: data.category,
        estimated_worth: ((data.estimated_worth_cents ?? 0) / 100).toString(),
        swap_type: data.swap_type,
        wanted_categories: data.wanted_categories ?? [],
        city: data.city ?? "",
      });
      setImages(
        (data.item_images ?? []).sort(
          (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order,
        ),
      );
    })();
  }, [itemId]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const arr = Array.from(files).slice(0, 6 - images.length);
    const valid = arr.filter((f) => {
      if (!ALLOWED.includes(f.type)) {
        toast.error(`"${f.name}" rejected — only JPEG, PNG, GIF or WebP allowed`);
        return false;
      }
      return true;
    });
    setImages([...images, ...valid.map((f) => ({ url: URL.createObjectURL(f), file: f }))]);
  };

  const removeImage = async (idx: number) => {
    const img = images[idx];
    if (img.id) {
      await supabase.from("item_images").delete().eq("id", img.id);
    }
    setImages(images.filter((_, i) => i !== idx));
  };

  const toggleWanted = (v: CategoryValue) => {
    setForm({
      ...form,
      wanted_categories: form.wanted_categories.includes(v)
        ? form.wanted_categories.filter((c) => c !== v)
        : [...form.wanted_categories, v],
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title required");
      return;
    }
    setBusy(true);

    const payload = {
      owner_id: user!.id,
      title: form.title.trim(),
      description: form.description,
      category: form.category,
      estimated_worth_cents: Math.round((parseFloat(form.estimated_worth) || 0) * 100),
      swap_type: form.swap_type,
      wanted_categories: form.wanted_categories,
      city: form.city,
    };

    let id = itemId;
    if (itemId) {
      const { error } = await supabase.from("items").update(payload).eq("id", itemId);
      if (error) {
        toast.error(error.message);
        setBusy(false);
        return;
      }
    } else {
      const { data, error } = await supabase.from("items").insert(payload).select("id").single();
      if (error) {
        toast.error(error.message);
        setBusy(false);
        return;
      }
      id = data.id;
    }

    // upload new images
    const newOnes = images.filter((i) => i.file);
    const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
    };
    for (let i = 0; i < newOnes.length; i++) {
      const img = newOnes[i];
      if (!ALLOWED.includes(img.file!.type)) {
        toast.error(`Skipped invalid file type: ${img.file!.type}`);
        continue;
      }
      const ext = extMap[img.file!.type];
      const path = `${user!.id}/${id}/${Date.now()}-${i}.${ext}`;
      const up = await supabase.storage
        .from("item-images")
        .upload(path, img.file!, { upsert: false, contentType: img.file!.type });
      if (up.error) {
        toast.error(up.error.message);
        continue;
      }
      const { data: pub } = supabase.storage.from("item-images").getPublicUrl(path);
      await supabase
        .from("item_images")
        .insert({ item_id: id!, url: pub.publicUrl, sort_order: images.indexOf(img) });
    }

    setBusy(false);
    toast.success(itemId ? "Saved" : "Listed!");
    nav({ to: "/items/$id", params: { id: id! } });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          required
          maxLength={120}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          rows={4}
          maxLength={1000}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={form.category}
            onValueChange={(v) => setForm({ ...form, category: v as CategoryValue })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Estimated worth ($)</Label>
          <Input
            type="number"
            min="0"
            step="1"
            value={form.estimated_worth}
            onChange={(e) => setForm({ ...form, estimated_worth: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Swap type</Label>
          <Select
            value={form.swap_type}
            onValueChange={(v) => setForm({ ...form, swap_type: v as "definitive" | "temporary" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="definitive">Definitive swap</SelectItem>
              <SelectItem value="temporary">Temporary loan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            maxLength={100}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Interested in (optional)</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <label key={c.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.wanted_categories.includes(c.value)}
                  onCheckedChange={() => toggleWanted(c.value)}
                />
                <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
                {c.label}
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Photos (up to 6)</Label>
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, i) => (
            <div
              key={i}
              className="relative aspect-square rounded-lg overflow-hidden border border-border"
            >
              <img src={img.url} className="w-full h-full object-cover" alt="" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 bg-background/90 rounded-full p-1"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {images.length < 6 && (
            <label className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center text-sm text-muted-foreground cursor-pointer hover:bg-secondary">
              + Add
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </label>
          )}
        </div>
      </div>

      <Button type="submit" disabled={busy} size="lg">
        {busy ? "Saving…" : itemId ? "Save changes" : "Publish item"}
      </Button>
    </form>
  );
}
