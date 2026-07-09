
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { ShoppingBag, Search, Loader2, Camera, X, Phone, CreditCard, Smartphone, Wand2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { virtualTryOn } from '@/app/actions';
import { getIdToken } from '@/lib/get-id-token';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useSearchParams } from 'next/navigation';
import AppCall, { CallTarget } from '@/components/app-call';
import { useRegional } from '@/contexts/language-provider';
import { useAuth } from '@/contexts/auth-provider';
import { spendFunds } from '@/lib/wallet';
import { subscribeToProducts, type Product } from '@/lib/products';
import CameraView from '@/components/camera-view';
import { mockServiceItems, type MarketplaceItem } from '@/lib/catalog-data';

function productToMarketplaceItem(product: Product): MarketplaceItem {
    return {
        category: product.category,
        title: product.title,
        description: product.description || `By @${product.ownerHandle}`,
        image: product.image,
        hint: product.title,
        providerName: `@${product.ownerHandle}`,
        type: 'product',
        price: product.price,
        tryOn: product.category === 'fashion' || product.category === 'beauty',
        productId: product.id,
        ownerUid: product.ownerUid,
    };
}

const TryOnDialog = ({ open, onOpenChange, item }: { open: boolean; onOpenChange: (open: boolean) => void; item: MarketplaceItem | null }) => {
    const [userPhoto, setUserPhoto] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [resultUri, setResultUri] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!open) {
            setUserPhoto(null);
            setResultUri(null);
        }
    }, [open]);

    const handleTryOn = async () => {
        if (!userPhoto || !item) return;
        setIsPending(true);
        try {
            const idToken = await getIdToken();
            const res = await virtualTryOn(idToken, {
                userPhotoDataUri: userPhoto,
                productPhotoDataUri: item.image,
                category: item.category,
            });
            setResultUri(res.generatedImageUri);
        } catch (err) {
            toast({ variant: 'destructive', title: "Try-On Failed", description: err instanceof Error ? err.message : "Please try again." });
        } finally {
            setIsPending(false);
        }
    };

    if (!item) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Wand2 className="w-5 h-5 text-primary" /> Try It On</DialogTitle>
                        <DialogDescription>See how "{item.title}" looks on you, powered by AI.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {resultUri ? (
                            <div className="relative aspect-square rounded-2xl overflow-hidden border">
                                <Image src={resultUri} alt="Try-on result" fill className="object-cover" />
                            </div>
                        ) : userPhoto ? (
                            <div className="relative aspect-square rounded-2xl overflow-hidden border">
                                <Image src={userPhoto} alt="Your photo" fill className="object-cover" />
                                <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={() => setUserPhoto(null)}><X className="w-4 h-4" /></Button>
                            </div>
                        ) : (
                            <Button variant="outline" className="w-full h-32 rounded-2xl border-dashed flex-col gap-2" onClick={() => setIsCameraOpen(true)}>
                                <Camera className="w-6 h-6" />
                                <span className="text-sm">Take a photo of yourself</span>
                            </Button>
                        )}
                    </div>
                    {resultUri ? (
                        <Button className="w-full h-12 rounded-xl font-bold" onClick={() => setResultUri(null)}>Try Another Photo</Button>
                    ) : (
                        <Button className="w-full h-12 rounded-xl font-bold" onClick={handleTryOn} disabled={!userPhoto || isPending}>
                            {isPending ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <Wand2 className="mr-2 w-4 h-4" />} Generate
                        </Button>
                    )}
                </DialogContent>
            </Dialog>
            <CameraView open={isCameraOpen} onOpenChange={setIsCameraOpen} onUsePhoto={setUserPhoto} title="Take a photo for Try-On" />
        </>
    );
};

