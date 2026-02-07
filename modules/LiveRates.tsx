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
  Cell,
  Label // Added Label import just in case, though we'll use the prop
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

    const rawRecords = data.records || [];
    const marketGroups = rawRecords.reduce((acc: any, record: any) => {
      const marketName = record.Market;
      if (!acc[marketName]) {
        acc[marketName] = {
          market: marketName,
          minTotal: 0,
          maxTotal: 0,
          modalTotal: 0,
          count: 0
        };
      }
      acc[marketName].minTotal += Number(record.Min_Price);
      acc[marketName].maxTotal += Number(record.Max_Price);
      acc[marketName].modalTotal += Number(record.Modal_Price);
      acc[marketName].count += 1;
      return acc;
    }, {});

    const parsedRates: Rate[] = Object.values(marketGroups).map((m: any) => ({
      market: m.market,
      minPrice: Math.round(m.minTotal / m.count),
      maxPrice: Math.round(m.maxTotal / m.count),
      modalPrice: Math.round(m.modalTotal / m.count)
    }));

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

  const maxModal = rates.length > 0 ? Math.max(...rates.map(r => r.modalPrice)) : 0;

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-12 animate-fade-in-up">
      
      {/* 🔽 FILTERS */}
      <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-stone-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
        <div className="flex flex-col md:flex-row justify-between gap-8">
            <h2 className="text-3xl font-black text-stone-900 flex items-center gap-3">
                <span className="p-3 bg-emerald-100 rounded-2xl">📈</span> {t.liveMandi}
            </h2>

            <div className="flex flex-wrap gap-4">
                <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="p-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold outline-none"
                >
                    {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>

                <select
                    value={commodity}
                    onChange={(e) => setCommodity(e.target.value)}
                    className="p-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold outline-none"
                >
                    {COMMODITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* 📊 CHART WITH AXIS LABELS */}
        <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-stone-100">
          <h3 className="text-2xl font-black mb-10">Market Price Comparison</h3>
          <div className="h-96 w-full"> {/* Increased height slightly for labels */}
            {rates.length > 0 && !loading ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rates} margin={{ bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                  
                  {/* X-AXIS WITH LABEL */}
                  <XAxis 
                    dataKey="market" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 800}}
                    height={60}
                    label={{ 
                        value: "Markets / Mandis", 
                        position: "insideBottom", 
                        offset: 0, 
                        fontSize: 12, 
                        fontWeight: 900,
                        fill: "#78716c" 
                    }} 
                  />
                  
                  {/* Y-AXIS WITH LABEL */}
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 800}}
                    width={70}
                    label={{ 
                        value: "Price (₹/Quintal)", 
                        angle: -90, 
                        position: "insideLeft", 
                        fontSize: 12, 
                        fontWeight: 900,
                        fill: "#78716c" 
                    }}
                  />
                  
                  <Tooltip 
                    cursor={{fill: '#f5f5f4'}} 
                    contentStyle={{ borderRadius: '1rem', border: 'none' }}
                  />
                  <Bar dataKey="modalPrice" radius={[8, 8, 0, 0]}>
                    {rates.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.modalPrice === maxModal ? '#10b981' : '#d6d3d1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center font-bold text-stone-400">
                {loading ? 'Loading...' : 'No Data Available'}
              </div>
            )}
          </div>
        </section>

        {/* 📋 LIST */}
        <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-stone-100 flex flex-col">
          <h3 className="text-2xl font-black mb-8">Average Market Rates</h3>
          <div className="flex-grow space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {rates.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-6 bg-stone-50 rounded-[2rem] border border-stone-100">
                <div className="space-y-1">
                  <div className="font-black text-lg text-stone-900">{r.market}</div>
                  <div className="flex gap-2">
                    <span className="text-[9px] bg-white border p-1 rounded font-bold uppercase">Avg Min: ₹{r.minPrice}</span>
                    <span className="text-[9px] bg-white border p-1 rounded font-bold uppercase">Avg Max: ₹{r.maxPrice}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-black ${r.modalPrice === maxModal ? 'text-emerald-600' : 'text-stone-900'}`}>
                    ₹{r.modalPrice.toLocaleString("en-IN")}
                  </div>
                  <p className="text-[9px] text-stone-400 font-bold uppercase">Avg Modal Price</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default LiveRates;