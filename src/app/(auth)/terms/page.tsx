import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Link href="/login">
        <Button variant="ghost" size="sm" className="mb-6 -ml-3 gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Button>
      </Link>

      <h1 className="text-3xl font-headline font-bold mb-2">Terms &amp; Conditions</h1>
      <p className="text-sm text-muted-foreground mb-8">
        This is placeholder text, not reviewed by legal counsel. Replace this page with Moood's
        actual Terms of Service before launch.
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="font-bold text-foreground mb-1">1. The Platform</h2>
          <p>Moood is a platform connecting users with third-party partners for products, services, wellness content, rides, and events. Moood is not responsible for the quality, safety, or legality of products or services offered by third-party partners.</p>
        </section>
        <section>
          <h2 className="font-bold text-foreground mb-1">2. AI-Generated Content</h2>
          <p>Aura Analysis, Naya, and related features use AI to generate cosmetic and wellness guidance. This guidance is not a medical diagnosis or treatment plan. Always consult a qualified professional for medical concerns.</p>
        </section>
        <section>
          <h2 className="font-bold text-foreground mb-1">3. Wallet &amp; Payments</h2>
          <p>The Moood Wallet and MOOOD tokens are used for in-app transfers, purchases, and virtual gifting. Balances are non-refundable except where required by law.</p>
        </section>
        <section>
          <h2 className="font-bold text-foreground mb-1">4. Your Account</h2>
          <p>You're responsible for keeping your account credentials secure and for all activity under your account.</p>
        </section>
      </div>
    </div>
  );
}
