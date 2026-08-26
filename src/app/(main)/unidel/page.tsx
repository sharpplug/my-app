"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bike,
  Footprints,
  GraduationCap,
  Loader2,
  MapPin,
  Package,
  PackageCheck,
  Rocket,
  Store,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-provider";
import { useRegional } from "@/contexts/language-provider";
import { subscribeToUserProfile, type UserProfile } from "@/lib/users";
import {
  CAMPUSES,
  campusesForRegion,
  getCampus,
  getCampusPoint,
  quoteDeliveryFee,
  UNIDEL_FEE_PERCENT,
  type Campus,
  type CampusPointKind,
} from "@/lib/campuses";
import {
  acceptDelivery,
  cancelDelivery,
  completeDelivery,
  createDelivery,
  markDeliveryPickedUp,
  registerRunner,
  subscribeToDropoffCode,
  subscribeToMyDeliveries,
  subscribeToMyRunnerJobs,
  subscribeToMyRunnerProfile,
  subscribeToOpenDeliveries,
  type Delivery,
  type DeliveryStatus,
  type RunnerMode,
  type RunnerProfile,
} from "@/lib/deliveries";

const POINT_KIND_ICON: Record<CampusPointKind, React.ElementType> = {
  vendor: Store,
  residence: MapPin,
  academic: GraduationCap,
};

const RUNNER_MODES: { id: RunnerMode; label: string; icon: React.ElementType }[] = [
  { id: "foot", label: "On foot", icon: Footprints },
  { id: "bike", label: "Bicycle", icon: Bike },
  { id: "scooter", label: "Scooter", icon: Zap },
];

const STATUS_LABEL: Record<DeliveryStatus, string> = {
  open: "Looking for a runner",
  accepted: "Runner assigned",
  picked_up: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_STYLE: Record<DeliveryStatus, string> = {
  open: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  accepted: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  picked_up: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  delivered: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const StatusBadge = ({ status }: { status: DeliveryStatus }) => (
  <Badge variant="outline" className={cn("rounded-full font-normal", STATUS_STYLE[status])}>
    {STATUS_LABEL[status]}
  </Badge>
);

/** Pickup -> drop-off, resolved from the campus directory. Falls back to the
 * raw id so a delivery placed against a campus point that has since been
 * renamed or retired still renders something. */
const Route = ({ delivery }: { delivery: Delivery }) => {
  const pickup = getCampusPoint(delivery.campusId, delivery.pickupPointId);
  const dropoff = getCampusPoint(delivery.campusId, delivery.dropoffPointId);
  return (
    <p className="text-sm text-muted-foreground">
      {pickup?.name ?? delivery.pickupPointId} <span className="mx-1">&rarr;</span>{" "}
      {dropoff?.name ?? delivery.dropoffPointId}
    </p>
  );
};

/**
 * Only the customer can read this (firestore.rules gates the subcollection),
 * so it renders on their own delivery card and nowhere else. Hidden once the
 * job is finished - a spent code is just noise.
 */
const DropoffCode = ({ deliveryId }: { deliveryId: string }) => {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => subscribeToDropoffCode(deliveryId, setCode), [deliveryId]);

  if (!code) return null;
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2">
      <span className="text-xs text-muted-foreground">Give the runner this code</span>
      <span className="font-mono text-lg font-semibold tracking-[0.3em]">{code}</span>
    </div>
  );
};

