"use client";

import React, { useState, useTransition, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    ArrowUpRight,
    Landmark,
    Smartphone,
    Loader2,
    Info,
    RefreshCw,
    Send,
    History,
    ArrowDownLeft,
    ArrowLeftRight,
    AlertTriangle,
    Plus,
    Search,
    CheckCircle2,
    X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useRegional } from "@/contexts/language-provider";
import { useAuth } from "@/contexts/auth-provider";
import {
    ensureWallet,
    subscribeToWallet,
    subscribeToTransactions,
    sendFunds,
    topUpFunds,
    swapAssets,
    TRANSACTION_FEE_PERCENT,
    MOOOD_TOKEN_RATE,
    type WalletTransaction,
} from "@/lib/wallet";
import { findUserByHandle, searchUsersByHandle, type UserProfile } from "@/lib/users";
import { getDoc, doc } from "firebase/firestore";
import { firestore } from "@/lib/firebase-config";

function formatTxTime(tx: WalletTransaction) {
    const date = tx.createdAt?.toDate();
    if (!date) return "Just now";
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function TransactionRow({ tx, currencySymbol }: { tx: WalletTransaction; currencySymbol: string }) {
    const isCredit = tx.type === 'topup' || tx.type === 'receive' || (tx.type === 'swap' && tx.direction === 'tokenToCash');
    const label =
        tx.type === 'send' ? `Sent to @${tx.recipient}` :
        tx.type === 'receive' ? `Received from @${tx.sender}` :
        tx.type === 'topup' ? `Top Up via ${tx.rail}` :
        tx.direction === 'cashToToken' ? 'Swapped cash for MOOOD' : 'Swapped MOOOD for cash';

    return (
        <div className="flex items-center justify-between p-3 border-b last:border-b-0 border-white/5">
            <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", isCredit ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary")}>
                    {tx.type === 'swap' ? <ArrowLeftRight className="w-4 h-4" /> : isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div>
                    <p className="text-sm font-bold">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{formatTxTime(tx)}</p>
                </div>
            </div>
            <p className={cn("text-sm font-bold", isCredit ? "text-green-500" : "text-foreground")}>
                {tx.type === 'swap'
                    ? (tx.direction === 'cashToToken' ? `-${currencySymbol}${tx.amount.toFixed(2)}` : `-${tx.amount.toFixed(2)} MOOOD`)
                    : `${isCredit ? '+' : '-'}${currencySymbol}${tx.amount.toFixed(2)}`}
            </p>
        </div>
    );
}

