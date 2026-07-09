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
    RefreshCw,
    History,
    ArrowDownLeft,
    ArrowLeftRight,
    AlertTriangle,
    Plus,
    CreditCard,
    Banknote,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    initiateTopUp,
    simulateTopUpConfirmation,
    initiateWithdrawal,
    simulateWithdrawalConfirmation,
    swapAssets,
    MOOOD_TOKEN_RATE,
    type WalletTransaction,
    type TopUpMethod,
} from "@/lib/wallet";
import SendMoneyDialog from "@/components/send-money-dialog";

function formatTxTime(tx: WalletTransaction) {
    const date = tx.createdAt?.toDate();
    if (!date) return "Just now";
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function TransactionRow({ tx, currencySymbol }: { tx: WalletTransaction; currencySymbol: string }) {
    const isCredit = tx.type === 'topup' || tx.type === 'receive' || tx.type === 'gift-received' || tx.type === 'sale' || (tx.type === 'swap' && tx.direction === 'tokenToCash');
    const label =
        tx.type === 'send' ? `Sent to @${tx.recipient}` :
        tx.type === 'receive' ? `Received from @${tx.sender}` :
        tx.type === 'topup' ? `Top Up via ${tx.rail}` :
        tx.type === 'withdrawal' ? `Withdrew to ${tx.rail}` :
        tx.type === 'gift-sent' ? `Sent ${tx.giftName} to @${tx.recipient}` :
        tx.type === 'gift-received' ? `${tx.giftName} from @${tx.sender}` :
        tx.type === 'purchase' ? `Purchased ${tx.item}` :
        tx.type === 'sale' ? `Sold ${tx.item}` :
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
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [isSwapOpen, setIsSwapOpen] = useState(false);

    const [topUpAmount, setTopUpAmount] = useState("");
    const [selectedRail, setSelectedRail] = useState("");
    const [topUpPhone, setTopUpPhone] = useState("");
    const [topUpStage, setTopUpStage] = useState<"form" | "confirming">("form");
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [selectedWithdrawRail, setSelectedWithdrawRail] = useState("");
    const [withdrawPhone, setWithdrawPhone] = useState("");
    const [withdrawStage, setWithdrawStage] = useState<"form" | "confirming">("form");
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

        return () => {
            unsubWallet();
            unsubTx();
        };
    }, [user]);

    // One rail list per region so top-ups can pull in outside money from
    // whichever local fintech apps are actually relevant there, plus a card
    // option available everywhere. `method` drives what initiateTopUp needs
    // (e.g. mobile money rails require a phone number) - see
    // functions/src/index.ts's RAIL_METHODS for the server-side mirror.
    const regionalPaymentRails = useMemo(() => {
        const card = { name: 'Debit / Credit Card', method: 'card' as TopUpMethod, icon: CreditCard, detail: 'Visa, Mastercard, Amex', status: 'Link' };
        const bank = { name: 'Traditional Bank', method: 'bank' as TopUpMethod, icon: Landmark, detail: 'Linked Account', status: 'Synced' };

        if (region === 'KE') {
            return [
                { name: 'M-Pesa', method: 'mobile_money' as TopUpMethod, icon: Smartphone, detail: 'Safaricom Wallet', status: 'Synced' },
                { name: 'Airtel Money', method: 'mobile_money' as TopUpMethod, icon: Smartphone, detail: 'Not Linked', status: 'Link' },
                card, bank,
            ];
        }
        if (region === 'UG') {
            return [
                { name: 'MTN Mobile Money', method: 'mobile_money' as TopUpMethod, icon: Smartphone, detail: 'MTN Wallet', status: 'Synced' },
                { name: 'Airtel Money', method: 'mobile_money' as TopUpMethod, icon: Smartphone, detail: 'Not Linked', status: 'Link' },
                card, bank,
            ];
        }
        if (region === 'ZA') {
            return [
                { name: 'SnapScan', method: 'mobile_money' as TopUpMethod, icon: Smartphone, detail: 'ZAR Instant', status: 'Link' },
                { name: 'Ozow EFT', method: 'bank' as TopUpMethod, icon: Landmark, detail: 'Direct Bank Pay', status: 'Link' },
                card, bank,
            ];
        }
        // AE (default)
        return [
            { name: 'Wio Bank', method: 'bank' as TopUpMethod, icon: Smartphone, detail: 'Digital UAE', status: 'Synced' },
            card, bank,
        ];
    }, [region]);

    const selectedRailInfo = useMemo(
        () => regionalPaymentRails.find(r => r.name === selectedRail) ?? regionalPaymentRails[0],
        [regionalPaymentRails, selectedRail]
    );

    const selectedWithdrawRailInfo = useMemo(
        () => regionalPaymentRails.find(r => r.name === selectedWithdrawRail) ?? regionalPaymentRails[0],
        [regionalPaymentRails, selectedWithdrawRail]
    );

    const openTopUp = () => {
        setSelectedRail(regionalPaymentRails[0].name);
        setTopUpPhone("");
        setTopUpAmount("");
        setTopUpStage("form");
        setIsTopUpOpen(true);
    };

    const openWithdraw = () => {
        setSelectedWithdrawRail(regionalPaymentRails[0].name);
        setWithdrawPhone("");
        setWithdrawAmount("");
        setWithdrawStage("form");
        setIsWithdrawOpen(true);
    };

    const handleTopUp = () => {
        if (!user) return;
        const numAmount = parseFloat(topUpAmount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast({ variant: 'destructive', title: "Invalid Amount" });
            return;
        }
        if (selectedRailInfo.method === 'mobile_money' && topUpPhone.trim().length < 7) {
            toast({ variant: 'destructive', title: "Phone Number Required", description: `Enter the number linked to your ${selectedRailInfo.name} account.` });
            return;
        }

        startTransition(async () => {
            try {
                const { intentId } = await initiateTopUp(
                    user.uid,
                    numAmount,
                    selectedRailInfo.name,
                    selectedRailInfo.method === 'mobile_money' ? topUpPhone : undefined
                );
                setTopUpStage("confirming");

                // Demo stand-in: no live payment aggregator account exists yet
                // (see functions/src/index.ts), so there's no real webhook to
                // wait on. This simulates the provider confirming the charge
                // after the user "approves" it, so the flow can be demoed
                // end-to-end. Swap for a real redirect/poll once a live
                // provider is wired to topUpWebhook.
                await new Promise((resolve) => setTimeout(resolve, 700));
                await simulateTopUpConfirmation(intentId);

                setIsTopUpOpen(false);
                setTopUpStage("form");
                setTopUpAmount("");
                setTopUpPhone("");
                toast({ title: "Top Up Successful!", description: `Added ${currency.symbol} ${numAmount.toFixed(2)} via ${selectedRailInfo.name}.` });
            } catch (err) {
                setTopUpStage("form");
                toast({ variant: 'destructive', title: "Top Up Failed", description: err instanceof Error ? err.message : "Please try again." });
            }
        });
    };

    const handleWithdraw = () => {
        if (!user) return;
        const numAmount = parseFloat(withdrawAmount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast({ variant: 'destructive', title: "Invalid Amount" });
            return;
        }
        if (numAmount > balance) {
            toast({ variant: 'destructive', title: "Insufficient Funds", description: `Your balance is ${currency.symbol} ${balance.toFixed(2)}.` });
            return;
        }
        if (selectedWithdrawRailInfo.method === 'mobile_money' && withdrawPhone.trim().length < 7) {
            toast({ variant: 'destructive', title: "Phone Number Required", description: `Enter the number linked to your ${selectedWithdrawRailInfo.name} account.` });
            return;
        }

        startTransition(async () => {
            try {
                const { intentId } = await initiateWithdrawal(
                    numAmount,
                    selectedWithdrawRailInfo.name,
                    selectedWithdrawRailInfo.method === 'mobile_money' ? withdrawPhone : undefined
                );
                setWithdrawStage("confirming");

                // Demo stand-in - see the matching comment on handleTopUp and
                // functions/src/index.ts's simulateWithdrawalConfirmation.
                await new Promise((resolve) => setTimeout(resolve, 700));
                await simulateWithdrawalConfirmation(intentId);

                setIsWithdrawOpen(false);
                setWithdrawStage("form");
                setWithdrawAmount("");
                setWithdrawPhone("");
                toast({ title: "Withdrawal Sent!", description: `${currency.symbol} ${numAmount.toFixed(2)} is on its way to ${selectedWithdrawRailInfo.name}.` });
            } catch (err) {
                setWithdrawStage("form");
                toast({ variant: 'destructive', title: "Withdrawal Failed", description: err instanceof Error ? err.message : "Please try again." });
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
                    <CardFooter className="grid grid-cols-3 gap-2">
                        <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0 px-2" onClick={() => setIsTransferOpen(true)} disabled={!isWalletReady}>
                            <ArrowUpRight className="w-4 h-4 mr-1.5" /> Send
                        </Button>
                        <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0 px-2" onClick={openTopUp} disabled={!isWalletReady}>
                            <Plus className="w-4 h-4 mr-1.5" /> Top Up
                        </Button>
                        <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0 px-2" onClick={openWithdraw} disabled={!isWalletReady || balance <= 0}>
                            <Banknote className="w-4 h-4 mr-1.5" /> Withdraw
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

            <SendMoneyDialog open={isTransferOpen} onOpenChange={setIsTransferOpen} />

            <Dialog open={isTopUpOpen} onOpenChange={(open) => { if (!open && topUpStage === 'form') setIsTopUpOpen(false); }}>
                <DialogContent className="max-w-md sm:rounded-[2rem] border-white/10 bg-zinc-950 text-white">
                    <DialogHeader>
                        <DialogTitle className="font-headline text-2xl">Top Up Balance</DialogTitle>
                        <DialogDescription className="text-zinc-400">Bring in money from a local mobile money account, card, or bank.</DialogDescription>
                    </DialogHeader>
                    {topUpStage === 'form' ? (
                        <>
                            <div className="space-y-6 py-6">
                                <div className="space-y-2">
                                    <Label className="text-zinc-400 text-xs uppercase font-bold tracking-widest">Pay With</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {regionalPaymentRails.map(rail => (
                                            <button
                                                key={rail.name}
                                                type="button"
                                                onClick={() => setSelectedRail(rail.name)}
                                                className={cn(
                                                    "flex items-center gap-2 p-3 rounded-xl border text-left transition-colors",
                                                    selectedRail === rail.name ? "border-primary bg-primary/10" : "border-white/10 bg-white/5 hover:border-white/20"
                                                )}
                                            >
                                                <rail.icon className="w-4 h-4 shrink-0" />
                                                <span className="text-xs font-bold leading-tight">{rail.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-400 text-xs uppercase font-bold tracking-widest">Amount ({currency.symbol})</Label>
                                    <Input type="number" placeholder="0.00" className="bg-white/5 border-white/10 h-14 text-2xl font-bold rounded-xl" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} />
                                </div>
                                {selectedRailInfo.method === 'mobile_money' && (
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400 text-xs uppercase font-bold tracking-widest">{selectedRailInfo.name} Phone Number</Label>
                                        <Input type="tel" placeholder="e.g. 07XX XXX XXX" className="bg-white/5 border-white/10 h-12 rounded-xl" value={topUpPhone} onChange={e => setTopUpPhone(e.target.value)} />
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button className="w-full h-14 text-lg font-bold rounded-xl" onClick={handleTopUp} disabled={isPending || !topUpAmount}>
                                    {isPending ? <Loader2 className="animate-spin mr-2"/> : <ArrowDownLeft className="mr-2"/>} Continue with {selectedRailInfo.name}
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <div className="py-10 flex flex-col items-center text-center gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                            <div className="space-y-1.5">
                                <p className="font-bold leading-snug">
                                    {selectedRailInfo.method === 'mobile_money'
                                        ? `Approve the ${selectedRailInfo.name} prompt on your phone`
                                        : selectedRailInfo.method === 'card'
                                        ? 'Confirming your card payment...'
                                        : 'Confirming with your bank...'}
                                </p>
                                <p className="text-xs text-zinc-400">{currency.symbol} {parseFloat(topUpAmount || "0").toFixed(2)} via {selectedRailInfo.name}</p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isWithdrawOpen} onOpenChange={(open) => { if (!open && withdrawStage === 'form') setIsWithdrawOpen(false); }}>
                <DialogContent className="max-w-md sm:rounded-[2rem] border-white/10 bg-zinc-950 text-white">
                    <DialogHeader>
                        <DialogTitle className="font-headline text-2xl">Withdraw Balance</DialogTitle>
                        <DialogDescription className="text-zinc-400">Send your balance out to a mobile money account, card, or bank. Available: {currency.symbol} {balance.toFixed(2)}.</DialogDescription>
                    </DialogHeader>
                    {withdrawStage === 'form' ? (
                        <>
                            <div className="space-y-6 py-6">
                                <div className="space-y-2">
                                    <Label className="text-zinc-400 text-xs uppercase font-bold tracking-widest">Send To</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {regionalPaymentRails.map(rail => (
                                            <button
                                                key={rail.name}
                                                type="button"
                                                onClick={() => setSelectedWithdrawRail(rail.name)}
                                                className={cn(
                                                    "flex items-center gap-2 p-3 rounded-xl border text-left transition-colors",
                                                    selectedWithdrawRail === rail.name ? "border-primary bg-primary/10" : "border-white/10 bg-white/5 hover:border-white/20"
                                                )}
                                            >
                                                <rail.icon className="w-4 h-4 shrink-0" />
                                                <span className="text-xs font-bold leading-tight">{rail.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-400 text-xs uppercase font-bold tracking-widest">Amount ({currency.symbol})</Label>
                                    <Input type="number" placeholder="0.00" className="bg-white/5 border-white/10 h-14 text-2xl font-bold rounded-xl" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
                                </div>
                                {selectedWithdrawRailInfo.method === 'mobile_money' && (
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400 text-xs uppercase font-bold tracking-widest">{selectedWithdrawRailInfo.name} Phone Number</Label>
                                        <Input type="tel" placeholder="e.g. 07XX XXX XXX" className="bg-white/5 border-white/10 h-12 rounded-xl" value={withdrawPhone} onChange={e => setWithdrawPhone(e.target.value)} />
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button className="w-full h-14 text-lg font-bold rounded-xl" onClick={handleWithdraw} disabled={isPending || !withdrawAmount}>
                                    {isPending ? <Loader2 className="animate-spin mr-2"/> : <Banknote className="mr-2"/>} Withdraw to {selectedWithdrawRailInfo.name}
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <div className="py-10 flex flex-col items-center text-center gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                            <div className="space-y-1.5">
                                <p className="font-bold leading-snug">Sending to {selectedWithdrawRailInfo.name}...</p>
                                <p className="text-xs text-zinc-400">{currency.symbol} {parseFloat(withdrawAmount || "0").toFixed(2)}</p>
                            </div>
                        </div>
                    )}
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
