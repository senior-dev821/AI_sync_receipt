import { AIResult } from "../types";

export interface ReceiptPayload {
  dataUrl: string;
  mimeType: string;
  filename?: string;
}

export const extractReceiptData = async (payload: ReceiptPayload): Promise<AIResult> => {
  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Extraction failed with status ${response.status}`);
    }

    return (await response.json()) as AIResult;
  } catch (error) {
    console.error("Extraction failed:", error);
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
