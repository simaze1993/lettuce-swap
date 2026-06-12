import { Link } from "@tanstack/react-router";
import { categoryLabel, categoryIcon, formatWorth } from "@/lib/constants";
import { MapPin } from "lucide-react";

export type ItemCardData = {
  id: string;
  title: string;
  category: string;
  estimated_worth_cents: number;
  city: string;
  swap_type: string;
  item_images?: { url: string }[] | null;
  owner?: { verified?: boolean | null; display_name?: string | null } | null;
};

export function ItemCard({ item }: { item: ItemCardData }) {
  const img = item.item_images?.[0]?.url;
  const CatIcon = categoryIcon(item.category);
  const isLoan = item.swap_type === "temporary";
  return (
    <Link to="/items/$id" params={{ id: item.id }} className="group block">
      <div className="relative aspect-[4/5] bg-secondary overflow-hidden rounded-2xl border border-border/60 shadow-sm group-hover:shadow-md transition-shadow">
        {img ? (
          <img
            src={img}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            No photo
          </div>
        )}
        {/* Bottom gradient + swap-type pill, Zalando-style */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 via-black/10 to-transparent pointer-events-none" />
        <div className="absolute top-3 left-3">
          <span className="bg-background/95 backdrop-blur-sm pl-1.5 pr-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-foreground shadow-sm inline-flex items-center gap-1">
            <CatIcon className="h-3 w-3 text-primary" strokeWidth={2} />
            {categoryLabel(item.category)}
          </span>
        </div>
        {item.owner?.verified && (
          <div className="absolute top-3 right-3">
            <span
              className="bg-background/95 backdrop-blur-sm px-2 py-1 rounded-full text-sm shadow-sm flex items-center gap-1"
              title={`Verified member${item.owner.display_name ? `: ${item.owner.display_name}` : ""}`}
              aria-label={`Listed by a verified member${item.owner.display_name ? `: ${item.owner.display_name}` : ""}`}
            >
              <span aria-hidden>🌳</span>
              <span className="sr-only">Verified member</span>
            </span>
          </div>
        )}
        <div className="absolute bottom-3 left-3">
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${
              isLoan ? "bg-background/95 text-foreground" : "bg-primary text-primary-foreground"
            }`}
          >
            {isLoan ? "Loan" : "Swap"}
          </span>
        </div>
      </div>
      <div className="pt-3">
        <h3 className="text-sm font-semibold leading-tight truncate group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">
            {formatWorth(item.estimated_worth_cents)}
          </span>
          {item.city && (
            <>
              <span className="opacity-60">·</span>
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" /> {item.city}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
