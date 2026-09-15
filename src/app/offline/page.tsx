export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="card max-w-sm p-7 text-center">
        <p aria-hidden className="text-3xl">📡</p>
        <h1 className="mt-3 text-lg font-semibold">You are offline</h1>
        <p className="mt-2 text-sm text-muted">
          Expenses you record while offline are saved on this phone and sent as soon as
          the signal is back. Balances and reports need a connection, so they are not
          shown here rather than showing you an out-of-date figure.
        </p>
        <a href="/entry" className="btn-primary mt-5 w-full">Back to Add expense</a>
      </div>
    </main>
  );
}
