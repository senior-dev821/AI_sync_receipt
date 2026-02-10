
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExtractionStatus, ExtractionRecord } from '../types';
import { fetchReceipts, exportReceiptsCsv } from "../services/receipts";

export const HistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<ExtractionRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReceipts({
      search: searchTerm,
      status: statusFilter === "all" ? undefined : statusFilter,
      category: categoryFilter === "all" ? undefined : categoryFilter,
      page,
      pageSize
    })
      .then((response) => {
        setRecords(response.items);
        setTotal(response.total);
      })
      .catch((error) => {
        console.error("Failed to load receipts:", error);
        setRecords([]);
        setTotal(0);
      });
  }, [searchTerm, statusFilter, categoryFilter, page, pageSize]);

  const totalSpend = records.reduce((sum, r) => sum + r.amount, 0);
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 pb-32">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-brand-black p-8 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Project Spend</p>
            <h4 className="text-3xl font-black text-white">${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
          </div>
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-125 transition-transform">
             <span className="material-symbols-outlined text-primary text-5xl">payments</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Receipts</p>
          <h4 className="text-3xl font-black text-slate-900 dark:text-white">{total}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status Flagged</p>
          <h4 className="text-3xl font-black text-amber-500">
            {records.filter(r => r.status === ExtractionStatus.FLAGGED).length}
          </h4>
        </div>
      </div>

      <div className="mb-10 flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input 
            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none shadow-sm dark:text-white" 
            placeholder="Search by vendor, date, or category..." 
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Status</option>
          <option value={ExtractionStatus.VERIFIED}>Verified</option>
          <option value={ExtractionStatus.FLAGGED}>Flagged</option>
          <option value={ExtractionStatus.EXTRACTED}>Extracted</option>
          <option value={ExtractionStatus.PENDING}>Pending</option>
          <option value={ExtractionStatus.REVIEWING}>Reviewing</option>
        </select>
        <select
          className="px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Categories</option>
          <option value="Materials">Materials</option>
          <option value="Equipment">Equipment</option>
          <option value="Labor">Labor</option>
          <option value="Fuel">Fuel</option>
          <option value="Other">Other</option>
        </select>
        <button
          onClick={() =>
            exportReceiptsCsv({
              search: searchTerm,
              status: statusFilter === "all" ? undefined : statusFilter,
              category: categoryFilter === "all" ? undefined : categoryFilter
            })
          }
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-primary/50 hover:bg-slate-50 transition-all shadow-sm"
        >
          <span className="material-icons text-slate-500 text-xl">download</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">Export CSV</span>
        </button>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
            <span className="material-icons text-primary">history</span>
            Record Archives
          </h2>
          <p className="text-sm text-slate-500 mt-1">Real-time expenditure synchronization</p>
        </div>
      </div>

      <div className="space-y-4">
        {records.map((record) => (
          <div key={record.id} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-primary/30 hover:shadow-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-primary/5 transition-colors border border-slate-100 dark:border-slate-700 overflow-hidden">
                {record.mimeType === "application/pdf" ? (
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-primary">
                    picture_as_pdf
                  </span>
                ) : record.imageUrl ? (
                  <img src={record.imageUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" />
                ) : (
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-primary">
                    {record.category === "Materials" ? "receipt_long" : record.category === "Equipment" ? "construction" : "local_gas_station"}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{record.vendor}</h3>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                  <span className="material-icons text-[12px]">calendar_today</span> {record.date} &bull; {record.time}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between md:justify-end gap-6 md:gap-12 border-t md:border-t-0 pt-4 md:pt-0 dark:border-slate-800">
              <div className="text-left md:text-right">
                <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">${record.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-black">{record.category}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                  record.status === ExtractionStatus.VERIFIED ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' : 
                  record.status === ExtractionStatus.FLAGGED ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800' :
                  'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}>
                  {record.status}
                </span>
                <button className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                  <span className="material-icons">more_vert</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {records.length === 0 && (
          <div className="text-center py-24 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
             <span className="material-icons text-5xl text-slate-200 mb-4">inventory_2</span>
             <p className="text-slate-400 font-bold uppercase tracking-widest">No matching records found</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            className="px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50"
            disabled={page === 1}
          >
            Prev
          </button>
          <button
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            className="px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50"
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>

      <div className="fixed bottom-10 right-8 z-50 flex items-center gap-3">
        <button 
          onClick={() => navigate('/')}
          className="h-16 px-8 bg-primary text-white rounded-2xl shadow-2xl shadow-primary/40 flex items-center justify-center gap-3 hover:bg-primary-dark hover:-translate-y-1 active:scale-95 transition-all group"
        >
          <span className="material-icons text-2xl group-hover:rotate-90 transition-transform">add</span>
          <span className="font-black uppercase tracking-widest text-sm">New Extraction</span>
        </button>
      </div>
    </div>
  );
};
