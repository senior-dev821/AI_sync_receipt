
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { extractReceiptData, ReceiptPayload } from "../services/extract";
import { createReceipt } from "../services/receipts";
import { AIResult, ExtractionStatus, ExtractionRecord } from "../types";

export const VerifyPage: React.FC = () => {
  const [receipt, setReceipt] = useState<ReceiptPayload | null>(null);
  const [data, setData] = useState<AIResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const state = location.state as { receipt?: ReceiptPayload; result?: AIResult } | null;
    if (state?.receipt) {
      console.log("[Verify] Using receipt from navigation state");
      setReceipt(state.receipt);
      if (state.result) {
        console.log("[Verify] Using result from navigation state");
        setData(state.result);
        setIsProcessing(false);
      } else {
        performExtraction(state.receipt);
      }
      return;
    }

    console.log("[Verify] Page mounted");
    const raw = localStorage.getItem("pending_receipt");
    if (!raw) {
      console.warn("[Verify] No pending receipt found, redirecting");
      navigate("/");
      return;
    }
    const pending = localStorage.getItem("pending_result");
    if (pending) {
      try {
        const parsedResult = JSON.parse(pending) as AIResult;
        console.log("[Verify] Using pending result from storage");
        setData(parsedResult);
        setIsProcessing(false);
      } catch {
        localStorage.removeItem("pending_result");
      }
    }

    try {
      const parsed = JSON.parse(raw) as ReceiptPayload;
      if (parsed?.dataUrl && parsed?.mimeType) {
        console.log("[Verify] Loaded pending receipt payload");
        setReceipt(parsed);
        if (!pending) {
          console.log("[Verify] No pending result, starting extraction");
          performExtraction(parsed);
        }
        return;
      }
    } catch {
      // Fall through to legacy string support.
    }

    if (raw.startsWith("data:")) {
      const legacy: ReceiptPayload = {
        dataUrl: raw,
        mimeType: raw.startsWith("data:application/pdf") ? "application/pdf" : "image/jpeg",
        filename: "receipt"
      };
      console.log("[Verify] Loaded legacy receipt payload");
      setReceipt(legacy);
      if (!pending) {
        console.log("[Verify] No pending result, starting extraction");
        performExtraction(legacy);
      }
    } else {
      console.warn("[Verify] Invalid receipt payload, redirecting");
      navigate("/");
    }
  }, [navigate]);

  const performExtraction = async (payload: ReceiptPayload) => {
    console.log("[Verify] Extracting receipt");
    setIsProcessing(true);
    try {
      const result = await extractReceiptData(payload);
      console.log("[Verify] Extraction result received", result);
      setData(result);
    } catch (err) {
      console.error("[Verify] Extraction failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!data) return;
    console.log("[Verify] Approve clicked");

    const newRecord: Omit<ExtractionRecord, "id"> = {
      vendor: data.vendor,
      location: "Field Office A",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: data.date,
      amount: data.amount,
      tax: data.tax,
      status: ExtractionStatus.VERIFIED,
      category: data.category
    };

    try {
      await createReceipt(newRecord);
      console.log("[Verify] Receipt saved");
    } catch (error) {
      console.error("[Verify] Failed to save receipt:", error);
    }
    
    localStorage.removeItem("pending_receipt");
    localStorage.removeItem("pending_result");
    console.log("[Verify] Cleared pending data, navigating to history");
    navigate("/history");
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f1a]">
        <div className="text-center space-y-8 max-w-md p-12">
          <div className="relative inline-block">
            <div className="w-24 h-24 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-3xl animate-pulse">psychology</span>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-2 text-slate-100">Engaging AI Engine</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Performing high-res spatial analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="flex flex-col lg:flex-row min-h-[calc(87vh-80px)] overflow-hidden">
      <div className="lg:hidden bg-[#0f1522] px-4 py-3 border-b border-slate-800/70 flex items-center justify-between">
         <div className="flex items-center gap-4">
           <button onClick={() => navigate("/")} className="material-icons text-slate-500">arrow_back</button>
           <h1 className="font-bold uppercase text-sm text-slate-100">Verification Portal</h1>
         </div>
         <div className="text-green-600 font-black text-xs">{data?.confidence}% Confidence</div>
      </div>

      <section className="lg:w-1/2 w-full bg-[#0b0f1a] relative flex flex-col border-r border-slate-800/70">
        <div className="flex-1 overflow-auto p-8 lg:p-12 flex items-start justify-center">
          <div className="relative bg-[#0f1522] shadow-2xl rounded-sm max-w-full ring-1 ring-slate-800/70 overflow-hidden">
            {receipt?.mimeType === "application/pdf" ? (
              <object
                data={receipt.dataUrl}
                type="application/pdf"
                className="w-[70vw] lg:w-auto max-h-[80vh] object-contain block"
              >
                <p className="p-6 text-sm text-slate-600">PDF preview not supported in this browser.</p>
              </object>
            ) : (
              <img 
                alt="Uploaded Receipt" 
                className="max-h-[80vh] object-contain block" 
                src={receipt?.dataUrl} 
              />
            )}
          </div>
        </div>
      </section>

      <section className="lg:w-1/2 w-full flex flex-col bg-[#0f1522] overflow-y-auto">
        <div className="p-8 md:p-14 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-4 mb-12">
            <div className="h-12 w-1.5 bg-primary rounded-full"></div>
            <div>
              <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tight">Data Extraction</h2>
              <p className="text-sm text-slate-500 font-medium">Please verify the AI identified fields for accuracy.</p>
            </div>
            <div className="ml-auto hidden md:block text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Extraction Confidence</span>
              <span className="text-lg font-black text-green-600">{data?.confidence}%</span>
            </div>
          </div>

          <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2 group">
              <div className="flex justify-between items-center px-1">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]" htmlFor="vendor">Vendor / Supplier</label>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 uppercase tracking-wider">
                  <span className="material-icons text-xs">check_circle</span> Auto-Detected
                </span>
              </div>
              <div className="relative group">
                <span className="material-icons absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">storefront</span>
                <input 
                  className="w-full pl-14 pr-6 py-5 rounded-xl border-2 border-slate-800 bg-[#0b1020] focus:border-primary focus:ring-0 transition-all font-bold text-xl text-slate-100" 
                  id="vendor" 
                  type="text" 
                  defaultValue={data?.vendor} 
                  onChange={(e) => setData(prev => prev ? {...prev, vendor: e.target.value} : null)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]" htmlFor="date">Invoice Date</label>
                <div className="relative group">
                  <span className="material-icons absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">calendar_today</span>
                  <input 
                    className="w-full pl-14 pr-6 py-4 rounded-xl border-2 border-slate-800 bg-[#0b1020] focus:border-primary focus:ring-0 transition-all font-bold text-lg text-slate-100" 
                    id="date" 
                    type="date" 
                    defaultValue={data?.date} 
                    onChange={(e) => setData(prev => prev ? {...prev, date: e.target.value} : null)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]" htmlFor="category">Job Site / Project</label>
                <div className="relative group">
                  <span className="material-icons absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">construction</span>
                  <select 
                    className="w-full pl-14 pr-6 py-4 rounded-xl border-2 border-slate-800 bg-[#0b1020] focus:border-primary focus:ring-0 transition-all font-bold text-lg appearance-none text-slate-100" 
                    id="category"
                    defaultValue={data?.category}
                    onChange={(e) => setData(prev => prev ? {...prev, category: e.target.value} : null)}
                  >
                    <option value="Materials">Materials</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Labor">Labor</option>
                    <option value="Fuel">Fuel</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-10 rounded-3xl bg-[#0b1020] border-2 border-slate-800 relative">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]" htmlFor="amount">Grand Total (USD)</label>
                <span className="flex items-center text-[10px] font-black bg-amber-100 text-amber-800 px-3 py-1 rounded-full gap-1 uppercase tracking-wider">
                  <span className="material-icons text-xs">priority_high</span> Manual Check Advised
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-black text-slate-100 opacity-20">$</span>
                <input 
                  className="w-full pl-10 pr-0 py-2 border-none bg-transparent focus:ring-0 transition-all font-[900] text-6xl text-primary tracking-tighter" 
                  id="amount" 
                  step="0.01" 
                  type="number" 
                  defaultValue={data?.amount} 
                  onChange={(e) => setData(prev => prev ? {...prev, amount: parseFloat(e.target.value)} : null)}
                />
              </div>
            </div>
          </form>

          <div className="mt-16 flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleApprove}
              className="flex-[2] bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 hover:from-cyan-300 hover:to-fuchsia-400 text-white py-5 rounded-xl font-black text-lg uppercase tracking-widest transition-all shadow-xl shadow-cyan-500/30 active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <span className="material-icons">check_circle</span> Approve Data
            </button>
            <button 
              onClick={() => navigate('/')}
              className="flex-1 bg-[#0b1020] text-slate-300 py-5 rounded-xl font-black text-lg uppercase tracking-widest hover:bg-[#12192b] transition-all active:scale-[0.98]"
            >
              Discard
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
