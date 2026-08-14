import { redirect } from "next/navigation";

/**
 * There's no separate "home" content to maintain here on purpose - /entrar
 * already is the participant-facing landing (branding + "type your email"),
 * so this just makes sure the bare domain root has *somewhere* to go
 * instead of falling through to Next's default 404.
 */
export default function HomePage() {
  redirect("/entrar");
}
