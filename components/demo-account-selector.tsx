type DemoAccount = {
  id: string;
  fullName: string;
  companyName: string;
  email: string;
};

export function DemoAccountSelector({
  accounts,
  currentAccountId,
  hrefBase,
  label
}: {
  accounts: DemoAccount[];
  currentAccountId: string;
  hrefBase: string;
  label: string;
}) {
  if (accounts.length <= 1) {
    return null;
  }

  return (
    <section className="mb-6 border border-neutral-300 bg-white p-4" aria-label={label}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-black uppercase text-hazard">Demo login</p>
          <h2 className="text-xl font-black">{label}</h2>
        </div>
        <span className="status-pill">{accounts.length} accounts</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {accounts.map((account) => {
          const active = account.id === currentAccountId;
          return (
            <a
              key={account.id}
              href={`${hrefBase}?account=${account.id}`}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "inline-flex min-h-11 flex-col justify-center border border-ink bg-ink px-3 text-sm font-black text-white"
                  : "inline-flex min-h-11 flex-col justify-center border border-neutral-300 bg-smoke px-3 text-sm font-black text-ink hover:border-hazard hover:text-hazard"
              }
            >
              <span>{account.fullName}</span>
              <span className={active ? "text-xs font-bold text-neutral-300" : "text-xs font-bold text-steel"}>
                {account.companyName} - {account.email}
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}