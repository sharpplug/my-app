"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, ShoppingBag, Ticket, Home } from "lucide-react";
import { subscribeToProducts, type Product } from "@/lib/products";
import { mockServiceItems, mockEvents } from "@/lib/catalog-data";
import { stays } from "@/components/stays-marketplace";

/**
 * A single search box across Shop, Links (Events + Stays) - the three
 * verticals with a browsable catalog. Vibes posts are left out: they're
 * live Firestore data with no full-text index (Firestore can't do
 * substring search server-side), so a real cross-vertical match there
 * would need a search service like Algolia/Typesense rather than a
 * client-side filter over a capped feed.
 */
export default function GlobalSearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!open) return;
    return subscribeToProducts(setProducts);
  }, [open]);

  useEffect(() => {
    if (!open) setTerm("");
  }, [open]);

  const results = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (q.length < 2) return { shop: [], events: [], stays: [] };

    const shop = [
      ...products.filter((p) => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)).map((p) => ({ title: p.title, sub: `${p.category} • by @${p.ownerHandle}` })),
      ...mockServiceItems.filter((i) => i.title.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)).map((i) => ({ title: i.title, sub: i.category })),
    ].slice(0, 5);

    const events = mockEvents
      .filter((e) => e.title.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || e.location.toLowerCase().includes(q))
      .map((e) => ({ title: e.title, sub: e.location }))
      .slice(0, 5);

    const staysResults = stays
      .filter((s) => s.title.toLowerCase().includes(q) || s.location.toLowerCase().includes(q) || s.type.toLowerCase().includes(q))
      .map((s) => ({ title: s.title, sub: s.location }))
      .slice(0, 5);

    return { shop, events, stays: staysResults };
  }, [term, products]);

  const hasAnyResults = results.shop.length > 0 || results.events.length > 0 || results.stays.length > 0;

  const goTo = (path: string) => {
    router.push(path);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:rounded-[2rem] max-w-lg">
        <DialogHeader>
          <DialogTitle>Search Moood</DialogTitle>
          <DialogDescription>Find products, events, and stays in one place.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input autoFocus placeholder="Search everything..." className="pl-9" value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>

        {term.trim().length >= 2 && (
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {!hasAnyResults ? (
              <p className="text-sm text-muted-foreground text-center py-8">No matches for "{term}".</p>
            ) : (
              <>
                {results.shop.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5"><ShoppingBag className="w-3 h-3" /> Shop</p>
                    {results.shop.map((r) => (
                      <button key={r.title} className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors" onClick={() => goTo(`/shop?q=${encodeURIComponent(r.title)}`)}>
                        <p className="text-sm font-bold">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.sub}</p>
                      </button>
                    ))}
                  </div>
                )}
                {results.events.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5"><Ticket className="w-3 h-3" /> Events</p>
                    {results.events.map((r) => (
                      <button key={r.title} className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors" onClick={() => goTo(`/events?q=${encodeURIComponent(r.title)}`)}>
                        <p className="text-sm font-bold">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.sub}</p>
                      </button>
                    ))}
                  </div>
                )}
                {results.stays.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5"><Home className="w-3 h-3" /> Stays</p>
                    {results.stays.map((r) => (
                      <button key={r.title} className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors" onClick={() => goTo(`/events?tab=stays&q=${encodeURIComponent(r.title)}`)}>
                        <p className="text-sm font-bold">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.sub}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
