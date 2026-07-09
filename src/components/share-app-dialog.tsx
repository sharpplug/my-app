"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Share2, Copy, Radio, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/lib/users";

/** Lets a user share the Moood app itself (not a specific post) via a QR
 * code, the device's native share sheet, an NFC tap, or a plain copied
 * link - previously there was no way to share the app at all from
 * Account. NFC uses the Web NFC API (NDEFReader), which is only available
 * on Chrome for Android over HTTPS; every other path degrades gracefully
 * when the browser doesn't support it. */
export default function ShareAppDialog({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile | null;
}) {
  const { toast } = useToast();
  const [shareUrl, setShareUrl] = useState("");
  const [nfcSupported, setNfcSupported] = useState(false);
  const [isNfcSharing, setIsNfcSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const base = window.location.origin;
    setShareUrl(profile?.handle ? `${base}/?ref=${encodeURIComponent(profile.handle)}` : base);
    setNfcSupported("NDEFReader" in window);
  }, [profile?.handle]);

  const shareText = "Join me on Moood - your vibe, your world.";

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Moood", text: shareText, url: shareUrl });
      } catch {
        // user cancelled - no toast needed
      }
    } else {
      handleCopy();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link Copied!", description: "Paste it anywhere to invite someone." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: "destructive", title: "Couldn't copy link" });
    }
  };

  const handleNfcShare = async () => {
    if (!nfcSupported) {
      toast({ variant: "destructive", title: "NFC Not Available", description: "Web NFC needs Chrome on an NFC-capable Android device." });
      return;
    }
    setIsNfcSharing(true);
    try {
      // NDEFReader is Chrome-for-Android-only and not yet in TS's DOM lib.
      const NDEFReaderCtor = (window as unknown as { NDEFReader: new () => { write(msg: unknown): Promise<void> } }).NDEFReader;
      const reader = new NDEFReaderCtor();
      await reader.write({ records: [{ recordType: "url", data: shareUrl }] });
      toast({ title: "Ready to Tap!", description: "Hold your phone near another NFC device to share Moood." });
    } catch (err) {
      toast({ variant: "destructive", title: "NFC Share Failed", description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setIsNfcSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:rounded-[2rem] max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Share2 className="w-5 h-5 text-primary" /> Share Moood</DialogTitle>
          <DialogDescription>Invite friends via QR code, NFC tap, or your phone's share sheet.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="p-4 bg-white rounded-2xl">
            {shareUrl && <QRCodeSVG value={shareUrl} size={180} level="M" />}
          </div>
          <p className="text-xs text-muted-foreground text-center break-all">{shareUrl}</p>
        </div>

        <div className="space-y-2">
          <Button className="w-full h-12 rounded-xl font-bold gap-2" onClick={handleNativeShare}>
            <Share2 className="w-4 h-4" /> Share via...
          </Button>
          <Button variant="outline" className="w-full h-12 rounded-xl font-bold gap-2" onClick={handleNfcShare} disabled={isNfcSharing}>
            <Radio className="w-4 h-4" /> {nfcSupported ? "Share via NFC Tap" : "NFC Not Supported Here"}
          </Button>
          <Button variant="outline" className="w-full h-12 rounded-xl font-bold gap-2" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />} Copy Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
