"use client";

import { StatefulForm } from "@/components/ui/stateful-form";
import { useActionState, useState } from "react";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { createImportDraft } from "./actions";
import { uploadImage, validateImage } from "@/features/media/image-upload";
import { downscaleImage } from "@/features/ask/downscale";
import { useCopy } from "@/lib/i18n/client";
import { vocab } from "@/lib/vocabulary";
import type { ActionState } from "@/lib/forms";

export function ImportForm({ userId, aiConfigured }: { userId: string; aiConfigured: boolean }) {
  const copy = useCopy();
  const t = copy.import;
  const { SOURCE_TYPES } = vocab(copy);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [state, action] = useActionState<ActionState, FormData>(async (prev, fd) => {
    if (file) {
      const up = await uploadImage(await downscaleImage(file, 2000), "private-user-assets", `${userId}/imports`, copy);
      if (up.error || !up.path) return { ok: false, message: up.error ?? copy.errors.uploadFailed };
      fd.set("image_path", up.path);
    }
    return createImportDraft(prev, fd);
  }, null);

  return (
    <StatefulForm action={action} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t.url} htmlFor="im-url" error={state?.fieldErrors?.source_url}>
          <Input id="im-url" name="source_url" type="url" inputMode="url" placeholder="https://…" />
        </Field>
        <Field label={t.sourceType} htmlFor="im-type">
          <Select id="im-type" name="source_type" defaultValue="community">
            {Object.entries(SOURCE_TYPES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.sourceName} htmlFor="im-name">
          <Input id="im-name" name="source_name" placeholder={t.sourceNamePlaceholder} />
        </Field>
        <Field label={t.author} htmlFor="im-author">
          <Input id="im-author" name="source_author" />
        </Field>
      </div>
      <Field label={t.text} htmlFor="im-text" hint={t.textHint}>
        <Textarea id="im-text" name="raw_text" rows={5} />
      </Field>
      <Field label={t.image} htmlFor="im-img" error={fileError ?? undefined}>
        <input
          id="im-img"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="block w-full text-sm file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-surface-2 file:px-4 file:text-sm file:font-medium"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            const invalid = f ? validateImage(f, copy) : null;
            setFileError(invalid);
            setFile(invalid ? null : f);
          }}
        />
      </Field>
      <Field label={t.notes} htmlFor="im-notes">
        <Textarea id="im-notes" name="notes" rows={2} />
      </Field>
      <p className="text-xs text-muted">{aiConfigured ? "AI will suggest fields from your input. You confirm everything on the next screen." : t.aiOff}</p>
      <FormMessage state={state} />
      <SubmitButton size="lg" pendingLabel={aiConfigured ? t.extracting : copy.common.saving}>
        {t.submit}
      </SubmitButton>
    </StatefulForm>
  );
}
