"use client";

import React, { useState, useTransition, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Wallet, 
    ArrowUpRight, 
    ArrowDownLeft, 
    Landmark, 
    Smartphone, 
    Coins, 
    History, 
    Plus, 
    Search, 
    Loader2, 
    CheckCircle2, 
    Info,
    RefreshCw,
    Gift,
    ShieldCheck,
    Send
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
    DialogClose 
} from "@/components/ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
import { useRegional } from "@/contexts/language-provider";

const TRANSACTION_FEE_PERCENT = 0.005; // 0.5% fee for P2P

export default function WalletTab() {
    const { currency, region } = useRegional();
    const [balance, setBalance] = useState(2450.50);
    const [tokenBalance, setTokenBalance] = useState(125.00);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

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

    const handleTransfer = () => {
        const numAmount = parseFloat(amount);
        if (!recipient || isNaN(numAmount) || numAmount <= 0) {
            toast({ variant: 'destructive', title: "Invalid Input" });
            return;
        }

        const fee = numAmount * TRANSACTION_FEE_PERCENT;
        const total = numAmount + fee;

        if (total > balance) {
            toast({ variant: 'destructive', title: "Insufficient Funds" });
            return;
        }

        startTransition(async () => {
            await new Promise(r => setTimeout(r, 1500));
            setBalance(prev => prev - total);
            setIsTransferOpen(false);
            setRecipient("");
            setAmount("");
            toast({ 
                title: "Transfer Sent!", 
                description: `Sent ${currency.symbol} ${numAmount.toFixed(2)} to ${recipient}.` 
            });
        });
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-primary to-indigo-800 text-white border-0 shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-3xl" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold tracking-widest uppercase opacity-70">Main Balance ({currency.code})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold font-headline tracking-tighter">{currency.symbol} {balance.toLocaleString()}</div>
                        <p className="text-[10px] mt-2 text-white/60">P2P Transfers enabled • 0.5% Global Fee</p>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                        <Button variant="secondary" className="w-full bg-white/10 hover:bg-white/20 text-white border-0" onClick={() => setIsTransferOpen(true)}>
                            <ArrowUpRight className="w-4 h-4 mr-2" /> Send
                        </Button>
                        <Button variant="secondary" className="w-full bg-white/10 hover:bg-white/20 text-white border-0">
                            <Plus className="w-4 h-4 mr-2" /> Top Up
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="bg-zinc-950 text-white border-amber-400/20 shadow-xl border-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold tracking-widest uppercase text-amber-400">Tokens & Rewards</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold font-headline tracking-tighter text-amber-400">{tokenBalance.toLocaleString()} <span className="text-sm font-body">MOOOD</span></div>
                        <p className="text-[10px] mt-2 text-zinc-500">Tokenized engagement assets (IoT Compatible)</p>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" className="w-full border-amber-400/30 text-amber-400 hover:bg-amber-400/10">
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

            <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                <DialogContent className="max-w-md sm:rounded-[2rem] border-white/10 bg-zinc-950 text-white">
                    <DialogHeader>
                        <DialogTitle className="font-headline text-2xl">Transfer Funds</DialogTitle>
                        <DialogDescription className="text-zinc-400">Send money instantly across the Global South network.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-6">
                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase font-bold tracking-widest">Recipient</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"/>
                                <Input placeholder="Name or @handle" className="pl-9 bg-white/5 border-white/10 h-12 rounded-xl" value={recipient} onChange={e => setRecipient(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase font-bold tracking-widest">Amount ({currency.symbol})</Label>
                            <Input type="number" placeholder="0.00" className="bg-white/5 border-white/10 h-14 text-2xl font-bold rounded-xl" value={amount} onChange={e => setAmount(e.target.value)} />
                        </div>
                        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex gap-3">
                            <Info className="w-5 h-5 text-primary shrink-0" />
                            <p className="text-[11px] leading-relaxed text-primary-foreground/80">Fee: <span className="font-bold">{currency.symbol} {calculatedFee}</span>. Transfers to mobile money might incur provider-specific charges.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button className="w-full h-14 text-lg font-bold rounded-xl" onClick={handleTransfer} disabled={isPending || !amount || !recipient}>
                            {isPending ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2"/>} Confirm & Send
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}