export default function UnidelPage() {
  const { user } = useAuth();
  const { currency, region } = useRegional();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myDeliveries, setMyDeliveries] = useState<Delivery[]>([]);
  const [runner, setRunner] = useState<RunnerProfile | null>(null);
  const [runnerLoaded, setRunnerLoaded] = useState(false);
  const [myJobs, setMyJobs] = useState<Delivery[]>([]);
  const [openJobs, setOpenJobs] = useState<Delivery[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubs = [
      subscribeToUserProfile(user.uid, setProfile),
      subscribeToMyDeliveries(user.uid, setMyDeliveries),
      subscribeToMyRunnerJobs(user.uid, setMyJobs),
      subscribeToMyRunnerProfile(user.uid, (p) => {
        setRunner(p);
        setRunnerLoaded(true);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [user]);

  // The job board only exists once you're a registered runner, and only for
  // the campus you registered on.
  useEffect(() => {
    if (!runner?.campusId) {
      setOpenJobs([]);
      return;
    }
    return subscribeToOpenDeliveries(runner.campusId, setOpenJobs);
  }, [runner?.campusId]);

  const activeDeliveries = myDeliveries.filter(
    (d) => d.status === "open" || d.status === "accepted" || d.status === "picked_up"
  );
  const pastDeliveries = myDeliveries.filter(
    (d) => d.status === "delivered" || d.status === "cancelled"
  );
  const activeJobs = myJobs.filter((d) => d.status === "accepted" || d.status === "picked_up");
  const claimable = openJobs.filter((d) => d.customerUid !== user?.uid);

  return (
    <div className="p-4 pb-24 space-y-4">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <Package className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-headline">UNIDEL</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Campus delivery, run by students. Post a job, or earn between lectures.
        </p>
      </header>

      <Tabs defaultValue="send">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="send">Send</TabsTrigger>
          <TabsTrigger value="orders">
            My Orders{activeDeliveries.length > 0 ? ` (${activeDeliveries.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="run">
            Run{activeJobs.length > 0 ? ` (${activeJobs.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-4">
          <SendPanel profile={profile} currencySymbol={currency.symbol} region={region} />
        </TabsContent>

        <TabsContent value="orders" className="mt-4 space-y-3">
          {myDeliveries.length === 0 && (
            <EmptyState
              icon={Package}
              title="No deliveries yet"
              body="Anything you send shows up here, with a code to hand the runner on arrival."
            />
          )}
          {activeDeliveries.map((delivery) => (
            <CustomerCard
              key={delivery.id}
              delivery={delivery}
              currencySymbol={currency.symbol}
              onError={(message) =>
                toast({ variant: "destructive", title: "Couldn't cancel", description: message })
              }
            />
          ))}
          {pastDeliveries.length > 0 && (
            <>
              <Separator className="my-4" />
              <p className="text-xs uppercase tracking-wide text-muted-foreground">History</p>
              {pastDeliveries.map((delivery) => (
                <CustomerCard
                  key={delivery.id}
                  delivery={delivery}
                  currencySymbol={currency.symbol}
                  onError={() => undefined}
                />
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="run" className="mt-4 space-y-3">
          {!runnerLoaded && <Skeleton className="h-40 w-full rounded-2xl" />}
          {runnerLoaded && !runner && (
            <RunnerSignup profile={profile} region={region} currencySymbol={currency.symbol} />
          )}
          {runnerLoaded && runner && (
            <RunnerPanel
              runner={runner}
              activeJobs={activeJobs}
              claimable={claimable}
              completed={myJobs.filter((d) => d.status === "delivered")}
              currencySymbol={currency.symbol}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const EmptyState = ({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
}) => (
  <Card className="rounded-2xl border-dashed">
    <CardContent className="p-8 text-center space-y-2">
      <Icon className="w-8 h-8 mx-auto text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </CardContent>
  </Card>
);

function SendPanel({
  profile,
  currencySymbol,
  region,
}: {
  profile: UserProfile | null;
  currencySymbol: string;
  region: ReturnType<typeof useRegional>["region"];
}) {
  const { toast } = useToast();
  const campuses = useMemo(() => campusesForRegion(region), [region]);
  const [campusId, setCampusId] = useState(campuses[0]?.id ?? CAMPUSES[0].id);
  const [pickupPointId, setPickupPointId] = useState("");
  const [dropoffPointId, setDropoffPointId] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [express, setExpress] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);

  const campus = getCampus(campusId) ?? campuses[0];

  // Switching campus invalidates whatever points were picked on the old one.
  useEffect(() => {
    setPickupPointId("");
    setDropoffPointId("");
  }, [campusId]);

  const fee = campus ? quoteDeliveryFee(campus, express) : 0;

  const handlePlace = async () => {
    if (!profile) return;
    if (!pickupPointId || !dropoffPointId) {
      toast({
        variant: "destructive",
        title: "Pick both ends",
        description: "Choose where the runner collects from and where it's going.",
      });
      return;
    }
    if (pickupPointId === dropoffPointId) {
      toast({
        variant: "destructive",
        title: "Same place twice",
        description: "Pickup and drop-off need to be different points.",
      });
      return;
    }
    if (!itemDescription.trim()) {
      toast({
        variant: "destructive",
        title: "What are they collecting?",
        description: "A runner needs to know what to ask for.",
      });
      return;
    }

    setIsPlacing(true);
    try {
      await createDelivery({
        campusId,
        pickupPointId,
        dropoffPointId,
        itemDescription: itemDescription.trim(),
        notes: notes.trim(),
        express,
      });
      toast({
        title: "Posted to the board",
        description: "Runners on your campus can see it now. Your code is on the order.",
      });
      setItemDescription("");
      setNotes("");
      setPickupPointId("");
      setDropoffPointId("");
      setExpress(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Couldn't post that",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <Label>Campus</Label>
          <Select value={campusId} onValueChange={setCampusId}>
            <SelectTrigger className="h-12 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {campuses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} &middot; {c.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <PointSelect
          label="Collect from"
          campus={campus}
          value={pickupPointId}
          onChange={setPickupPointId}
          exclude={dropoffPointId}
        />
        <PointSelect
          label="Deliver to"
          campus={campus}
          value={dropoffPointId}
          onChange={setDropoffPointId}
          exclude={pickupPointId}
        />

        <div className="space-y-2">
          <Label htmlFor="unidel-item">What is it?</Label>
          <Input
            id="unidel-item"
            className="h-12 rounded-xl"
            placeholder="Lunch order, printed notes, charger..."
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
            maxLength={280}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="unidel-notes">Anything the runner should know?</Label>
          <Textarea
            id="unidel-notes"
            className="rounded-xl"
            placeholder="Paid for already, under the name Amina. Room 214."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={280}
          />
        </div>

        <button
          type="button"
          onClick={() => setExpress((v) => !v)}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left",
            express ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
          )}
        >
          <div className={cn("p-2 rounded-lg", express ? "bg-primary text-primary-foreground" : "bg-muted")}>
            <Rocket className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Express</p>
            <p className="text-xs text-muted-foreground">Pushed to the top of the board</p>
          </div>
          <span className="text-sm text-muted-foreground">+50%</span>
        </button>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Delivery fee</p>
            <p className="text-xs text-muted-foreground">
              Held until drop-off is confirmed
            </p>
          </div>
          <p className="text-2xl font-semibold">
            {currencySymbol} {fee}
          </p>
        </div>

        <Button
          className="w-full h-12 rounded-xl"
          onClick={handlePlace}
          disabled={isPlacing || !profile}
        >
          {isPlacing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post delivery"}
        </Button>
      </CardContent>
    </Card>
  );
}

function PointSelect({
  label,
  campus,
  value,
  onChange,
  exclude,
}: {
  label: string;
  campus: Campus | undefined;
  value: string;
  onChange: (value: string) => void;
  exclude: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-12 rounded-xl">
          <SelectValue placeholder="Pick a point on campus" />
        </SelectTrigger>
        <SelectContent>
          {(campus?.points ?? [])
            .filter((point) => point.id !== exclude)
            .map((point) => {
              const Icon = POINT_KIND_ICON[point.kind];
              return (
                <SelectItem key={point.id} value={point.id}>
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    {point.name}
                  </span>
                </SelectItem>
              );
            })}
        </SelectContent>
      </Select>
    </div>
  );
}

function CustomerCard({
  delivery,
  currencySymbol,
  onError,
}: {
  delivery: Delivery;
  currencySymbol: string;
  onError: (message: string) => void;
}) {
  const [isCancelling, setIsCancelling] = useState(false);
  // Once a runner is holding the goods it stops being a refund and starts
  // being a dispute, so the button goes away at pickup - same rule the
  // server enforces in cancelDelivery.
  const canCancel = delivery.status === "open" || delivery.status === "accepted";

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await cancelDelivery(delivery.id);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{delivery.itemDescription}</p>
            <Route delivery={delivery} />
          </div>
          <StatusBadge status={delivery.status} />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {getCampus(delivery.campusId)?.shortName ?? delivery.campusId}
            {delivery.express ? " · Express" : ""}
          </span>
          <span className="font-medium">
            {currencySymbol} {delivery.fee}
          </span>
        </div>

        {delivery.runnerHandle && delivery.status !== "cancelled" && (
          <p className="text-sm text-muted-foreground">Runner: @{delivery.runnerHandle}</p>
        )}

        {(delivery.status === "accepted" || delivery.status === "picked_up") && (
          <DropoffCode deliveryId={delivery.id} />
        )}

        {canCancel && (
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel & refund"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function RunnerSignup({
  profile,
  region,
  currencySymbol,
}: {
  profile: UserProfile | null;
  region: ReturnType<typeof useRegional>["region"];
  currencySymbol: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const campuses = useMemo(() => campusesForRegion(region), [region]);
  const [campusId, setCampusId] = useState(campuses[0]?.id ?? CAMPUSES[0].id);
  const [mode, setMode] = useState<RunnerMode>("foot");
  const [isSaving, setIsSaving] = useState(false);

  const campus = getCampus(campusId);
  const sampleEarning = campus
    ? Math.round(quoteDeliveryFee(campus, false) * (1 - UNIDEL_FEE_PERCENT))
    : 0;

  const handleRegister = async () => {
    if (!user || !profile) return;
    setIsSaving(true);
    try {
      await registerRunner({
        ownerUid: user.uid,
        ownerHandle: profile.handle,
        ownerName: profile.displayName,
        campusId,
        mode,
      });
      toast({ title: "You're a runner", description: "Open jobs on your campus are below." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Couldn't register",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-1">
          <p className="font-medium">Run deliveries on your campus</p>
          <p className="text-sm text-muted-foreground">
            Pick up a job between lectures. You keep {Math.round((1 - UNIDEL_FEE_PERCENT) * 100)}% of
            every fee &mdash; about {currencySymbol} {sampleEarning} on a standard run here.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Your campus</Label>
          <Select value={campusId} onValueChange={setCampusId}>
            <SelectTrigger className="h-12 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {campuses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} &middot; {c.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>How you get around</Label>
          <div className="grid grid-cols-3 gap-2">
            {RUNNER_MODES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setMode(option.id)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-xl border text-xs transition-colors",
                  mode === option.id
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                )}
              >
                <option.icon className="w-5 h-5" />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          className="w-full h-12 rounded-xl"
          onClick={handleRegister}
          disabled={isSaving || !profile}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start running"}
        </Button>
      </CardContent>
    </Card>
  );
}

function RunnerPanel({
  runner,
  activeJobs,
  claimable,
  completed,
  currencySymbol,
}: {
  runner: RunnerProfile;
  activeJobs: Delivery[];
  claimable: Delivery[];
  completed: Delivery[];
  currencySymbol: string;
}) {
  const earned = completed.reduce((sum, job) => sum + (job.runnerShare ?? 0), 0);

  return (
    <div className="space-y-3">
      <Card className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">
              {getCampus(runner.campusId)?.shortName ?? runner.campusId} runner
            </p>
            <p className="text-2xl font-semibold">
              {currencySymbol} {earned.toFixed(2)}
            </p>
            <p className="text-xs opacity-80">
              earned over {completed.length} run{completed.length === 1 ? "" : "s"}
            </p>
          </div>
          <PackageCheck className="w-10 h-10 opacity-80" />
        </CardContent>
      </Card>

      {activeJobs.length > 0 && (
        <>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Your active runs</p>
          {activeJobs.map((job) => (
            <RunnerJobCard key={job.id} job={job} currencySymbol={currencySymbol} claimed />
          ))}
        </>
      )}

      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        Open on {getCampus(runner.campusId)?.shortName ?? runner.campusId}
      </p>
      {claimable.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nothing on the board"
          body="No unclaimed deliveries on your campus right now. Check back between classes."
        />
      ) : (
        claimable.map((job) => (
          <RunnerJobCard key={job.id} job={job} currencySymbol={currencySymbol} claimed={false} />
        ))
      )}
    </div>
  );
}

function RunnerJobCard({
  job,
  currencySymbol,
  claimed,
}: {
  job: Delivery;
  currencySymbol: string;
  claimed: boolean;
}) {
  const { toast } = useToast();
  const [isBusy, setIsBusy] = useState(false);
  const [code, setCode] = useState("");

  const run = async (action: () => Promise<void>) => {
    setIsBusy(true);
    try {
      await action();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "That didn't go through",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Card className={cn("rounded-2xl", job.express && !claimed && "border-primary/40")}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{job.itemDescription}</p>
            <Route delivery={job} />
          </div>
          {job.express && (
            <Badge variant="outline" className="rounded-full border-primary/30 text-primary">
              <Rocket className="w-3 h-3 mr-1" />
              Express
            </Badge>
          )}
        </div>

        {job.notes && <p className="text-sm text-muted-foreground">&ldquo;{job.notes}&rdquo;</p>}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">@{job.customerHandle}</span>
          <span className="font-medium">
            You earn {currencySymbol} {job.runnerShare.toFixed(2)}
          </span>
        </div>

        {!claimed && (
          <Button
            className="w-full rounded-xl"
            disabled={isBusy}
            onClick={() => run(() => acceptDelivery(job.id))}
          >
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Accept job"}
          </Button>
        )}

        {claimed && job.status === "accepted" && (
          <Button
            className="w-full rounded-xl"
            disabled={isBusy}
            onClick={() => run(() => markDeliveryPickedUp(job.id))}
          >
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "I've collected it"}
          </Button>
        )}

        {claimed && job.status === "picked_up" && (
          <div className="space-y-2">
            <Label htmlFor={`code-${job.id}`} className="text-xs text-muted-foreground">
              Ask for the customer&apos;s 4-digit code to finish
            </Label>
            <div className="flex gap-2">
              <Input
                id={`code-${job.id}`}
                className="h-11 rounded-xl font-mono tracking-[0.3em] text-center"
                inputMode="numeric"
                maxLength={4}
                placeholder="0000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
              <Button
                className="h-11 rounded-xl"
                disabled={isBusy || code.length !== 4}
                onClick={() => run(() => completeDelivery(job.id, code))}
              >
                {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
