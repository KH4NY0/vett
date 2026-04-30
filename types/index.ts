export type RiskLevel = "low" | "medium" | "high";

export interface FraudSignal {
  name: string;
  detail: string;
  severity: RiskLevel;
}

export interface FraudReport {
  risk_score: number;
  risk_level: RiskLevel;
  summary: string;
  signals: FraudSignal[];
  safe_signals: string[];
}
