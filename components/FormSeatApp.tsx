"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "dressage" | "jumping";
type ViewState = "upload" | "preview" | "loading" | "results" | "rejected" | "error" | "paywall";

interface AnalysisPoint {
  name: string;
  status: "good" | "warn" | "issue";
  rating: "Correct" | "Needs Work" | "Significant Fault";
  confidence: "high" | "medium" | "low";
  finding: string;
  standard: string;
  standardSourceId: string;
  tips: string[];
}

interface AnalysisOk {
  status: "ok";
  overallScore: number;
  overallVerdict: string;
  points: AnalysisPoint[];
}

interface AnalysisRejected {
  status: "rejected";
  reason: string;
  message: string;
}

interface AnalysisError {
  status: "error";
  message: string;
}

const FREE_LIMIT = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ANALYZE_TIMEOUT_MS = 30_000;

export default function FormSeatApp() {
  const [phase, setPhase] = useState<Phase>("dressage");
  const [viewState, setViewState] = useState<ViewState>("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<"image/jpeg" | "image/png" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [result, setResult] = useState<AnalysisOk | null>(null);
  const [rejection, setRejection] = useState<AnalysisRejected | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [openPoints, setOpenPoints] = useState<Set<number>>(new Set());

  const [analysisCount, setAnalysisCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const stored = parseInt(localStorage.getItem("fsAnalysisCount") || "0", 10);
    setAnalysisCount(Number.isNaN(stored) ? 0 : stored);
  }, []);

  function selectPhase(next: Phase) {
    setPhase(next);
  }

  function validateAndLoad(file: File) {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setUploadError("Please upload a JPG or PNG photo — other formats aren't supported yet.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError("That photo is larger than 10MB. Please upload a smaller file.");
      return;
    }
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const [, base64] = dataUrl.split(",");
      setPreviewUrl(dataUrl);
      setBase64Image(base64);
      setMimeType(file.type as "image/jpeg" | "image/png");
      setViewState("preview");
    };
    reader.readAsDataURL(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndLoad(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndLoad(file);
  }

  function resetUpload() {
    setPreviewUrl(null);
    setBase64Image(null);
    setMimeType(null);
    setUploadError(null);
    setResult(null);
    setRejection(null);
    setErrorMessage(null);
    setOpenPoints(new Set());
    setViewState("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function togglePoint(i: number) {
    setOpenPoints((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function runAnalysis() {
    if (analysisCount >= FREE_LIMIT) {
      setViewState("paywall");
      return;
    }
    if (!base64Image || !mimeType) return;

    setViewState("loading");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase, image: base64Image, mimeType }),
        signal: controller.signal,
      });

      const data: AnalysisOk | AnalysisRejected | AnalysisError = await response.json();

      if (data.status === "ok") {
        const nextCount = analysisCount + 1;
        setAnalysisCount(nextCount);
        localStorage.setItem("fsAnalysisCount", nextCount.toString());
        setResult(data);
        setViewState("results");
        const firstIssue = data.points.findIndex((p) => p.status === "issue" || p.status === "warn");
        setOpenPoints(firstIssue >= 0 ? new Set([firstIssue]) : new Set());
      } else if (data.status === "rejected") {
        setRejection(data);
        setViewState("rejected");
      } else {
        setErrorMessage(data.message || "Something went wrong. Please try again.");
        setViewState("error");
      }
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setErrorMessage(
        aborted
          ? "Analysis timed out. Please try again — if it keeps happening, try a smaller photo."
          : "We couldn't reach the analysis service. Check your connection and try again.",
      );
      setViewState("error");
    } finally {
      clearTimeout(timeout);
    }
  }

  const remaining = FREE_LIMIT - analysisCount;

  return (
    <>
      <header>
        <div className="logo">
          Form<span>Seat</span>
        </div>
        <nav>
          <a href="#">How It Works</a>
          <a href="#">Standards</a>
          <a href="#">Pricing</a>
          <a href="#" className="nav-cta">Sign Up Free</a>
        </nav>
      </header>

      <div className="hero">
        <div className="hero-badge">Eventing Position Analysis · USEA &amp; FEI Standards</div>
        <h1>
          Ride like a judge
          <br />
          <em>sees you</em>
        </h1>
        <p>
          Upload a side-on photo and get an instant, standards-referenced breakdown of your position
          — dressage and show jumping phases.
        </p>
        <div className="hero-actions">
          <button
            className="btn-primary"
            onClick={() => document.getElementById("analyzeSection")?.scrollIntoView({ behavior: "smooth" })}
          >
            Analyze My Position
          </button>
        </div>
      </div>

      <div className="phase-section" id="analyzeSection">
        <div className="free-counter">
          {mounted && remaining <= 0
            ? "🔒 Free analyses used — subscribe to continue"
            : `🎯 You have ${mounted ? remaining : FREE_LIMIT} free ${
                (mounted ? remaining : FREE_LIMIT) === 1 ? "analysis" : "analyses"
              } remaining — no account needed`}
        </div>

        <div className="section-label">Step 1</div>
        <div className="section-title">Select Your Phase</div>

        <div className="phase-cards">
          <div
            className={`phase-card ${phase === "dressage" ? "active" : ""}`}
            onClick={() => selectPhase("dressage")}
          >
            <div className="phase-icon">🎩</div>
            <h3>Dressage Phase</h3>
            <p>Upright seat, long leg, soft contact. Judged on harmony, straightness, and vertical alignment.</p>
          </div>
          <div
            className={`phase-card ${phase === "jumping" ? "active" : ""}`}
            onClick={() => selectPhase("jumping")}
          >
            <div className="phase-icon">🏇</div>
            <h3>Show Jumping Phase</h3>
            <p>Two-point, release, balance over fences. Judged on security, following hand, and heel depth.</p>
          </div>
        </div>

        <div className="angle-guide">
          <div className="angle-guide-icon">📐</div>
          <div>
            <h4>Camera Setup for Best Results</h4>
            <p>
              Position your camera directly to the side (profile view) at shoulder height, approximately 10–15
              metres away. The full horse and rider should be visible. Side-on shots give the most accurate
              alignment reads — off-angle photos will be flagged rather than guessed at.
            </p>
          </div>
        </div>

        {(viewState === "upload") && (
          <>
            <div className="section-label">Step 2</div>
            <div className="section-title">Upload Your Photo</div>

            <div
              className={`upload-section ${dragOver ? "dragover" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="upload-icon">📷</div>
              <h3>Drop your photo here or tap to browse</h3>
              <p>JPG or PNG · Max 10MB · Side-on profile view only</p>
              <div className="upload-hint">
                <span>💡</span>
                <span>
                  For dressage: capture at sitting trot or halt. For jumping: capture at the apex of the fence or
                  on approach.
                </span>
              </div>
            </div>
            {uploadError && <div className="upload-error">{uploadError}</div>}
            <input
              ref={fileInputRef}
              type="file"
              id="fileInput"
              accept="image/jpeg,image/png"
              onChange={handleFileInput}
            />
          </>
        )}

        {(viewState === "preview" ||
          viewState === "loading" ||
          viewState === "results" ||
          viewState === "rejected" ||
          viewState === "error" ||
          viewState === "paywall") &&
          previewUrl && (
            <>
              <div className="preview-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Uploaded rider position" />
              </div>

              {viewState === "preview" && (
                <div className="preview-actions">
                  <button className="btn-analyze" onClick={runAnalysis}>
                    🔍 Analyze Position Now
                  </button>
                  <button className="btn-reset" onClick={resetUpload}>
                    ✕ Remove Photo
                  </button>
                </div>
              )}
            </>
          )}

        {viewState === "loading" && (
          <div className="loading-state">
            <span className="loading-horse">🐴</span>
            <h3>Analyzing your position...</h3>
            <p style={{ fontSize: "0.85rem", color: "#888", fontWeight: 300 }}>
              Checking image quality and measuring alignment against compiled USEA &amp; FEI position guidance
            </p>
            <div className="loading-bar">
              <div className="loading-bar-fill" />
            </div>
          </div>
        )}

        {viewState === "rejected" && rejection && (
          <div className="error-state">
            <h3>We couldn&apos;t analyze this photo</h3>
            <p>{rejection.message}</p>
            <div className="preview-actions">
              <button className="btn-reset" onClick={resetUpload}>
                Try Another Photo
              </button>
            </div>
          </div>
        )}

        {viewState === "error" && (
          <div className="error-state">
            <h3>Something went wrong</h3>
            <p>{errorMessage}</p>
            <div className="preview-actions">
              <button className="btn-analyze" onClick={runAnalysis}>
                Try Again
              </button>
              <button className="btn-reset" onClick={resetUpload}>
                Remove Photo
              </button>
            </div>
          </div>
        )}

        {viewState === "results" && result && (
          <div className="results-section">
            <div className="results-header">
              <div>
                <h2>{(phase === "dressage" ? "Dressage" : "Show Jumping") + " Phase — Position Analysis"}</h2>
                <p style={{ fontSize: "0.82rem", color: "var(--light-brown)", fontWeight: 300, marginTop: "0.25rem" }}>
                  Amateur/Adult Amateur · Eventing position guidance
                </p>
              </div>
              <div className="overall-score">
                <div className="score-ring">
                  <span className="score-num">{result.overallScore.toFixed(1)}</span>
                  <span className="score-label">/10</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--light-brown)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Overall
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "var(--gold)", fontFamily: "'Cormorant Garamond', serif" }}>
                    {result.overallVerdict}
                  </div>
                </div>
              </div>
            </div>

            <div className="results-body">
              {result.points.map((pt, i) => (
                <div className="alignment-point" key={pt.name}>
                  <div className={`point-header ${openPoints.has(i) ? "open" : ""}`} onClick={() => togglePoint(i)}>
                    <div className={`point-status status-${pt.status}`} />
                    <div className="point-name">{pt.name}</div>
                    {pt.confidence === "low" && <div className="confidence-chip confidence-low">Low Confidence</div>}
                    {pt.confidence === "medium" && <div className="confidence-chip">Medium Confidence</div>}
                    <div className={`point-rating rating-${pt.status}`}>{pt.rating}</div>
                    <div className="point-chevron">▼</div>
                  </div>
                  <div className={`point-body ${openPoints.has(i) ? "open" : ""}`}>
                    <div className="point-finding">
                      <div className="finding-label">What We Found</div>
                      <div className="finding-text">{pt.finding}</div>
                    </div>
                    <div className="standard-ref">
                      <div className="finding-label">Position Standard Reference</div>
                      <div className="finding-text">{pt.standard}</div>
                    </div>
                    <div className="correction-tips">
                      <div className="finding-label" style={{ marginBottom: "0.6rem" }}>
                        Correction Tips
                      </div>
                      {pt.tips.map((tip, ti) => (
                        <div className="tip-item" key={ti}>
                          <div className="tip-bullet">{ti + 1}</div>
                          <div>{tip}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="disclaimer">
              <strong>Note:</strong> This analysis is based on a compiled reference of publicly available USEA and
              FEI position guidance and is intended as a training aid, not official judging. FormSeat is not
              affiliated with or endorsed by USEA or FEI. Results are most accurate from clear, side-on profile
              photos, and each finding shows how confident the analysis is given what your specific photo could
              show. Always work with a certified coach (USEA L1+ or BHS) to develop your position safely.
            </div>

            <div className="preview-actions" style={{ marginTop: "1.5rem" }}>
              <button className="btn-reset" onClick={resetUpload}>
                Analyze Another Photo
              </button>
            </div>
          </div>
        )}

        {viewState === "paywall" && (
          <div className="paywall">
            <h3>You&apos;ve used your 3 free analyses</h3>
            <p>
              Join the waitlist to be notified when paid plans go live — unlimited analyses, progress tracking,
              and full correction tip libraries.
            </p>
            <div className="plan-cards">
              <div className="plan-card">
                <div className="plan-name">Starter</div>
                <div className="plan-price">
                  $9<span>/month</span>
                </div>
                <ul className="plan-features">
                  <li>20 analyses per month</li>
                  <li>Both phases</li>
                  <li>Full correction tips</li>
                  <li>Download reports</li>
                </ul>
              </div>
              <div className="plan-card featured">
                <div className="plan-name">⭐ Rider Pro</div>
                <div className="plan-price">
                  $19<span>/month</span>
                </div>
                <ul className="plan-features">
                  <li>Unlimited analyses</li>
                  <li>Progress tracking</li>
                  <li>Before/after comparison</li>
                  <li>Priority support</li>
                </ul>
              </div>
            </div>
            <button className="btn-primary" disabled>
              Billing Coming Soon
            </button>
            <div className="waitlist-note">Pricing shown is illustrative — payments aren&apos;t live yet.</div>
          </div>
        )}
      </div>

      <footer>
        <div className="footer-logo">FormSeat</div>
        <p>Built on a compiled reference of publicly available USEA &amp; FEI position guidance · For training purposes only</p>
        <p style={{ marginTop: "0.5rem", opacity: 0.5 }}>© 2026 FormSeat · Not affiliated with USEA or FEI</p>
      </footer>
    </>
  );
}
