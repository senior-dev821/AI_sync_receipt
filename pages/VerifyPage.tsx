
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { extractReceiptData, ReceiptPayload } from "../services/extract";
import { createReceipt } from "../services/receipts";
import { AIResult, ExtractionStatus, ExtractionRecord } from "../types";

export const VerifyPage: React.FC = () => {
  const [receipt, setReceipt] = useState<ReceiptPayload | null>(null);
  const [data, setData] = useState<AIResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const raw = localStorage.getItem("pending_receipt");
    if (!raw) {
      navigate("/");
      return;
    }
    const pending = localStorage.getItem("pending_result");
    if (pending) {
      try {
        const parsedResult = JSON.parse(pending) as AIResult;
        setData(parsedResult);
        setIsProcessing(false);
      } catch {
        localStorage.removeItem("pending_result");
      }
    }

    try {
      const parsed = JSON.parse(raw) as ReceiptPayload;
      if (parsed?.dataUrl && parsed?.mimeType) {
        setReceipt(parsed);
        if (!pending) {
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
      setReceipt(legacy);
      if (!pending) {
        performExtraction(legacy);
      }
    } else {
      navigate("/");
    }
  }, [navigate]);

  const performExtraction = async (payload: ReceiptPayload) => {
    setIsProcessing(true);
    try {
      const result = await extractReceiptData(payload);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!data) return;

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
    } catch (error) {
      console.error("Failed to save receipt:", error);
    }
    
    localStorage.removeItem("pending_receipt");
    localStorage.removeItem("pending_result");
    navigate("/history");
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-8 max-w-md p-12">
          <div className="relative inline-block">
            <div className="w-24 h-24 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-3xl animate-pulse">psychology</span>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-2 dark:text-white">Engaging AI Engine</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Performing high-res spatial analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="flex flex-col lg:flex-row min-h-[calc(87vh-80px)] overflow-hidden">
      <div className="lg:hidden bg-white dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
         <div className="flex items-center gap-4">
           <button onClick={() => navigate("/")} className="material-icons text-slate-500">arrow_back</button>
           <h1 className="font-bold uppercase text-sm dark:text-white">Verification Portal</h1>
         </div>
         <div className="text-green-600 font-black text-xs">{data?.confidence}% Confidence</div>
      </div>

      <section className="lg:w-1/2 w-full bg-[#eef0f2] dark:bg-slate-950 relative flex flex-col border-r border-slate-200 dark:border-slate-800">
        <div className="flex-1 overflow-auto p-8 lg:p-12 flex items-start justify-center">
          <div className="relative bg-white shadow-2xl rounded-sm max-w-full ring-1 ring-slate-200 overflow-hidden">
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

      <section className="lg:w-1/2 w-full flex flex-col bg-white dark:bg-slate-900 overflow-y-auto">
        <div className="p-8 md:p-14 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-4 mb-12">
            <div className="h-12 w-1.5 bg-primary rounded-full"></div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Data Extraction</h2>
              <p className="text-sm text-slate-500 font-medium dark:text-slate-400">Please verify the AI identified fields for accuracy.</p>
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
                  className="w-full pl-14 pr-6 py-5 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 focus:border-primary focus:ring-0 focus:bg-white transition-all font-bold text-xl text-slate-800 dark:text-slate-100" 
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
                    className="w-full pl-14 pr-6 py-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 focus:border-primary focus:ring-0 transition-all font-bold text-lg dark:text-white" 
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
                    className="w-full pl-14 pr-6 py-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 focus:border-primary focus:ring-0 transition-all font-bold text-lg appearance-none dark:text-white" 
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

            <div className="space-y-3 p-10 rounded-3xl bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 relative">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]" htmlFor="amount">Grand Total (USD)</label>
                <span className="flex items-center text-[10px] font-black bg-amber-100 text-amber-800 px-3 py-1 rounded-full gap-1 uppercase tracking-wider">
                  <span className="material-icons text-xs">priority_high</span> Manual Check Advised
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-black text-slate-900 dark:text-white opacity-20">$</span>
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
              className="flex-[2] bg-primary text-white py-5 rounded-xl font-black text-lg uppercase tracking-widest hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <span className="material-icons">check_circle</span> Approve Data
            </button>
            <button 
              onClick={() => navigate('/')}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-5 rounded-xl font-black text-lg uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-[0.98]"
            >
              Discard
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
