"use client";

import React, { useState, useTransition, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, Sparkles, Heart, Send, Share2, MoreVertical, Music, Loader2, X, Plus, Play, BrainCircuit, Gift, Download, Waves, MapPin, Users, Video, Clock, Eye, Signal, MessageSquare, Phone, Radio, ShoppingBag } from "lucide-react";
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { generateVibeVideoAction, recommendVibes, generateStoryAction, analyzeVibePost, AnalyzeVibePostOutput } from "@/app/actions";
import CameraView from "./camera-view";
import { Badge } from "./ui/badge";
import { Watermark } from "./watermark";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import AppCall, { CallTarget } from "./app-call";

const PanoramaView = lazy(() => import('./panorama-view'));

// --- MOCK DATA ---
const sampleMusic = [
    { id: 1, title: "Desert Mirage", artist: "Nadia" },
    { id: 2, title: "City Lights", artist: "DXB Flow" },
];

const virtualGifts = [
    { id: 'rose', name: 'Rose', icon: '🌹', price: 5 },
    { id: 'coffee', name: 'Coffee', icon: '☕', price: 15 },
    { id: 'heart', name: 'Big Heart', icon: '💖', price: 50 },
    { id: 'crown', name: 'Crown', icon: '👑', price: 100 },
    { id: 'trophy', name: 'Diamond Trophy', icon: '💎', price: 500 },
];

export const initialMockPosts = [
    { id: 'live-1', type: 'live', user: { name: "Aisha's Boutique", avatar: "https://picsum.photos/seed/aishaboutique/40/40" }, title: "Summer Collection Live Sale! 👗", viewers: 124, isShopping: true, product: { name: "Silk Wrap Dress", price: "Dhs. 450", image: "https://picsum.photos/seed/dress/200/200" }, timestamp: new Date() },
    { id: 'hotspot-1', type: 'hotspot', businessName: "Artisan's Corner", avatar: "https://picsum.photos/seed/artisans/40/40", text: "Grand Opening! ✨ Handmade crafts 20% off.", location: "Alserkal Avenue", media: ["https://picsum.photos/seed/shop-interior/900/1600"], mediaTypes: ['photo'], timestamp: new Date(Date.now() - 3600000), user: { name: "Artisan's Corner" }, likes: 302, waves: 88, hint: "handmade crafts" },
    { id: 1, type: 'post', user: { name: "Aisha", avatar: "https://picsum.photos/id/1027/40/40" }, timestamp: new Date(Date.now() - 7200000), text: "Morning coffee view.", media: ["https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"], mediaTypes: ['video'], hint: "coffee view", music: null, likes: 124, waves: 12 },
    { id: 'hotspot-2', type: 'hotspot-360', businessName: "The Italian Place", avatar: "https://picsum.photos/seed/pizza-logo/40/40", text: "Step inside! 🍕", location: "JLT, Cluster D", media: ["https://picsum.photos/seed/pano-restaurant/2048/1024"], mediaTypes: ['360-photo'], timestamp: new Date(Date.now() - 43200000), user: { name: "The Italian Place" }, likes: 450, waves: 150, hint: "restaurant interior" },
];