export default function WalletTab() {
    const { currency, region } = useRegional();
    const { user } = useAuth();
    const { toast } = useToast();

    const [balance, setBalance] = useState(0);
    const [tokenBalance, setTokenBalance] = useState(0);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [walletError, setWalletError] = useState<string | null>(null);
    const [isWalletReady, setIsWalletReady] = useState(false);

    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [isSwapOpen, setIsSwapOpen] = useState(false);

    const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
    const [recipientQuery, setRecipientQuery] = useState("");
    const [recipientResults, setRecipientResults] = useState<UserProfile[]>([]);
    const [selectedRecipient, setSelectedRecipient] = useState<UserProfile | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    const [amount, setAmount] = useState("");
    const [topUpAmount, setTopUpAmount] = useState("");
    const [swapAmount, setSwapAmount] = useState("");
    const [swapDirection, setSwapDirection] = useState<"cashToToken" | "tokenToCash">("cashToToken");

    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!user) return;
        let unsubWallet = () => {};
        let unsubTx = () => {};

        ensureWallet(user.uid)
            .then(() => {
                unsubWallet = subscribeToWallet(user.uid, (wallet) => {
                    setBalance(wallet.balance);
                    setTokenBalance(wallet.tokenBalance);
                    setIsWalletReady(true);
                });
                unsubTx = subscribeToTransactions(user.uid, setTransactions);
            })
            .catch((err) => {
                console.error(err);
                setWalletError("Couldn't load your wallet. Firestore may not be reachable or its security rules aren't deployed yet.");
            });

        getDoc(doc(firestore, "users", user.uid)).then((snap) => {
            if (snap.exists()) setMyProfile(snap.data() as UserProfile);
        });

        return () => {
            unsubWallet();
            unsubTx();
        };
    }, [user]);

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

    const regionalPaymentRails = useMemo(() => {
        const rails = [
            { name: 'Traditional Bank', icon: Landmark, detail: 'Linked Account', status: 'Synced' },
        ];

        if (region === 'KE') {
            rails.unshift({ name: 'M-Pesa', icon: Smartphone, detail: 'Safaricom Wallet', status: 'Synced' });
            rails.push({ name: 'Airtel Money', icon: Smartphone, detail: 'Not Linked', status: 'Link' });
        } else if (region === 'UG') {
            rails.unshift({ name: 'MTN Mobile Money', icon: Smartphone, detail: 'MTN Wallet', status: 'Synced' });
            rails.push({ name: 'Airtel Money', icon: Smartphone, detail: 'Not Linked', status: 'Link' });
        } else if (region === 'ZA') {
            rails.unshift({ name: 'SnapScan', icon: Smartphone, detail: 'ZAR Instant', status: 'Link' });
            rails.push({ name: 'Ozow EFT', icon: Landmark, detail: 'Direct Bank Pay', status: 'Link' });
        } else {
            rails.unshift({ name: 'Wio Bank', icon: Smartphone, detail: 'Digital UAE', status: 'Synced' });
        }

        return rails;
    }, [region]);

    const resetTransferDialog = () => {
        setIsTransferOpen(false);
        setRecipientQuery("");
        setSelectedRecipient(null);
        setRecipientResults([]);
        setAmount("");
    };

    const handleTransfer = () => {
        if (!user || !myProfile) return;
        const numAmount = parseFloat(amount);

        if (!selectedRecipient || isNaN(numAmount) || numAmount <= 0) {
            toast({ variant: 'destructive', title: "Invalid Input", description: "Pick a recipient from the search results first." });
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
                resetTransferDialog();
            } catch (err) {
                toast({ variant: 'destructive', title: "Transfer Failed", description: err instanceof Error ? err.message : "Please try again." });
            }
        });
    };

    const handleTopUp = () => {
        if (!user) return;
        const numAmount = parseFloat(topUpAmount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast({ variant: 'destructive', title: "Invalid Amount" });
            return;
        }

        startTransition(async () => {
            try {
                await topUpFunds(user.uid, numAmount, regionalPaymentRails[0].name);
                setIsTopUpOpen(false);
                setTopUpAmount("");
                toast({ title: "Top Up Successful!", description: `Added ${currency.symbol} ${numAmount.toFixed(2)} via ${regionalPaymentRails[0].name}.` });
            } catch (err) {
                toast({ variant: 'destructive', title: "Top Up Failed", description: err instanceof Error ? err.message : "Please try again." });
            }
        });
    };

    const handleSwap = () => {
        if (!user) return;
        const numAmount = parseFloat(swapAmount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast({ variant: 'destructive', title: "Invalid Amount" });
            return;
        }

        startTransition(async () => {
            try {
                await swapAssets(user.uid, swapDirection, numAmount);
                setIsSwapOpen(false);
                setSwapAmount("");
                toast({ title: "Swap Complete!" });
            } catch (err) {
                toast({ variant: 'destructive', title: "Swap Failed", description: err instanceof Error ? err.message : "Please try again." });
            }
        });
    };

    if (walletError) {
        return (
            <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-6 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-destructive">Wallet Unavailable</p>
                        <p className="text-xs text-muted-foreground mt-1">{walletError}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-primary to-indigo-800 text-white border-0 shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-3xl" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold tracking-widest uppercase opacity-70">Main Balance ({currency.code})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isWalletReady ? (
                            <div className="text-4xl font-bold font-headline tracking-tighter">{currency.symbol} {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        ) : (
                            <div className="h-10 flex items-center"><Loader2 className="w-5 h-5 animate-spin opacity-70" /></div>
                        )}
                        <p className="text-[10px] mt-2 text-white/60">P2P Transfers enabled • 0.5% Global Fee</p>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                        <Button variant="secondary" className="w-full bg-white/10 hover:bg-white/20 text-white border-0" onClick={() => setIsTransferOpen(true)} disabled={!isWalletReady}>
                            <ArrowUpRight className="w-4 h-4 mr-2" /> Send
                        </Button>
                        <Button variant="secondary" className="w-full bg-white/10 hover:bg-white/20 text-white border-0" onClick={() => setIsTopUpOpen(true)} disabled={!isWalletReady}>
                            <Plus className="w-4 h-4 mr-2" /> Top Up
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="bg-zinc-950 text-white border-amber-400/20 shadow-xl border-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold tracking-widest uppercase text-amber-400">Tokens & Rewards</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isWalletReady ? (
                            <div className="text-4xl font-bold font-headline tracking-tighter text-amber-400">{tokenBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-sm font-body">MOOOD</span></div>
                        ) : (
                            <div className="h-10 flex items-center"><Loader2 className="w-5 h-5 animate-spin text-amber-400/70" /></div>
                        )}
                        <p className="text-[10px] mt-2 text-zinc-500">1 MOOOD = {currency.symbol} {MOOOD_TOKEN_RATE.toFixed(2)}</p>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" className="w-full border-amber-400/30 text-amber-400 hover:bg-amber-400/10" onClick={() => setIsSwapOpen(true)} disabled={!isWalletReady}>
                            <RefreshCw className="w-4 h-4 mr-2" /> Swap Assets
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            <Card className="border-white/10 bg-card/50">
                <CardHeader>
                    <CardTitle className="text-lg font-headline flex items-center gap-2"><Landmark className="w-5 h-5"/> Regional Payment Sync</CardTitle>
                    <CardDescription className="text-xs">Connecting to local mobile money and banking infrastructure.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {regionalPaymentRails.map(item => (
                        <div key={item.name} className="flex items-center justify-between p-4 border rounded-xl bg-background/50">
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary"><item.icon className="w-5 h-5" /></div>
                                <div><p className="font-bold text-sm">{item.name}</p><p className="text-[10px] text-muted-foreground">{item.detail}</p></div>
                            </div>
                            <Button variant={item.status === 'Synced' ? 'secondary' : 'outline'} size="sm" className="h-8 text-xs">{item.status}</Button>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card className="border-white/10 bg-card/50">
                <CardHeader>
                    <CardTitle className="text-lg font-headline flex items-center gap-2"><History className="w-5 h-5"/> Transaction History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {transactions.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-4 text-center">No transactions yet.</p>
                    ) : (
                        transactions.map(tx => <TransactionRow key={tx.id} tx={tx} currencySymbol={currency.symbol} />)
                    )}
                </CardContent>
            </Card>

            <Dialog open={isTransferOpen} onOpenChange={(open) => open ? setIsTransferOpen(true) : resetTransferDialog()}>
                <DialogContent className="max-w-md sm:rounded-[2rem] border-white/10 bg-zinc-950 text-white">
                    <DialogHeader>
                        <DialogTitle className="font-headline text-2xl">Transfer Funds</DialogTitle>
                        <DialogDescription className="text-zinc-400">Send MOOOD wallet balance to another Moood user.</DialogDescription>
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
                                            onChange={e => setRecipientQuery(e.target.value)}
                                        />
                                        {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-zinc-500" />}
                                    </div>
                                    {recipientResults.length > 0 && (
                                        <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
                                            {recipientResults.map(profile => (
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
                            <Input type="number" placeholder="0.00" className="bg-white/5 border-white/10 h-14 text-2xl font-bold rounded-xl" value={amount} onChange={e => setAmount(e.target.value)} />
                        </div>
                        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex gap-3">
                            <Info className="w-5 h-5 text-primary shrink-0" />
                            <p className="text-[11px] leading-relaxed text-primary-foreground/80">Fee: <span className="font-bold">{currency.symbol} {calculatedFee}</span>. In-app transfer between Moood wallets, settled instantly.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button className="w-full h-14 text-lg font-bold rounded-xl" onClick={handleTransfer} disabled={isPending || !amount || !selectedRecipient}>
                            {isPending ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2"/>} Confirm & Send
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
                <DialogContent className="max-w-md sm:rounded-[2rem] border-white/10 bg-zinc-950 text-white">
                    <DialogHeader>
                        <DialogTitle className="font-headline text-2xl">Top Up Balance</DialogTitle>
                        <DialogDescription className="text-zinc-400">Add funds via {regionalPaymentRails[0].name}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-6">
                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase font-bold tracking-widest">Amount ({currency.symbol})</Label>
                            <Input type="number" placeholder="0.00" className="bg-white/5 border-white/10 h-14 text-2xl font-bold rounded-xl" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button className="w-full h-14 text-lg font-bold rounded-xl" onClick={handleTopUp} disabled={isPending || !topUpAmount}>
                            {isPending ? <Loader2 className="animate-spin mr-2"/> : <ArrowDownLeft className="mr-2"/>} Confirm Top Up
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isSwapOpen} onOpenChange={setIsSwapOpen}>
                <DialogContent className="max-w-md sm:rounded-[2rem] border-white/10 bg-zinc-950 text-white">
                    <DialogHeader>
                        <DialogTitle className="font-headline text-2xl">Swap Assets</DialogTitle>
                        <DialogDescription className="text-zinc-400">Exchange between cash and MOOOD tokens at a fixed rate of 1 MOOOD = {currency.symbol} {MOOOD_TOKEN_RATE.toFixed(2)}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-6">
                        <div className="grid grid-cols-2 gap-2">
                            <Button variant={swapDirection === 'cashToToken' ? 'default' : 'outline'} className="h-12 rounded-xl" onClick={() => setSwapDirection('cashToToken')}>
                                {currency.code} → MOOOD
                            </Button>
                            <Button variant={swapDirection === 'tokenToCash' ? 'default' : 'outline'} className="h-12 rounded-xl" onClick={() => setSwapDirection('tokenToCash')}>
                                MOOOD → {currency.code}
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase font-bold tracking-widest">
                                Amount ({swapDirection === 'cashToToken' ? currency.symbol : 'MOOOD'})
                            </Label>
                            <Input type="number" placeholder="0.00" className="bg-white/5 border-white/10 h-14 text-2xl font-bold rounded-xl" value={swapAmount} onChange={e => setSwapAmount(e.target.value)} />
                        </div>
                        {!!parseFloat(swapAmount) && (
                            <p className="text-xs text-zinc-400">
                                You'll receive{' '}
                                <span className="font-bold text-white">
                                    {swapDirection === 'cashToToken'
                                        ? `${(parseFloat(swapAmount) / MOOOD_TOKEN_RATE).toFixed(2)} MOOOD`
                                        : `${currency.symbol} ${(parseFloat(swapAmount) * MOOOD_TOKEN_RATE).toFixed(2)}`}
                                </span>
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button className="w-full h-14 text-lg font-bold rounded-xl" onClick={handleSwap} disabled={isPending || !swapAmount}>
                            {isPending ? <Loader2 className="animate-spin mr-2"/> : <ArrowLeftRight className="mr-2"/>} Confirm Swap
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
