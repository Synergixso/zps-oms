export const metadata = { title: "Contact" };

export default function Contact() {
  return (
    <div className="print-a4 mx-auto max-w-[820px] px-4 py-12">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zp-green">Contact</p>
      <h1 className="mt-2 text-3xl font-bold">Contact and support</h1>
      <div className="mt-6 rounded-[9px] border border-amber-300 bg-amber-50 p-5 text-[14px] text-amber-900">
        <p className="font-semibold">Official contact details have not yet been supplied.</p>
        <p className="mt-1">
          Contact channels for ZPS-OMS will be published here once provided and approved by the Zambia Police Service. No telephone numbers, e-mail addresses or postal
          addresses are shown to avoid publishing unverified information.
        </p>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="rounded-[9px] border border-line bg-white p-5">
          <h2 className="text-[15px] font-semibold">Business enquiries</h2>
          <p className="mt-2 text-[13.5px] text-ink-2">Proposed business sponsor: Office of the Deputy Inspector General – Operations. Channel to be confirmed.</p>
        </section>
        <section className="rounded-[9px] border border-line bg-white p-5">
          <h2 className="text-[15px] font-semibold">Technical support</h2>
          <p className="mt-2 text-[13.5px] text-ink-2">Proposed technical authority: Technical Services Directorate (subject to confirmation). Channel to be confirmed.</p>
        </section>
        <section className="rounded-[9px] border border-line bg-white p-5 md:col-span-2">
          <h2 className="text-[15px] font-semibold">Account access</h2>
          <p className="mt-2 text-[13.5px] text-ink-2">
            There is no public registration. Accounts are provisioned only through the approved institutional access process. This site does not accept public complaints or
            reports; members of the public should use the Service&apos;s established official channels.
          </p>
        </section>
      </div>
    </div>
  );
}
