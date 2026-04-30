"use client";

import { useCallback, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { FraudReport, FraudSignal, RiskLevel } from "@/types";
import styles from "./InvoiceScanner.module.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

const SCAN_STEPS = [
  "Uploading invoice...",
  "Extracting invoice data...",
  "Checking fraud signals...",
  "Generating risk report...",
];

function ScoreCircle({ score, level }: { score: number; level: RiskLevel }) {
  return (
    <div className={`${styles.scoreCircle} ${styles[level]}`}>
      <span className={styles.scoreNum}>{score}</span>
      <span className={styles.scoreSub}>/ 100</span>
    </div>
  );
}

function RiskTag({ level }: { level: RiskLevel }) {
  const labels: Record<RiskLevel, string> = {
    low: "Low risk",
    medium: "Medium risk",
    high: "High risk",
  };
  return (
    <span className={`${styles.riskTag} ${styles[level]}`}>{labels[level]}</span>
  );
}

function SignalCard({ signal }: { signal: FraudSignal }) {
  return (
    <div className={`${styles.signalCard} ${styles[signal.severity]}`}>
      <p className={styles.signalName}>
        {signal.name}
        <span className={`${styles.severityPip} ${styles[signal.severity]}`}>
          {signal.severity}
        </span>
      </p>
      <p className={styles.signalDetail}>{signal.detail}</p>
    </div>
  );
}

export default function InvoiceScanner() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [report, setReport] = useState<FraudReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleFile = useCallback((f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError("Unsupported file type. Please upload a JPG, PNG, WEBP, or PDF.");
      return;
    }
    setFile(f);
    setReport(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const startProgress = () => {
    setProgress(0);
    let pct = 0;
    progressRef.current = setInterval(() => {
      pct += Math.random() * 9;
      if (pct > 88) pct = 88;
      setProgress(pct);
    }, 400);
  };

  const endProgress = () => {
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(100);
    setTimeout(() => setProgress(0), 500);
  };

  const convertPdfToImage = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const scale = 2;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvas,
      viewport,
    }).promise;

    return canvas.toDataURL("image/jpeg", 0.9);
  };

  const runScan = async () => {
    if (!file || !preview) return;
    setScanning(true);
    setReport(null);
    setError(null);
    startProgress();

    setStepIndex(0);
    let si = 0;
    tickerRef.current = setInterval(() => {
      si = Math.min(si + 1, SCAN_STEPS.length - 1);
      setStepIndex(si);
    }, 2500);

    try {
      let imageBase64: string;
      let imageMimeType: string;

      if (file.type === "application/pdf") {
        const imageDataUrl = await convertPdfToImage(file);
        imageBase64 = imageDataUrl.split(",")[1];
        imageMimeType = "image/jpeg";
      } else {
        imageBase64 = preview.split(",")[1];
        imageMimeType = file.type;
      }

      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileData: imageBase64, mimeType: imageMimeType }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Scan failed.");

      setReport(data.report);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error.";
      setError(msg);
    } finally {
      if (tickerRef.current) clearInterval(tickerRef.current);
      endProgress();
      setScanning(false);
    }
  };

  const isPDF = file?.type === "application/pdf";
  const sevOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sortedSignals = report?.signals
    ? [...report.signals].sort(
        (a, b) => (sevOrder[a.severity] ?? 1) - (sevOrder[b.severity] ?? 1)
      )
    : [];

  return (
    <main className={styles.main}>
      <div className={styles.headerContainer}>
        <img src="/vett_logo_black.png" alt="Vett Logo" className={styles.logo} />
        <span className={styles.badge}>Vett v1.0</span>
      </div>
      
      <h1 className={styles.title}>Invoice fraud detector</h1>
      <p className={styles.subtitle}>
        Upload any invoice, image or PDF. The scanner checks for common
        billing fraud signals and returns a risk score with a full breakdown of
        what&apos;s suspicious and why.
      </p>

      <div
        className={`${styles.dropZone} ${dragging ? styles.dragging : ""} ${
          file ? styles.hasFile : ""
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        aria-label="Upload invoice"
      >
        <span className={styles.dropIcon}>&#8679;</span>
        <p className={styles.dropText}>Drop your invoice here, or click to browse</p>
        <p className={styles.dropHint}>Supports JPG, PNG, WEBP, PDF: max 20MB</p>
        {file && <p className={styles.fileName}>{file.name}</p>}
        {preview && !isPDF && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Invoice preview" className={styles.preview} />
        )}
        {isPDF && <p className={styles.pdfBadge}>PDF ready to scan</p>}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
        style={{ display: "none" }}
        aria-label="Upload invoice file"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      <button
        className={styles.scanBtn}
        disabled={!file || scanning}
        onClick={runScan}
      >
        {scanning ? SCAN_STEPS[stepIndex] : "▶ Scan for fraud signals"}
      </button>

      {progress > 0 && (
        <div className={styles.progressWrap}>
          <div className={styles.progressBar} style={{ width: `${progress}%` }} />
        </div>
      )}

      {error && <div className={styles.errorBox}>{error}</div>}

      {report && (
        <div className={styles.result} ref={resultRef}>
          <div className={styles.resultHeader}>
            <ScoreCircle score={Math.round(report.risk_score)} level={report.risk_level} />
            <div className={styles.scoreInfo}>
              <RiskTag level={report.risk_level} />
              <p className={styles.summaryText}>{report.summary}</p>
            </div>
          </div>

          <hr className={styles.divider} />

          {sortedSignals.length > 0 && (
            <section>
              <p className={styles.sectionLabel}>Fraud signals detected</p>
              {sortedSignals.map((s, i) => (
                <SignalCard key={i} signal={s} />
              ))}
              <hr className={styles.divider} />
            </section>
          )}

          {report.safe_signals.length > 0 && (
            <section>
              <p className={styles.sectionLabel}>Checks that passed</p>
              <ul className={styles.safeList}>
                {report.safe_signals.map((s, i) => (
                  <li key={i}>
                    <span className={styles.checkIcon}>&#10003;</span>
                    {s}
                  </li>
                ))}
              </ul>
              <hr className={styles.divider} />
            </section>
          )}

          <p className={styles.footerNote}>
            This tool assists human review, always verify directly with
            the issuing company before making or declining payment. Not legal or
            financial advice.
          </p>
        </div>
      )}
    </main>
  );
}