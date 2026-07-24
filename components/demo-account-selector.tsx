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
    <section className="demo-account-panel mb-6" aria-label={label}>
      <div className="demo-account-panel__header">
        <div>
          <p className="text-sm font-black uppercase text-hazard">Demo login</p>
          <h2 className="text-xl font-black">{label}</h2>
        </div>
        <span className="status-pill status-pill--strong">{accounts.length} accounts</span>
      </div>
      <div className="demo-account-panel__grid">
        {accounts.map((account) => {
          const active = account.id === currentAccountId;
          return (
            <a
              key={account.id}
              href={`${hrefBase}?account=${account.id}`}
              aria-current={active ? "page" : undefined}
              className={active ? "demo-account-chip demo-account-chip--active" : "demo-account-chip"}
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
