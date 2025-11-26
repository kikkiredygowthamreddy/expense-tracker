// src/pages/Intro.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Intro() {
  const nav = useNavigate();
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);

  // When "More info" opens, scroll that panel into view nicely
  useEffect(() => {
    if (showMore && moreRef.current) {
      moreRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showMore]);

  const handleGetStarted = () => {
    nav("/login");
  };

  const handleMoreInfo = () => {
    setShowMore((prev) => !prev);
  };

  return (
    <div className="intro-page">
      {/* column wrapper so hero + more-info stay centered */}
      <div style={{ width: "100%", maxWidth: 900 }}>
        {/* main hero card */}
        <div className="intro-hero">
          <div className="intro-college">
            MOTHER TERESA INSTITUTE OF SCIENCE AND TECHNOLOGY
          </div>

          <h1 className="intro-title">Expense Tracker</h1>

          <p className="intro-subtitle">
            Track your expenses, analyze your monthly spending,
            and stay on top of your budget.
          </p>

          <div className="intro-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={handleGetStarted}
            >
              Get Started
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={handleMoreInfo}
            >
              {showMore ? "Hide info" : "More info"}
            </button>
          </div>
        </div>

        {/* extra information block under hero */}
        {showMore && (
          <div className="intro-more-panel" ref={moreRef}>
            <h3>About Expense Tracker</h3>
            <p>
              Simple expense manager with charts, CSV export, predictions,
              and monthly analysis.
            </p>

            <h4>Quick Overview</h4>
            <ul>
              <li>Add / edit / delete expenses</li>
              <li>Dashboard with charts &amp; basic predictions</li>
              <li>Export CSV and backups of your data</li>
            </ul>

            <h4>Built At</h4>
            <p>
              <strong>
                Mother Teresa Institute of Science and Technology
              </strong>
            </p>

            <h4>Security</h4>
            <p className="muted">
              Your data is stored in your own account (browser / backend).
              When using Firebase, authentication tokens are verified
              server-side for extra safety.
            </p>

            <h4>Tips</h4>
            <ol>
              <li>Click <strong>Get Started</strong> and create an account.</li>
              <li>Add a few transactions across different categories.</li>
              <li>
                Use the chart to understand how your spending changes month to month.
              </li>
              <li>
                Export CSV regularly if you want an offline backup of your records.
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
