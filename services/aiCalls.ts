import { AICallRecord } from "../types";

export interface AICallResponse {
  items: AICallRecord[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    successCount: number;
    errorCount: number;
    avgDuration: number;
  };
}

export const fetchAICalls = async (page = 1, pageSize = 25): Promise<AICallResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize)
  });
  const response = await fetch(`/api/ai-calls?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to load AI calls (${response.status})`);
  }
  return (await response.json()) as AICallResponse;
};

export const deleteAICall = async (id: number): Promise<void> => {
  const response = await fetch(`/api/ai-calls/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Failed to delete AI call (${response.status})`);
  }
};
