export const metadata = {
  title: 'Privacy Policy | Weave of Presence',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12">
      <article className="mx-auto max-w-3xl prose prose-invert">
        <h1>Privacy Policy</h1>
        <p>Weave of Presence operates Bridge AI as an interaction layer between supported services and Weave.</p>
        <h2>Information sent to Bridge AI</h2>
        <p>When a user chooses an integration that calls Bridge AI, the relevant request text may be sent to Weave so Bridge AI can create and operate the requested crossing.</p>
        <h2>Bridge sessions</h2>
        <p>Bridge AI may create a short-lived session containing the request, source, topic and timestamps. Sessions created through the ChatGPT integration expire after 24 hours unless a longer retention period is required for security or operational records.</p>
        <h2>Use of information</h2>
        <p>Information is used to operate the Bridge, provide the requested Weave experience, maintain security, and improve the reliability of the service.</p>
        <h2>Third-party services</h2>
        <p>Requests can originate from third-party platforms. Their handling of information is governed by their own privacy policies. Weave does not control how a third-party platform processes information before it is sent to Bridge AI.</p>
        <h2>Contact</h2>
        <p>For privacy questions concerning Bridge AI, use the contact channel provided by Weave of Presence.</p>
      </article>
    </main>
  )
}
