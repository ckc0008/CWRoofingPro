import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: Promise<SupabaseClient> | undefined;
export function getAuthClient(): Promise<SupabaseClient> {
  if (!client) client = fetch("/api/auth/config").then(async response => {
    if (!response.ok) throw new Error("Unable to load sign-in configuration.");
    const config = await response.json();
    return createClient(config.url, config.publishableKey);
  }).catch(error => { client = undefined; throw error; });
  return client;
}
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const auth = await getAuthClient();
  const { data } = await auth.auth.getSession();
  const headers = new Headers(options.headers);
  if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
  return fetch(url, { ...options, headers });
}
