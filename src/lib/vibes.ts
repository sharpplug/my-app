import {
  doc,
  addDoc,
  deleteDoc,
  collection,
  runTransaction,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase-config";

// Stories (the top-bar carousel) and the main Vibes feed are both
// ephemeral, but on different clocks: a Story is meant to be a quick,
// in-the-moment share (24h, matches Snapchat/Instagram convention), while
// the main feed gives a post a bit longer to circulate (48h). Either way,
// "expired" only ever means "stopped appearing in the public feed/story
// bar" - subscribeToVibePosts/subscribeToActiveStories filter expiresAt >
// now, but the document itself is never deleted, so subscribeToMyVibePosts
// (the author's own archive) can still show it after it expires publicly.
export const STORY_WINDOW_MS = 24 * 60 * 60 * 1000;
export const FEED_WINDOW_MS = 48 * 60 * 60 * 1000;

export type VibePostType = "post" | "hotspot" | "hotspot-360" | "live";
export type VibeMediaType = "photo" | "video" | "360-photo";

export type VibePost = {
  id: string;
  authorUid: string;
  authorHandle: string;
  authorDisplayName: string;
  authorPhotoURL: string | null;
  type: VibePostType;
  /** A Story (24h window) vs a regular feed post (48h window) - see
   * STORY_WINDOW_MS/FEED_WINDOW_MS above. */
  isStory: boolean;
  text?: string;
  media: string[];
  mediaTypes: VibeMediaType[];
  businessName?: string;
  location?: string;
  hint?: string;
  viewers?: number;
  isShopping?: boolean;
  product?: { name: string; price: string; image: string };
  likes: number;
  waves: number;
  likedBy: string[];
  wavedBy: string[];
  createdAt: Timestamp | null;
  expiresAt: Timestamp | null;
};

export type VibeComment = {
  id: string;
  authorUid: string;
  authorHandle: string;
  text: string;
  type: "chat" | "gift";
  giftName?: string;
  createdAt: Timestamp | null;
};

const postsCol = () => collection(firestore, "vibePosts");
const postRef = (postId: string) => doc(firestore, "vibePosts", postId);
const commentsCol = (postId: string) => collection(firestore, "vibePosts", postId, "comments");

export async function createVibePost(
  author: { uid: string; handle: string; displayName: string; photoURL: string | null },
  input: {
    type: VibePostType;
    isStory?: boolean;
    text?: string;
    media?: string[];
    mediaTypes?: VibeMediaType[];
    businessName?: string;
    location?: string;
    hint?: string;
    viewers?: number;
    isShopping?: boolean;
    product?: { name: string; price: string; image: string };
  }
): Promise<string> {
  const now = Date.now();
  const isStory = input.isStory ?? false;
  const docRef = await addDoc(postsCol(), {
    authorUid: author.uid,
    authorHandle: author.handle,
    authorDisplayName: author.displayName,
    authorPhotoURL: author.photoURL,
    type: input.type,
    isStory,
    text: input.text || "",
    media: input.media || [],
    mediaTypes: input.mediaTypes || [],
    businessName: input.businessName || null,
    location: input.location || null,
    hint: input.hint || null,
    viewers: input.viewers ?? null,
    isShopping: input.isShopping ?? false,
    product: input.product ?? null,
    likes: 0,
    waves: 0,
    likedBy: [],
    wavedBy: [],
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(now + (isStory ? STORY_WINDOW_MS : FEED_WINDOW_MS)),
  });
  return docRef.id;
}

/** The main Vibes feed - active (non-expired), non-Story posts only.
 * Stories share the same collection, so this filters them out client-side
 * after the query rather than adding a second Firestore filter, avoiding a
 * composite index on (isStory, expiresAt). */
export function subscribeToVibePosts(onChange: (posts: VibePost[]) => void) {
  const q = query(postsCol(), where("expiresAt", ">", Timestamp.now()), limit(100));
  return onSnapshot(q, (snap) => {
    const posts = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<VibePost, "id">) }))
      .filter((p) => !p.isStory);
    posts.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    onChange(posts);
  });
}

/** Active (non-expired) Stories only, for the top-bar carousel - same
 * query as subscribeToVibePosts, filtered the other way. */
export function subscribeToActiveStories(onChange: (stories: VibePost[]) => void) {
  const q = query(postsCol(), where("expiresAt", ">", Timestamp.now()), limit(100));
  return onSnapshot(q, (snap) => {
    const stories = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<VibePost, "id">) }))
      .filter((p) => p.isStory);
    stories.sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
    onChange(stories);
  });
}

/** A user's own posts and Stories, expired or not - the private archive
 * behind "hide from the public feed/story bar, keep in your own account"
 * (nothing is ever deleted on expiry; this is simply a query without the
 * expiresAt filter, scoped to one author). Sorted client-side to avoid a
 * composite index on (authorUid, createdAt). */
export function subscribeToMyVibePosts(uid: string, onChange: (posts: VibePost[]) => void) {
  const q = query(postsCol(), where("authorUid", "==", uid), limit(200));
  return onSnapshot(q, (snap) => {
    const posts = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VibePost, "id">) }));
    posts.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    onChange(posts);
  });
}

export async function deleteVibePost(postId: string): Promise<void> {
  await deleteDoc(postRef(postId));
}

async function toggleMembership(postId: string, uid: string, field: "likedBy" | "wavedBy", countField: "likes" | "waves") {
  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(postRef(postId));
    if (!snap.exists()) return;
    const data = snap.data();
    const members: string[] = data[field] || [];
    const count: number = data[countField] || 0;

    if (members.includes(uid)) {
      tx.update(postRef(postId), {
        [field]: members.filter((m) => m !== uid),
        [countField]: Math.max(0, count - 1),
      });
    } else {
      tx.update(postRef(postId), {
        [field]: [...members, uid],
        [countField]: count + 1,
      });
    }
  });
}

export function toggleLike(postId: string, uid: string) {
  return toggleMembership(postId, uid, "likedBy", "likes");
}

export function toggleWave(postId: string, uid: string) {
  return toggleMembership(postId, uid, "wavedBy", "waves");
}

export function subscribeToComments(postId: string, onChange: (comments: VibeComment[]) => void) {
  const q = query(commentsCol(postId), orderBy("createdAt", "asc"), limit(200));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VibeComment, "id">) })));
  });
}

export async function addComment(
  postId: string,
  author: { uid: string; handle: string },
  text: string,
  type: "chat" | "gift" = "chat",
  giftName?: string
) {
  await addDoc(commentsCol(postId), {
    authorUid: author.uid,
    authorHandle: author.handle,
    text,
    type,
    giftName: giftName || null,
    createdAt: serverTimestamp(),
  });
}
