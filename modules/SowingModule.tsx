import React, { useState, useRef, useMemo } from 'react';
import { Language, translations } from '../translations';
import { CropCategory, CropRecord } from '../types';
import { verifyCropImage } from '../services/gemini';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';

/* 🔥 Firebase Integration */
import { db } from "../firebase/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface SowingModuleProps {
  lang: Language;
}

const SowingModule: React.FC<SowingModuleProps> = ({ lang }) => {
  const t = translations[lang];
  
  // Categorized State (Local UI Storage)
  const [vegRecords, setVegRecords] = useState<CropRecord[]>([]);
  const [fruitRecords, setFruitRecords] = useState<CropRecord[]>([]);
  const [flowerRecords, setFlowerRecords] = useState<CropRecord[]>([]);

  // Form State
  const [category, setCategory] = useState<CropCategory>('VEGETABLE');
  const [cropName, setCropName] = useState('');
  const [area, setArea] = useState('');
  const [sowingDate, setSowingDate] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  // UI Tab State
  const [analysisTab, setAnalysisTab] = useState<CropCategory>('VEGETABLE');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  /* ===============================
     🔥 AI VERIFY + FIREBASE STORE
     =============================== */
  const handleVerify = async () => {
    if (!image || !cropName || !area) return;
    setVerifying(true);
    setAiFeedback(null);
    try {
      const base64 = image.split(',')[1];
      const result = await verifyCropImage(base64, cropName, category);
      
      if (result.match) {
        const newRecord: CropRecord = {
          id: Date.now().toString(),
          farmerId: 'f1', // This should ideally come from auth context
          category,
          name: cropName,
          area: parseFloat(area),
          sowingDate,
          harvestDate,
          imageUrl: image,
          status: 'AUTHORIZED'
        };

        /* 🔥 FIREBASE STORAGE */
        await addDoc(collection(db, "sowing_records"), {
          ...newRecord,
          createdAt: serverTimestamp()
        });

        // Store in local state for immediate UI update
        if (category === 'VEGETABLE') setVegRecords(prev => [newRecord, ...prev]);
        else if (category === 'FRUIT') setFruitRecords(prev => [newRecord, ...prev]);
        else if (category === 'FLOWER') setFlowerRecords(prev => [newRecord, ...prev]);

        setAiFeedback(`✅ Verification Successful: ${result.reason}`);
        
        // Reset form
        setCropName(''); setArea(''); setSowingDate(''); setHarvestDate(''); setImage(null);
      } else {
        setAiFeedback(`❌ Verification Failed: ${result.reason}`);
      }
    } catch (err) {
      console.error(err);
      setAiFeedback("An error occurred during verification.");
    } finally {
      setVerifying(false);
    }
  };

  /* ===============================
     ANALYTICS LOGIC
     =============================== */
  const getCategoryData = (records: CropRecord[]) => {
    const grouped = records.reduce((acc: any, curr) => {
      acc[curr.name] = (acc[curr.name] || 0) + curr.area;
      return acc;
    }, {});
    return Object.keys(grouped).map(name => ({ name, area: grouped[name] }));
  };

  const vegData = useMemo(() => getCategoryData(vegRecords), [vegRecords]);
  const fruitData = useMemo(() => getCategoryData(fruitRecords), [fruitRecords]);
  const flowerData = useMemo(() => getCategoryData(flowerRecords), [flowerRecords]);

  const activeAnalysisData = 
    analysisTab === 'VEGETABLE' ? vegData : 
    analysisTab === 'FRUIT' ? fruitData : 
    flowerData;

  const activeRecords = 
    analysisTab === 'VEGETABLE' ? vegRecords : 
    analysisTab === 'FRUIT' ? fruitRecords : 
    flowerRecords;

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-12 animate-fade-in-up">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Module: Entry Form */}
        <section className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-stone-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
          <h2 className="text-3xl font-black text-stone-900 mb-8 flex items-center gap-3">
            <span className="p-3 bg-emerald-100 rounded-2xl text-2xl">🌱</span> {t.sowingTitle}
          </h2>
          
          <div className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-stone-400 ml-1">{t.cropCategory}</label>
              <div className="grid grid-cols-3 gap-2">
                {(['VEGETABLE', 'FRUIT', 'FLOWER'] as CropCategory[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                      category === cat 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200' 
                        : 'bg-stone-50 text-stone-400 border-stone-200 hover:border-emerald-300'
                    }`}
                  >
                    {cat === 'VEGETABLE' ? t.veg : cat === 'FRUIT' ? t.fruit : t.flower}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-stone-400 ml-1">{t.cropName}</label>
                <input 
                  type="text" 
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  placeholder="e.g. Onion, Banana, Rose"
                  className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-stone-800" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-stone-400 ml-1">{t.sowingArea}</label>
                <input 
                  type="number" 
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Area in Acres"
                  className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-stone-800" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-stone-400 ml-1">{t.sowingDate}</label>
                <input type="date" value={sowingDate} onChange={(e) => setSowingDate(e.target.value)} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-stone-400 ml-1">{t.harvestDate}</label>
                <input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-stone-400 ml-1">{t.uploadImg}</label>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-52 border-2 border-dashed border-stone-200 rounded-3xl flex items-center justify-center cursor-pointer hover:bg-stone-50 transition-all overflow-hidden group"
              >
                {image ? (
                  <img src={image} className="h-full w-full object-cover" alt="Preview" />
                ) : (
                  <div className="text-center space-y-2">
                    <span className="text-4xl block">📸</span>
                    <span className="text-[10px] uppercase font-black tracking-widest text-stone-400">Tap to Capture Crop Photo</span>
                  </div>
                )}
              </div>
            </div>

            {aiFeedback && (
              <div className={`p-6 rounded-2xl text-sm font-bold animate-in fade-in slide-in-from-top-2 ${aiFeedback.includes('✅') ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>
                {aiFeedback}
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={verifying || !image || !cropName || !area}
              className="w-full py-5 bg-stone-900 hover:bg-emerald-600 disabled:bg-stone-100 text-white font-black rounded-3xl shadow-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-sm"
            >
              {verifying ? 'Processing AI Verification...' : t.verifyAI}
            </button>
          </div>
        </section>

        {/* Module: Analysis & Visualization */}
        <section className="space-y-8">
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-stone-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
              <h3 className="text-2xl font-black text-stone-900">Crop Analysis</h3>
              <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200">
                {(['VEGETABLE', 'FRUIT', 'FLOWER'] as CropCategory[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setAnalysisTab(cat)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      analysisTab === cat ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'
                    }`}
                  >
                    {cat === 'VEGETABLE' ? t.veg : cat === 'FRUIT' ? t.fruit : t.flower}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-72 w-full">
              {activeAnalysisData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeAnalysisData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#a8a29e'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#a8a29e'}} />
                    <Tooltip cursor={{fill: '#f5f5f4'}} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="area" fill="#10b981" radius={[8, 8, 0, 0]} name="Total Area (Acres)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-stone-300 space-y-4">
                   <div className="text-6xl opacity-30">📊</div>
                   <p className="font-bold text-sm tracking-widest uppercase">No data for {analysisTab.toLowerCase()}</p>
                </div>
              )}
            </div>
            
            <div className="mt-8 p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
               <p className="text-sm text-emerald-700 font-medium leading-relaxed">
                 {activeAnalysisData.length > 0 
                  ? `Your region shows balanced sowing for ${analysisTab.toLowerCase()}. Our AI predicts optimal market rates for ${activeAnalysisData[0].name} in the upcoming season.`
                  : `Please add sowing records to generate specific AI insights.`
                 }
               </p>
            </div>
          </div>

          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-stone-100">
            <h3 className="text-2xl font-black text-stone-900 mb-8">Authorized Crops List</h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {activeRecords.length === 0 ? (
                <div className="text-center py-12 text-stone-300 font-black uppercase text-[10px] tracking-[0.2em]">No records</div>
              ) : (
                activeRecords.map(r => (
                  <div key={r.id} className="flex items-center gap-6 p-5 bg-stone-50 rounded-[2rem] border border-stone-100 group">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0">
                       <img src={r.imageUrl} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex-grow">
                      <div className="font-black text-lg text-stone-900">{r.name}</div>
                      <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                        {r.area} Acres • Sown: {new Date(r.sowingDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-black uppercase">Authorized</span>
                      <p className="text-[9px] text-stone-400 font-bold uppercase">UID: {r.id.slice(-6)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SowingModule;