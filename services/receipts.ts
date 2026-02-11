import { ExtractionRecord } from "../types";

export interface ReceiptQuery {
  search?: string;
  status?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: string;
  maxAmount?: string;
  page?: number;
  pageSize?: number;
}

export interface ReceiptResponse {
  items: ExtractionRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export const fetchReceipts = async (query: ReceiptQuery = {}): Promise<ReceiptResponse> => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });

  const response = await fetch(`/api/receipts?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to load receipts (${response.status})`);
  }
  return (await response.json()) as ReceiptResponse;
};

export const exportReceiptsCsv = async (query: ReceiptQuery = {}): Promise<void> => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });

  const response = await fetch(`/api/receipts/export?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to export receipts (${response.status})`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "receipt_history.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const createReceipt = async (record: Omit<ExtractionRecord, "id">): Promise<string> => {
  const response = await fetch("/api/receipts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record)
  });

  if (!response.ok) {
    throw new Error(`Failed to save receipt (${response.status})`);
  }

  const data = (await response.json()) as { id: number };
  return String(data.id);
};

export const deleteReceipt = async (id: string): Promise<void> => {
  const response = await fetch(`/api/receipts/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Failed to delete receipt (${response.status})`);
  }
};
