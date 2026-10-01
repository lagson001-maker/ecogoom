"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/auth";
import { bool, isUuid, str } from "@/lib/forms";
import { copy } from "@/lib/i18n";

export async function toggleInventory(glazeId: string): Promise<{ owned: boolean; error?: string }> {
  const viewer = await getViewer();
  if (!viewer.userId) return { owned: false, error: copy.auth.required };
  if (!isUuid(glazeId)) return { owned: false, error: copy.errors.generic };
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("user_inventory")
    .select("id")
    .eq("user_id", viewer.userId)
    .eq("glaze_id", glazeId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("user_inventory").delete().eq("id", existing.id);
    if (error) return { owned: true, error: error.message };
    revalidatePath("/my-glazes");
    return { owned: false };
  }
  const { error } = await supabase.from("user_inventory").insert({ user_id: viewer.userId, glaze_id: glazeId });
  if (error) return { owned: false, error: error.message };
  revalidatePath("/my-glazes");
  return { owned: true };
}

export async function updateInventoryItem(fd: FormData): Promise<void> {
  const viewer = await getViewer();
  const id = str(fd, "id");
  if (!viewer.userId || !isUuid(id)) return;
  const supabase = await createClient();
  await supabase
    .from("user_inventory")
    .update({
      quantity_note: str(fd, "quantity_note", 100),
      notes: str(fd, "notes", 1000),
      favorite: bool(fd, "favorite"),
      in_stock: bool(fd, "in_stock"),
    })
    .eq("id", id);
  revalidatePath("/my-glazes");
}
