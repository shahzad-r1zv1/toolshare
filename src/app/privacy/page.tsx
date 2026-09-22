export const metadata = {
  title: "Privacy Policy — ToolShare",
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
        <div className="relative bg-surface border-2 border-border rounded-3xl overflow-hidden shadow-[0_4px_0_0_hsl(var(--shadow-color)/0.15)]">
          <div className="h-[4px] kit-edge" />
          <div className="p-6 sm:p-10">
            <p className="font-tag text-xs uppercase tracking-wide text-ink-faint mb-2">
              Last updated August 29, 2026
            </p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight mb-3">
              Privacy Policy
            </h1>
            <p className="text-ink-muted leading-relaxed">
              ToolShare helps small, trusted circles of family, friends, or
              neighbors lend and borrow tools with each other. This page
              explains what information the app collects and how it is used.
            </p>

            <Section title="Information We Collect">
              <ul className="grid gap-3">
                <ListItem>
                  <strong className="text-ink">Account information:</strong>{" "}
                  when you sign in with Google or create an email/password
                  account, we receive your name, email address, and profile
                  photo (if provided by Google) via Firebase Authentication.
                </ListItem>
                <ListItem>
                  <strong className="text-ink">Content you add:</strong>{" "}
                  tools and items you list, requests, messages sent to other
                  circle members, and loan history are stored so that
                  members of your circle(s) can see them.
                </ListItem>
                <ListItem>
                  <strong className="text-ink">Circle membership:</strong>{" "}
                  which circles you belong to and your invite codes, so
                  members can find and coordinate with each other.
                </ListItem>
              </ul>
            </Section>

            <Section title="How We Use Information">
              <p>
                Information is used only to operate the app&apos;s core
                functionality: authenticating you, syncing your circle&apos;s
                items and requests in real time, and displaying loan history
                and messages to the members of circles you belong to. We do
                not sell your data or use it for advertising.
              </p>
            </Section>

            <Section title="Who Can See Your Data">
              <p>
                Data you add (items, requests, messages, loan history) is
                visible only to members of the same circle(s) as you — never
                to the general public or to members of unrelated circles.
              </p>
            </Section>

            <Section title="Third-Party Services">
              <p>
                ToolShare uses Google Firebase (Authentication and Firestore
                database) to store data and manage sign-in. Firebase&apos;s
                handling of data is governed by{" "}
                <LegalLink href="https://firebase.google.com/support/privacy">
                  Google&apos;s Privacy Policy
                </LegalLink>
                .
              </p>
            </Section>

            <Section title="Data Retention & Deletion">
              <p>
                Your data is retained as long as your account exists. To
                request deletion of your account and associated data, see{" "}
                <LegalLink href="/delete-account">
                  how to delete your account
                </LegalLink>
                .
              </p>
            </Section>

            <Section title="Children's Privacy">
              <p>
                ToolShare is not directed at children under 13, and we do not
                knowingly collect information from children under 13.
              </p>
            </Section>

            <Section title="Changes to This Policy">
              <p>
                We may update this policy from time to time. Continued use
                of the app after changes constitutes acceptance of the
                updated policy.
              </p>
            </Section>

            <p className="mt-10 pt-6 border-t-2 border-border text-sm text-ink-muted">
              Questions about this policy or your data? Contact{" "}
              <LegalLink href="mailto:toolshare26@gmail.com">
                toolshare26@gmail.com
              </LegalLink>
              .
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
      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-teal shrink-0" />
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
