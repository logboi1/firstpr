import { z } from "zod";
export const emailSchema = z.string().trim().email().max(254);
export const codeSchema = z.string().trim().regex(/^\d{6,10}$/, "Enter the code from your email.");
export const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Enter a display name.").max(80),
  skills: z.array(z.string().trim().min(1).max(60)).max(30, "Use at most 30 skills."),
  experience: z.enum(["beginner", "intermediate", "experienced"]),
  public_board_consent: z.boolean(),
});
export type Profile = z.infer<typeof profileSchema> & { onboarding_completed: boolean };
export type FormState = { error?: string; message?: string; email?: string };
export function profileInput(form: FormData) {
  return profileSchema.safeParse({
    display_name: form.get("display_name"),
    skills: [...new Set(String(form.get("skills") ?? "").split(",").map(s => s.trim()).filter(Boolean))],
    experience: form.get("experience"),
    public_board_consent: form.get("public_board_consent") === "on",
  });
}