const MarketplaceItemCard = ({ item, onCall }: { item: MarketplaceItem, onCall?: (target: CallTarget) => void }) => {
    const { currency } = useRegional();
    const { user } = useAuth();
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isTryOnOpen, setIsTryOnOpen] = useState(false);
    const isOwnListing = !!item.productId && item.ownerUid === user?.uid;

    return (
        <>
            <Card className="overflow-hidden flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
                <div className="relative aspect-square w-full bg-muted">
                    <Image src={item.image} alt={item.title} fill className="object-cover" />
                    {item.type && <Badge className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm border-0">{item.type}</Badge>}
                    {item.productId && <Badge variant="secondary" className="absolute top-2 left-2">Partner Listing</Badge>}
                </div>
                <CardHeader className="p-3">
                    <CardTitle className="text-sm font-bold truncate">{item.title}</CardTitle>
                    <CardDescription className="text-[10px] truncate">{item.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow p-3 pt-0">
                    <p className="font-bold text-base text-primary">{currency.symbol} {item.price}</p>
                </CardContent>
                <CardFooter className="flex flex-col items-stretch gap-2 p-3 pt-0">
                    {item.tryOn && (
                        <Button variant="outline" size="sm" className="w-full rounded-full gap-1.5" onClick={() => setIsTryOnOpen(true)}>
                            <Wand2 className="w-3.5 h-3.5" /> Try It On
                        </Button>
                    )}
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" className="shrink-0 rounded-full" onClick={() => onCall?.({ name: item.providerName, type: 'business' })}><Phone className="w-4 h-4 text-green-500" /></Button>
                        {isOwnListing ? (
                            <Button size="sm" className="w-full rounded-full" variant="secondary" disabled>Your Listing</Button>
                        ) : (
                            <Button size="sm" className="w-full rounded-full bg-primary" onClick={() => setIsCheckoutOpen(true)}>Get Now</Button>
                        )}
                    </div>
                </CardFooter>
            </Card>
            <CheckoutDialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen} item={item} />
            <TryOnDialog open={isTryOnOpen} onOpenChange={setIsTryOnOpen} item={item} />
        </>
    );
};

const CheckoutDialog = ({ open, onOpenChange, item }: { open: boolean, onOpenChange: (open: boolean) => void, item: MarketplaceItem }) => {
    const { currency, region } = useRegional();
    const { toast } = useToast();
    const { user } = useAuth();
    const [isPending, setIsPending] = useState(false);

    const handlePay = async () => {
        if (!user) return;
        setIsPending(true);
        try {
            await spendFunds(user.uid, item.title, item.price, item.productId);
            toast({ title: "Order Confirmed!", description: `${currency.symbol} ${item.price} paid from your Moood wallet.` });
            onOpenChange(false);
        } catch (err) {
            toast({ variant: 'destructive', title: "Payment Failed", description: err instanceof Error ? err.message : "Please try again." });
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle>Checkout</DialogTitle>
                    <DialogDescription>Review and pay from your Moood wallet.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="flex items-center gap-4 p-4 border rounded-2xl bg-muted/30">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden"><Image src={item.image} alt="item" fill className="object-cover" /></div>
                        <div className="flex-1">
                            <h4 className="font-bold text-sm">{item.title}</h4>
                            <p className="text-lg font-bold text-primary">{currency.symbol} {item.price}</p>
                        </div>
                    </div>
                    <div className="p-4 border rounded-2xl space-y-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Paying With</p>
                        <div className="grid grid-cols-1 gap-2">
                            <div className="flex items-center gap-2 h-12 px-4 rounded-xl border bg-primary/5 text-sm font-bold">
                                <CreditCard className="text-primary w-4 h-4" /> Moood Wallet Balance
                            </div>
                            {region === 'KE' && <Button variant="outline" className="justify-start h-12 rounded-xl" disabled><Smartphone className="mr-2 text-green-600" /> M-Pesa Express (coming soon)</Button>}
                            {region === 'UG' && <Button variant="outline" className="justify-start h-12 rounded-xl" disabled><Smartphone className="mr-2 text-yellow-500" /> MTN Mobile Money (coming soon)</Button>}
                        </div>
                    </div>
                </div>
                <Button className="w-full h-14 rounded-xl text-lg font-bold" onClick={handlePay} disabled={isPending}>
                    {isPending ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : null} Pay {currency.symbol} {item.price}
                </Button>
            </DialogContent>
        </Dialog>
    );
};

export default function ShopPage() {
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCallTarget, setActiveCallTarget] = useState<CallTarget | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchTerm(q);
  }, [searchParams]);

  useEffect(() => subscribeToProducts(setProducts), []);

  const allItems = useMemo(
    () => [...products.map(productToMarketplaceItem), ...mockServiceItems],
    [products]
  );

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return allItems;
    return allItems.filter(item =>
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.providerName.toLowerCase().includes(term)
    );
  }, [allItems, searchTerm]);

  return (
    <div className="w-full p-4 md:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                <ShoppingBag className="w-8 h-8 text-primary" /> Marketplace
            </h1>
            <div className="relative md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder="Search global products..." className="pl-10 rounded-full bg-muted border-0" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
            </div>
        </div>

        {filteredItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">No products match "{searchTerm}".</p>
        ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredItems.map((item, i) => (
                    <MarketplaceItemCard key={item.productId ?? `mock-${i}`} item={item} onCall={setActiveCallTarget} />
                ))}
            </div>
        )}

        <AppCall open={!!activeCallTarget} onOpenChange={(o) => !o && setActiveCallTarget(null)} target={activeCallTarget} />
    </div>
  );
}
