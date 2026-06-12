import {
  Home as HomeIcon,
  Shirt,
  Sparkles,
  Smartphone,
  PawPrint,
  Baby,
  Bike,
  Palette,
  Music,
  BookOpen,
  Box,
  type LucideIcon,
} from "lucide-react";

export const CATEGORIES = [
  { value: "house_garden", label: "House & Garden", icon: HomeIcon },
  { value: "clothing", label: "Clothing", icon: Shirt },
  { value: "beauty", label: "Beauty & Accessories", icon: Sparkles },
  { value: "electronics", label: "Electronics", icon: Smartphone },
  { value: "animals", label: "Animals", icon: PawPrint },
  { value: "children", label: "Children", icon: Baby },
  { value: "activities", label: "Activities & Hobbies", icon: Bike },
  { value: "art_design", label: "Art & Design", icon: Palette },
  { value: "music_movies", label: "Music & Movies", icon: Music },
  { value: "books", label: "Books", icon: BookOpen },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

// Map any legacy DB values (pre-migration) to the new categories so old data
// or cached values never break the UI.
const LEGACY_CATEGORY_MAP: Record<string, CategoryValue> = {
  home: "house_garden",
  plants: "house_garden",
  garden: "house_garden",
  toys: "children",
  sports: "activities",
  art: "art_design",
  design: "art_design",
  vinyl: "music_movies",
  instruments: "music_movies",
  music: "music_movies",
  movies: "music_movies",
  other: "house_garden",
};

export const normalizeCategory = (v: string | null | undefined): CategoryValue => {
  if (!v) return "house_garden";
  if (CATEGORIES.some((c) => c.value === v)) return v as CategoryValue;
  return LEGACY_CATEGORY_MAP[v] ?? "house_garden";
};

export const categoryLabel = (v: string) =>
  CATEGORIES.find((c) => c.value === normalizeCategory(v))?.label ?? v;

export const categoryIcon = (v: string): LucideIcon =>
  CATEGORIES.find((c) => c.value === normalizeCategory(v))?.icon ?? Box;

export const formatWorth = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
