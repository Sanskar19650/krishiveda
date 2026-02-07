import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Language, translations } from '../translations';
import { CropCategory, CropRecord } from '../types';
import { verifyCropImage } from '../services/gemini';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Text
} from 'recharts';

/* 🔥 Firebase Integration */
import { db } from "../firebase/firebaseConfig";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  onSnapshot 
} from "firebase/firestore";

const CROP_OPTIONS: Record<CropCategory, string[]> = {
  VEGETABLE: ["Onion", "Tomato", "Potato", "Cabbage", "Cauliflower", "Brinjal", "Okra", "Spinach", "Green Chili", "Cucumber", "Carrot", "Radish", "Bitter Gourd", "Bottle Gourd", "Garlic", "Ginger", "Coriander", "Capsicum", "Peas", "Beetroot", "Other"],
  FRUIT: ["Mango", "Banana", "Grapes", "Pomegranate", "Papaya", "Guava", "Orange", "Watermelon", "Lemon", "Custard Apple", "Chiku (Sapodilla)", "Pineapple", "Strawberry", "Fig", "Jackfruit", "Muskmelon", "Amla", "Dragon Fruit", "Sweet Lime", "Coconut", "Other"],
  FLOWER: ["Marigold", "Rose", "Jasmine", "Hibiscus", "Tuberose", "Chrysanthemum", "Gerbera", "Lotus", "Sunflower", "Orchid", "Lily", "Dahlia", "Gladiolus", "Zinnia", "Daisy", "Carnation", "Mogra", "Aster", "Canna", "Lavender", "Other"]
};

interface SowingModuleProps { lang: Language; }

