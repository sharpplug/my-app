"use client";

import React, { useState, useTransition, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, Sparkles, Heart, Send, BrainCircuit, Gift, Waves, MapPin, Users, Phone, X, Music, Trash2, Loader2, BookOpen, Megaphone } from "lucide-react";
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { generateVibeVideoAction, generateStoryAction, analyzeVibePost, AnalyzeVibePostOutput, recommendVibes } from "@/app/actions";
import { getIdToken } from "@/lib/get-id-token";
import CameraView from "./camera-view";
import { Badge } from "./ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import AppCall, { CallTarget } from "./app-call";
import type { UserProfile } from "@/lib/users";
import {
    subscribeToVibePosts,
    createVibePost,
    deleteVibePost,
    toggleLike,
    toggleWave,
    subscribeToComments,
    addComment,
    type VibePost,
    type VibeComment,
} from "@/lib/vibes";
import { sendGift, spendFunds } from "@/lib/wallet";
import { useActiveAds, type Ad } from "@/lib/ads";
import { Timestamp } from "firebase/firestore";

const PanoramaView = lazy(() => import('./panorama-view'));

const sampleMusic = [
    { title: "Desert Mirage", artist: "Nadia" },
    { title: "City Lights", artist: "DXB Flow" },
];

const virtualGifts = [
    { id: 'rose', name: 'Rose', icon: '🌹', price: 5 },
    { id: 'coffee', name: 'Coffee', icon: '☕', price: 15 },
    { id: 'heart', name: 'Big Heart', icon: '💖', price: 50 },
    { id: 'crown', name: 'Crown', icon: '👑', price: 100 },
    { id: 'trophy', name: 'Diamond Trophy', icon: '💎', price: 500 },
];

