"use client";
import { useActionState } from "react";
import { startGitHubSignIn, saveProfile, signOut } from "@/app/auth/actions";
import type { FormState, Profile } from "@/lib/auth/validation";
const initial: FormState = {};
function Feedback({ state }: { state: FormState }) {
  return (
    <>
      <p className="form-error" role="alert">
        {state.error}
      </p>
      <p role="status">{state.message}</p>
    </>
  );
}
export function GitHubSignInButton() {
  return (
    <form action={startGitHubSignIn} className="account-form">
      <button className="button primary" type="submit">
        Continue with GitHub
      </button>
    </form>
  );
}
export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(saveProfile, initial);
  return (
    <form action={action} className="account-form">
      <label htmlFor="display-name">Display name</label>
      <input
        id="display-name"
        name="display_name"
        maxLength={80}
        required
        defaultValue={profile.onboarding_completed ? profile.display_name : ""}
      />
      <label htmlFor="skills">Skills and interests</label>
      <input
        id="skills"
        name="skills"
        defaultValue={profile.skills.join(", ")}
        aria-describedby="skills-hint"
      />
      <p id="skills-hint" className="field-hint">
        Separate with commas. For example: React, documentation, design. You can
        leave this blank.
      </p>
      <label htmlFor="experience">Experience level</label>
      <select
        id="experience"
        name="experience"
        defaultValue={profile.experience}
      >
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="experienced">Experienced</option>
      </select>
      <label className="checkbox-label">
        <input
          type="checkbox"
          name="public_board_consent"
          defaultChecked={profile.public_board_consent}
        />{" "}
        Show my display name and submitted PRs on the public progress board when
        it launches.
      </label>
      <p className="field-hint">
        Optional. Your email and help requests stay private. You can change this
        at any time.
      </p>
      <button className="button primary" disabled={pending}>
        {pending ? "Saving…" : "Save and continue"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
export function SignOutButton() {
  const [state, action, pending] = useActionState(signOut, initial);
  return (
    <form action={action}>
      <button className="button secondary" disabled={pending}>
        {pending ? "Signing out…" : "Sign out"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
