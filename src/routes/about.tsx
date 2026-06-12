import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, UserPlus, Recycle, MessageCircle, Star, ListPlus } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "What is Lettuce Swap? — Swapping is the New Shopping" },
      {
        name: "description",
        content:
          "Learn how Lettuce Swap helps you swap clothes, books, plants, electronics and more with your community — sustainably and for free.",
      },
      { property: "og:title", content: "What is Lettuce Swap? — Swapping is the New Shopping" },
      {
        property: "og:description",
        content:
          "Learn how Lettuce Swap helps you swap clothes, books, plants, electronics and more with your community — sustainably and for free.",
      },
      { property: "og:type", content: "website" },
      // Re-add og:url and a canonical link (absolute URLs) once the app has
      // its production domain.
    ],
  }),
});

const faqs = [
  {
    question: "How does swapping work?",
    answer:
      "You list items you no longer need, browse what others have posted, and make an offer. If the other person accepts, you arrange a time and place to exchange the items directly — no money changes hands.",
  },
  {
    question: "How do offers and chat work?",
    answer:
      "When you find something you like, send an offer through the item page. The owner gets notified and can accept, decline, or counter. Once an offer is accepted, a chat opens so you can agree on pickup details or ask questions.",
  },
  {
    question: "What are Lettuce Leaves 🥬?",
    answer:
      "Leaves are Lettuce Swap's own credits. When you have nothing the other member wants, offer Leaves for their item instead — they can spend those Leaves later on something they love. You earn Leaves by joining, inviting friends, completing swaps, and helping the community grow. Leaves only have value inside the app.",
  },
  {
    question: "Can I buy Leaves, or turn them into money?",
    answer:
      "Not yet, and never, respectively. Buying Leaves with money may arrive in a later version. Converting Leaves into money will never be possible — Leaves exist to make swapping more flexible, not to be a useable currency outside the app.",
  },
  {
    question: "How do reviews work?",
    answer:
      "After a swap is completed, both traders can leave a review. Reviews build trust in the community and help others choose reliable swap partners. You can see a user's rating on their profile before making an offer.",
  },
  {
    question: "Is Lettuce Swap really free?",
    answer:
      "Yes. There are no fees, no commissions, no subscriptions. We believe swapping should be as effortless as it is sustainable.",
  },
  {
    question: "How is my location used?",
    answer:
      "We only show your city to other members. Your precise address, postcode and coordinates stay private and are never exposed publicly.",
  },
];

const steps = [
  { icon: ListPlus, title: "List", text: "Snap a few photos of what you no longer need." },
  { icon: Search, title: "Discover", text: "Browse fresh listings from people in your area." },
  {
    icon: MessageCircle,
    title: "Offer",
    text: "Make a swap proposal and chat to agree the details.",
  },
  { icon: Recycle, title: "Swap", text: "Meet up, exchange, and give your things a new life." },
];

function AboutPage() {
  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-3">
          <Link
            to="/home"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </Button>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] uppercase tracking-[0.14em] font-semibold text-accent-foreground mb-5">
          <Recycle className="h-3 w-3" /> Sustainable by design
        </span>

        <h1 className="font-serif text-4xl md:text-6xl text-foreground mb-6 leading-[1.02] tracking-tight">
          <span className="text-primary">Swapping</span> is the new Shopping!
        </h1>

        <div className="mt-8 space-y-12">
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Swap clothes, books, plants, decorations, electronics and almost anything you want with
            a community of people who, like you, choose to live in a more sustainable way. Whether
            you're craving a new outfit, a fresh look for your home, or simply a change of scenery —
            discover items that are new to you, without spending money and without creating waste.
          </p>

          <div className="surface-card p-8 md:p-10">
            <p className="font-serif text-xl md:text-2xl text-foreground leading-snug">
              Tired of your favourite jumper?{" "}
              <span className="text-primary">Swap it with something new for a while</span>, enjoy
              it, and then come back to it — or fall in love with the new.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-8">How it works</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="surface-card p-5 relative">
                    <span className="absolute top-4 right-4 text-xs font-bold text-muted-foreground">
                      0{i + 1}
                    </span>
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-snug">{s.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-3">
              Lettuce Leaves <span aria-hidden>🥬</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Sometimes a swap doesn't match: you love someone's record player, but they don't want
              anything from your list. That's what Leaves fix — our app-only credits that keep swaps
              moving when items don't line up.
            </p>
            <div className="surface-card p-6 md:p-8 space-y-4">
              <p className="text-sm uppercase tracking-[0.14em] font-semibold text-muted-foreground">
                How it plays out
              </p>
              <ol className="space-y-3 text-[15px] leading-relaxed text-foreground">
                <li className="flex gap-3">
                  <span aria-hidden>😍</span>
                  <span>
                    <strong>Anna</strong> wants <strong>Boris</strong>'s record player and offers
                    items from her list — but Boris doesn't like any of them.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span aria-hidden>🥬</span>
                  <span>
                    Instead of giving up, Anna offers <strong>100 Leaves</strong>. She picks the
                    amount herself — owners never put a price on their items.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span aria-hidden>🤝</span>
                  <span>
                    Boris accepts: the Leaves move from Anna to Boris, and the record player finds a
                    new home. Boris spends his Leaves later on something <em>he</em> loves.
                  </span>
                </li>
              </ol>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="surface-card p-5">
                <p className="font-semibold text-foreground mb-1">
                  Earn them, don't buy them <span aria-hidden>🌱</span>
                </p>
                <p className="text-sm text-muted-foreground leading-snug">
                  You get Leaves for joining, inviting friends, completing swaps, building and
                  managing communities, and promoting the app. Buying Leaves isn't possible for now
                  — and turning Leaves into money never will be.
                </p>
              </div>
              <div className="surface-card p-5">
                <p className="font-semibold text-foreground mb-1">
                  In-app value only <span aria-hidden>🔒</span>
                </p>
                <p className="text-sm text-muted-foreground leading-snug">
                  Leaves are not money and never convert to it. They exist for one reason: making
                  more swaps happen between people whose items don't perfectly match.
                </p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="text-center surface-card p-6">
              <Star className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-3xl font-serif text-foreground">0€</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                Fees, ever
              </p>
            </div>
            <div className="text-center surface-card p-6">
              <Recycle className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-3xl font-serif text-foreground">∞</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                Second lives
              </p>
            </div>
            <div className="text-center surface-card p-6">
              <UserPlus className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-3xl font-serif text-foreground">1</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                Friendly community
              </p>
            </div>
          </div>

          <p className="font-serif text-3xl md:text-5xl text-foreground text-center leading-[1.05] tracking-tight py-4">
            Need a change?
            <span className="block mt-2">
              <span className="text-primary">Swap</span> the old. Feel the new.
            </span>
            <span className="block mt-2">Sustainably. For free.</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button asChild size="lg" className="rounded-full px-8">
              <Link to="/signup">
                <UserPlus className="h-4 w-4" /> Join the community
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-8">
              <Link to="/browse">
                <Search className="h-4 w-4" /> Browse items
              </Link>
            </Button>
          </div>

          <div className="pt-6">
            <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-6">
              Frequently asked questions
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-b border-border">
                  <AccordionTrigger className="text-base font-semibold text-left hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed text-[15px]">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  );
}
