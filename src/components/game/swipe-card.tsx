import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Heart, X, MapPin } from "lucide-react";
import { categoryLabel, categoryIcon, formatWorth } from "@/lib/constants";

export type GameCandidate = {
  id: string;
  title: string;
  category: string;
  city: string;
  estimated_worth_cents: number;
  swap_type: string;
  item_images?: { url: string }[] | null;
  owner?: { display_name?: string | null; verified?: boolean | null } | null;
};

type Props = {
  item: GameCandidate;
  onDecision: (direction: "like" | "skip") => void;
  isTop: boolean;
  offset?: number;
};

const SWIPE_THRESHOLD = 120;

export function SwipeCard({ item, onDecision, isTop, offset = 0 }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
  const likeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const skipOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const img = item.item_images?.[0]?.url;
  const CatIcon = categoryIcon(item.category);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) onDecision("like");
    else if (info.offset.x < -SWIPE_THRESHOLD) onDecision("skip");
  };

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        zIndex: 10 - offset,
        scale: 1 - offset * 0.04,
        y: offset * 12,
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
    >
      <div className="relative w-full h-full rounded-3xl overflow-hidden bg-secondary border border-border shadow-2xl select-none">
        {img ? (
          <img
            src={img}
            alt={item.title}
            draggable={false}
            className="w-full h-full object-cover pointer-events-none"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No photo
          </div>
        )}

        {/* Like / Skip overlays */}
        {isTop && (
          <>
            <motion.div
              style={{ opacity: likeOpacity }}
              className="absolute top-8 left-8 px-4 py-2 rounded-xl border-4 border-primary text-primary font-black text-2xl uppercase tracking-wider rotate-[-12deg] bg-background/80 backdrop-blur-sm"
            >
              Like
            </motion.div>
            <motion.div
              style={{ opacity: skipOpacity }}
              className="absolute top-8 right-8 px-4 py-2 rounded-xl border-4 border-destructive text-destructive font-black text-2xl uppercase tracking-wider rotate-[12deg] bg-background/80 backdrop-blur-sm"
            >
              Skip
            </motion.div>
          </>
        )}

        {/* Top chip */}
        <div className="absolute top-4 left-4">
          <span className="bg-background/95 backdrop-blur-sm pl-1.5 pr-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 shadow-sm">
            <CatIcon className="h-3 w-3 text-primary" strokeWidth={2} />
            {categoryLabel(item.category)}
          </span>
        </div>

        {/* Info */}
        <div className="absolute inset-x-0 bottom-0 p-6 pt-20 bg-gradient-to-t from-black/85 via-black/40 to-transparent text-white pointer-events-none">
          <h3 className="font-serif text-2xl leading-tight">{item.title}</h3>
          <div className="mt-2 flex items-center gap-3 text-xs text-white/85 flex-wrap">
            <span className="font-semibold">{formatWorth(item.estimated_worth_cents)}</span>
            {item.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {item.city}
              </span>
            )}
            {item.owner?.display_name && (
              <span className="truncate">
                by {item.owner.display_name}
                {item.owner.verified ? " 🌳" : ""}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function DecisionButtons({
  onSkip,
  onLike,
  disabled,
}: {
  onSkip: () => void;
  onLike: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-6">
      <button
        onClick={onSkip}
        disabled={disabled}
        aria-label="Skip"
        className="h-16 w-16 rounded-full bg-background border-2 border-border shadow-lg flex items-center justify-center hover:border-destructive hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
      >
        <X className="h-7 w-7 text-destructive" strokeWidth={2.5} />
      </button>
      <button
        onClick={onLike}
        disabled={disabled}
        aria-label="Like"
        className="h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
      >
        <Heart className="h-7 w-7" strokeWidth={2.5} fill="currentColor" />
      </button>
    </div>
  );
}
