"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search, CheckCircle2, X, Send, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-provider";
import { useRegional } from "@/contexts/language-provider";
import { sendFunds, TRANSACTION_FEE_PERCENT } from "@/lib/wallet";
import { searchUsersByHandle, type UserProfile } from "@/lib/users";
import { getDoc, doc } from "firebase/firestore";
import { firestore } from "@/lib/firebase-config";

/**
 * Shared P2P transfer UI - used both by the Wallet tab's "Send" button and
 * by Messages' "Send Money" action inside a conversation, so sending money
 * to someone doesn't require leaving the chat and re-finding them by handle
 * from scratch. `initialQuery` prefills the recipient search (e.g. with the
 * chat's display name); mock conversations aren't real Moood accounts, so
 * this is a best-effort match rather than a guaranteed one.
 */
export default function SendMoneyDialog({
  open,
  onOpenChange,
  initialQuery,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
  onSent?: (recipient: UserProfile, amount: number) => void;
}) {
  const { user } = useAuth();
  const { currency } = useRegional();
  const { toast } = useToast();

  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientResults, setRecipientResults] = useState<UserProfile[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<UserProfile | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [amount, setAmount] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!user) return;
    getDoc(doc(firestore, "users", user.uid)).then((snap) => {
      if (snap.exists()) setMyProfile(snap.data() as UserProfile);
    });
  }, [user]);

  useEffect(() => {
    if (open) setRecipientQuery(initialQuery ?? "");
  }, [open, initialQuery]);

  useEffect(() => {
    if (!user || selectedRecipient || recipientQuery.trim().length < 2) {
      setRecipientResults([]);
      return;
    }
    setIsSearching(true);
    const timeout = setTimeout(() => {
      searchUsersByHandle(recipientQuery, user.uid)
        .then(setRecipientResults)
        .catch((err) => console.error("Recipient search failed:", err))
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [recipientQuery, selectedRecipient, user]);

  const calculatedFee = useMemo(() => {
    const val = parseFloat(amount);
    return isNaN(val) ? "0.00" : (val * TRANSACTION_FEE_PERCENT).toFixed(2);
  }, [amount]);

  const reset = () => {
    setRecipientQuery("");
    setSelectedRecipient(null);
    setRecipientResults([]);
    setAmount("");
  };

  const handleTransfer = () => {
    if (!user || !myProfile) return;
    const numAmount = parseFloat(amount);

    if (!selectedRecipient || isNaN(numAmount) || numAmount <= 0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Pick a recipient from the search results first." });
      return;
    }

    startTransition(async () => {
      try {
        await sendFunds(
          { uid: user.uid, handle: myProfile.handle },
          { uid: selectedRecipient.uid, handle: selectedRecipient.handle },
          numAmount
        );
        toast({ title: "Transfer Sent!", description: `Sent ${currency.symbol} ${numAmount.toFixed(2)} to @${selectedRecipient.handle}.` });
        onSent?.(selectedRecipient, numAmount);
        reset();
        onOpenChange(false);
      } catch (err) {
        toast({ variant: "destructive", title: "Transfer Failed", description: err instanceof Error ? err.message : "Please try again." });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md sm:rounded-[2rem] border-white/10 bg-zinc-950 text-white">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Send Money</DialogTitle>
          <DialogDescription className="text-zinc-400">Send Moood wallet balance to another Moood user.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs uppercase font-bold tracking-widest">Recipient</Label>
            {selectedRecipient ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={selectedRecipient.photoURL || undefined} />
                    <AvatarFallback>{selectedRecipient.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold">{selectedRecipient.displayName}</p>
                    <p className="text-[11px] text-zinc-400">@{selectedRecipient.handle}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedRecipient(null); setRecipientQuery(""); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Search by @handle"
                    className="pl-9 bg-white/5 border-white/10 h-12 rounded-xl"
                    value={recipientQuery}
                    onChange={(e) => setRecipientQuery(e.target.value)}
                  />
                  {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-zinc-500" />}
                </div>
                {recipientResults.length > 0 && (
                  <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
                    {recipientResults.map((profile) => (
                      <button
                        key={profile.uid}
                        type="button"
                        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                        onClick={() => { setSelectedRecipient(profile); setRecipientResults([]); }}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={profile.photoURL || undefined} />
                          <AvatarFallback>{profile.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold">{profile.displayName}</p>
                          <p className="text-[11px] text-zinc-400">@{profile.handle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {!isSearching && recipientQuery.trim().length >= 2 && recipientResults.length === 0 && (
                  <p className="text-[11px] text-zinc-500 px-1">No Moood users found for "@{recipientQuery}".</p>
                )}
              </>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs uppercase font-bold tracking-widest">Amount ({currency.symbol})</Label>
            <Input type="number" placeholder="0.00" className="bg-white/5 border-white/10 h-14 text-2xl font-bold rounded-xl" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex gap-3">
            <Info className="w-5 h-5 text-primary shrink-0" />
            <p className="text-[11px] leading-relaxed text-primary-foreground/80">Fee: <span className="font-bold">{currency.symbol} {calculatedFee}</span>. In-app transfer between Moood wallets, settled instantly.</p>
          </div>
        </div>
        <DialogFooter>
          <Button className="w-full h-14 text-lg font-bold rounded-xl" onClick={handleTransfer} disabled={isPending || !amount || !selectedRecipient}>
            {isPending ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />} Confirm & Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
