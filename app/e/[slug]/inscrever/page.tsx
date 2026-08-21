import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { SignupForm } from "@/components/participant/SignupForm";

export const dynamic = "force-dynamic";

interface SignupField {
  key: string;
  label: string;
  required: boolean;
  type?: "text" | "photo";
}

export default async function EventSignupPage({ params }: { params: { slug: string } }) {
  const event = await db.event.findUnique({ where: { slug: params.slug } });
  if (!event || !event.active || event.archived || !event.publicSignupEnabled) notFound();

  const theme = event.theme as any;
  const colors = theme?.colors ?? {};
  const bannerUrl = theme?.bannerUrl as string | undefined;
  const fields = (event.signupFields as unknown as SignupField[]) ?? [];

  return (
    <main
      style={
        {
          "--primary": colors.primary ?? "#4F5FFF",
          background: colors.background ?? "#0A1330",
          color: colors.text ?? "#F5F6FA",
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
        } as React.CSSProperties
      }
    >
      <section className={`hero ${bannerUrl ? "has-banner" : ""}`}>
        {bannerUrl && (
          <>
            <img src={bannerUrl} alt="" className="hero-bg" />
            <div className="hero-scrim" />
          </>
        )}
        <div className="hero-content">
          <h1>{event.name}</h1>
          {event.campaign && <span className="eyebrow">{event.campaign}</span>}
        </div>
      </section>

      <div className="form-wrap">
        {event.description && <p className="description">{event.description}</p>}
        <SignupForm slug={event.slug} fields={fields} />
      </div>

      <style>{`
        .hero {
          position: relative;
          padding: 3rem 1.5rem 1.5rem;
          text-align: center;
        }
        .hero.has-banner {
          padding: 0;
          min-height: min(20rem, 50vh);
          display: flex;
          align-items: flex-end;
          overflow: hidden;
        }
        .hero-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
        }
        .hero-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.55) 55%, var(--background, #0a1330) 92%);
          z-index: 1;
        }
        .hero-content {
          position: relative;
          z-index: 2;
          width: 100%;
        }
        .has-banner .hero-content {
          padding: 2.5rem 1.5rem 2rem;
        }
        .eyebrow {
          display: block;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          font-size: 0.7rem;
          color: var(--primary);
          margin-top: 0.4rem;
        }
        .hero h1 {
          font-family: "Sora", system-ui, sans-serif;
          font-size: clamp(1.6rem, 4vw, 2.4rem);
          margin: 0;
        }
        .form-wrap {
          max-width: 28rem;
          margin: 0 auto;
          padding: 2rem 1.5rem 5rem;
        }
        .description {
          text-align: center;
          opacity: 0.75;
          margin: 0 0 2rem;
          line-height: 1.6;
        }
      `}</style>
    </main>
  );
}
