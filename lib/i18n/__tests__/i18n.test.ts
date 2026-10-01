import { describe, expect, it } from "vitest";
import { getMessages, resolveLocale } from "@/lib/i18n";
import { COLOR_TAGS, EFFECT_TAGS, GLAZE_TYPES, RESULT_TAGS, SURFACE_TAGS, vocab } from "@/lib/vocabulary";

describe("resolveLocale()", () => {
  it("prefers the cookie over Accept-Language", () => {
    expect(resolveLocale("en", "vi-VN,vi;q=0.9")).toBe("en");
    expect(resolveLocale("vi", "en-US,en;q=0.9")).toBe("vi");
  });

  it("falls back to the first supported Accept-Language", () => {
    expect(resolveLocale(undefined, "fr-FR,vi;q=0.8,en;q=0.5")).toBe("vi");
    expect(resolveLocale(undefined, "en-GB")).toBe("en");
  });

  it("ignores unknown cookies and defaults to English", () => {
    expect(resolveLocale("de", null)).toBe("en");
    expect(resolveLocale(undefined, "ja-JP")).toBe("en");
  });
});

describe("Vietnamese vocabulary", () => {
  const vi = getMessages("vi");

  it("labels every canonical tag", () => {
    const all = [...COLOR_TAGS, ...EFFECT_TAGS, ...SURFACE_TAGS, ...RESULT_TAGS, ...GLAZE_TYPES];
    const missing = all.filter((t) => !(t in vi.vocab.tags));
    expect(missing).toEqual([]);
  });

  it("translates labels but keeps stored values", () => {
    const v = vocab(vi);
    expect(v.ATMOSPHERES.find((a) => a.value === "oxidation")?.label).toBe("Ô-xy hoá");
    expect(v.tag("breaking")).toBe("lộ cạnh");
    expect(v.coneLabel(5, 6)).toBe("Cone 5–6");
  });

  it("falls back to the humanized tag for free-text tags", () => {
    expect(vocab(vi).tag("my_custom_tag")).toBe("my custom tag");
    expect(vocab(getMessages("en")).tag("great_break")).toBe("great break");
  });
});
