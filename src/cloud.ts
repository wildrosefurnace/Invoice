import { createClient, type Session } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isCloudConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const client = isCloudConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

function requireClient() {
  if (!client) throw new Error("Cloud storage has not been configured yet.");
  return client;
}

async function currentUserId() {
  const { data, error } = await requireClient().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Please sign in again.");
  return data.user.id;
}

export async function getCloudSession(): Promise<Session | null> {
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function watchCloudSession(onChange: (session: Session | null) => void) {
  if (!client) return () => undefined;
  const { data } = client.auth.onAuthStateChange((_event, session) => onChange(session));
  return () => data.subscription.unsubscribe();
}

export async function sendMagicLink(email: string) {
  const { error } = await requireClient().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOutCloud() {
  const { error } = await requireClient().auth.signOut();
  if (error) throw error;
}

export async function loadCloudState<TInvoice, TSettings>() {
  const database = requireClient();
  const [invoiceResult, settingsResult] = await Promise.all([
    database.from("invoices").select("payload").order("created_at", { ascending: false }),
    database.from("business_settings").select("payload").maybeSingle(),
  ]);
  if (invoiceResult.error) throw invoiceResult.error;
  if (settingsResult.error) throw settingsResult.error;
  return {
    invoices: (invoiceResult.data ?? []).map((row) => row.payload as TInvoice),
    settings: settingsResult.data?.payload as TSettings | undefined,
  };
}

export async function createCloudInvoiceDraft<TInvoice extends { id: string; number: string }>(invoice: TInvoice) {
  const { data, error } = await requireClient().rpc("create_invoice_draft", {
    draft_id: invoice.id,
    draft_payload: invoice,
  });
  if (error) throw error;
  if (typeof data !== "string") throw new Error("The next invoice number could not be reserved.");
  return data;
}

export async function ensureInvoiceCounterAtLeast(value: number) {
  const { error } = await requireClient().rpc("set_invoice_counter_floor", { floor_value: value });
  if (error) throw error;
}

export async function saveCloudInvoice(invoice: { id: string; number: string }) {
  const userId = await currentUserId();
  const { error } = await requireClient().from("invoices").upsert({
    user_id: userId,
    id: invoice.id,
    invoice_number: invoice.number,
    payload: invoice,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,id" });
  if (error) throw error;
}

export async function saveCloudInvoices(invoices: Array<{ id: string; number: string }>) {
  if (!invoices.length) return;
  const userId = await currentUserId();
  const now = new Date().toISOString();
  const { error } = await requireClient().from("invoices").upsert(
    invoices.map((invoice) => ({
      user_id: userId,
      id: invoice.id,
      invoice_number: invoice.number,
      payload: invoice,
      updated_at: now,
    })),
    { onConflict: "user_id,id" },
  );
  if (error) throw error;
}

export async function deleteCloudInvoice(invoiceId: string) {
  const { error } = await requireClient().from("invoices").delete().eq("id", invoiceId);
  if (error) throw error;
}

export async function saveCloudSettings(settings: object) {
  const userId = await currentUserId();
  const { error } = await requireClient().from("business_settings").upsert({
    user_id: userId,
    payload: settings,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
