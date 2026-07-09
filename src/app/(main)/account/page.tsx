
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    User, 
    Settings, 
    Pencil, 
    ShieldCheck, 
    LogOut, 
    Globe, 
    Zap, 
    BarChart, 
    PieChart, 
    Video, 
    Users, 
    Download,
    LayoutDashboard,
    Box,
    Star,
    Mail,
    BellRing,
    Lock,
    Palette,
    Smartphone,
    Eye,
    Cpu,
    GraduationCap,
    BookOpen,
    Clock,
    CheckCircle,
    Plus,
    MapPin,
    Trash2,
    Sparkles,
    Loader2,
    Calendar,
    Megaphone,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-provider";
import { signOut } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/firebase-config";
import { useRouter } from "next/navigation";
import WalletTab from "@/components/wallet-tab";
import { useRegional, Region } from "@/contexts/language-provider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { subscribeToUserProfile, becomePartner, type UserProfile } from "@/lib/users";
import { subscribeToTransactions, type WalletTransaction } from "@/lib/wallet";
import { subscribeToMyProducts, deleteProduct, type Product as ProductType } from "@/lib/products";
import { subscribeToMyStays, deleteStay, type HostedStay } from "@/lib/stays";
import { subscribeToMyEvents, deleteEvent, type HostedEvent } from "@/lib/events";
import CreateListingDialog from "@/components/create-listing-dialog";
import CreateStayDialog from "@/components/create-stay-dialog";
import CreateEventDialog from "@/components/create-event-dialog";
import DriverConsoleCard from "@/components/driver-console-card";
import PromoteDialog from "@/components/promote-dialog";
import InterestPickerDialog from "@/components/interest-picker-dialog";
import { aiCareerCoach } from "@/app/actions";
import { getIdToken } from "@/lib/get-id-token";

