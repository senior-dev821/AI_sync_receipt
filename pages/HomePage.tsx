
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractReceiptData } from "../services/extract";
import { fetchReceipts } from "../services/receipts";
import { ExtractionRecord } from "../types";

export const HomePage: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string | null>(null);
  const [activityRecords, setActivityRecords] = useState<ExtractionRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isCameraOpen) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.muted = true;
      video.onloadedmetadata = () => {
        video.play().catch(() => {});
      };
    }
  }, [isCameraOpen]);

  useEffect(() => {
    localStorage.removeItem("pending_receipt");
    setPreviewUrl(null);
    setPreviewMime(null);
  }, []);

  useEffect(() => {
    fetchReceipts({ page: 1, pageSize: 3 })
      .then((response) => setActivityRecords(response.items))
      .catch((error) => {
        console.error("Failed to load activity records:", error);
        setActivityRecords([]);
      });
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const beginUploadFlow = async (payload: { dataUrl: string; mimeType: string; filename?: string }) => {
    setIsUploading(true);
    setPreviewUrl(payload.dataUrl);
    setPreviewMime(payload.mimeType);
    localStorage.setItem("pending_receipt", JSON.stringify(payload));
    try {
      const result = await extractReceiptData(payload);
      localStorage.setItem("pending_result", JSON.stringify(result));
      navigate("/verify");
    } catch (error) {
      console.error("Extraction failed:", error);
      setIsUploading(false);
    }
  };

  const handleCameraClick = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError("Camera access blocked. Use file upload instead.");
      cameraInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const payload = {
      dataUrl,
      mimeType: "image/jpeg",
      filename: "camera-capture.jpg"
    };
    beginUploadFlow(payload);
    stopCamera();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const payload = {
          dataUrl,
          mimeType: file.type || "application/octet-stream",
          filename: file.name
        };
        beginUploadFlow(payload);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Real-Time AI Extraction
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-brand-black dark:text-white mb-6 tracking-tight">Receipt Upload & Scan</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Professional-grade data extraction for industrial job sites. Instant vendor detection and expense categorization.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Section: Upload & History */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/60 dark:shadow-none border border-slate-200 dark:border-slate-800 p-8 sm:p-12 flex flex-col items-center justify-center min-h-[460px] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-brand-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            
            {isUploading ? (
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-5xl">receipt_long</span>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-brand-black dark:text-white uppercase tracking-wider">Scanning Receipt</p>
                  <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-[0.25em] font-bold">Hold on...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <span className="material-symbols-outlined text-primary text-6xl">cloud_upload</span>
                </div>
                <div className="space-y-4 w-full max-w-sm relative z-10">
                  <button 
                    onClick={handleCameraClick}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-black py-6 px-8 rounded-2xl flex items-center justify-center gap-4 shadow-lg shadow-primary/25 active:scale-[0.97] transition-all uppercase tracking-wider text-lg"
                  >
                    <span className="material-symbols-outlined text-2xl">photo_camera</span>
                    Capture Receipt
                  </button>
                  <input
                    type="file"
                    ref={cameraInputRef}
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                  />
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                  />
                  
                  <div className="relative flex py-4 items-center">
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                    <span className="flex-shrink mx-6 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Direct Upload</span>
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                  </div>
                  
                  <button 
                    onClick={handleUploadClick}
                    className="w-full bg-white dark:bg-slate-800 border-2 border-brand-black dark:border-slate-600 text-brand-black dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 font-black py-5 px-8 rounded-2xl flex items-center justify-center gap-4 transition-all uppercase tracking-wider"
                  >
                    <span className="material-symbols-outlined">add_to_photos</span>
                    Select Local File
                  </button>
                </div>
                {cameraError && (
                  <div className="mt-4 text-xs text-amber-600 font-bold uppercase tracking-widest">
                    {cameraError}
                  </div>
                )}
                <div className="mt-12 flex items-center gap-3 py-2 px-4 rounded-full bg-slate-100 dark:bg-slate-800/50">
                  <span className="material-symbols-outlined text-primary text-sm">info</span>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Supports PDF, JPG, PNG (Max 25MB)</span>
                </div>
              </>
            )}
          </div>

          {/* Activity Log */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h2 className="font-black text-brand-black dark:text-white text-xl tracking-tight uppercase">Site Activity</h2>
              <button onClick={() => navigate('/history')} className="text-[10px] font-black text-primary uppercase tracking-[0.2em] cursor-pointer hover:underline">Full Log</button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activityRecords.map((record) => (
                <div key={record.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700">
                      <span className="material-symbols-outlined text-slate-300">
                        {record.category === "Materials" ? "receipt_long" : record.category === "Equipment" ? "construction" : "local_gas_station"}
                      </span>
                    </div>
                    <div>
                      <p className="font-black text-slate-100 tracking-tight">{record.vendor}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                        {record.location} &bull; {record.time}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-100 text-xl">${record.amount.toLocaleString()}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest mt-1 ${
                      record.status === "Verified" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {record.status}
                    </span>
                  </div>
                </div>
              ))}
              {activityRecords.length === 0 && (
                <div className="p-6 text-center text-slate-400 text-sm">
                  Recent activity appears after you approve a receipt.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: AI Preview */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 sticky top-28 overflow-hidden">
            <div className="bg-brand-black p-6 border-b border-brand-black">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary animate-pulse">psychology</span>
                  <span className="font-black text-white uppercase tracking-[0.2em] text-[11px]">AI Powered Engine</span>
                </div>
                {/* <span className="text-[9px] font-black text-slate-500 uppercase">Version 4.0 High-Res</span> */}
              </div>
            </div>
            <div className="p-8">
              <div className="relative w-full aspect-[4/5] bg-slate-950 rounded-2xl mb-8 overflow-hidden ring-1 ring-slate-800">
                {previewMime === "application/pdf" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-200/70">
                    <span className="material-symbols-outlined text-6xl text-primary">picture_as_pdf</span>
                    <p className="mt-3 text-xs font-black uppercase tracking-widest">PDF Ready for Scan</p>
                  </div>
                ) : (
                  <img 
                    alt="Receipt Preview" 
                    className="object-cover w-full h-full opacity-60 mix-blend-luminosity" 
                    src={previewUrl || "https://picsum.photos/seed/receipt/400/500"}
                  />
                )}
                {previewUrl && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute h-0.5 w-full bg-primary shadow-[0_0_15px_2px_rgba(225,29,72,0.8)] z-20 animate-scan"></div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                  <span className="material-symbols-outlined text-primary">autorenew</span>
                  <span className="text-xs font-black uppercase tracking-widest text-primary">AI Scan Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isCameraOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black uppercase tracking-wider text-sm text-slate-900 dark:text-white">Camera Capture</h3>
              <button onClick={stopCamera} className="text-slate-500 hover:text-primary">
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="p-6">
              <div className="rounded-2xl overflow-hidden bg-black">
                <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />
              </div>
              <div className="mt-6 flex justify-between items-center">
                <button
                  onClick={stopCamera}
                  className="px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black uppercase tracking-widest text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCapture}
                  className="px-6 py-3 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/30"
                >
                  Capture Photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
