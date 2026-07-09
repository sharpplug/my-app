"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X, Download, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VibePost } from "@/lib/vibes";
import { downloadMedia, shareMedia } from "@/lib/media-share";

const STORY_DURATION_MS = 5000;

type Frame = { post: VibePost; media: string | null; mediaType: "photo" | "video" | "360-photo" | null };

/** Full-screen, tap-through Story viewer for one author's active (24h)
 * Stories - see src/lib/vibes.ts. Multiple Story posts from the same
 * author are flattened into one sequence of frames, Instagram-style, with
 * a segmented progress bar and an auto-advance timer per frame. */
export default function StoryViewer({
  authorName,
  authorAvatar,
  stories,
  initialIndex = 0,
  onClose,
}: {
  authorName: string;
  authorAvatar: string | null;
  stories: VibePost[];
  initialIndex?: number;
  onClose: () => void;
}) {
  const frames: Frame[] = useMemo(() => {
    const out: Frame[] = [];
    for (const post of stories) {
      if (post.media.length === 0) {
        out.push({ post, media: null, mediaType: null });
      } else {
        post.media.forEach((m, i) => out.push({ post, media: m, mediaType: post.mediaTypes[i] ?? "photo" }));
      }
    }
    return out;
  }, [stories]);

  const [index, setIndex] = useState(Math.min(initialIndex, Math.max(frames.length - 1, 0)));
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const frame = frames[index];

  const goNext = () => {
    if (index >= frames.length - 1) {
      onClose();
    } else {
      setIndex((i) => i + 1);
      setProgress(0);
    }
  };

  const goPrev = () => {
    if (index === 0) return;
    setIndex((i) => i - 1);
    setProgress(0);
  };

  useEffect(() => {
    if (isPaused || !frame) return;
    const tickMs = 50;
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = p + (tickMs / STORY_DURATION_MS) * 100;
        if (next >= 100) {
          goNext();
          return 0;
        }
        return next;
      });
    }, tickMs);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isPaused, frame]);

  if (!frame) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full h-full max-w-full p-0 m-0 border-0 bg-black text-white flex flex-col overflow-hidden">
        <div className="relative flex-1" onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)}>
          {frame.media ? (
            frame.mediaType === "video" ? (
              <video src={frame.media} className="w-full h-full object-contain bg-black" autoPlay playsInline onEnded={goNext} />
            ) : (
              <Image src={frame.media} alt="Story" fill className="object-contain bg-black" />
            )
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-700 to-indigo-900 flex items-center justify-center p-8">
              <p className="text-2xl font-bold text-center">{frame.post.text}</p>
            </div>
          )}

          <div className="absolute top-0 left-0 right-0 p-3 flex gap-1.5 z-20">
            {frames.map((f, i) => (
              <div key={i} className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden">
                <div
                  className="h-full bg-white"
                  style={{ width: i < index ? "100%" : i === index ? `${progress}%` : "0%" }}
                />
              </div>
            ))}
          </div>

          <div className="absolute top-6 left-3 right-3 flex items-center justify-between z-20">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8 border-2 border-white/20">
                <AvatarImage src={authorAvatar || undefined} />
                <AvatarFallback>{authorName.charAt(0)}</AvatarFallback>
              </Avatar>
              <p className="font-bold text-sm shadow-black [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">{authorName}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
          </div>

          {frame.media && (
            <div className="absolute bottom-6 right-3 flex gap-2 z-20">
              <Button
                variant="ghost"
                size="icon"
                className="bg-black/40 hover:bg-black/60"
                onClick={() => frame.media && downloadMedia(frame.media, `moood-story-${frame.post.id}`)}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="bg-black/40 hover:bg-black/60"
                onClick={() => frame.media && shareMedia(frame.media, `${authorName}'s Story`, frame.post.text)}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          )}

          <button className={cn("absolute left-0 top-0 bottom-0 w-1/3 z-10")} onClick={goPrev} aria-label="Previous story" />
          <button className={cn("absolute right-0 top-0 bottom-0 w-2/3 z-10")} onClick={goNext} aria-label="Next story" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
