import { useEffect, useState, type ReactNode } from "react";
import { getAuthClient, authenticatedFetch } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";

export default function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    let generation = 0;
    const check = async () => {
      const current = ++generation;
      const client = await getAuthClient();
      const { data } = await client.auth.getSession();
      if (!mounted || current !== generation) return;
      setSignedIn(!!data.session);
      if (!data.session) { setAllowed(false); setReady(true); queryClient.clear(); return; }
      const response = await authenticatedFetch("/api/auth/me");
      if (!mounted || current !== generation) return;
      setAllowed(response.ok);
      if (!response.ok) setError((await response.json()).error || "Unable to verify access.");
      else setError("");
      setReady(true);
    };
    getAuthClient().then(client => {
      unsubscribe = client.auth.onAuthStateChange(() => { setTimeout(() => check().catch(e => { if (mounted) { setError(e.message); setReady(true); } }), 0); }).data.subscription.unsubscribe;
      return check();
    }).catch(e => { if (mounted) { setError(e.message); setReady(true); } });
    return () => { mounted = false; unsubscribe?.(); };
  }, []);
  if (!ready) return <div className="min-h-screen grid place-items-center text-white">Loading CW Roofing Pro…</div>;
  if (allowed) return <>{children}</>;
  return <main className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-white">
    <form className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-8" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError("");
      try {
        const client = await getAuthClient();
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setPassword("");
      } catch (e: any) { setError(e.message); } finally { setBusy(false); }
    }}>
      <div><h1 className="text-2xl font-bold">CW Roofing Pro</h1><p className="mt-2 text-sm text-slate-400">Sign in to your company workspace.</p></div>
      {!signedIn && <>
        <label className="block text-sm">Email<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded border border-slate-600 bg-slate-950 p-3" /></label>
        <label className="block text-sm">Password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded border border-slate-600 bg-slate-950 p-3" /></label>
        <button disabled={busy} className="w-full rounded bg-lime-400 p-3 font-semibold text-slate-950 disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
      </>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {signedIn && <button type="button" onClick={async () => { await (await getAuthClient()).auth.signOut(); setError(""); }} className="text-sm underline">Use a different account</button>}
      <p className="text-xs text-slate-400">Access is limited to approved CW Roofing staff. Contact your administrator if you need an account or a password reset.</p>
    </form>
  </main>;
}
