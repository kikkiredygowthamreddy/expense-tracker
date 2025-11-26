// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc
} from "firebase/firestore";
import { signOut } from "firebase/auth";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";
import "../index.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const COLORS = [
  "#2E86AB",
  "#F6C85F",
  "#6AB187",
  "#F37C7C",
  "#8D6CAB",
  "#FF9F1C",
  "#A2D2FF",
  "#FFB5E8",
  "#7D5A50",
  "#00A6A6"
];

function monthKeyFromDate(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

function linearRegressionPredict(xs, ys, xToPredict) {
  const n = xs.length;
  if (n === 0) return 0;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumXX += xs[i] * xs[i];
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return ys.reduce((a, b) => a + b, 0) / n;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept =
    (ys.reduce((a, b) => a + b, 0) - slope * xs.reduce((a, b) => a + b, 0)) /
    n;
  return slope * xToPredict + intercept;
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    date: "",
    category: "",
    amount: "",
    description: ""
  });
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState(null);
  const [showPredictions, setShowPredictions] = useState(false); // toggle

  // hide the global gradient while dashboard is mounted
  useEffect(() => {
    document.body.classList.add("no-gradient");
    return () => document.body.classList.remove("no-gradient");
  }, []);

  // auth + realtime data
  useEffect(() => {
    let unsubSnapshot = null;
    const unsubAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }
      if (u) {
        setLoading(true);
        const q = query(
          collection(db, "users", u.uid, "transactions"),
          orderBy("date", "desc")
        );
        unsubSnapshot = onSnapshot(
          q,
          (snap) => {
            const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setTxs(arr);
            setLoading(false);
          },
          (err) => {
            console.error("snapshot err", err);
            setTxs([]);
            setLoading(false);
          }
        );
      } else {
        setTxs([]);
        setLoading(false);
      }
    });

    return () => {
      if (unsubSnapshot) unsubSnapshot();
      unsubAuth();
    };
  }, []);

  // Add transaction
  async function handleAdd(e) {
    e?.preventDefault?.();
    if (!user) return alert("Not signed in");
    if (!form.date || !form.category || form.amount === "")
      return alert("Fill date, category, amount");

    const amountNum = Number(form.amount);
    if (Number.isNaN(amountNum)) return alert("Amount must be a number");

    const payload = {
      date: form.date,
      category: form.category.trim(),
      amount: amountNum,
      description: (form.description || "").trim(),
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, "users", user.uid, "transactions"), payload);
      setForm({ date: "", category: "", amount: "", description: "" });
    } catch (err) {
      console.error(err);
      alert("Failed to add: " + (err.message || err));
    }
  }

  // Delete transaction
  async function handleDelete(txId) {
    if (!user) return;
    if (!confirm("Delete this transaction?")) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "transactions", txId));
    } catch (err) {
      console.error(err);
      alert("Delete failed: " + err.message);
    }
  }

  // Export CSV
  function exportCsv() {
    if (!txs || txs.length === 0) {
      alert("No data to export");
      return;
    }
    const header = ["date", "category", "amount", "description"];
    const rows = txs.map((t) => [
      t.date,
      t.category,
      t.amount,
      t.description || ""
    ]);
    const csv = [header, ...rows]
      .map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${user?.uid || "data"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Build chart + prediction data (now works with 2+ months)
  const chartDataAndPreds = useMemo(() => {
    if (!txs || txs.length === 0) return { chart: null, preds: null };

    const catMonth = {};
    const monthsSet = new Set();

    for (const r of txs) {
      if (!r.date) continue;
      const mk = monthKeyFromDate(r.date);
      monthsSet.add(mk);
      catMonth[r.category] = catMonth[r.category] || {};
      catMonth[r.category][mk] =
        (catMonth[r.category][mk] || 0) + Number(r.amount || 0);
    }

    const months = Array.from(monthsSet).sort();
    if (months.length === 0) return { chart: null, preds: null };

    const categories = Object.keys(catMonth).sort((a, b) => {
      const suma = Object.values(catMonth[a] || {}).reduce(
        (x, y) => x + y,
        0
      );
      const sumb = Object.values(catMonth[b] || {}).reduce(
        (x, y) => x + y,
        0
      );
      return sumb - suma;
    });

    const datasets = [];
    const preds = {};

    categories.forEach((cat, idx) => {
      const monthsObj = catMonth[cat] || {};
      const values = months.map((m) => monthsObj[m] || 0);
      const color = COLORS[idx % COLORS.length];

      // History dataset
      datasets.push({
        label: cat,
        data: values,
        borderColor: color,
        backgroundColor: color,
        tension: 0.25,
        pointRadius: 4,
        fill: false
      });

      // ----- prediction logic -----
      const pairs = months.map((m, i) => ({ idx: i, val: values[i] }));
      const nonZero = pairs.filter((p) => p.val !== 0);

      // Need at least 2 points in time to build a line
      if (pairs.length < 2 || nonZero.length === 0) {
        return;
      }

      let xs, ys;
      if (nonZero.length >= 2) {
        xs = nonZero.map((p) => p.idx);
        ys = nonZero.map((p) => p.val);
      } else {
        // only one non-zero point, still use all pairs for a rough line
        xs = pairs.map((p) => p.idx);
        ys = pairs.map((p) => p.val);
      }

      const nextIdx = Math.max(...xs) + 1;
      const predictedRaw = linearRegressionPredict(xs, ys, nextIdx);
      const predicted = Math.max(0, Math.round(predictedRaw * 100) / 100);

      // figure out label for next month
      const [y, m] = months[months.length - 1].split("-");
      let mm = Number(m) + 1;
      let yyyy = Number(y);
      if (mm > 12) {
        mm = 1;
        yyyy += 1;
      }
      const nextMonthLabel = `${yyyy}-${String(mm).padStart(2, "0")}`;

      preds[cat] = {
        predicted,
        nextMonthLabel,
        history: { months, values }
      };
    });

    return { chart: { labels: months, datasets }, preds };
  }, [txs]);

  useEffect(
    () => setPredictions(chartDataAndPreds.preds),
    [chartDataAndPreds]
  );

  async function doSignOut() {
    await signOut(auth);
    setUser(null);
  }

  // Chart options (title reacts to toggle)
  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        title: {
          display: true,
          text: showPredictions
            ? "Monthly spending by category (history + predicted next month)"
            : "Monthly spending by category (history)"
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "rgba(0,0,0,0.06)" }, beginAtZero: true }
      }
    }),
    [showPredictions]
  );

  // Build chart data with or without prediction
  const chartWithPrediction = useMemo(() => {
    if (!chartDataAndPreds.chart) return null;
    const { labels, datasets } = chartDataAndPreds.chart;

    // History only when toggle OFF or no prediction data
    if (!showPredictions || !predictions) {
      return {
        labels,
        datasets: datasets.map((ds) => ({
          ...ds,
          borderWidth: 2,
          pointRadius: 4
        }))
      };
    }

    const predEntries = Object.entries(predictions);
    if (!predEntries.length) {
      // no predicted categories yet
      return {
        labels,
        datasets: datasets.map((ds) => ({
          ...ds,
          borderWidth: 2,
          pointRadius: 4
        }))
      };
    }

    // History + extra month + dashed forecast points
    const newLabels = [...labels];
    const somePredLabels = predEntries
      .map(([, v]) => v?.nextMonthLabel)
      .filter(Boolean);
    const nextLabel = somePredLabels[0];

    let labelsFinal = newLabels;
    if (nextLabel && !newLabels.includes(nextLabel)) {
      labelsFinal = [...newLabels, nextLabel];
    }

    const finalDatasets = datasets.map((ds) => {
      const values = [...ds.data];
      if (labelsFinal.length > labels.length) values.push(NaN);
      return { ...ds, data: values, borderWidth: 2 };
    });

    for (const [cat, v] of predEntries) {
      const catIndex = finalDatasets.findIndex((d) => d.label === cat);
      if (catIndex === -1) continue;
      const arr = new Array(labelsFinal.length).fill(NaN);
      arr[arr.length - 1] = v.predicted;
      finalDatasets.push({
        label: `${cat} (predicted)`,
        data: arr,
        borderColor: finalDatasets[catIndex].borderColor,
        pointRadius: 7,
        pointBorderWidth: 2,
        borderDash: [6, 4],
        showLine: false
      });
    }

    return { labels: labelsFinal, datasets: finalDatasets };
  }, [chartDataAndPreds, predictions, showPredictions]);

  // Prediction cards summary (only with toggle ON)
  const predictionSummary = useMemo(() => {
    if (!predictions) return null;
    const entries = Object.entries(predictions).filter(
      ([, v]) =>
        v &&
        typeof v.predicted === "number" &&
        !Number.isNaN(v.predicted) &&
        v.predicted > 0
    );
    if (!entries.length) return null;

    const totalPredicted = entries.reduce(
      (sum, [, v]) => sum + (v.predicted || 0),
      0
    );
    const monthLabel = entries[0][1].nextMonthLabel;

    return { entries, totalPredicted, monthLabel };
  }, [predictions]);

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-card" style={{ padding: 20, maxWidth: 980 }}>
        <h2 style={{ marginTop: 0 }}>Dashboard</h2>
        {user && (
          <p className="muted" style={{ marginTop: 6 }}>
            Logged in as: <b>{user.email}</b>
          </p>
        )}

        <div
          className="dashboard-actions"
          style={{ marginTop: 12, display: "flex", gap: 10 }}
        >
          <button className="glass-btn" onClick={doSignOut}>
            Sign out
          </button>
          <button className="glass-btn" onClick={exportCsv}>
            Export CSV
          </button>
        </div>

        <section className="add-tx" style={{ marginTop: 18 }}>
          <h3 style={{ marginBottom: 8 }}>Add transaction</h3>
          <form
            onSubmit={handleAdd}
            className="tx-form"
            style={{ gap: 8, flexWrap: "wrap" }}
          >
            <input
              type="date"
              value={form.date}
              onChange={(e) =>
                setForm({ ...form, date: e.target.value })
              }
            />
            <input
              placeholder="Category"
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value })
              }
            />
            <input
              placeholder="Amount"
              type="number"
              value={form.amount}
              onChange={(e) =>
                setForm({ ...form, amount: e.target.value })
              }
            />
            <input
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
            <button type="submit" className="glass-btn primary">
              Add
            </button>
          </form>
        </section>

        <section className="chart-section" style={{ marginTop: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 8
            }}
          >
            <h3 style={{ margin: 0 }}>Spending chart</h3>
            <button
              type="button"
              className="glass-btn"
              onClick={() => setShowPredictions((v) => !v)}
              style={{ fontSize: 13 }}
            >
              {showPredictions
                ? "Hide next-month prediction"
                : "Show next-month prediction"}
            </button>
          </div>

          <div className="chart-wrapper" style={{ height: 340 }}>
            {chartWithPrediction ? (
              <Line data={chartWithPrediction} options={chartOptions} />
            ) : (
              <div className="muted">
                No chart data yet — add transactions to see a chart.
              </div>
            )}
          </div>
        </section>

        {showPredictions && predictionSummary && (
          <section style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 6 }}>Predicted next month</h3>
            <p className="muted" style={{ marginBottom: 10, fontSize: 14 }}>
              Based on your recent spending, here&apos;s what we expect for{" "}
              <b>{predictionSummary.monthLabel}</b>.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 8
              }}
            >
              {predictionSummary.entries.map(([cat, v], i) => (
                <div
                  key={cat}
                  style={{
                    flex: "0 1 220px",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.06)",
                    background: "#fafbff"
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: 4,
                      color: COLORS[i % COLORS.length]
                    }}
                  >
                    {cat}
                  </div>
                  <div style={{ fontSize: 14 }}>
                    Predicted:{" "}
                    <b>
                      ₹
                      {v.predicted?.toFixed
                        ? v.predicted.toFixed(2)
                        : v.predicted}
                    </b>
                  </div>
                  <div
                    className="muted"
                    style={{ fontSize: 11, marginTop: 4 }}
                  >
                    Month: {v.nextMonthLabel}
                  </div>
                </div>
              ))}
            </div>

            <div className="muted" style={{ fontSize: 14 }}>
              Total predicted spending:{" "}
              <b>
                ₹{predictionSummary.totalPredicted.toFixed(2)}
              </b>
            </div>
          </section>
        )}

        <section className="recent" style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 8 }}>Recent transactions</h3>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="table-wrap">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((t) => (
                    <tr key={t.id || t.date + t.amount}>
                      <td>{t.date}</td>
                      <td>{t.category}</td>
                      <td>₹{t.amount}</td>
                      <td>{t.description}</td>
                      <td>
                        <button
                          className="glass-btn danger"
                          onClick={() => handleDelete(t.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
