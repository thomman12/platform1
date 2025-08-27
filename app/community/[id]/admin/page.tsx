'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

type Community = Database['public']['Tables']['communities']['Row'];
type Visibility = 'public' | 'restricted' | 'private';

type PendingUser = {
  profile_id: string;
  username: string | null;
  avatar_id: string | null;
  requested_at: string | null;
};

type MemberUser = {
  profile_id: string;
  username: string | null;
  avatar_id: string | null;
  role: 'owner' | 'moderator' | 'member';
  joined_at: string | null;
};

type BannedUser = {
  profile_id: string;
  username: string | null;
  avatar_id: string | null;
  banned_at: string | null; // from status_changed_at
};

type ModAction = 'approve' | 'reject' | 'promote' | 'demote' | 'remove' | 'ban' | 'unban';

type ModLog = {
  id: string;
  action: ModAction;
  actor_id: string;
  target_id: string;
  reason: string | null;
  created_at: string | null;
  actor_name?: string | null;
  target_name?: string | null;
};

type TabKey = 'requests' | 'members' | 'banned' | 'audit';

export default function CommunityAdminPage() {
  const supabase = createClientComponentClient<Database>();
  const params = useParams();
  const communityId = (params.id as string) ?? '';

  const [loading, setLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  const [community, setCommunity] = useState<Community | null>(null);
  const [role, setRole] = useState<'owner' | 'moderator' | 'member' | null>(null);
  const [status, setStatus] = useState<'approved' | 'pending' | 'banned' | 'none'>('none');

  const [activeTab, setActiveTab] = useState<TabKey>('requests');

  // Requests
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  // Members
  const [members, setMembers] = useState<MemberUser[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Banned
  const [banned, setBanned] = useState<BannedUser[]>([]);
  const [loadingBanned, setLoadingBanned] = useState(false);

  // Audit log
  const [audit, setAudit] = useState<ModLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSupported, setAuditSupported] = useState<boolean>(true);

  // action state
  const [acting, setActing] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);

  // Reason modal state
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonText, setReasonText] = useState('');
  const [reasonContext, setReasonContext] = useState<{
    action: ModAction | null;
    targetId: string | null;
    targetName?: string | null;
    confirm?: (reason: string | null) => Promise<void>;
    headline?: string;
    danger?: boolean;
  }>({ action: null, targetId: null });

  const isOwner = useMemo(() => {
    if (!community || !authUserId) return false;
    return community.creator_id === authUserId || role === 'owner';
  }, [community, authUserId, role]);

  const isMod = isOwner || role === 'moderator';

  /* ---------- bootstrap ---------- */
  useEffect(() => {
    if (!communityId) return;

    (async () => {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id ?? null;
      setAuthUserId(uid);

      // load community
      const { data: comm } = await supabase
        .from('communities')
        .select('*')
        .eq('id', communityId)
        .maybeSingle();
      setCommunity(comm ?? null);

      // load my membership/role
      if (uid) {
        const { data: mem } = await supabase
          .from('community_members')
          .select('status, role')
          .eq('community_id', communityId)
          .eq('profile_id', uid)
          .maybeSingle();

        setRole((mem?.role as any) ?? null);
        setStatus((mem?.status as any) ?? 'none');
      }

      setLoading(false);
    })();
  }, [communityId, supabase]);

  /* ---------- helpers ---------- */
  const withActing = (pid: string, fn: () => Promise<void>) => {
    setActing((s) => new Set(s).add(pid));
    fn()
      .then(() => window.setTimeout(() => setNotice(null), 2000))
      .catch((e) => {
        console.error(e);
        setNotice(e?.message || 'Something went wrong.');
      })
      .finally(() => {
        setActing((s) => {
          const next = new Set(s);
          next.delete(pid);
          return next;
        });
      });
  };

  // Log helper (tolerant if table missing)
  const logAction = async (action: ModAction, targetId: string, reason?: string | null) => {
    try {
      await supabase
        .from('community_mod_logs' as any)
        .insert([
          {
            community_id: communityId,
            actor_id: authUserId, // RLS check: must be current user
            target_id: targetId,
            action,
            reason: reason ?? null,
          },
        ]);
    } catch (e: any) {
      console.warn('Audit log insert skipped:', e?.message || e);
    }
  };

  // Open reason modal with a configured confirm action
  const openReason = (opts: {
    action: ModAction;
    targetId: string;
    targetName?: string | null;
    headline: string;
    danger?: boolean;
    confirm: (reason: string | null) => Promise<void>;
    presetReason?: string;
  }) => {
    setReasonText(opts.presetReason ?? '');
    setReasonContext({
      action: opts.action,
      targetId: opts.targetId,
      targetName: opts.targetName ?? null,
      confirm: opts.confirm,
      headline: opts.headline,
      danger: opts.danger,
    });
    setReasonOpen(true);
  };

  const closeReason = () => {
    setReasonOpen(false);
    setReasonText('');
    setReasonContext({ action: null, targetId: null });
  };

  /* ---------- REQUESTS ---------- */
  const refreshPending = async () => {
    if (!communityId) return;
    setLoadingPending(true);

    const { data: cm, error } = await supabase
      .from('community_members')
      .select('profile_id, created_at')
      .eq('community_id', communityId)
      .eq('status', 'pending');
    if (error) console.error(error);

    const ids = (cm ?? []).map((r) => r.profile_id);
    if (!ids.length) {
      setPending([]);
      setLoadingPending(false);
      return;
    }

    const { data: profs, error: pErr } = await supabase
      .from('profiles')
      .select('id, username, avatar_id')
      .in('id', ids);
    if (pErr) console.error(pErr);

    const pmap = new Map<string, { username: string | null; avatar_id: string | null }>();
    (profs ?? []).forEach((p: any) =>
      pmap.set(p.id, { username: p.username ?? null, avatar_id: p.avatar_id ?? null })
    );

    const list: PendingUser[] = (cm ?? []).map((row: any) => ({
      profile_id: row.profile_id,
      username: pmap.get(row.profile_id)?.username ?? null,
      avatar_id: pmap.get(row.profile_id)?.avatar_id ?? null,
      requested_at: row.created_at ?? null,
    }));

    list.sort((a, b) => (a.requested_at ?? '').localeCompare(b.requested_at ?? ''));
    setPending(list);
    setLoadingPending(false);
  };

  useEffect(() => {
    if (communityId && (isOwner || isMod)) {
      refreshPending();
    } else {
      setPending([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, isOwner, isMod]);

  const approve = async (pid: string) => {
    await supabase
      .from('community_members')
      .update({ status: 'approved' })
      .eq('community_id', communityId)
      .eq('profile_id', pid)
      .eq('status', 'pending');

    await logAction('approve', pid);
    setPending((prev) => prev.filter((u) => u.profile_id !== pid));
    refreshMembers();
    setNotice('Approved request.');
  };

  const reject = async (pid: string, reason?: string | null) => {
    await supabase
      .from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('profile_id', pid)
      .eq('status', 'pending');

    await logAction('reject', pid, reason);
    setPending((prev) => prev.filter((u) => u.profile_id !== pid));
    setNotice('Request rejected.');
  };

  /* ---------- MEMBERS ---------- */
  const refreshMembers = async () => {
    if (!communityId) return;
    setLoadingMembers(true);

    const { data: rows } = await supabase
      .from('community_members')
      .select('profile_id, role, created_at')
      .eq('community_id', communityId)
      .eq('status', 'approved');

    const ids = (rows ?? []).map((r) => r.profile_id);
    if (!ids.length) {
      setMembers([]);
      setLoadingMembers(false);
      return;
    }

    const { data: profs } = await supabase
      .from('profiles')
      .select('id, username, avatar_id')
      .in('id', ids);

    const pmap = new Map<string, { username: string | null; avatar_id: string | null }>();
    (profs ?? []).forEach((p: any) =>
      pmap.set(p.id, { username: p.username ?? null, avatar_id: p.avatar_id ?? null })
    );

    const list: MemberUser[] = (rows ?? []).map((r: any) => ({
      profile_id: r.profile_id,
      role: r.role as 'owner' | 'moderator' | 'member',
      joined_at: r.created_at ?? null,
      username: pmap.get(r.profile_id)?.username ?? null,
      avatar_id: pmap.get(r.profile_id)?.avatar_id ?? null,
    }));

    // owners > moderators > members
    const order = { owner: 0, moderator: 1, member: 2 } as const;
    list.sort((a, b) => {
      const r = order[a.role] - order[b.role];
      if (r !== 0) return r;
      return (a.joined_at ?? '').localeCompare(b.joined_at ?? '');
    });

    setMembers(list);
    setLoadingMembers(false);
  };

  useEffect(() => {
    if (communityId && (isOwner || isMod)) {
      refreshMembers();
    } else {
      setMembers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, isOwner, isMod]);

  const canShowActions = (target: MemberUser) =>
    (role === 'owner' && target.role !== 'owner') ||
    (role === 'moderator' && target.role === 'member');

  const promoteToMod = async (pid: string, reason?: string | null) => {
    await supabase
      .from('community_members')
      .update({ role: 'moderator' })
      .eq('community_id', communityId)
      .eq('profile_id', pid)
      .eq('status', 'approved');

    await logAction('promote', pid, reason);
    setMembers((prev) =>
      prev.map((m) => (m.profile_id === pid ? { ...m, role: 'moderator' } : m))
    );
    setNotice('Promoted to moderator.');
  };

  const demoteToMember = async (pid: string, reason?: string | null) => {
    await supabase
      .from('community_members')
      .update({ role: 'member' })
      .eq('community_id', communityId)
      .eq('profile_id', pid)
      .eq('status', 'approved');

    await logAction('demote', pid, reason);
    setMembers((prev) =>
      prev.map((m) => (m.profile_id === pid ? { ...m, role: 'member' } : m))
    );
    setNotice('Demoted to member.');
  };

  const removeMember = async (pid: string, reason?: string | null) => {
    await supabase
      .from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('profile_id', pid)
      .eq('status', 'approved');

    await logAction('remove', pid, reason);
    setMembers((prev) => prev.filter((m) => m.profile_id !== pid));
    setNotice('Member removed.');
  };

  const banMember = async (pid: string, reason?: string | null) => {
    await supabase
      .from('community_members')
      .update({ status: 'banned' })
      .eq('community_id', communityId)
      .eq('profile_id', pid)
      .eq('status', 'approved');

    await logAction('ban', pid, reason);
    setMembers((prev) => prev.filter((m) => m.profile_id !== pid));
    refreshBanned();
    setNotice('Member banned.');
  };

  /* ---------- BANNED (uses status_changed_at) ---------- */
  const refreshBanned = async () => {
    if (!communityId) return;
    setLoadingBanned(true);

    const { data: rows, error } = await supabase
      .from('community_members')
      .select('profile_id, status_changed_at')
      .eq('community_id', communityId)
      .eq('status', 'banned');

    if (error) {
      console.error('refreshBanned error:', error);
      setBanned([]);
      setLoadingBanned(false);
      return;
    }

    const ids = (rows ?? []).map((r) => r.profile_id);
    if (!ids.length) {
      setBanned([]);
      setLoadingBanned(false);
      return;
    }

    const { data: profs, error: pErr } = await supabase
      .from('profiles')
      .select('id, username, avatar_id')
      .in('id', ids);
    if (pErr) {
      console.error('refreshBanned(profiles) error:', pErr);
      setBanned([]);
      setLoadingBanned(false);
      return;
    }

    const pmap = new Map<string, { username: string | null; avatar_id: string | null }>();
    (profs ?? []).forEach((p: any) =>
      pmap.set(p.id, { username: p.username ?? null, avatar_id: p.avatar_id ?? null })
    );

    const list: BannedUser[] = (rows ?? []).map((r: any) => ({
      profile_id: r.profile_id,
      username: pmap.get(r.profile_id)?.username ?? null,
      avatar_id: pmap.get(r.profile_id)?.avatar_id ?? null,
      banned_at: r.status_changed_at ?? null,
    }));

    list.sort((a, b) => (b.banned_at ?? '').localeCompare(a.banned_at ?? ''));
    setBanned(list);
    setLoadingBanned(false);
  };

  const unbanMember = async (pid: string, reason?: string | null) => {
    await supabase
      .from('community_members')
      .update({ status: 'approved' })
      .eq('community_id', communityId)
      .eq('profile_id', pid)
      .eq('status', 'banned');

    await logAction('unban', pid, reason);
    setBanned((prev) => prev.filter((u) => u.profile_id !== pid));
    refreshMembers();
    setNotice('User unbanned.');
  };

  useEffect(() => {
    if (communityId && (isOwner || isMod)) {
      refreshBanned();
    } else {
      setBanned([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, isOwner, isMod]);

  /* ---------- AUDIT LOG ---------- */
  const refreshAudit = async () => {
    if (!communityId) return;
    setLoadingAudit(true);
    setAuditSupported(true);

    const { data: rows, error } = await supabase
      .from('community_mod_logs' as any)
      .select('id, community_id, actor_id, target_id, action, reason, created_at')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('Audit log table not available:', error.message);
      setAuditSupported(false);
      setLoadingAudit(false);
      return;
    }

    const ids = Array.from(
      new Set((rows ?? []).flatMap((r: any) => [r.actor_id, r.target_id]))
    ).filter(Boolean) as string[];

    let nameMap = new Map<string, string | null>();
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', ids);
      nameMap = new Map((profs ?? []).map((p: any) => [p.id, p.username ?? null]));
    }

    const list: ModLog[] = (rows ?? []).map((r: any) => ({
      id: r.id,
      action: r.action,
      actor_id: r.actor_id,
      target_id: r.target_id,
      reason: r.reason ?? null,
      created_at: r.created_at ?? null,
      actor_name: nameMap.get(r.actor_id) ?? null,
      target_name: nameMap.get(r.target_id) ?? null,
    }));

    setAudit(list);
    setLoadingAudit(false);
  };

  useEffect(() => {
    if (communityId && (isOwner || isMod) && activeTab === 'audit') {
      refreshAudit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, isOwner, isMod, activeTab]);

  /* ---------- render ---------- */
  if (loading) return <div className="p-6">Loading…</div>;

  if (!authUserId || !community || (!isOwner && !isMod) || status === 'none') {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold mb-2">403 — Not allowed</h1>
        <p className="text-gray-600 mb-4">
          You need to be a moderator or owner of this community to access Admin Controls.
        </p>
        <Link href={`/community/${communityId}`} className="text-blue-600 hover:underline">
          ← Back to community
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Controls</h1>
          <p className="text-gray-600">
            {community.name} ·{' '}
            <span className="inline-block text-xs px-2 py-0.5 bg-gray-100 rounded">
              {community.visibility as Visibility}
            </span>
          </p>
        </div>
        <Link
          href={`/community/${communityId}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to community
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-4 border-b border-gray-200 flex items-center gap-6">
        <TabButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')}>
          Requests
        </TabButton>
        <TabButton active={activeTab === 'members'} onClick={() => setActiveTab('members')}>
          Members
        </TabButton>
        <TabButton active={activeTab === 'banned'} onClick={() => setActiveTab('banned')}>
          Banned
        </TabButton>
        <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')}>
          Audit Log
        </TabButton>
      </div>

      {notice && (
        <div className="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {notice}
        </div>
      )}

      {/* Requests */}
      {activeTab === 'requests' && (
        <div className="rounded border bg-white p-4">
          <PanelHeader
            title={`Pending Requests (${pending.length})`}
            onRefresh={refreshPending}
          />
          {loadingPending ? (
            <p className="text-gray-500">Loading…</p>
          ) : pending.length === 0 ? (
            <p className="text-gray-500">No pending requests.</p>
          ) : (
            <ul className="divide-y">
              {pending.map((u) => {
                const busy = acting.has(u.profile_id);
                return (
                  <li key={u.profile_id} className="py-3 flex items-center justify-between">
                    <UserCell
                      avatarId={u.avatar_id}
                      title={u.username ?? u.profile_id.slice(0, 8)}
                      subtitle={
                        u.requested_at
                          ? `Requested at ${new Date(u.requested_at).toLocaleString()}`
                          : '—'
                      }
                    />
                    <div className="flex items-center gap-2">
                      <ActionBtn
                        busy={busy}
                        onClick={() => withActing(u.profile_id, () => approve(u.profile_id))}
                        primary
                      >
                        {busy ? 'Approving…' : 'Approve'}
                      </ActionBtn>
                      <ActionBtn
                        busy={busy}
                        onClick={() =>
                          openReason({
                            action: 'reject',
                            targetId: u.profile_id,
                            targetName: u.username,
                            headline: 'Reject request',
                            danger: false,
                            confirm: async (reason) => withActing(u.profile_id, () => reject(u.profile_id, reason)),
                          })
                        }
                      >
                        {busy ? 'Working…' : 'Reject'}
                      </ActionBtn>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Members */}
      {activeTab === 'members' && (
        <div className="rounded border bg-white p-4">
          <PanelHeader title={`Members (${members.length})`} onRefresh={refreshMembers} />
          {loadingMembers ? (
            <p className="text-gray-500">Loading…</p>
          ) : members.length === 0 ? (
            <p className="text-gray-500">No approved members yet.</p>
          ) : (
            <ul className="divide-y">
              {members.map((m) => {
                const busy = acting.has(m.profile_id);
                const showActions = canShowActions(m);
                return (
                  <li key={m.profile_id} className="py-3 flex items-center justify-between">
                    <UserCell
                      avatarId={m.avatar_id}
                      title={m.username ?? m.profile_id.slice(0, 8)}
                      subtitle={
                        m.joined_at ? `Joined ${new Date(m.joined_at).toLocaleDateString()}` : '—'
                      }
                    />
                    <div className="flex items-center gap-2">
                      <RolePill role={m.role} />
                      {showActions ? (
                        <>
                          {role === 'owner' && m.role === 'member' && (
                            <ActionBtn
                              busy={busy}
                              onClick={() =>
                                openReason({
                                  action: 'promote',
                                  targetId: m.profile_id,
                                  targetName: m.username,
                                  headline: 'Promote to moderator',
                                  confirm: async (reason) => withActing(m.profile_id, () => promoteToMod(m.profile_id, reason)
                                  ),
                                })
                              }
                              accent="indigo"
                            >
                              {busy ? 'Working…' : 'Promote'}
                            </ActionBtn>
                          )}
                          {role === 'owner' && m.role === 'moderator' && (
                            <ActionBtn
                              busy={busy}
                              onClick={() =>
                                openReason({
                                  action: 'demote',
                                  targetId: m.profile_id,
                                  targetName: m.username,
                                  headline: 'Demote to member',
                                  confirm: async (reason) => withActing(m.profile_id, () => demoteToMember(m.profile_id, reason)
                                  ),
                                })
                              }
                              accent="yellow"
                            >
                              {busy ? 'Working…' : 'Demote'}
                            </ActionBtn>
                          )}
                          <ActionBtn
                            busy={busy}
                            onClick={() =>
                              openReason({
                                action: 'remove',
                                targetId: m.profile_id,
                                targetName: m.username,
                                headline: 'Remove member',
                                confirm: async (reason) => withActing(m.profile_id, () => removeMember(m.profile_id, reason)
                                ),
                              })
                            }
                          >
                            {busy ? 'Working…' : 'Remove'}
                          </ActionBtn>
                          <ActionBtn
                            busy={busy}
                            onClick={() =>
                              openReason({
                                action: 'ban',
                                targetId: m.profile_id,
                                targetName: m.username,
                                headline: 'Ban member',
                                danger: true,
                                confirm: async (reason) => withActing(m.profile_id, () => banMember(m.profile_id, reason)),
                              })
                            }
                            danger
                          >
                            {busy ? 'Banning…' : 'Ban'}
                          </ActionBtn>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">No actions</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Banned */}
      {activeTab === 'banned' && (
        <div className="rounded border bg-white p-4">
          <PanelHeader title={`Banned (${banned.length})`} onRefresh={refreshBanned} />
          {loadingBanned ? (
            <p className="text-gray-500">Loading…</p>
          ) : banned.length === 0 ? (
            <p className="text-gray-500">No banned users.</p>
          ) : (
            <ul className="divide-y">
              {banned.map((u) => {
                const busy = acting.has(u.profile_id);
                return (
                  <li key={u.profile_id} className="py-3 flex items-center justify-between">
                    <UserCell
                      avatarId={u.avatar_id}
                      title={u.username ?? u.profile_id.slice(0, 8)}
                      subtitle={
                        u.banned_at
                          ? `Banned at ${new Date(u.banned_at).toLocaleString()}`
                          : 'Banned'
                      }
                    />
                    <ActionBtn
                      busy={busy}
                      onClick={() =>
                        openReason({
                          action: 'unban',
                          targetId: u.profile_id,
                          targetName: u.username,
                          headline: 'Unban user',
                          confirm: async (reason) => withActing(u.profile_id, () => unbanMember(u.profile_id, reason)),
                        })
                      }
                      primary
                    >
                      {busy ? 'Unbanning…' : 'Unban'}
                    </ActionBtn>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Audit Log */}
      {activeTab === 'audit' && (
        <div className="rounded border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Audit Log</h2>
            <button onClick={refreshAudit} className="text-sm text-blue-600 hover:underline">
              Refresh
            </button>
          </div>

          {!auditSupported ? (
            <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
              Audit log isn’t enabled. Create a <code>community_mod_logs</code> table to track
              moderation actions.
            </div>
          ) : loadingAudit ? (
            <p className="text-gray-500">Loading…</p>
          ) : audit.length === 0 ? (
            <p className="text-gray-500">No moderation actions recorded.</p>
          ) : (
            <ul className="divide-y">
              {audit.map((log) => (
                <li key={log.id} className="py-2 text-sm flex items-center justify-between">
                  <div className="flex-1">
                    <span className="font-medium">{log.actor_name ?? log.actor_id.slice(0, 8)}</span>{' '}
                    <span className="text-gray-600">→ {log.action}</span>{' '}
                    <span className="font-medium">
                      {log.target_name ?? log.target_id.slice(0, 8)}
                    </span>
                    {log.reason ? <span className="text-gray-500"> · “{log.reason}”</span> : null}
                  </div>
                  <div className="text-xs text-gray-500">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Reason Modal */}
      <ReasonModal
        open={reasonOpen}
        onClose={closeReason}
        headline={reasonContext.headline ?? 'Add a note (optional)'}
        action={reasonContext.action ?? null}
        targetName={reasonContext.targetName ?? null}
        danger={reasonContext.danger}
        reason={reasonText}
        onReasonChange={setReasonText}
        onConfirm={async () => {
          if (reasonContext.confirm) {
            await reasonContext.confirm(reasonText.trim() ? reasonText.trim() : null);
          }
          closeReason();
        }}
      />
    </div>
  );
}

/* ---------- small UI helpers ---------- */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`pb-2 text-sm font-medium border-b-2 ${
        active
          ? 'border-gray-900 text-gray-900'
          : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PanelHeader({ title, onRefresh }: { title: string; onRefresh: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      <button onClick={onRefresh} className="text-sm text-blue-600 hover:underline">
        Refresh
      </button>
    </div>
  );
}

function AvatarBubble({ avatarId, size = 32 }: { avatarId?: string | null; size?: number }) {
  const src = avatarId ? `/avatars/thumbs/${avatarId}-thumb.png` : null;
  return (
    <div
      className="rounded-full overflow-hidden bg-gray-200 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {src ? <img src={src} className="w-full h-full object-cover" alt="avatar" /> : <span>🙂</span>}
    </div>
  );
}

function UserCell({
  avatarId,
  title,
  subtitle,
}: {
  avatarId?: string | null;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <AvatarBubble avatarId={avatarId} />
      <div>
        <div className="font-medium">{title}</div>
        {subtitle ? <div className="text-xs text-gray-500">{subtitle}</div> : null}
      </div>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  busy,
  primary,
  danger,
  accent,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
  primary?: boolean;
  danger?: boolean;
  accent?: 'indigo' | 'yellow';
}) {
  const base = 'px-3 py-1 rounded text-sm';
  const cls = danger
    ? busy
      ? 'bg-red-300 text-white'
      : 'bg-red-600 text-white hover:bg-red-700'
    : primary
    ? busy
      ? 'bg-green-300 text-white'
      : 'bg-green-600 text-white hover:bg-green-700'
    : accent === 'indigo'
    ? busy
      ? 'bg-indigo-300 text-white'
      : 'bg-indigo-600 text-white hover:bg-indigo-700'
    : accent === 'yellow'
    ? busy
      ? 'bg-yellow-300 text-gray-800'
      : 'bg-yellow-200 text-gray-800 hover:bg-yellow-300'
    : busy
    ? 'bg-gray-200 text-gray-500'
    : 'bg-gray-100 text-gray-800 hover:bg-gray-200';

  return (
    <button disabled={busy} onClick={onClick} className={`${base} ${cls}`}>
      {children}
    </button>
  );
}

function RolePill({ role }: { role: 'owner' | 'moderator' | 'member' }) {
  const style =
    role === 'owner'
      ? 'bg-amber-100 text-amber-800'
      : role === 'moderator'
      ? 'bg-indigo-100 text-indigo-800'
      : 'bg-gray-100 text-gray-700';
  return <span className={`inline-block text-xs px-2 py-0.5 rounded ${style}`}>{role}</span>;
}

/* ---------- Reason Modal ---------- */

function ReasonModal({
  open,
  onClose,
  headline,
  reason,
  onReasonChange,
  onConfirm,
  action,
  targetName,
  danger,
}: {
  open: boolean;
  onClose: () => void;
  headline: string;
  reason: string;
  onReasonChange: (v: string) => void;
  onConfirm: () => Promise<void>;
  action: ModAction | null;
  targetName: string | null;
  danger?: boolean;
}) {
  if (!open) return null;

  const actionTitle = action ? action[0].toUpperCase() + action.slice(1) : 'Confirm';
  const detail =
    action === 'ban'
      ? 'This will block the user from viewing or posting until they are unbanned.'
      : action === 'remove'
      ? 'This removes the user from the community. They may re-request later.'
      : action === 'unban'
      ? 'This restores access for the user.'
      : action === 'promote'
      ? 'Grants moderator tools in this community.'
      : action === 'demote'
      ? 'Removes moderator tools for this user.'
      : action === 'reject'
      ? 'This declines the user’s join request.'
      : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-1 text-sm uppercase tracking-wide text-gray-500">
          {actionTitle} {targetName ? `· ${targetName}` : ''}
        </div>
        <h3 className="text-lg font-semibold mb-2">{headline}</h3>
        {detail && <p className="text-sm text-gray-600 mb-3">{detail}</p>}

        <label className="block text-sm text-gray-600 mb-1">
          Reason (optional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          className="w-full h-24 rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Add a short note for the audit log…"
          maxLength={200}
        />

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded text-sm bg-gray-100 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1 rounded text-sm text-white ${
              danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {actionTitle}
          </button>
        </div>
      </div>
    </div>
  );
}