const SowingModule: React.FC<SowingModuleProps> = ({ lang }) => {
  const t = translations[lang];

  // Records state
  const [vegRecords, setVegRecords] = useState<CropRecord[]>([]);
  const [fruitRecords, setFruitRecords] = useState<CropRecord[]>([]);
  const [flowerRecords, setFlowerRecords] = useState<CropRecord[]>([]);

  // Form State
  const [category, setCategory] = useState<CropCategory>('VEGETABLE');
  const [cropName, setCropName] = useState('');
  const [customCropName, setCustomCropName] = useState('');
  const [area, setArea] = useState('');
  const [areaUnit, setAreaUnit] = useState('Acres');
  const [sowingDate, setSowingDate] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [analysisTab, setAnalysisTab] = useState<CropCategory>('VEGETABLE');
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ===============================
     📥 FETCH DATA FROM FIREBASE
     =============================== */
  useEffect(() => {
    // Basic query (No orderBy) to prevent Firestore Index Errors
    const q = query(
      collection(db, "sowing_records"),
      where("farmerId", "==", "f1")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CropRecord[];

      // Sort in JavaScript (Latest first)
      const sortedData = allData.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });

      setVegRecords(sortedData.filter(r => r.category === 'VEGETABLE'));
      setFruitRecords(sortedData.filter(r => r.category === 'FRUIT'));
      setFlowerRecords(sortedData.filter(r => r.category === 'FLOWER'));
    });

    return () => unsubscribe();
  }, []);

  /* ===============================
     🔥 AI VERIFY + DB STORE
     =============================== */
  const handleVerify = async () => {
    const finalName = cropName === "Other" ? customCropName : cropName;
    if (!image || !finalName || !area || !sowingDate || !harvestDate) return;

    setVerifying(true);
    setAiFeedback(null);
    try {
      const base64 = image.split(',')[1];
      const result = await verifyCropImage(base64, finalName, category);

      if (result.match) {
        const newRecord = {
          farmerId: 'f1',
          category,
          name: finalName,
          area: Number(area), 
          areaUnit,
          sowingDate,
          harvestDate,
          imageUrl: image,
          status: 'AUTHORIZED',
          createdAt: serverTimestamp()
        };

        await addDoc(collection(db, "sowing_records"), newRecord);
        setAiFeedback(`✅ Verified: ${result.reason}`);
        
        // Reset Form
        setCropName(''); setCustomCropName(''); setArea(''); 
        setSowingDate(''); setHarvestDate(''); setImage(null);
      } else {
        setAiFeedback(`❌ Failed: ${result.reason}`);
      }
    } catch (err) {
      setAiFeedback("Verification Error occurred.");
    } finally {
      setVerifying(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  /* ===============================
     📊 ANALYTICS LOGIC
     =============================== */
  const activeRecords = useMemo(() => {
    if (analysisTab === 'VEGETABLE') return vegRecords;
    if (analysisTab === 'FRUIT') return fruitRecords;
    return flowerRecords;
  }, [analysisTab, vegRecords, fruitRecords, flowerRecords]);

  const activeAnalysisData = useMemo(() => {
    const grouped = activeRecords.reduce((acc: any, curr) => {
      const val = Number(curr.area) || 0;
      acc[curr.name] = (acc[curr.name] || 0) + val;
      return acc;
    }, {});
    return Object.keys(grouped).map(name => ({ name, area: grouped[name] }));
  }, [activeRecords]);

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-12 animate-fade-in-up">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

        {/* --- FORM SECTION --- */}
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
                    onClick={() => { setCategory(cat); setCropName(''); }}
                    className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase border transition-all ${category === cat 
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' 
                      : 'bg-stone-50 text-stone-400 border-stone-200'}`}
                  >
                    {cat === 'VEGETABLE' ? t.veg : cat === 'FRUIT' ? t.fruit : t.flower}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-stone-400 ml-1">{t.cropName}</label>
                <select value={cropName} onChange={(e) => setCropName(e.target.value)} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold">
                  <option value="">Select Crop</option>
                  {CROP_OPTIONS[category].map(crop => <option key={crop} value={crop}>{crop}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-stone-400 ml-1">{t.sowingArea}</label>
                <div className="flex gap-2">
                  <input type="number" value={area} onChange={(e) => setArea(e.target.value)} placeholder="0.00" className="flex-1 p-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold" />
                  <select value={areaUnit} onChange={(e) => setAreaUnit(e.target.value)} className="w-28 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl font-bold text-emerald-700">
                    <option value="Acres">Acres</option>
                    <option value="Guntha">Guntha</option>
                  </select>
                </div>
              </div>
            </div>

            {/* --- DATES SECTION --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-stone-400 ml-1">Sowing Date</label>
                <input type="date" value={sowingDate} onChange={(e) => setSowingDate(e.target.value)} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-stone-400 ml-1">Harvest Date</label>
                <input type="date" value={harvestDate} min={sowingDate} onChange={(e) => setHarvestDate(e.target.value)} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-stone-400 ml-1">{t.uploadImg}</label>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
              <div onClick={() => fileInputRef.current?.click()} className="w-full h-40 border-2 border-dashed border-stone-200 rounded-3xl flex items-center justify-center cursor-pointer overflow-hidden bg-stone-50">
                {image ? <img src={image} className="h-full w-full object-cover" alt="" /> : <span className="text-4xl">📸</span>}
              </div>
            </div>

            {aiFeedback && <div className={`p-4 rounded-xl text-xs font-bold ${aiFeedback.includes('✅') ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{aiFeedback}</div>}

            <button onClick={handleVerify} disabled={verifying || !image || !area} className="w-full py-5 bg-stone-900 hover:bg-emerald-600 disabled:bg-stone-100 text-white font-black rounded-3xl uppercase tracking-widest text-xs transition-all">
              {verifying ? 'Verifying...' : t.verifyAI}
            </button>
          </div>
        </section>

        {/* --- ANALYTICS SECTION --- */}
        <section className="space-y-8">
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-stone-100">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black text-stone-900">Analysis</h3>
              <div className="flex bg-stone-100 p-1 rounded-xl">
                {['VEGETABLE', 'FRUIT', 'FLOWER'].map(cat => (
                  <button key={cat} onClick={() => setAnalysisTab(cat as CropCategory)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${analysisTab === cat ? 'bg-white shadow-sm text-emerald-600' : 'text-stone-400'}`}>{cat.slice(0, 3)}</button>
                ))}
              </div>
            </div>
            
            <div className="h-72 w-full">
              {activeAnalysisData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeAnalysisData} margin={{ top: 30, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10, fontWeight: 800 }} 
                      axisLine={false} 
                      tickLine={false}
                      label={{ value: 'Crop Name', position: 'insideBottom', offset: -10, fontSize: 10, fontWeight: 900, fill: '#78716c' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fontWeight: 800 }} 
                      axisLine={false} 
                      tickLine={false}
                      label={{ value: `Area (${areaUnit})`, angle: -90, position: 'insideLeft', fontSize: 10, fontWeight: 900, fill: '#78716c' }}
                    />
                    <Tooltip cursor={{ fill: '#f5f5f4' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar 
                      dataKey="area" 
                      fill="#10b981" 
                      radius={[6, 6, 0, 0]}
                      label={{ position: 'top', fontSize: 10, fontWeight: 900, fill: '#059669' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-stone-300 font-bold uppercase text-xs">No records found</div>}
            </div>
          </div>

          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-stone-100">
            <h3 className="text-2xl font-black text-stone-900 mb-6">Authorized Records</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {activeRecords.length === 0 ? (
                <div className="text-center py-10 text-stone-300 font-black text-[10px]">EMPTY</div>
              ) : (
                activeRecords.map(r => (
                  <div key={r.id} className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <img src={r.imageUrl} className="w-14 h-14 rounded-xl object-cover" alt="" />
                    <div className="flex-grow">
                      <div className="font-black text-stone-900">{r.name}</div>
                      <div className="text-[10px] font-bold text-stone-400 uppercase">
                        {r.area} {r.areaUnit}
                      </div>
                      <div className="text-[9px] font-bold text-emerald-600 mt-1 uppercase">
                        📅 Sown: {r.sowingDate} | Harvest: {r.harvestDate}
                      </div>
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