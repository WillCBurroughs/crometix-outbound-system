import { useEffect, useState } from "react";
import "./App.css";

type Stage = {
  key: string;
  label: string;
  value: number;
};

type DashboardResponse = {
  funnel: Record<string, number>;
  stages: Stage[];
};

function App() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:3001/dashboard/metrics")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard metrics");
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <main className="page">Error: {error}</main>;
  if (!data) return <main className="page">Loading dashboard...</main>;

  const maxValue = data.stages[0]?.value || 1;

  return (
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">Crometix Outbound</p>
          <h1>Pipeline Dashboard</h1>
        </div>
        <p className="subtitle">Lead source → revenue funnel</p>
      </header>

      <section className="cards">
        {data.stages.slice(0, 6).map((stage) => (
          <div className="card" key={stage.key}>
            <p>{stage.label}</p>
            <strong>{stage.value.toLocaleString()}</strong>
          </div>
        ))}
      </section>

      <section className="panel">
        <h2>Outbound Funnel</h2>

        <div className="funnel">
          {data.stages.map((stage, index) => {
            const previous = data.stages[index - 1];
            const stepRate =
              previous && previous.value > 0
                ? Math.round((stage.value / previous.value) * 100)
                : null;

            const totalRate =
              maxValue > 0 ? Math.round((stage.value / maxValue) * 100) : 0;

            return (
              <div className="funnel-row" key={stage.key}>
                <div className="funnel-label">
                  <span>{stage.label}</span>
                  <strong>{stage.value.toLocaleString()}</strong>
                </div>

                <div className="bar-wrap">
                  <div
                    className="bar"
                    style={{ width: `${Math.max(totalRate, 2)}%` }}
                  />
                </div>

                <div className="rates">
                  <span>{totalRate}% of total</span>
                  {stepRate !== null && <span>{stepRate}% from previous</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default App;
