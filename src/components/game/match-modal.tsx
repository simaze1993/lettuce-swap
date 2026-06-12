import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

type ItemPreview = {
  id: string;
  title: string;
  item_images?: { url: string }[] | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  myItem: ItemPreview | null;
  theirItem: ItemPreview | null;
  offerId: string | null;
};

export function MatchModal({ open, onOpenChange, myItem, theirItem, offerId }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md text-center border-primary/40 bg-gradient-to-b from-primary/10 to-background">
        <DialogTitle className="sr-only">It's a match</DialogTitle>
        <DialogDescription className="sr-only">
          You and another user both liked each other's items. A chat has been opened.
        </DialogDescription>

        <div className="pt-2 pb-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider mb-3">
            <Sparkles className="h-3 w-3" /> Match
          </div>
          <h2 className="font-serif text-4xl mb-2 animate-fade-in">It's a match!</h2>
          <p className="text-sm text-muted-foreground">You and the owner both want to swap.</p>
        </div>

        <div className="flex items-center justify-center gap-3 my-4">
          <ItemThumb item={myItem} label="You" />
          <div className="text-3xl">🤝</div>
          <ItemThumb item={theirItem} label="Them" />
        </div>

        <div className="flex flex-col gap-2">
          {offerId && (
            <Button asChild size="lg" className="rounded-full">
              <Link to="/chat/$offerId" params={{ offerId }}>
                Start chatting
              </Link>
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full">
            Keep playing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ItemThumb({ item, label }: { item: ItemPreview | null; label: string }) {
  const img = item?.item_images?.[0]?.url;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="h-24 w-24 rounded-2xl overflow-hidden bg-secondary border-2 border-primary/40 shadow-md animate-scale-in">
        {img ? (
          <img src={img} alt={item?.title ?? label} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
            No photo
          </div>
        )}
      </div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </span>
    </div>
  );
}
