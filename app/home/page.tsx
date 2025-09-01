"use client";

import { useEffect, useMemo, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import debounce from "lodash.debounce";
import AvatarFinalizeOnLogin from "@/app/components/AvatarFinalizeOnLogin";

type Visibility = "public" | "restricted" | "private";
type Community = {
  id: string;
  name: string;
  description: string | null;
  visibility: Visibility;
  is_hidden?: boolean | null;
};

export default function HomeFeed() {
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [results, setResults] = useState<Community[]>([]);

  // auth gate
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session ?? null;
      if (!session) {
        router.push("/login");
        return;
      }
      setUserId(session.user.id);
      setLoading(false);
    })();
  }, [router, supabase]);

  // fetcher (handles empty search -> default explore list)
  const runSearch = useMemo(
    () =>
      debounce(async (term: string) => {
        if (!userId) return;

        setBusy(true);
        setError(null);

        try {
          // base select
          let q = supabase
            .from("communities")
            .select("id, name, description, visibility, is_hidden")
            // IMPORTANT: accept hidden = false **or** NULL (NULL would be filtered out by .eq)
            .or("is_hidden.is.false,is_hidden.is.null")
            .order("name", { ascending: true })
            .limit(25);

          const t = term.trim();
          if (t) {
            // search in both name and description, match anywhere
            q = q.or(`name.ilike.%${t}%,description.ilike.%${t}%`);
          }

          const { data, error } = await q;
          if (error) throw error;
          setResults((data ?? []) as Community[]);
        } catch (e: any) {
          console.error("Search error:", e);
          setError(e?.message || "Search error");
          setResults([]);
        } finally {
          setBusy(false);
        }
      }, 250),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supabase, userId]
  );

  // initial explore + live search
  useEffect(() => {
    if (!loading) runSearch(search);
    return () => runSearch.cancel();
  }, [loading, search, runSearch]);

  if (loading) return <p>Loading...</p>;

  const badgeClass = (v: Visibility) =>
    v === "public"
      ? "bg-green-100 text-green-700"
      : v === "restricted"
      ? "bg-amber-100 text-amber-700"
      : "bg-gray-200 text-gray-700";

  return (
    <div>
      <AvatarFinalizeOnLogin />

      <h1 className="text-xl font-bold mb-4">Home Feed</h1>

      <div className="mb-6 flex max-w-md shadow-sm">
        <input
          type="text"
          placeholder="Search communities…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 p-2 pl-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="ml-2 flex items-center gap-2 text-gray-500">
          <MagnifyingGlassIcon className="h-5 w-5" />
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-lg font-semibold">
            {search.trim() ? "Communities" : "Explore Communities"}
          </h2>
          {busy && <span className="text-xs text-gray-500">Loading…</span>}
        </div>

        {results.length === 0 ? (
          <div className="text-sm text-gray-500">
            {search.trim() ? "No communities match your search." : "No communities to show."}
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((comm) => (
              <div key={comm.id} className="p-3 border rounded shadow-sm bg-white">
                <div className="flex items-center gap-2">
                  <Link href={`/community/${comm.id}`} className="font-semibold hover:underline">
                    {comm.name}
                  </Link>
                  <span className={`text-xs px-2 py-0.5 rounded ${badgeClass(comm.visibility)}`}>
                    {comm.visibility}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{comm.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Placeholder feed content */}
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
