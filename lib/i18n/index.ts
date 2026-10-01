import { en, type Messages } from "./en";

// V1 ships English. To add Vietnamese, create vi.ts exporting `vi: Messages`
// and switch on a locale cookie here.
export const copy: Messages = en;
export type { Messages };
