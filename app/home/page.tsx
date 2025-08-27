"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/types/supabase";
import { useRouter } from "next/navigation";
import debounce from "lodash.debounce";
import Link from "next/link";
import AvatarFinalizeOnLogin from "@/app/components/AvatarFinalizeOnLogin";

type Visibility = "public" | "restricted" | "private";
type Community = {
  id: string;
  name: string;
  description: string | null;
  visibility: Visibility;
};

export default function HomeFeed() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<Community[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClientComponentClient<Database>();

  // Ensure user is logged in
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        setUserId(session.user.id);
        setLoading(false);
      }
    };
    checkSession();
  }, [router, supabase]);

  // Debounced live search (communities only; name match; includes visibility badge)
  useEffect(() => {
    const fetchCommunities = debounce(async () => {
      if (!userId) return;

      if (!search.trim()) {
        setSearchResults([]);
        return;
      }

      const { data, error } = await supabase
        .from("communities")
        .select("id, name, description, visibility")
        .ilike("name", `${search}%`)
        .order("name", { ascending: true })
        .limit(10);

      if (error) {
        console.error("Search error:", error);
        return;
      }

      setSearchResults((data ?? []) as Community[]);
    }, 300);

    fetchCommunities();
    return () => fetchCommunities.cancel();
  }, [search, userId, supabase]);

  if (loading) return <p>Loading...</p>;

  const badgeClass = (v: Visibility) =>
    v === "public"
      ? "bg-green-100 text-green-700"
      : v === "restricted"
      ? "bg-amber-100 text-amber-700"
      : "bg-gray-200 text-gray-700";

  return (
    <div>
      {/* Copies preset_avatar_id -> profiles.avatar_id after login */}
      <AvatarFinalizeOnLogin />

      <h1 className="text-xl font-bold mb-4">Home Feed</h1>

      <div className="mb-6 flex max-w-md shadow-sm">
        <input
          type="text"
          placeholder="Search posts or communities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 p-2 pl-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="ml-2 flex items-center gap-2 text-gray-500">
          <MagnifyingGlassIcon className="h-5 w-5" />
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Communities</h2>
          <div className="space-y-3">
            {searchResults.map((comm) => (
              <div
                key={comm.id}
                className="p-3 border rounded shadow-sm bg-white flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    {/* Link to the community page */}
                    <Link
                      href={`/community/${comm.id}`} // adjust if your route differs
                      className="font-semibold hover:underline"
                    >
                      {comm.name}
                    </Link>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${badgeClass(
                        comm.visibility
                      )}`}
                    >
                      {comm.visibility}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{comm.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Your placeholder feed content */}
      <div className="space-y-4">
        <div className="p-4 border rounded shadow-sm bg-white">
          <h2 className="text-lg font-semibold">Post Title 1</h2>
          <p className="text-sm text-gray-600">Sample post content here.</p>
        </div>
        <div className="p-4 border rounded shadow-sm bg-white">
          <h2 className="text-lg font-semibold">Post Title 2</h2>
          <p className="text-sm text-gray-600">Another sample post here.</p>
        </div>
      </div>
    </div>
  );
}
