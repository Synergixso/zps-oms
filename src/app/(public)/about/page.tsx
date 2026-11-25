export const metadata = { title: "About" };

export default function About() {
  return (
    <article className="print-a4 mx-auto max-w-[820px] px-4 py-12">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zp-green">About ZPS-OMS</p>
      <h1 className="mt-2 text-3xl font-bold">A proposed administrative platform for the Operations Section</h1>
      <div className="mt-6 space-y-5 text-[14.5px] leading-relaxed text-ink-2">
        <p>
          The Zambia Police Service Operations Management System (ZPS-OMS) is a proposed centralised digital platform intended to support the administrative management,
          coordination, resource accountability and reporting functions of the Zambia Police Service Operations Section.
        </p>
        <p>
          It is designed for authorised Operations office bearers at Service Headquarters under the Office of the Deputy Inspector General – Operations, the ten Provincial Police
          Divisions, and authorised Divisional Units and formations within the approved establishment.
        </p>
        <h2 className="pt-2 text-lg font-bold text-ink">Guiding principles</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>The software represents the approved institutional structure; it does not create command authority or change delegations.</li>
          <li>Every user&apos;s access is defined by an approved role, functional responsibility and organisational scope — never by rank alone.</li>
          <li>Approval authority requires a separately recorded delegation.</li>
          <li>Aggregate-first management reporting with data minimisation.</li>
          <li>Every significant action is recorded in a tamper-evident audit trail.</li>
          <li>Operational, tactical, intelligence and investigative capabilities are explicitly out of scope.</li>
        </ul>
        <h2 className="pt-2 text-lg font-bold text-ink">Governance</h2>
        <p>
          Institutional authority rests with Zambia Police Service High Command. The proposed business sponsor is the Office of the Deputy Inspector General – Operations. The
          proposed technical authority is the Technical Services Directorate, subject to institutional confirmation.
        </p>
        <h2 className="pt-2 text-lg font-bold text-ink">Status</h2>
        <p>
          ZPS-OMS is a proposed software development project. The current version is a local prototype using synthetic data, prepared for institutional review. It has not been
          approved for production use, and the legal, privacy, security, hosting and records-management reviews required before any such use remain outstanding.
        </p>
      </div>
    </article>
  );
}