const formatTimestamp = (timestamp: Timestamp | null, now: Date): string => {
    if (!timestamp) return "just now";
    const postDate = timestamp.toDate();
    const seconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

const LiveStreamViewer = ({ post, open, onOpenChange, myProfile }: { post: VibePost | null; open: boolean; onOpenChange: (open: boolean) => void; myProfile: UserProfile | null }) => {
    const [comments, setComments] = useState<VibeComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isGiftMenuOpen, setIsGiftMenuOpen] = useState(false);
    const [isBuying, setIsBuying] = useState(false);
    const { toast } = useToast();

    const handleBuyNow = async () => {
        if (!post?.product || !myProfile) return;
        const amount = parseFloat(post.product.price.replace(/[^0-9.]/g, ''));
        if (!amount) return;
        setIsBuying(true);
        try {
            await spendFunds(myProfile.uid, post.product.name, amount);
            toast({ title: "Purchased!", description: `${post.product.name} bought from @${post.authorHandle}'s live stream.` });
        } catch (err) {
            toast({ variant: 'destructive', title: "Purchase Failed", description: err instanceof Error ? err.message : "Please try again." });
        } finally {
            setIsBuying(false);
        }
    };

    useEffect(() => {
        if (!post || !open) return;
        return subscribeToComments(post.id, setComments);
    }, [post, open]);

    const handleSend = async () => {
        if (!newComment.trim() || !post || !myProfile) return;
        const text = newComment;
        setNewComment('');
        try {
            await addComment(post.id, { uid: myProfile.uid, handle: myProfile.handle }, text, 'chat');
        } catch {
            toast({ variant: 'destructive', title: "Couldn't send", description: "Please try again." });
        }
    };

    const handleSendGift = async (gift: typeof virtualGifts[0]) => {
        if (!post || !myProfile) return;
        setIsGiftMenuOpen(false);
        try {
            await sendGift(
                { uid: myProfile.uid, handle: myProfile.handle },
                { uid: post.authorUid, handle: post.authorHandle },
                gift.name,
                gift.price
            );
            await addComment(post.id, { uid: myProfile.uid, handle: myProfile.handle }, `sent ${gift.name} ${gift.icon}`, 'gift', gift.name);
            toast({ title: "Gift Sent!", description: `${gift.icon} ${gift.name} sent to @${post.authorHandle}.` });
        } catch (err) {
            toast({ variant: 'destructive', title: "Gift Failed", description: err instanceof Error ? err.message : "Please try again." });
        }
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
                                <Badge variant="secondary" className="bg-black/40"><Users className="w-3 h-3 mr-1" /> {post.viewers ?? 0}</Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <Avatar className="w-8 h-8 border-2 border-white/20"><AvatarImage src={post.authorPhotoURL || undefined} /><AvatarFallback>{post.authorDisplayName.charAt(0)}</AvatarFallback></Avatar>
                                <p className="font-bold shadow-black [text-shadow:0_1px_4px_rgba(0,0,0,0.8)]">{post.authorDisplayName}</p>
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
                            <Button size="sm" className="w-full h-7 text-[10px] mt-1" onClick={handleBuyNow} disabled={isBuying}>
                                {isBuying ? <Loader2 className="w-3 h-3 animate-spin" /> : "Buy Now"}
                            </Button>
                        </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex flex-col">
                        <ScrollArea className="h-32 mb-4">
                            <div className="flex flex-col gap-1 pr-4">
                                {comments.map(c => (
                                    <div key={c.id} className={cn("text-sm p-1.5 rounded-lg max-w-fit", c.type === 'gift' ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-black/20")}>
                                        <span className="font-bold mr-2 text-primary">@{c.authorHandle}:</span> {c.text}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
                            <Input placeholder="Say something..." className="rounded-full bg-black/40 border-white/20" value={newComment} onChange={e => setNewComment(e.target.value)} />
                            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => setIsGiftMenuOpen(true)}><Gift className="text-amber-400"/></Button>
                            <Button type="submit" variant="ghost" size="icon" className="h-10 w-10 rounded-full" disabled={!newComment.trim()}><Send className="w-4 h-4"/></Button>
                        </form>
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

const PostCard = ({ post, myUid, onOpen, onCall, onDelete }: { post: VibePost; myUid?: string; onOpen: (post: VibePost) => void; onCall: (target: CallTarget) => void; onDelete: (post: VibePost) => void; }) => {
    const isHotspot = post.type.startsWith('hotspot');
    const isLive = post.type === 'live';
    const isMine = post.authorUid === myUid;
    const isLiked = myUid ? post.likedBy.includes(myUid) : false;
    const isWaved = myUid ? post.wavedBy.includes(myUid) : false;
    const [now, setNow] = useState(new Date());
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const handleCallAction = (e: React.MouseEvent) => {
        e.stopPropagation();
        onCall({ name: post.authorDisplayName, avatar: post.authorPhotoURL || undefined, type: isHotspot ? 'business' : 'user' });
    }

    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (myUid) toggleLike(post.id, myUid).catch(() => {});
    };

    const handleWave = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (myUid) toggleWave(post.id, myUid).catch(() => {});
    };

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
                <Avatar className="w-10 h-10 border-2 border-white/20"><AvatarImage src={post.authorPhotoURL || undefined}/><AvatarFallback>{post.authorDisplayName.charAt(0)}</AvatarFallback></Avatar>
                <div>
                    <p className="font-bold text-sm shadow-black [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">{isHotspot && post.businessName ? post.businessName : post.authorDisplayName}</p>
                    <p className="text-[10px] text-white/60">{isLive ? 'Live Now' : formatTimestamp(post.createdAt, now)}</p>
                </div>
                {isHotspot && <Badge className="bg-amber-500/20 text-amber-300 ml-auto border-amber-500/20">Sponsored</Badge>}
                {isLive && <Badge variant="destructive" className="ml-auto animate-pulse">LIVE</Badge>}
                {isMine && !isHotspot && !isLive && (
                    <button className="ml-auto p-1.5 rounded-full bg-black/30 hover:bg-black/50" onClick={(e) => { e.stopPropagation(); onDelete(post); }}>
                        <Trash2 className="w-4 h-4 text-white/70" />
                    </button>
                )}
            </div>

            <div className="absolute bottom-6 left-6 right-20 z-10">
                <p className="text-sm text-white/90 line-clamp-3 mb-2">{post.text}</p>
                {isHotspot && <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-300"><MapPin className="w-3 h-3"/> {post.location}</div>}
                {isLive && <div className="flex items-center gap-2 text-[10px] font-bold text-white/70"><Users className="w-3 h-3"/> {post.viewers ?? 0} watching</div>}
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
                <button className="group flex flex-col items-center gap-1" onClick={handleLike}>
                    <Heart className={cn("w-7 h-7 transition-all group-hover:scale-110", isLiked && "fill-red-500 text-red-500")} />
                    <span className="text-[10px] font-bold">{post.likes || 0}</span>
                </button>
                <button className="group flex flex-col items-center gap-1" onClick={handleWave}>
                    <Waves className={cn("w-7 h-7 group-hover:scale-110 transition-transform", isWaved && "text-cyan-400")} />
                    <span className="text-[10px] font-bold">{post.waves || 0}</span>
                </button>
            </div>
            <AiAnalysisDialog post={post} open={isAnalyzing} onOpenChange={setIsAnalyzing} />
        </div>
    );
};

/** A real, partner-paid promotion interspersed into the feed (see
 * src/lib/ads.ts) - it stops appearing on its own once the ad's paid
 * duration expires, since useActiveAds() only ever returns active ads. */
const AdCard = ({ ad }: { ad: Ad }) => {
    const router = useRouter();
    return (
        <div className="h-full w-full relative rounded-[2rem] overflow-hidden border border-amber-400/20 bg-black shadow-2xl cursor-pointer" onClick={() => router.push(ad.linkPath)}>
            {ad.image ? (
                <Image src={ad.image} alt={ad.title} fill className="object-cover opacity-70" />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-purple-600/20" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/50 pointer-events-none" />
            <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/20 gap-1"><Megaphone className="w-3 h-3" /> Promoted</Badge>
                <span className="text-[10px] text-white/50">@{ad.ownerHandle}</span>
            </div>
            <div className="absolute bottom-6 left-6 right-6 z-10 space-y-3">
                <p className="text-2xl font-black text-white leading-tight">{ad.title}</p>
                <p className="text-sm text-white/80 line-clamp-3">{ad.description}</p>
                <Button
                    className="w-full h-12 rounded-xl font-bold bg-amber-400 text-black hover:bg-amber-300"
                    onClick={(e) => { e.stopPropagation(); router.push(ad.linkPath); }}
                >
                    Learn More
                </Button>
            </div>
        </div>
    );
};

const AiAnalysisDialog = ({ post, open, onOpenChange }: { post: VibePost; open: boolean; onOpenChange: (open: boolean) => void; }) => {
    const [analysis, setAnalysis] = useState<AnalyzeVibePostOutput | null>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    useEffect(() => {
        if (open && post && !analysis) {
            startTransition(async () => {
                try {
                    const idToken = await getIdToken();
                    const res = await analyzeVibePost(idToken, { postText: post.text || post.businessName || '', mediaHint: post.hint });
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

export const CreateVibeDialog = ({ open, onOpenChange, profile }: { open: boolean, onOpenChange: (open: boolean) => void, profile: UserProfile | null }) => {
    const [text, setText] = useState("");
    const [media, setMedia] = useState<{ uri: string, type: 'photo' | 'video' }[]>([]);
    const [selectedMusic, setSelectedMusic] = useState<typeof sampleMusic[0] | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isVibifying, setIsVibifying] = useState(false);
    const [isStorifying, setIsStorifying] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleVibify = async () => {
        if (!text.trim()) { toast({ variant: "destructive", title: "Add a caption first!" }); return; }
        setIsVibifying(true);
        try {
            const photo = media.find(m => m.type === 'photo')?.uri;
            const idToken = await getIdToken();
            const res = await generateVibeVideoAction(idToken, { textPrompt: text, photoDataUri: photo });
            setMedia(prev => [...prev, { uri: res.videoDataUri, type: 'video' }]);
            toast({ title: "✨ Vibified!", description: "AI video generated successfully." });
        } catch (e) { toast({ variant: "destructive", title: "Vibify Offline", description: e instanceof Error ? e.message : undefined }); }
        finally { setIsVibifying(false); }
    };

    const handleStorify = async () => {
        if (!text.trim()) { toast({ variant: "destructive", title: "Add a prompt first!" }); return; }
        setIsStorifying(true);
        try {
            const idToken = await getIdToken();
            const res = await generateStoryAction(idToken, { prompt: text });
            setText(res.storyText);
            setMedia(prev => [...prev, { uri: res.imageDataUri, type: 'photo' }]);
            toast({ title: "✨ Story generated!", description: "Your prompt became a short story with cover art." });
        } catch (e) { toast({ variant: "destructive", title: "Story Generation Failed", description: e instanceof Error ? e.message : undefined }); }
        finally { setIsStorifying(false); }
    };

    const reset = () => {
        setText("");
        setMedia([]);
        setSelectedMusic(null);
    };

    const handleShare = async () => {
        if (!profile || !text.trim()) return;
        setIsPosting(true);
        try {
            await createVibePost(profile, {
                type: 'post',
                text,
                media: media.map(m => m.uri),
                mediaTypes: media.map(m => m.type),
            });
            reset();
            onOpenChange(false);
        } catch (e) {
            toast({ variant: "destructive", title: "Couldn't post", description: e instanceof Error ? e.message : "Please try again." });
        } finally {
            setIsPosting(false);
        }
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
                        <div className="flex flex-wrap gap-2">
                            {sampleMusic.map(m => (
                                <button
                                    key={m.title}
                                    type="button"
                                    onClick={() => setSelectedMusic(selectedMusic?.title === m.title ? null : m)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors",
                                        selectedMusic?.title === m.title ? "bg-purple-600 border-purple-500 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                                    )}
                                >
                                    <Music className="w-3 h-3" /> {m.title} · {m.artist}
                                </button>
                            ))}
                        </div>
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
                            <Button variant="secondary" className="h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 font-bold px-5" onClick={handleStorify} disabled={isStorifying}>
                                {isStorifying ? <Loader2 className="animate-spin mr-2"/> : <BookOpen className="w-4 h-4 mr-2"/>} AI Story
                            </Button>
                            <Button variant="secondary" className="ml-auto h-12 rounded-full bg-purple-600 hover:bg-purple-500 font-bold px-6" onClick={handleVibify} disabled={isVibifying}>
                                {isVibifying ? <Loader2 className="animate-spin mr-2"/> : <Sparkles className="w-4 h-4 mr-2"/>} Vibify
                            </Button>
                        </div>
                    </div>
                    <DialogFooter className="flex-row gap-2">
                        <DialogClose asChild><Button variant="ghost" className="flex-1 rounded-full h-12 font-bold" onClick={reset}>Discard</Button></DialogClose>
                        <Button className="flex-[2] rounded-full h-12 font-bold bg-white text-black hover:bg-zinc-200" onClick={handleShare} disabled={isPosting || !text.trim()}>
                            {isPosting ? <Loader2 className="animate-spin mr-2" /> : null} Share Vibe
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <CameraView open={isCameraOpen} onOpenChange={setIsCameraOpen} onUsePhoto={(u) => setMedia(p => [...p, { uri: u, type: 'photo' }])} onUseVideo={(u) => setMedia(p => [...p, { uri: u, type: 'video' }])} />
        </>
    );
};

export function VibeFeed({ profile }: { profile: UserProfile | null }) {
    const [posts, setPosts] = useState<VibePost[] | null>(null);
    const [viewingPost, setViewingPost] = useState<VibePost | null>(null);
    const [activeCall, setActiveCall] = useState<CallTarget | null>(null);
    const [isForYou, setIsForYou] = useState(false);
    const [isRanking, setIsRanking] = useState(false);
    const [rankedIds, setRankedIds] = useState<string[] | null>(null);
    const { toast } = useToast();
    const activeAds = useActiveAds();

    useEffect(() => subscribeToVibePosts(setPosts), []);

    const handleDelete = async (post: VibePost) => {
        try {
            await deleteVibePost(post.id);
        } catch {
            toast({ variant: 'destructive', title: "Couldn't delete", description: "Please try again." });
        }
    };

    const handleToggleForYou = async (checked: boolean) => {
        setIsForYou(checked);
        if (!checked || !posts || posts.length === 0) {
            setRankedIds(null);
            return;
        }
        setIsRanking(true);
        try {
            const likedTexts = posts.filter(p => profile && p.likedBy.includes(profile.uid) && p.text).map(p => p.text);
            const userPreferences = likedTexts.length > 0
                ? `Likes posts about: ${likedTexts.slice(0, 5).join("; ")}`
                : "No strong preferences yet - show a balanced, engaging mix.";
            const idToken = await getIdToken();
            const result = await recommendVibes(idToken, {
                userPreferences,
                availableVibes: posts.map(p => ({ id: p.id, text: p.text, hint: p.type })),
            });
            setRankedIds(result.recommendedVibeIds as string[]);
        } catch (err) {
            toast({ variant: 'destructive', title: "Couldn't personalize feed", description: err instanceof Error ? err.message : "Please try again." });
            setIsForYou(false);
        } finally {
            setIsRanking(false);
        }
    };

    const displayedPosts = useMemo(() => {
        if (!posts || !isForYou || !rankedIds) return posts;
        const byId = new Map(posts.map(p => [p.id, p]));
        const ranked = rankedIds.map(id => byId.get(id)).filter((p): p is VibePost => !!p);
        const remaining = posts.filter(p => !rankedIds.includes(p.id));
        return [...ranked, ...remaining];
    }, [posts, isForYou, rankedIds]);

    if (posts === null) {
        return (
            <div className="w-full max-w-lg mx-auto py-6 px-4">
                <Skeleton className="h-[70vh] min-h-[500px] w-full rounded-[2rem] bg-white/5" />
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="w-full max-w-lg mx-auto py-16 px-4 text-center text-white/60">
                <Sparkles className="w-10 h-10 mx-auto mb-4 text-white/30" />
                <p className="font-bold text-white/80">No vibes yet</p>
                <p className="text-sm mt-1">Be the first to share what's happening around you.</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-lg mx-auto py-6 space-y-6 px-4">
            <div className="flex items-center justify-center gap-2">
                <button
                    type="button"
                    onClick={() => handleToggleForYou(!isForYou)}
                    disabled={isRanking}
                    className={cn(
                        "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border transition-colors",
                        isForYou ? "bg-purple-600 border-purple-500 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    )}
                >
                    {isRanking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {isForYou ? "For You" : "Recent"}
                </button>
            </div>
            <div className="space-y-10">
                {(displayedPosts ?? posts).map((p, i) => (
                    <React.Fragment key={p.id}>
                        <div className="h-[85vh] min-h-[600px] w-full">
                            <PostCard post={p} myUid={profile?.uid} onDelete={handleDelete} onOpen={setViewingPost} onCall={setActiveCall} />
                        </div>
                        {(i + 1) % 4 === 0 && activeAds.length > 0 && (
                            <div className="h-[85vh] min-h-[600px] w-full">
                                <AdCard ad={activeAds[Math.floor(i / 4) % activeAds.length]} />
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
            <LiveStreamViewer post={viewingPost?.type === 'live' ? viewingPost : null} open={viewingPost?.type === 'live'} onOpenChange={(o) => !o && setViewingPost(null)} myProfile={profile} />
            <AppCall open={!!activeCall} onOpenChange={(o) => !o && setActiveCall(null)} target={activeCall} />
        </div>
    );
}
