import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Mencatat tindakan admin ke `admin_audit_logs`. Sengaja tidak melempar error:
 * kegagalan pencatatan tidak boleh membatalkan aksi utama admin.
 */
export async function logAdminAction(
  supabase: SupabaseClient,
  actorId: string,
  entry: {
    action: string;
    entityType: string;
    entityId?: string | null;
    detail?: string | null;
  },
) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", actorId)
      .single();

    await supabase.from("admin_audit_logs").insert({
      actor_id: actorId,
      actor_name: profile?.full_name ?? null,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      detail: entry.detail ?? null,
    });
  } catch {
    // diabaikan: audit log bersifat pelengkap
  }
}