const SettingsTab = () => {
    const { region, setRegion, language, setLanguage, dataSaver, setDataSaver } = useRegional();
    const { toast } = useToast();
    const [notifications, setNotifications] = useState(true);
    const [twoFactor, setTwoFactor] = useState(false);
    const [incognito, setIncognito] = useState(false);

    const handleRegionChange = (val: Region) => {
        setRegion(val);
        toast({ title: "Region Updated", description: `Active market switched to ${val}.` });
    };

    return (
        <div className="space-y-6">
            <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline text-lg"><Globe className="text-primary w-5 h-5"/> Regional & Currency</CardTitle>
                    <CardDescription>Configure localization for pilot regions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold tracking-widest opacity-70">Active Pilot Market</Label>
                        <Select value={region} onValueChange={(v) => handleRegionChange(v as Region)}>
                            <SelectTrigger className="w-full bg-background/50 rounded-xl h-12">
                                <SelectValue placeholder="Select Region" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="AE">United Arab Emirates (AED)</SelectItem>
                                <SelectItem value="KE">Kenya (KES) - M-Pesa Enabled</SelectItem>
                                <SelectItem value="UG">Uganda (UGX) - MTN Enabled</SelectItem>
                                <SelectItem value="ZA">South Africa (ZAR) - EFT Enabled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant={language === 'en' ? 'default' : 'outline'} onClick={() => setLanguage('en')} className="rounded-xl h-12">English</Button>
                        <Button variant={language === 'ar' ? 'default' : 'outline'} onClick={() => setLanguage('ar')} className="rounded-xl h-12 font-body">العربية</Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline text-lg"><ShieldCheck className="text-green-500 w-5 h-5"/> Security & Privacy</CardTitle>
                    <CardDescription>Control your digital footprint and data.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-xl bg-background/30">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold flex items-center gap-2"><Lock className="w-3 h-3"/> Two-Factor Auth</Label>
                            <p className="text-[10px] text-muted-foreground">Secure your wallet with SMS/Push verification.</p>
                        </div>
                        <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-xl bg-background/30">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold flex items-center gap-2"><Eye className="w-3 h-3"/> Incognito Mode</Label>
                            <p className="text-[10px] text-muted-foreground">Hide your active status and last vibe location.</p>
                        </div>
                        <Switch checked={incognito} onCheckedChange={setIncognito} />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline text-lg"><Cpu className="text-amber-500 w-5 h-5"/> Connectivity & IoT</CardTitle>
                    <CardDescription>Optimization for SSA network conditions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-xl bg-primary/5 border-primary/10">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold flex items-center gap-2"><Zap className="w-3 h-3 text-primary"/> Data Saver Mode</Label>
                            <p className="text-[10px] text-muted-foreground">Compress images and disable auto-play video.</p>
                        </div>
                        <Switch checked={dataSaver} onCheckedChange={setDataSaver} />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-xl bg-background/30">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold flex items-center gap-2"><BellRing className="w-3 h-3"/> Smart Alerts</Label>
                            <p className="text-[10px] text-muted-foreground">Switch to SMS alerts when offline or on 2G.</p>
                        </div>
                        <Switch checked={notifications} onCheckedChange={setNotifications} />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline text-lg"><Palette className="text-purple-500 w-5 h-5"/> Personalization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full justify-between h-12 rounded-xl group">
                        <span className="flex items-center gap-2 text-sm"><Palette className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors"/> Theme Engine</span>
                        <Badge variant="secondary" className="text-[9px]">Sync with Aura</Badge>
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-12 rounded-xl">
                        <Smartphone className="w-4 h-4 mr-2 text-muted-foreground"/> Appearance Settings
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

function ProfileContent({ profile }: { profile: UserProfile | null }) {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [bio, setBio] = useState("Exploring the vibes of the city. Digital nomad and coffee enthusiast.");
    const [isEditing, setIsEditing] = useState(false);
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [isInterestsOpen, setIsInterestsOpen] = useState(false);

    const handleBecomePartner = async () => {
        if (!user) return;
        setIsUpgrading(true);
        try {
            await becomePartner(user.uid);
            toast({ title: "Welcome, Partner!", description: "Partner and Academy tabs are now unlocked." });
        } catch {
            toast({ variant: "destructive", title: "Couldn't upgrade", description: "Please try again." });
        } finally {
            setIsUpgrading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="overflow-hidden border-white/10 bg-card/50 backdrop-blur-xl">
                <div className="h-24 bg-gradient-to-r from-primary/20 via-indigo-500/20 to-purple-500/20" />
                <CardContent className="relative pt-0">
                    <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 mb-6 px-2">
                        <Avatar className="w-24 h-24 border-4 border-background shadow-2xl">
                            <AvatarImage src={user?.photoURL || ''}/>
                            <AvatarFallback className="text-2xl bg-primary text-white font-bold">{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-center sm:text-left pb-2">
                            <h2 className="text-2xl font-bold font-headline">{user?.displayName || 'Moood User'}</h2>
                            {profile?.handle && <p className="text-sm text-primary font-medium">@{profile.handle}</p>}
                            <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1"><Mail className="w-3 h-3"/> {user?.email}</p>
                        </div>
                        <Button variant="outline" size="sm" className="rounded-full gap-2 px-4" onClick={() => setIsEditing(!isEditing)}>
                            <Pencil className="w-3 h-3" /> {isEditing ? 'Save' : 'Edit Profile'}
                        </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 py-6 border-y border-white/5 mb-6">
                        <div className="text-center group cursor-pointer">
                            <p className="text-xl font-bold group-hover:text-primary transition-colors">24</p>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Vibes</p>
                        </div>
                        <div className="text-center group cursor-pointer">
                            <p className="text-xl font-bold group-hover:text-primary transition-colors">1.2k</p>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Connections</p>
                        </div>
                        <div className="text-center group cursor-pointer">
                            <p className="text-xl font-bold group-hover:text-primary transition-colors">850</p>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Waves</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold tracking-widest opacity-70">Bio</Label>
                            {isEditing ? (
                                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="bg-background/50 rounded-xl resize-none border-white/10" rows={3} />
                            ) : (
                                <p className="text-sm leading-relaxed text-muted-foreground italic px-1">"{bio}"</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-white/5 p-2 rounded-lg inline-flex">
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                            <span>Dubai, UAE</span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="pt-6 border-t border-white/5">
                    <Button variant="destructive" className="w-full rounded-xl gap-2 h-12 font-bold" onClick={() => signOut(auth).then(() => router.push('/login'))}>
                        <LogOut className="w-4 h-4"/> Sign Out
                    </Button>
                </CardFooter>
            </Card>

            <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-500"/> Verification Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between mb-2 text-xs">
                        <span className="text-muted-foreground">Level 2 (Standard User)</span>
                        <span className="font-bold text-primary">75%</span>
                    </div>
                    <Progress value={75} className="h-2" />
                    <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1.5"><Smartphone className="w-3 h-3"/> Verify a phone number to unlock P2P transfers.</p>
                </CardContent>
            </Card>

            <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-500"/> Your Interests</CardTitle>
                    <CardDescription className="text-xs">Drives your Find Friends suggestions and which promotions you see.</CardDescription>
                </CardHeader>
                <CardContent>
                    {profile?.interests && profile.interests.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {profile.interests.map((tag) => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">No interests picked yet.</p>
                    )}
                </CardContent>
                <CardFooter>
                    <Button variant="outline" className="w-full rounded-xl h-11 font-bold" onClick={() => setIsInterestsOpen(true)}>
                        Edit Interests
                    </Button>
                </CardFooter>
            </Card>

            {profile && profile.role !== 'partner' && (
                <Card className="border-primary/20 bg-primary/5 backdrop-blur-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2"><LayoutDashboard className="w-4 h-4 text-primary"/> Sell on Moood</CardTitle>
                        <CardDescription className="text-xs">Unlock the Partner Dashboard and Academy to list products, go live for shopping, and grow a business on Moood.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button className="w-full rounded-xl h-11 font-bold" onClick={handleBecomePartner} disabled={isUpgrading}>
                            {isUpgrading ? "Upgrading..." : "Become a Partner"}
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {user && (
                <InterestPickerDialog
                    open={isInterestsOpen}
                    onOpenChange={setIsInterestsOpen}
                    uid={user.uid}
                    initialInterests={profile?.interests ?? []}
                />
            )}
        </div>
    );
}

const PartnerDashboardTab = ({ profile }: { profile: UserProfile | null }) => {
    const { currency } = useRegional();
    const { user } = useAuth();
    const { toast } = useToast();
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [myProducts, setMyProducts] = useState<ProductType[]>([]);
    const [myStays, setMyStays] = useState<HostedStay[]>([]);
    const [myEvents, setMyEvents] = useState<HostedEvent[]>([]);
    const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
    const [isCreateStayOpen, setIsCreateStayOpen] = useState(false);
    const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
    const [isPromoteOpen, setIsPromoteOpen] = useState(false);

    useEffect(() => {
        if (!user) return;
        return subscribeToTransactions(user.uid, setTransactions);
    }, [user]);

    useEffect(() => {
        if (!user) return;
        return subscribeToMyProducts(user.uid, setMyProducts);
    }, [user]);

    useEffect(() => {
        if (!user) return;
        return subscribeToMyStays(user.uid, setMyStays);
    }, [user]);

    useEffect(() => {
        if (!user) return;
        return subscribeToMyEvents(user.uid, setMyEvents);
    }, [user]);

    // Real numbers pulled from the partner's own wallet transaction history
    // (Cloud-Function-recorded, not a hardcoded display value): 'sale'
    // covers products/stays/events (spendFunds crediting the listing's
    // owner), 'driver-earning' covers Skip rides/deliveries/tow jobs, and
    // 'gift-received' is a streamer's share of live gifting. Limited to the
    // last 20 transactions (subscribeToTransactions' cap), so this is
    // "recent earnings" rather than lifetime - a real dashboard would
    // aggregate server-side instead of scanning a capped client feed.
    const marketplaceSales = useMemo(() => transactions.filter(tx => tx.type === 'sale').reduce((sum, tx) => sum + tx.amount, 0), [transactions]);
    const drivingIncome = useMemo(() => transactions.filter(tx => tx.type === 'driver-earning').reduce((sum, tx) => sum + tx.amount, 0), [transactions]);
    const liveGifting = useMemo(() => transactions.filter(tx => tx.type === 'gift-received').reduce((sum, tx) => sum + tx.amount, 0), [transactions]);
    const totalEarnings = marketplaceSales + drivingIncome + liveGifting;
    const pct = (n: number) => (totalEarnings > 0 ? Math.round((n / totalEarnings) * 100) : 0);

    const handleDeleteListing = async (productId: string) => {
        try {
            await deleteProduct(productId);
            toast({ title: "Listing Removed" });
        } catch (err) {
            toast({ variant: 'destructive', title: "Couldn't remove listing", description: err instanceof Error ? err.message : "Please try again." });
        }
    };

    const handleDeleteStay = async (stayId: string) => {
        try {
            await deleteStay(stayId);
            toast({ title: "Listing Removed" });
        } catch (err) {
            toast({ variant: 'destructive', title: "Couldn't remove listing", description: err instanceof Error ? err.message : "Please try again." });
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        try {
            await deleteEvent(eventId);
            toast({ title: "Event Removed" });
        } catch (err) {
            toast({ variant: 'destructive', title: "Couldn't remove event", description: err instanceof Error ? err.message : "Please try again." });
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-zinc-950 text-white border-white/5 shadow-2xl">
                    <CardHeader className="p-4 pb-0">
                        <CardTitle className="text-[10px] uppercase tracking-tighter opacity-50 flex items-center gap-1.5"><BarChart className="w-3 h-3"/> Recent Earnings</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <p className="text-2xl font-bold font-headline tracking-tighter">{currency.symbol} {totalEarnings.toFixed(2)}</p>
                        <p className="text-[9px] text-white/40 mt-1">From your wallet's sale + gift history</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950 text-white border-white/5 shadow-2xl">
                    <CardHeader className="p-4 pb-0">
                        <CardTitle className="text-[10px] uppercase tracking-tighter opacity-50 flex items-center gap-1.5"><Box className="w-3 h-3"/> Active Listings</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <p className="text-2xl font-bold font-headline tracking-tighter">{myProducts.length + myStays.length + myEvents.length}</p>
                        <Badge className="bg-primary/20 text-primary border-0 mt-1 text-[8px]">Products, Stays & Events</Badge>
                    </CardContent>
                </Card>
            </div>

            <DriverConsoleCard profile={profile} />

            <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-transparent backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-lg font-headline flex items-center gap-2"><Megaphone className="w-5 h-5 text-primary"/> Promote</CardTitle>
                    <CardDescription>Pay to run a sponsored ad in Vibes and Messages until your promotion runs out.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button className="w-full rounded-xl gap-2 h-14 font-bold text-lg shadow-xl shadow-primary/20" onClick={() => setIsPromoteOpen(true)}><Megaphone className="w-5 h-5"/> Promote Something</Button>
                </CardFooter>
            </Card>

            <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-lg font-headline flex items-center gap-2"><LayoutDashboard className="w-5 h-5 text-primary"/> Marketplace Listings</CardTitle>
                    <CardDescription>Sell products on Shop, just like anyone else offering a service.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 rounded-2xl bg-background/50 border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><Video className="w-5 h-5"/></div>
                            <div><p className="font-bold text-sm">Live Sales Sync</p><p className="text-[10px] text-muted-foreground">Go live from Vibes to sell your listings</p></div>
                        </div>
                        <Badge variant="outline" className="text-[9px]">Vibes</Badge>
                    </div>
                    {myProducts.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-background/50 border border-white/5 text-center">
                            <p className="text-sm font-bold">No listings yet</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Create your first product below - it shows up on the Shop marketplace immediately.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {myProducts.map((product) => (
                                <div key={product.id} className="p-3 rounded-2xl bg-background/50 border border-white/5 flex items-center gap-3">
                                    <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted"><Image src={product.image} alt={product.title} fill className="object-cover" /></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate">{product.title}</p>
                                        <p className="text-[10px] text-muted-foreground">{currency.symbol} {product.price}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => handleDeleteListing(product.id)}><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button className="w-full rounded-xl gap-2 h-14 font-bold text-lg shadow-xl shadow-primary/20" onClick={() => setIsCreateProductOpen(true)}><Plus className="w-5 h-5"/> Create New Listing</Button>
                </CardFooter>
            </Card>

            <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-lg font-headline flex items-center gap-2"><Box className="w-5 h-5 text-primary"/> Become a Host</CardTitle>
                    <CardDescription>List a place on Stays - guests book and pay straight into your wallet.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {myStays.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-background/50 border border-white/5 text-center">
                            <p className="text-sm font-bold">No places listed yet</p>
                            <p className="text-[10px] text-muted-foreground mt-1">List your first stay below - it shows up on Links &gt; Stays immediately.</p>
                        </div>
                    ) : (
                        myStays.map((stay) => (
                            <div key={stay.id} className="p-3 rounded-2xl bg-background/50 border border-white/5 flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted"><Image src={stay.images[0]} alt={stay.title} fill className="object-cover" /></div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate">{stay.title}</p>
                                    <p className="text-[10px] text-muted-foreground">{currency.symbol} {stay.pricePerNight} / night</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => handleDeleteStay(stay.id)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        ))
                    )}
                </CardContent>
                <CardFooter>
                    <Button className="w-full rounded-xl gap-2 h-14 font-bold text-lg shadow-xl shadow-primary/20" onClick={() => setIsCreateStayOpen(true)}><Plus className="w-5 h-5"/> Become a Host</Button>
                </CardFooter>
            </Card>

            <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-lg font-headline flex items-center gap-2"><Calendar className="w-5 h-5 text-primary"/> Your Events</CardTitle>
                    <CardDescription>Sell tickets on Links - paid events pay straight into your wallet.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {myEvents.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-background/50 border border-white/5 text-center">
                            <p className="text-sm font-bold">No events yet</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Create your first event below - it shows up on Links immediately.</p>
                        </div>
                    ) : (
                        myEvents.map((eventItem) => (
                            <div key={eventItem.id} className="p-3 rounded-2xl bg-background/50 border border-white/5 flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted"><Image src={eventItem.image} alt={eventItem.title} fill className="object-cover" /></div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate">{eventItem.title}</p>
                                    <p className="text-[10px] text-muted-foreground">{eventItem.priceValue === 0 ? "Free" : `${currency.symbol} ${eventItem.priceValue}`}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => handleDeleteEvent(eventItem.id)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        ))
                    )}
                </CardContent>
                <CardFooter>
                    <Button className="w-full rounded-xl gap-2 h-14 font-bold text-lg shadow-xl shadow-primary/20" onClick={() => setIsCreateEventOpen(true)}><Plus className="w-5 h-5"/> Create Event</Button>
                </CardFooter>
            </Card>

            <Card className="border-white/10 bg-card/50 overflow-hidden backdrop-blur-xl">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2"><PieChart className="w-4 h-4 text-primary"/> Earnings Mix</CardTitle>
                    <CardDescription className="text-xs">Real split from your wallet transaction history.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="flex items-center gap-2 p-4 border-b border-white/5">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-xs flex-1">Marketplace Sales</span>
                        <span className="text-xs font-bold tabular-nums">{pct(marketplaceSales)}%</span>
                    </div>
                    <div className="flex items-center gap-2 p-4 border-b border-white/5">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-xs flex-1">Driving & Delivery</span>
                        <span className="text-xs font-bold tabular-nums">{pct(drivingIncome)}%</span>
                    </div>
                    <div className="flex items-center gap-2 p-4">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-xs flex-1">Live Gifting</span>
                        <span className="text-xs font-bold tabular-nums">{pct(liveGifting)}%</span>
                    </div>
                </CardContent>
            </Card>

            <CreateListingDialog open={isCreateProductOpen} onOpenChange={setIsCreateProductOpen} profile={profile} />
            <CreateStayDialog open={isCreateStayOpen} onOpenChange={setIsCreateStayOpen} profile={profile} />
            <CreateEventDialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen} profile={profile} />
            <PromoteDialog open={isPromoteOpen} onOpenChange={setIsPromoteOpen} />
        </div>
    );
};

const AiCareerCoachCard = () => {
    const [skills, setSkills] = useState("");
    const [marketDemand, setMarketDemand] = useState("");
    const [advice, setAdvice] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);
    const { toast } = useToast();

    const handleAsk = async () => {
        if (!skills.trim() || !marketDemand.trim()) {
            toast({ variant: 'destructive', title: "Tell Naya a bit more", description: "Fill in both your skills and what your market needs." });
            return;
        }
        setIsPending(true);
        try {
            const idToken = await getIdToken();
            const result = await aiCareerCoach(idToken, { skills, marketDemand });
            setAdvice(result.advice);
        } catch (err) {
            toast({ variant: 'destructive', title: "Couldn't reach the coach", description: err instanceof Error ? err.message : "Please try again." });
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary"/> AI Career Coach</CardTitle>
                <CardDescription className="text-xs">Naya's personalized advice on growing your business in the Global South.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Your Skills</Label>
                    <Textarea value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. Tailoring, social media marketing, basic bookkeeping" className="min-h-[60px] text-sm" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Market Demand</Label>
                    <Textarea value={marketDemand} onChange={(e) => setMarketDemand(e.target.value)} placeholder="e.g. Growing demand for custom clothing among young professionals" className="min-h-[60px] text-sm" />
                </div>
                {advice && (
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-sm leading-relaxed whitespace-pre-line">{advice}</div>
                )}
            </CardContent>
            <CardFooter>
                <Button className="w-full rounded-xl h-11 font-bold gap-2" onClick={handleAsk} disabled={isPending}>
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Get Advice
                </Button>
            </CardFooter>
        </Card>
    );
};

const AcademyTab = () => {
    return (
        <div className="space-y-6">
            <Card className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 text-white border-0 shadow-2xl relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 w-48 h-48 bg-white/5 rounded-full blur-3xl animate-pulse" />
                <CardHeader>
                    <CardTitle className="font-headline text-2xl flex items-center gap-3"><GraduationCap className="w-8 h-8 text-amber-400"/> Moood Academy</CardTitle>
                    <CardDescription className="text-white/60">Upskilling for the Global South digital economy.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-amber-400 mb-1.5">Currently Learning</p>
                        <h4 className="font-bold text-lg mb-3 leading-tight">Digital Marketing for SSA Micro-Businesses</h4>
                        <div className="space-y-2.5">
                            <div className="flex justify-between text-[10px] font-bold">
                                <span className="opacity-70 text-white">Course Progress</span>
                                <span className="text-amber-400">Module 4/12</span>
                            </div>
                            <Progress value={33} className="h-2 bg-white/10" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <AiCareerCoachCard />

            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">My Enrollment</h3>
                <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
                    <CardContent className="p-0">
                        {[
                            { title: "M-Pesa Business API 101", category: "FinTech", status: "Active", icon: Smartphone, color: "text-green-500" },
                            { title: "Smart Agri-Tech Management", category: "AgriTech", status: "Locked", icon: Cpu, color: "text-amber-500" },
                            { title: "Live Streaming Strategy", category: "Creator", status: "Completed", icon: Video, color: "text-primary" },
                        ].map((course, i) => (
                            <div key={i} className="p-4 border-b last:border-b-0 border-white/5 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer group">
                                <div className={cn("p-2.5 rounded-xl bg-background/50 border border-white/5", course.color)}><course.icon className="w-5 h-5"/></div>
                                <div className="flex-1">
                                    <p className="text-[9px] uppercase font-bold tracking-widest opacity-50">{course.category}</p>
                                    <p className="text-sm font-bold leading-tight group-hover:text-primary transition-colors">{course.title}</p>
                                </div>
                                <Badge variant={course.status === 'Completed' ? 'default' : 'outline'} className="text-[8px] px-2">{course.status}</Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary"/> Knowledge Hub</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-background/50 border border-white/5 group hover:border-primary/30 transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors"/>
                            <div className="space-y-0.5"><p className="text-xs font-bold">Partner Success Guide</p><p className="text-[9px] text-muted-foreground">PDF • 2.4 MB</p></div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all"><Download className="w-4 h-4"/></Button>
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-background/50 border border-white/5 group hover:border-primary/30 transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-4 h-4 text-green-500"/>
                            <div className="space-y-0.5"><p className="text-xs font-bold">Regional Tax Toolkit</p><p className="text-[9px] text-muted-foreground">XLSX • 1.1 MB</p></div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all"><Download className="w-4 h-4"/></Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function AccountPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const isPartner = profile?.role === 'partner';

  useEffect(() => {
    if (!user) return;
    return subscribeToUserProfile(user.uid, setProfile);
  }, [user]);

  return (
    <div className="w-full mx-auto p-4 md:p-6 lg:p-8 max-w-2xl pb-24 animate-in fade-in duration-700">
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                <User className="w-8 h-8 text-primary" /> My Account
            </h1>
            {isPartner && <Badge variant="outline" className="h-6 px-3 border-primary/20 bg-primary/5 text-primary font-bold text-[10px]">PARTNER</Badge>}
        </div>

        <Tabs defaultValue="profile" className="w-full">
            <TabsList className={cn("grid w-full h-auto bg-muted/50 p-1.5 rounded-2xl mb-8 backdrop-blur-xl border border-white/5", isPartner ? "grid-cols-5" : "grid-cols-3")}>
                <TabsTrigger value="profile" className="py-2.5 text-[9px] sm:text-xs rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-2xl transition-all">Profile</TabsTrigger>
                <TabsTrigger value="wallet" className="py-2.5 text-[9px] sm:text-xs rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-2xl transition-all">Wallet</TabsTrigger>
                <TabsTrigger value="settings" className="py-2.5 text-[9px] sm:text-xs rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-2xl transition-all">Settings</TabsTrigger>
                {isPartner && <TabsTrigger value="partner" className="py-2.5 text-[9px] sm:text-xs rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-2xl transition-all">Partner</TabsTrigger>}
                {isPartner && <TabsTrigger value="academy" className="py-2.5 text-[9px] sm:text-xs rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-2xl transition-all">Academy</TabsTrigger>}
            </TabsList>

            <TabsContent value="profile" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <ProfileContent profile={profile} />
            </TabsContent>

            <TabsContent value="wallet" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <WalletTab />
            </TabsContent>

            <TabsContent value="settings" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <SettingsTab />
            </TabsContent>

            {isPartner && (
                <TabsContent value="partner" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <PartnerDashboardTab profile={profile} />
                </TabsContent>
            )}

            {isPartner && (
                <TabsContent value="academy" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <AcademyTab />
                </TabsContent>
            )}
        </Tabs>
    </div>
  );
}
