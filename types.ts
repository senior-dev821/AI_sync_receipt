
export enum ExtractionStatus {
  EXTRACTED = 'Extracted',
  FLAGGED = 'Flagged',
  VERIFIED = 'Verified',
  PENDING = 'Pending',
  REVIEWING = 'Reviewing'
}

export interface ExtractionRecord {
  id: string;
  vendor: string;
  location: string;
  time: string;
  date: string;
  amount: number;
  tax?: number;
  status: ExtractionStatus;
  category: string;
  imageUrl?: string;
  mimeType?: string;
  project?: string;
}

export interface AIResult {
  vendor: string;
  date: string;
  amount: number;
  tax: number;
  confidence: number;
  category: string;
}

export interface AICallRecord {
  id: number;
  model: string;
  input_type: "image" | "pdf";
  mime_type: string;
  filename?: string | null;
  status: "success" | "error";
  error?: string | null;
  duration_ms: number;
  created_at: string;
}