const formatTimestamp = (date: Date | string, now: Date): string => {
    const postDate = typeof date === 'string' ? new Date(date) : date;
    if (!(postDate instanceof Date) || isNaN(postDate.getTime())) return "just now";
    const seconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

const LiveStreamViewer = ({ post, open, onOpenChange }: { post: any | null; open: boolean; onOpenChange: (open: boolean) => void; }) => {
    const [comments, setComments] = useState<{ id: number, user: string, text: string, type?: 'chat' | 'gift' }>([
        { id: 1, user: 'Omar', text: 'Love that dress!', type: 'chat' },
        { id: 2, user: 'Ali', text: 'Greetings from Abu Dhabi! 🇦🇪', type: 'chat' }
    ]);
    const [newComment, setNewComment] = useState('');
    const [isGiftMenuOpen, setIsGiftMenuOpen] = useState(false);
    const { toast } = useToast();

    const handleSendGift = (gift: typeof virtualGifts[0]) => {
        const streamerShare = gift.price * 0.8;
        setComments(prev => [...prev, { id: Date.now(), user: 'You', text: `sent ${gift.name} ${gift.icon}`, type: 'gift' }]);
        setIsGiftMenuOpen(false);
        toast({ title: "Gift Sent!", description: `Dhs. ${gift.price} charged. Streamer earns Dhs. ${streamerShare.toFixed(2)}.` });
    };

    if (!post) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full h-full max-w-full p-0 m-0 border-0 bg-black text-white flex flex-col overflow-hidden">
                <div className="relative flex-1">
                    <Image src={`https://picsum.photos/seed/live-${post.id}/800/1200`} alt="Live" fill className="object-cover opacity-80" />
                    <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between">
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
                                <Badge variant="secondary" className="bg-black/40"><Users className="w-3 h-3 mr-1" /> {post.viewers}</Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <Avatar className="w-8 h-8 border-2 border-white/20"><AvatarImage src={post.user.avatar} /></Avatar>
                                <p className="font-bold shadow-black [text-shadow:0_1px_4px_rgba(0,0,0,0.8)]">{post.user.name}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}><X /></Button>
                    </div>

                    {post.isShopping && post.product && (
                        <div className="absolute top-32 right-4 z-20 w-36 bg-black/40 backdrop-blur-xl p-2 rounded-2xl border border-white/10 animate-in slide-in-from-right">
                            <div className="relative aspect-square rounded-lg overflow-hidden mb-2">
                                <Image src={post.product.image} alt="Product" fill className="object-cover" />
                            </div>
                            <p className="text-[10px] font-bold text-primary truncate uppercase">{post.product.name}</p>
                            <p className="text-xs font-bold text-green-400">{post.product.price}</p>
                            <Button size="sm" className="w-full h-7 text-[10px] mt-1">Buy Now</Button>
                        </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex flex-col">
                        <ScrollArea className="h-32 mb-4">
                            <div className="flex flex-col gap-1 pr-4">
                                {comments.map(c => (
                                    <div key={c.id} className={cn("text-sm p-1.5 rounded-lg max-w-fit", c.type === 'gift' ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-black/20")}>
                                        <span className="font-bold mr-2 text-primary">{c.user}:</span> {c.text}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <div className="flex gap-2">
                            <Input placeholder="Say something..." className="rounded-full bg-black/40 border-white/20" value={newComment} onChange={e => setNewComment(e.target.value)} />
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => setIsGiftMenuOpen(true)}><Gift className="text-amber-400"/></Button>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full"><Heart className="text-red-500 fill-red-500"/></Button>
                        </div>
                    </div>

                    {isGiftMenuOpen && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
                            <Card className="bg-zinc-900 border-white/10 text-white w-full max-w-xs sm:rounded-[2rem]">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="font-headline">Send Support</CardTitle>
                                    <Button variant="ghost" size="icon" onClick={() => setIsGiftMenuOpen(false)}><X/></Button>
                                </CardHeader>
                                <CardContent className="grid grid-cols-3 gap-2">
                                    {virtualGifts.map(g => (
                                        <button key={g.id} className="flex flex-col items-center p-2 rounded-xl border border-white/5 hover:bg-white/10" onClick={() => handleSendGift(g)}>
                                            <span className="text-2xl">{g.icon}</span>
                                            <p className="text-[8px] font-bold mt-1">Dhs. {g.price}</p>
                                        </button>
                                    ))}
                                </CardContent>
                                <CardFooter className="flex flex-col gap-1 text-[9px] text-center text-zinc-500 italic">
                                    <p>App Fee (20%) supports platform growth.</p>
                                </CardFooter>
                            </Card>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

const PostCard = ({ post, onDelete, onInteract, onOpen, onCall }: { post: any; onDelete: (id: any) => void; onInteract: (post: any) => void; onOpen: (post: any) => void; onCall: (target: CallTarget) => void; }) => {
    const isHotspot = post.type.startsWith('hotspot');
    const isLive = post.type === 'live';
    const user = isHotspot ? { name: post.businessName, avatar: post.avatar } : post.user;
    const [now, setNow] = useState(new Date());
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const handleCallAction = (e: React.MouseEvent) => {
        e.stopPropagation();
        onCall({ name: user.name, avatar: user.avatar, type: isHotspot ? 'business' : 'user' });
    }

    return (
        <div className={cn("h-full w-full relative rounded-[2rem] overflow-hidden border transition-all hover:scale-[1.01] bg-black shadow-2xl", isHotspot ? "border-amber-400/20" : "border-white/10")} onClick={() => onOpen(post)}>
            {isLive ? (
                <Image src={`https://picsum.photos/seed/live-${post.id}/900/1600`} alt="Live" fill className="object-cover opacity-60" />
            ) : post.media?.[0] && (
                post.mediaTypes[0] === 'video' ? (
                    <video src={post.media[0]} playsInline loop muted autoPlay className="w-full h-full object-cover" />
                ) : post.mediaTypes[0] === '360-photo' ? (
                    <Suspense fallback={<Skeleton className="w-full h-full" />}><PanoramaView imageUrl={post.media[0]} /></Suspense>
                ) : (
                    <Image src={post.media[0]} alt="Vibe" fill className="object-cover" />
                )
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
            
            <div className="absolute top-6 left-6 right-6 flex items-center gap-3 z-10">
                <Avatar className="w-10 h-10 border-2 border-white/20"><AvatarImage src={user.avatar}/></Avatar>
                <div>
                    <p className="font-bold text-sm shadow-black [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">{user.name}</p>
                    <p className="text-[10px] text-white/60">{isLive ? 'Live Now' : formatTimestamp(post.timestamp, now)}</p>
                </div>
                {isHotspot && <Badge className="bg-amber-500/20 text-amber-300 ml-auto border-amber-500/20">Sponsored</Badge>}
                {isLive && <Badge variant="destructive" className="ml-auto animate-pulse">LIVE</Badge>}
            </div>

            <div className="absolute bottom-6 left-6 right-20 z-10">
                <p className="text-sm text-white/90 line-clamp-3 mb-2">{post.text || post.title}</p>
                {isHotspot && <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-300"><MapPin className="w-3 h-3"/> {post.location}</div>}
                {isLive && <div className="flex items-center gap-2 text-[10px] font-bold text-white/70"><Users className="w-3 h-3"/> {post.viewers} watching</div>}
            </div>

            <div className="absolute bottom-6 right-6 flex flex-col gap-6 z-10 items-center">
                <button className="group flex flex-col items-center gap-1" onClick={(e) => { e.stopPropagation(); setIsAnalyzing(true); }}>
                    <BrainCircuit className="w-7 h-7 text-purple-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold">AI</span>
                </button>
                {!isLive && (
                    <button className="group flex flex-col items-center gap-1" onClick={handleCallAction}>
                        <Phone className="w-7 h-7 text-green-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold">Call</span>
                    </button>
                )}
                <button className="group flex flex-col items-center gap-1" onClick={(e) => { e.stopPropagation(); onInteract(post); }}>
                    <Heart className={cn("w-7 h-7 transition-all group-hover:scale-110", isLive && "fill-red-500 text-red-500")} />
                    <span className="text-[10px] font-bold">{post.likes || 0}</span>
                </button>
                <button className="group flex flex-col items-center gap-1" onClick={(e) => { e.stopPropagation(); onInteract(post); }}>
                    <Waves className="w-7 h-7 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold">{post.waves || 0}</span>
                </button>
            </div>
            <AiAnalysisDialog post={post} open={isAnalyzing} onOpenChange={setIsAnalyzing} />
        </div>
    );
};

const AiAnalysisDialog = ({ post, open, onOpenChange }: { post: any; open: boolean; onOpenChange: (open: boolean) => void; }) => {
    const [analysis, setAnalysis] = useState<AnalyzeVibePostOutput | null>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    useEffect(() => {
        if (open && post && !analysis) {
            startTransition(async () => {
                try {
                    const res = await analyzeVibePost({ postText: post.text || post.title, mediaHint: post.hint });
                    setAnalysis(res);
                } catch (e) { onOpenChange(false); }
            });
        }
    }, [open, post, analysis, onOpenChange]);

    if (!post) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-950/90 backdrop-blur-2xl text-white border-white/10 sm:rounded-[2rem]">
                <DialogHeader><DialogTitle className="font-headline text-2xl flex items-center gap-2"><BrainCircuit className="text-purple-400"/> Naya Insights</DialogTitle></DialogHeader>
                <div className="py-6">
                    {isPending ? <div className="flex flex-col items-center gap-4 py-10"><Loader2 className="w-8 h-8 animate-spin text-primary"/><p className="text-xs uppercase tracking-widest opacity-50">Analyzing Vibe...</p></div> : analysis ? (
                        <div className="space-y-6">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                <p className="text-lg italic font-medium leading-relaxed">"{analysis.explanation}"</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {analysis.suggestedSearches.map(s => (
                                    <Button key={s} variant="secondary" size="sm" className="rounded-full px-4" onClick={() => { router.push(`/shop?q=${s}`); onOpenChange(false); }}>{s}</Button>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export const CreateVibeDialog = ({ open, onOpenChange, onPost }: { open: boolean, onOpenChange: (open: boolean) => void, onPost: (post: any) => void }) => {
    const [text, setText] = useState("");
    const [media, setMedia] = useState<{ uri: string, type: 'photo' | 'video' }[]>([]);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isVibifying, setIsVibifying] = useState(false);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleVibify = async () => {
        if (!text.trim()) { toast({ variant: "destructive", title: "Add a caption first!" }); return; }
        setIsVibifying(true);
        try {
            const photo = media.find(m => m.type === 'photo')?.uri;
            const res = await generateVibeVideoAction({ textPrompt: text, photoDataUri: photo });
            setMedia(prev => [...prev, { uri: res.videoDataUri, type: 'video' }]);
            toast({ title: "✨ Vibified!", description: "AI video generated successfully." });
        } catch (e) { toast({ variant: "destructive", title: "Vibify Offline" }); }
        finally { setIsVibifying(false); }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="bg-zinc-950/90 backdrop-blur-2xl border-white/10 text-white sm:rounded-[2.5rem]">
                    <DialogHeader><DialogTitle className="font-headline text-3xl">New Vibe</DialogTitle></DialogHeader>
                    <div className="space-y-6 py-4">
                        <Textarea placeholder="What's the energy?..." className="bg-white/5 border-white/10 h-32 rounded-2xl text-lg" value={text} onChange={e => setText(e.target.value)} />
                        {media.length > 0 && (
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {media.map((m, i) => (
                                    <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-lg">
                                        {m.type === 'video' ? <video src={m.uri} className="w-full h-full object-cover" /> : <Image src={m.uri} alt="Pre" fill className="object-cover" />}
                                        <button className="absolute top-1.5 right-1.5 bg-black/60 rounded-full p-1 shadow-xl" onClick={() => setMedia(p => p.filter((_, idx) => idx !== i))}><X className="w-3 h-3"/></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            <Button variant="outline" size="icon" className="w-12 h-12 rounded-full border-white/10 bg-white/5" onClick={() => setIsCameraOpen(true)}><Camera className="w-5 h-5"/></Button>
                            <Button variant="outline" size="icon" className="w-12 h-12 rounded-full border-white/10 bg-white/5" onClick={() => fileInputRef.current?.click()}><ImageIcon className="w-5 h-5"/></Button>
                            <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,video/*" onChange={(e) => {
                                Array.from(e.target.files || []).forEach(f => {
                                    const r = new FileReader();
                                    r.onload = (ev) => setMedia(p => [...p, { uri: ev.target?.result as string, type: f.type.startsWith('video') ? 'video' : 'photo' }]);
                                    r.readAsDataURL(f);
                                });
                            }} />
                            <Button variant="secondary" className="ml-auto h-12 rounded-full bg-purple-600 hover:bg-purple-500 font-bold px-6" onClick={handleVibify} disabled={isVibifying}>
                                {isVibifying ? <Loader2 className="animate-spin mr-2"/> : <Sparkles className="w-4 h-4 mr-2"/>} Vibify
                            </Button>
                        </div>
                    </div>
                    <DialogFooter className="flex-row gap-2">
                        <DialogClose asChild><Button variant="ghost" className="flex-1 rounded-full h-12 font-bold">Discard</Button></DialogClose>
                        <Button className="flex-[2] rounded-full h-12 font-bold bg-white text-black hover:bg-zinc-200" onClick={() => { onPost({ id: Date.now(), user: { name: "You", avatar: "https://picsum.photos/id/237/40/40" }, timestamp: new Date(), text, media: media.map(m => m.uri), mediaTypes: media.map(m => m.type), likes: 0, waves: 0, type: 'post' }); onOpenChange(false); }}>Share Vibe</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <CameraView open={isCameraOpen} onOpenChange={setIsCameraOpen} onUsePhoto={(u) => setMedia(p => [...p, { uri: u, type: 'photo' }])} onUseVideo={(u) => setMedia(p => [...p, { uri: u, type: 'video' }])} />
        </>
    );
};

export function VibeFeed({ posts, setPosts }: { posts: any[], setPosts: React.Dispatch<React.SetStateAction<any[]>> }) {
    const [viewingPost, setViewingPost] = useState<any | null>(null);
    const [activeCall, setActiveCall] = useState<CallTarget | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleInteract = (post: any) => {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: (p.likes || 0) + 1 } : p));
    };

    const sortedPosts = useMemo(() => [...posts].sort((a, b) => b.timestamp - a.timestamp), [posts]);

    return (
        <div className="w-full max-w-lg mx-auto py-6 space-y-10 px-4">
            {sortedPosts.map(p => (
                <div key={p.id} className="h-[85vh] min-h-[600px] w-full">
                    <PostCard post={p} onDelete={(id) => setPosts(prev => prev.filter(x => x.id !== id))} onInteract={handleInteract} onOpen={setViewingPost} onCall={setActiveCall} />
                </div>
            ))}
            <LiveStreamViewer post={viewingPost?.type === 'live' ? viewingPost : null} open={viewingPost?.type === 'live'} onOpenChange={(o) => !o && setViewingPost(null)} />
            <AppCall open={!!activeCall} onOpenChange={(o) => !o && setActiveCall(null)} target={activeCall} />
        </div>
    );
}