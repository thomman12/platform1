"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/types/supabase";

type Post = Database["public"]["Tables"]["posts"]["Row"];

type SavedItem = {
  sp_post_id: string;
  saved_at: string | null;
  posts: (Post & {
    profiles: { username: string | null } | null;
  }) | null;
};

export default function SavedPostsPage() {
  const supabase = createClientComponentClient<Database>();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // NOTE: join via the FK name sp_post_id -> posts.id
      const { data, error } = await supabase
        .from("saved_posts")
        .select(`
          sp_post_id,
          saved_at,
          posts:sp_post_id (
            id, title, content, created_at, user_id, community_id,
            profiles:profiles!user_id ( username )
          )
        `)
        .eq("sp_profile_id", user.id)
        .order("saved_at", { ascending: false });

      if (error) {
        console.error("Failed to load saved posts:", error);
      } else {
        setItems((data || []) as unknown as SavedItem[]);
      }
      setLoading(false);
    };

    run();
  }, [supabase]);

  const handleUnsave = async (postId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("saved_posts")
      .delete()
      .match({ sp_profile_id: user.id, sp_post_id: postId });

    if (error) {
      console.error("Unsave failed:", error);
      return;
    }
    setItems((prev) => prev.filter((it) => it.sp_post_id !== postId));
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Saved Posts</h1>
        <Link href="/home" className="text-blue-600 hover:underline">
          ← Back to Home
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-600">You haven’t saved any posts yet.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const post = item.posts;
            if (!post) return null;
            return (
              <li key={item.sp_post_id} className="rounded border bg-white p-4 shadow-sm">
                <div className="mb-1 text-sm text-gray-500">
                  by <span className="font-medium">
                    {post.profiles?.username ?? "Unknown"}
                  </span>{" "}
                  · {new Date(post.created_at).toLocaleString()}
                </div>
                <h3 className="text-lg font-semibold">{post.title}</h3>
                <p className="mt-1 text-gray-700 whitespace-pre-wrap">{post.content}</p>

                <div className="mt-3 flex items-center gap-3 text-sm">
                  <Link
                    href={`/community/${post.community_id}`}
                    className="text-blue-600 hover:underline"
                  >
                    View community
                  </Link>
                  <Link
                    href={`/post/${post.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    Open post
                  </Link>
                  <button
                    onClick={() => handleUnsave(post.id)}
                    className="ml-auto rounded bg-gray-200 px-3 py-1 hover:bg-gray-300"
                    title="Remove from saved"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
