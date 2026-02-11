import React, { useEffect, useMemo, useState } from "react";
import { fetchAICalls, deleteAICall } from "../services/aiCalls";
import { AICallRecord } from "../types";

export const AICallsPage: React.FC = () => {
  const [records, setRecords] = useState<AICallRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ successCount: 0, errorCount: 0, avgDuration: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  useEffect(() => {
    console.log("[AI Calls] Loading calls", { page, pageSize });
    fetchAICalls(page, pageSize)
      .then((response) => {
        console.log("[AI Calls] Loaded", { count: response.items.length, total: response.total });
        setRecords(response.items);
        setTotal(response.total);
        setSummary(response.summary);
      })
      .catch((error) => {
        console.error("[AI Calls] Failed to load AI calls:", error);
        setRecords([]);
        setTotal(0);
        setSummary({ successCount: 0, errorCount: 0, avgDuration: 0 });
      });
  }, [page, pageSize]);

  const filtered = useMemo(() => {
    return records.filter((record) => {
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const haystack = `${record.model} ${record.input_type} ${record.mime_type} ${record.filename || ""} ${record.status}`.toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [records, searchTerm, statusFilter]);

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const errorRate = summary.successCount + summary.errorCount > 0
    ? Math.round((summary.errorCount / (summary.successCount + summary.errorCount)) * 100)
    : 0;

  const handleExport = () => {
    const rows = filtered.map((record) => ({
      id: record.id,
      model: record.model,
      input_type: record.input_type,
      mime_type: record.mime_type,
      filename: record.filename || "",
      status: record.status,
      duration_ms: record.duration_ms,
      created_at: record.created_at,
      error: record.error || ""
    }));

    const header = Object.keys(rows[0] || {
      id: "",
      model: "",
      input_type: "",
      mime_type: "",
      filename: "",
      status: "",
      duration_ms: "",
      created_at: "",
      error: ""
    });

    const csv = [
      header.join(","),
      ...rows.map((row) =>
        header
          .map((key) => `"${String((row as Record<string, string | number>)[key]).replace(/"/g, '""')}"`)
          .join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "openai_call_history.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this AI call record?")) return;
    console.log("[AI Calls] Deleting call", { id });
    try {
      await deleteAICall(id);
      fetchAICalls(page, pageSize).then((response) => {
        setRecords(response.items);
        setTotal(response.total);
        setSummary(response.summary);
      });
    } catch (error) {
      console.error("[AI Calls] Failed to delete call:", error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 pb-32 text-slate-100">
      <div className="mb-10">
        <h1 className="text-2xl font-black text-slate-100 uppercase tracking-tight flex items-center gap-2">
          <span className="material-icons text-primary">psychology</span>
          OpenAI Call History
        </h1>
        <p className="text-sm text-slate-500 mt-1">Operational log of extraction requests.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-[#0b1020] p-6 rounded-3xl shadow-xl border border-slate-800/70">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Calls</p>
          <h4 className="text-3xl font-black text-white">{total}</h4>
        </div>
        <div className="bg-[#0f1522] p-6 rounded-3xl shadow-lg border border-slate-800/70">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Error Rate</p>
          <h4 className="text-3xl font-black text-amber-600">{errorRate}%</h4>
        </div>
        <div className="bg-[#0f1522] p-6 rounded-3xl shadow-lg border border-slate-800/70">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Avg Duration</p>
          <h4 className="text-3xl font-black text-slate-100">{summary.avgDuration} ms</h4>
        </div>
      </div>

      <div className="mb-8 flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            className="w-full pl-12 pr-4 py-3.5 bg-[#0f1522] border border-slate-800/70 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none shadow-sm text-slate-100"
            placeholder="Search by model, type, status, filename..."
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-3 rounded-2xl text-sm font-bold uppercase tracking-wider border transition-all ${
              statusFilter === "all"
                ? "bg-primary text-white border-primary"
                : "bg-[#0f1522] border-slate-800/70 text-slate-300"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("success")}
            className={`px-4 py-3 rounded-2xl text-sm font-bold uppercase tracking-wider border transition-all ${
              statusFilter === "success"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-[#0f1522] border-slate-800/70 text-slate-300"
            }`}
          >
            Success
          </button>
          <button
            onClick={() => setStatusFilter("error")}
            className={`px-4 py-3 rounded-2xl text-sm font-bold uppercase tracking-wider border transition-all ${
              statusFilter === "error"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-[#0f1522] border-slate-800/70 text-slate-300"
            }`}
          >
            Errors
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-3 rounded-2xl text-sm font-bold uppercase tracking-wider transition-all bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 hover:from-cyan-300 hover:to-fuchsia-400 text-white shadow-lg shadow-cyan-500/30"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-[#0f1522] border border-slate-800/70 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-800/70">
          <div className="col-span-3">Model</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Duration</div>
          <div className="col-span-2">Timestamp</div>
          <div className="col-span-1 text-right">Delete</div>
        </div>
        {filtered.map((record) => (
          <div
            key={record.id}
            className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-800/70 last:border-b-0 text-sm"
          >
            <div className="col-span-3 font-bold text-slate-100 truncate">{record.model}</div>
            <div className="col-span-2 text-slate-300 uppercase text-xs font-bold tracking-widest">
              {record.input_type}
            </div>
            <div className="col-span-2">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                  record.status === "success"
                    ? "bg-emerald-900/30 text-emerald-300"
                    : "bg-amber-900/30 text-amber-300"
                }`}
              >
                {record.status}
              </span>
            </div>
            <div className="col-span-2 text-slate-300">{record.duration_ms} ms</div>
            <div className="col-span-2 text-slate-500 text-xs font-semibold">
              {new Date(record.created_at).toLocaleString()}
            </div>
            <div className="col-span-1 flex justify-end">
              <button
                onClick={() => handleDelete(record.id)}
                className="text-slate-400 hover:text-rose-400 transition-colors"
                title="Delete call"
              >
                <span className="material-icons text-base">delete</span>
              </button>
            </div>
            {record.error && (
              <div className="col-span-12 text-xs text-amber-600 dark:text-amber-400 mt-2">
                {record.error}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-10 text-center text-slate-500 text-sm">No AI calls found.</div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            className="px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider border bg-[#0f1522] border-slate-800/70 text-slate-300 disabled:opacity-50"
            disabled={page === 1}
          >
            Prev
          </button>
          <button
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            className="px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider border bg-[#0f1522] border-slate-800/70 text-slate-300 disabled:opacity-50"
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
