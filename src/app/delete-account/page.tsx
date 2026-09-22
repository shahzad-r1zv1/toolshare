export const metadata = {
  title: "Delete Your Account — ToolShare",
};

export default function DeleteAccount() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
        <div className="relative bg-surface border-2 border-border rounded-3xl overflow-hidden shadow-[0_4px_0_0_hsl(var(--shadow-color)/0.15)]">
          <div className="h-[4px] kit-edge" />
          <div className="p-6 sm:p-10">
            <p className="font-tag text-xs uppercase tracking-wide text-ink-faint mb-2">
              Account &amp; Data
            </p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight mb-3">
              Delete Your ToolShare Account
            </h1>
            <p className="text-ink-muted leading-relaxed">
              This page explains how to request deletion of your ToolShare
              account and the data associated with it.
            </p>

            <Section title="How to Request Deletion">
              <p>
                Send an email to{" "}
                <LegalLink href="mailto:toolshare26@gmail.com?subject=Delete%20my%20ToolShare%20account">
                  toolshare26@gmail.com
                </LegalLink>{" "}
                from the email address associated with your ToolShare
                account, with the subject line &quot;Delete my ToolShare
                account.&quot; We will confirm the deletion by email within 7
                days.
              </p>
            </Section>

            <Section title="What Gets Deleted">
              <ul className="grid gap-2">
                <ListItem>Your account (name, email address, and sign-in credentials)</ListItem>
                <ListItem>Tool listings you created</ListItem>
                <ListItem>Your loan requests and loan history</ListItem>
                <ListItem>Messages you sent in circles</ListItem>
              </ul>
            </Section>

            <Section title="What May Be Retained">
              <p>
                If you were part of a shared circle, references to your
                participation in a completed loan (for example, that
                &quot;a member borrowed Item X on this date&quot;) may be
                retained in anonymized form so the other circle
                member&apos;s loan history stays accurate. No personally
                identifying information about you is kept in that record
                after deletion. Circles you created remain owned by the
                circle&apos;s other members, if any; if you were the only
                member, the circle and its listings are deleted along with
                your account.
              </p>
              <p className="mt-3">
                Deletion typically completes within 30 days of confirmation.
              </p>
            </Section>

            <p className="mt-10 pt-6 border-t-2 border-border text-sm text-ink-muted">
              See the full{" "}
              <LegalLink href="/privacy">Privacy Policy</LegalLink> for more
              detail on what data ToolShare collects.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display font-bold text-lg tracking-tight mb-2.5">
        {title}
      </h2>
      <div className="text-ink-muted leading-relaxed [&_p]:leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function ListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function LegalLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="text-accent-strong font-semibold underline decoration-2 underline-offset-2 hover:text-accent"
    >
      {children}
    </a>
  );
}
