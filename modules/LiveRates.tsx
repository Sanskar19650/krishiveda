import React, { useEffect, useState } from "react";
import { Language, translations } from "../translations";

/* 🔥 Firebase */
import { db } from "../firebase/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

/* 📊 Chart */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from "recharts";

/* ===============================
   CONSTANTS
================================ */
const DISTRICTS = ["Sangli", "Kolhapur", "Solapur", "Satara"];
const COMMODITIES = ["Tomato", "Onion", "Soyabean", "Wheat"];

interface Rate {
  market: string;
  modalPrice: number;
  minPrice: number;
  maxPrice: number;
}

interface LiveRatesProps {
  lang: Language;
}

const today = () => new Date().toISOString().split("T")[0];

/* ===============================
   COMPONENT
================================ */
const LiveRates: React.FC<LiveRatesProps> = ({ lang }) => {
  const t = translations[lang];

  const [district, setDistrict] = useState("Sangli");
  const [commodity, setCommodity] = useState("Tomato");
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ===============================
     🔥 CACHED FETCH (UPDATED FOR MULTIPLE PRICES)
     =============================== */
  const getCachedMarketRates = async (
    commodity: string,
    district: string
  ): Promise<Rate[]> => {
    const date = today();
    const docId = `${district}_${commodity}_${date}`;
    const ref = doc(db, "liveRates", docId);

    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data().rates as Rate[];
      }
    } catch (err) {
      console.warn("Firestore read failed", err);
    }

    const url = new URL("https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24");
    url.searchParams.append("api-key", import.meta.env.VITE_DATA_GOV_API);
    url.searchParams.append("format", "json");
    url.searchParams.append("filters[State]", "Maharashtra");
    url.searchParams.append("filters[District]", district);
    url.searchParams.append("filters[Commodity]", commodity);

    const res = await fetch(url.toString());
    const text = await res.text();
    if (!text.startsWith("{")) return [];
    const data = JSON.parse(text);

    // Capture Min, Max, and Modal prices
    const parsedRates: Rate[] = data.records?.map((r: any) => ({
      market: r.Market,
      modalPrice: Number(r.Modal_Price),
      minPrice: Number(r.Min_Price),
      maxPrice: Number(r.Max_Price)
    })) || [];

    try {
      await setDoc(ref, { district, commodity, date, rates: parsedRates, createdAt: serverTimestamp() });
    } catch (err) {
      console.warn("Firestore write blocked", err);
    }
    return parsedRates;
  };

  useEffect(() => {
    const loadRates = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getCachedMarketRates(commodity, district);
        setRates(data);
      } catch (err) {
        setError("Failed to load market rates");
      } finally {
        setLoading(false);
      }
    };
    loadRates();
  }, [commodity, district]);

  // Find highest and lowest modal prices for UI highlights
  const maxModal = Math.max(...rates.map(r => r.modalPrice), 0);
  const minModal = Math.min(...rates.map(r => r.modalPrice), Infinity);

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-12 animate-fade-in-up">
      
      {/* 🔽 TOP SECTION: FILTERS */}
      <section className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-stone-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <h2 className="text-3xl font-black text-stone-900 flex items-center gap-3">
                <span className="p-3 bg-emerald-100 rounded-2xl text-2xl">📈</span> {t.liveMandi}
            </h2>

            <div className="flex flex-wrap gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 ml-1">Select District</label>
                    <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="block w-full md:w-48 p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-stone-800 appearance-none cursor-pointer"
                    >
                        {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 ml-1">Select Commodity</label>
                    <select
                        value={commodity}
                        onChange={(e) => setCommodity(e.target.value)}
                        className="block w-full md:w-48 p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-stone-800 appearance-none cursor-pointer"
                    >
                        {COMMODITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* 📊 CHART MODULE (Shows Price Variation) */}
        <section className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-stone-100">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-2xl font-black text-stone-900">Price Comparison</h3>
            <span className="text-[10px] bg-stone-100 text-stone-500 px-3 py-1 rounded-full font-black uppercase tracking-widest">
              {commodity}
            </span>
          </div>

          <div className="h-80 w-full">
            {rates.length > 0 && !loading ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rates}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                  <XAxis dataKey="market" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#a8a29e'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#a8a29e'}} />
                  <Tooltip 
                    cursor={{fill: '#f5f5f4'}} 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value, name) => [`₹${value}`, name === 'modalPrice' ? 'Modal Price' : name]}
                  />
                  <Bar dataKey="modalPrice" radius={[8, 8, 0, 0]} name="Price (₹)">
                    {rates.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.modalPrice === maxModal ? '#10b981' : '#d6d3d1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-stone-300 space-y-4">
                 <div className="text-6xl opacity-30 animate-pulse">📊</div>
                 <p className="font-bold text-sm tracking-widest uppercase">{loading ? 'Loading...' : 'No Data'}</p>
              </div>
            )}
          </div>
          
          <div className="mt-8 p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
             <p className="text-sm text-emerald-700 font-medium leading-relaxed">
               The <span className="text-emerald-600 font-bold underline">green bar</span> indicates the market offering the <b>highest modal price</b> for {commodity} in {district} today.
             </p>
          </div>
        </section>

        {/* 📋 LIST MODULE (Shows Different Prices: Min, Max, Modal) */}
        <section className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-stone-100 flex flex-col">
          <h3 className="text-2xl font-black text-stone-900 mb-8">Detailed Market Rates</h3>
          
          <div className="flex-grow space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
                [1,2,3].map(i => (
                    <div key={i} className="h-24 w-full bg-stone-50 animate-pulse rounded-[2rem]" />
                ))
            ) : error ? (
                <div className="text-center py-12 text-rose-400 font-black uppercase text-xs tracking-widest">{error}</div>
            ) : rates.length === 0 ? (
                <div className="text-center py-12 text-stone-300 font-black uppercase text-[10px] tracking-[0.2em]">No records found for today</div>
            ) : (
                rates.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-6 bg-stone-50 rounded-[2rem] border border-stone-100 hover:border-emerald-200 transition-all group">
                    <div className="space-y-1">
                      <div className="font-black text-lg text-stone-900 flex items-center gap-2">
                        {r.market}
                        {r.modalPrice === maxModal && <span className="text-[8px] bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Best Rate</span>}
                      </div>
                      <div className="flex gap-3">
                        <div className="text-[9px] font-black text-stone-400 uppercase tracking-widest bg-white px-2 py-1 rounded-md border border-stone-200">
                          Min: <span className="text-stone-600">₹{r.minPrice}</span>
                        </div>
                        <div className="text-[9px] font-black text-stone-400 uppercase tracking-widest bg-white px-2 py-1 rounded-md border border-stone-200">
                          Max: <span className="text-stone-600">₹{r.maxPrice}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-black ${r.modalPrice === maxModal ? 'text-emerald-600' : 'text-stone-900'}`}>
                        ₹{r.modalPrice.toLocaleString("en-IN")}
                      </div>
                      <p className="text-[9px] text-stone-400 font-bold uppercase tracking-tighter">Modal Price / Qtl</p>
                    </div>
                  </div>
                ))
            )}
          </div>

          <div className="mt-6 text-center">
            <span className="text-[10px] text-stone-400 font-black uppercase tracking-[0.3em]">
              Source: Agmarknet (Updated Daily)
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LiveRates;