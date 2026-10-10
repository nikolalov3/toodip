import Image from "next/image";

/**
 * The right-hand side of the sign-in screen: a quiet, looping picture of what
 * the product does. Three AI assistants feed one venue; the venue's monthly
 * report fills in below. Pure CSS motion, so it costs nothing to run and
 * stops entirely for people who asked for reduced motion.
 */

const SOURCES = ["ChatGPT", "Google AI", "Perplexity"];

const METRICS = [
  { label: "Share of voice", value: "34%", delta: "+4 pts", fill: 34 },
  { label: "Recommended", value: "7 of 10", delta: "+1", fill: 70 },
  { label: "Sources citing you", value: "12", delta: "+3", fill: 48 },
];

export function SignalVisual() {
  return (
    <div className="auth-visual" aria-hidden="true">
      <div className="auth-visual-brand">
        <Image src="/landing/signal-mark.png" alt="" width={22} height={22} />
        <span>toodip</span>
      </div>

      <div className="auth-scene">
        <div className="auth-sources">
          {SOURCES.map((name, i) => (
            <span key={name} className="auth-source" style={{ animationDelay: `${i * 0.9}s` }}>
              {name}
            </span>
          ))}
        </div>

        <svg className="auth-flow" viewBox="0 0 360 96" fill="none">
          <path d="M60 0 C60 50, 180 36, 180 92" className="flow-line" />
          <path d="M180 0 L180 92" className="flow-line" style={{ animationDelay: "0.9s" }} />
          <path d="M300 0 C300 50, 180 36, 180 92" className="flow-line" style={{ animationDelay: "1.8s" }} />
        </svg>

        <div className="auth-node">
          <span className="ring ring-a" />
          <span className="ring ring-b" />
          <span className="core">
            <Image src="/landing/signal-mark.png" alt="" width={26} height={26} />
          </span>
        </div>

        <svg className="auth-flow auth-flow-down" viewBox="0 0 360 64" fill="none">
          <path d="M180 0 L180 60" className="flow-line" style={{ animationDelay: "0.45s" }} />
          <path d="M180 0 C180 34, 90 30, 90 60" className="flow-line" style={{ animationDelay: "1.35s" }} />
          <path d="M180 0 C180 34, 270 30, 270 60" className="flow-line" style={{ animationDelay: "2.25s" }} />
        </svg>

        <div className="auth-report">
          <div className="auth-report-head">
            <span className="auth-report-title">Your venue</span>
            <span className="auth-report-live">
              <span className="pulse" /> measuring
            </span>
          </div>
          <div className="auth-report-grid">
            {METRICS.map((m, i) => (
              <div key={m.label} className="auth-metric" style={{ animationDelay: `${0.4 + i * 0.25}s` }}>
                <span className="auth-metric-label">{m.label}</span>
                <span className="auth-metric-value">
                  {m.value} <em>{m.delta}</em>
                </span>
                <span className="auth-metric-bar">
                  <span style={{ ["--fill" as string]: `${m.fill}%`, animationDelay: `${0.8 + i * 0.25}s` }} />
                </span>
              </div>
            ))}
          </div>
          <svg className="auth-spark" viewBox="0 0 320 56" fill="none" preserveAspectRatio="none">
            <path
              d="M0 44 C 30 42, 50 40, 80 36 S 130 38, 160 28 S 220 24, 250 18 S 300 12, 320 8"
              className="spark-line"
            />
            <path
              d="M0 44 C 30 42, 50 40, 80 36 S 130 38, 160 28 S 220 24, 250 18 S 300 12, 320 8 V 56 H 0 Z"
              className="spark-fill"
            />
          </svg>
          <div className="auth-report-foot">
            <span>Monthly report</span>
            <span>50 questions · asked twice</span>
          </div>
        </div>
      </div>
    </div>
  );
}
