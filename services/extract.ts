import { AIResult } from "../types";

export interface ReceiptPayload {
  dataUrl: string;
  mimeType: string;
  filename?: string;
}

export const extractReceiptData = async (payload: ReceiptPayload): Promise<AIResult> => {
  try {
    console.log("[Extract] Requesting extraction", { mimeType: payload.mimeType, filename: payload.filename });
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Extraction failed with status ${response.status}`);
    }

    const result = (await response.json()) as AIResult;
    console.log("[Extract] Extraction succeeded");
    return result;
  } catch (error) {
    console.error("[Extract] Extraction failed:", error);
    return {
      vendor: "Manual Entry Required",
      date: new Date().toISOString().split("T")[0],
      amount: 0,
      tax: 0,
      confidence: 0,
      category: "Other"
    };
  }
};
