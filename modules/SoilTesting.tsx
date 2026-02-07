import React, { useState, useRef, useMemo } from 'react';
import { Language, translations } from '../translations';
import { getFertilizerRecommendation } from '../services/gemini';

/* 🔥 Firebase Integration */
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";

/* ===============================
   RAZORPAY LOADER
   =============================== */
const loadRazorpay = () => {
  return new Promise<boolean>((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

interface SoilTestingProps {
  lang: Language;
  user?: any;
}

const SoilTesting: React.FC<SoilTestingProps> = ({ lang, user }) => {
  const t = translations[lang];

  // Steps: 1: Booking, 2: Payment, 3: Collection, 4: Upload, 5: AI
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* Booking State */
  const [farmerName, setFarmerName] = useState(user?.fullName || '');
  const [testArea, setTestArea] = useState('');
  const [areaUnit, setAreaUnit] = useState('Acres'); // New State for Area Unit
  const [bookingDate, setBookingDate] = useState('');
  const [location, setLocation] = useState(user?.address || '');

  /* Payment State */
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  /* AI & Reporting State */
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportText, setReportText] = useState('');
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [reportFile, setReportFile] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ===============================
     📅 CALENDAR CONSTRAINTS (Today to +1 Month)
     =============================== */
  const dateLimits = useMemo(() => {
    const today = new Date();
    const future = new Date();
    future.setMonth(future.getMonth() + 1);

    return {
      min: today.toISOString().split('T')[0],
      max: future.toISOString().split('T')[0]
    };
  }, []);

  /* ===============================
     VALIDATION LOGIC
     =============================== */
  const validateBooking = () => {
    const newErrors: Record<string, string> = {};
    if (farmerName.trim().length < 3) newErrors.farmerName = "Enter valid full name (min 3 chars)";
    if (!testArea || parseFloat(testArea) <= 0) newErrors.testArea = "Required";
    if (!bookingDate) newErrors.bookingDate = "Required";
    if (location.trim().length < 10) newErrors.location = "Provide detailed address/landmark";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (setter: (val: string) => void, field: string, value: string) => {
    setter(value);
    if (errors[field]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  /* ===============================
     STEP 1: BOOKING
     =============================== */
  const handleBook = async () => {
    if (!validateBooking()) return;

    try {
      const ref = await addDoc(collection(db, "soil_tests"), {
        farmerName,
        testArea: parseFloat(testArea),
        areaUnit, // Stored in Firestore
        bookingDate,
        location,
        userId: user?.uid || null,
        status: "BOOKED",
        createdAt: serverTimestamp()
      });

      setDocId(ref.id);
      setStep(2);
    } catch (e) {
      alert("Booking failed.");
    }
  };

  /* ===============================
     STEP 2: PAYMENT (RAZORPAY)
     =============================== */
  const handlePayment = async () => {
    setIsProcessingPayment(true);
    const loaded = await loadRazorpay();
    if (!loaded) {
      alert("Payment system failed to load");
      setIsProcessingPayment(false);
      return;
    }

    const options = {
      key: "rzp_test_S65eOkVzHn838L", 
      amount: 400 * 100,
      currency: "INR",
      name: "Soil Testing Service",
      description: "Laboratory Soil Analysis",
      handler: async function (response: any) {
        const refNo = response.razorpay_payment_id;
        setBookingRef(refNo);
        try {
          if (docId) {
            await updateDoc(doc(db, "soil_tests", docId), {
              paymentMethod,
              bookingRef: refNo,
              status: "PAID",
              paidAt: serverTimestamp()
            });
          }
          setIsProcessingPayment(false);
          setStep(3);
        } catch (e) {
          setIsProcessingPayment(false);
        }
      },
      prefill: {
        name: farmerName,
        email: user?.email || "",
        contact: user?.phone || "",
      },
      theme: { color: "#d97706" },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  /* ===============================
     STEP 4 & 5: AI LOGIC
     =============================== */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setReportFile(base64);
      const extractedText = `Soil Test Results (${farmerName}): Nitrogen Low, Phosphorus Medium, Potassium High, pH 6.2`;
      setReportText(extractedText);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeReport = async () => {
    if (!reportText) return;
    setLoading(true);
    try {
      const result = await getFertilizerRecommendation(reportText, parseFloat(testArea));
      setRecommendation(result);
      if (docId) {
        await updateDoc(doc(db, "soil_tests", docId), {
          aiRecommendation: result,
          status: "COMPLETED",
          analyzedAt: serverTimestamp()
        });
      }
      setStep(5);
    } catch {
      alert("AI analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { n: 1, icon: '📍', label: 'Booking' },
    { n: 2, icon: '💳', label: 'Payment' },
    { n: 3, icon: '🚚', label: 'Collection' },
    { n: 4, icon: '📤', label: 'Upload' },
    { n: 5, icon: '✨', label: 'Analysis' }
  ];

  const ErrorLabel = ({ msg }: { msg?: string }) => 
    msg ? <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 animate-pulse">{msg}</p> : null;

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto animate-fade-in-up">
      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-amber-900/10 overflow-hidden border border-stone-100">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-700 p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10">
            <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">Laboratory Service</span>
            <h2 className="text-4xl md:text-5xl font-black mb-3 leading-tight">{t.soilTitle}</h2>
            <p className="text-lg font-medium opacity-90 max-w-xl">Laboratory analysis & AI-driven prescriptions.</p>
          </div>
        </div>

        <div className="p-12">
          {/* Progress Bar */}
          <div className="flex justify-between items-center mb-16 relative">
            <div className="absolute left-0 right-0 top-6 h-1 bg-stone-100 -z-0" />
            {steps.map(s => (
              <div key={s.n} className="flex flex-col items-center flex-1 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg transition-all duration-500 shadow-lg ${
                  step >= s.n ? 'bg-amber-600 text-white scale-110' : 'bg-white text-stone-300 border-2 border-stone-100'
                }`}>
                  {s.icon}
                </div>
                <span className={`text-[11px] mt-4 font-black uppercase tracking-widest ${
                  step >= s.n ? 'text-amber-700' : 'text-stone-400'
                }`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Step 1: Booking Form */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in duration-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <h3 className="text-2xl font-black text-stone-800">1. {t.bookSlot}</h3>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-stone-400 ml-1">{t.fullName}</label>
                        <input 
                          type="text"
                          value={farmerName}
                          onChange={(e) => handleInputChange(setFarmerName, 'farmerName', e.target.value)}
                          className={`w-full p-4 bg-stone-50 border ${errors.farmerName ? 'border-rose-400' : 'border-stone-200'} rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-stone-700 transition-all`}
                        />
                        <ErrorLabel msg={errors.farmerName} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-stone-400 ml-1">Test Area</label>
                          <div className="flex gap-2">
                             <input 
                                type="number"
                                value={testArea}
                                onChange={(e) => handleInputChange(setTestArea, 'testArea', e.target.value)}
                                placeholder="0"
                                className={`w-full p-4 bg-stone-50 border ${errors.testArea ? 'border-rose-400' : 'border-stone-200'} rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-stone-700`}
                             />
                             <select 
                                value={areaUnit}
                                onChange={(e) => setAreaUnit(e.target.value)}
                                className="w-24 p-4 bg-amber-50 border border-amber-100 rounded-2xl font-bold text-amber-700 outline-none"
                             >
                                <option value="Acres">Acres</option>
                                <option value="Hectares">Hec</option>
                                <option value="Guntha">Gun</option>
                             </select>
                          </div>
                          <ErrorLabel msg={errors.testArea} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-stone-400 ml-1">Preferred Date</label>
                          <input 
                            type="date"
                            min={dateLimits.min}
                            max={dateLimits.max}
                            value={bookingDate}
                            onChange={(e) => handleInputChange(setBookingDate, 'bookingDate', e.target.value)}
                            className={`w-full p-4 bg-stone-50 border ${errors.bookingDate ? 'border-rose-400' : 'border-stone-200'} rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-stone-700`}
                          />
                          <ErrorLabel msg={errors.bookingDate} />
                        </div>
                      </div>
                    </div>
                 </div>
                 
                 <div className="space-y-1 flex flex-col">
                    <label className="text-[10px] font-black uppercase text-stone-400 ml-1">{t.address} & Landmark</label>
                    <textarea 
                      rows={8}
                      value={location}
                      onChange={(e) => handleInputChange(setLocation, 'location', e.target.value)}
                      placeholder="Enter the full farm address for sample collection..."
                      className={`flex-1 w-full p-6 bg-stone-50 border ${errors.location ? 'border-rose-400' : 'border-stone-200'} rounded-3xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-stone-700 shadow-inner resize-none transition-all`}
                    />
                    <ErrorLabel msg={errors.location} />
                 </div>
              </div>
              <button onClick={handleBook} className="w-full py-5 bg-stone-900 text-white font-black rounded-[2rem] hover:bg-amber-600 transition-all shadow-2xl uppercase tracking-widest text-sm mt-4">
                Proceed to Secure Payment
              </button>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="max-w-xl mx-auto space-y-8 py-8 animate-in fade-in zoom-in-95 duration-500">
               <div className="text-center space-y-2">
                  <h3 className="text-3xl font-black text-stone-900">Secure Payment</h3>
                  <p className="text-stone-500 font-medium">Fee: <span className="text-stone-900 font-black">₹400.00</span></p>
               </div>
               <button onClick={handlePayment} className="w-full py-5 bg-emerald-600 text-white font-black rounded-[2rem] hover:bg-emerald-700 transition-all shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-sm">
                  {isProcessingPayment ? 'Connecting...' : 'Confirm and Pay ₹400'}
               </button>
            </div>
          )}

          {/* Step 3: Tracking */}
          {step === 3 && (
            <div className="text-center space-y-8 py-12 animate-in fade-in duration-700">
              <div className="relative text-7xl mb-4">🚛</div>
              <h3 className="text-3xl font-black text-stone-900">Slot Confirmed</h3>
              <p className="text-stone-500 font-medium max-w-md mx-auto text-lg">
                Sample collection scheduled for <span className="text-stone-900 font-black">{new Date(bookingDate).toLocaleDateString()}</span>.
              </p>
              <button onClick={() => setStep(4)} className="px-10 py-4 bg-stone-900 text-white font-black rounded-full hover:bg-emerald-600 transition-all uppercase tracking-widest text-xs">
                Go to Upload Report
              </button>
            </div>
          )}

          {/* Step 4: Upload */}
          {step === 4 && (
            <div className="space-y-8 animate-in fade-in duration-700 text-center">
               <h3 className="text-3xl font-black text-stone-900">Step 4: Report Analysis</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                  <div className="space-y-4">
                     <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />
                     <div onClick={() => fileInputRef.current?.click()} className="w-full h-64 border-4 border-dashed border-stone-100 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 transition-all">
                        {reportFile ? <p className="text-emerald-600 font-black">📄 Report Selected</p> : <p className="text-stone-400 font-black uppercase text-xs">Upload Lab Report</p>}
                     </div>
                  </div>
                  <textarea rows={6} value={reportText} onChange={(e) => setReportText(e.target.value)} className="w-full p-6 bg-stone-50 border border-stone-200 rounded-[2.5rem] font-bold text-stone-700 shadow-inner resize-none" />
               </div>
               <button onClick={handleAnalyzeReport} disabled={loading || !reportText} className="w-full py-5 bg-stone-900 text-white font-black rounded-[2rem] hover:bg-emerald-600 transition-all shadow-2xl disabled:bg-stone-200 uppercase tracking-widest text-sm">
                 {loading ? 'AI RUNNING...' : 'GENERATE AI FERTILIZER PRESCRIPTION'}
               </button>
            </div>
          )}

          {/* Step 5: Final AI Results */}
          {step === 5 && (
            <div className="space-y-8 animate-in zoom-in-95 duration-500">
              <div className="flex justify-between items-end border-b pb-6">
                 <div>
                    <h3 className="text-3xl font-black text-stone-900">Soil Prescription</h3>
                    <p className="text-stone-500 font-bold uppercase text-xs mt-1">For {testArea} {areaUnit} Area</p>
                 </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 bg-stone-50 p-10 rounded-[2.5rem] border border-stone-200 whitespace-pre-wrap font-medium text-lg text-stone-800 leading-relaxed shadow-inner">
                    {recommendation}
                 </div>
                 <div className="space-y-6">
                    <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm">
                       <h4 className="text-xs font-black text-emerald-600 uppercase mb-4 tracking-widest">Requirement Estimator</h4>
                       <div className="space-y-3">
                          <div className="flex justify-between border-b border-emerald-100 pb-2">
                             <span className="font-bold text-stone-600">Urea:</span>
                             <span className="font-black text-emerald-700">{(parseFloat(testArea) * 45).toFixed(1)} kg</span>
                          </div>
                          <div className="flex justify-between border-b border-emerald-100 pb-2">
                             <span className="font-bold text-stone-600">DAP:</span>
                             <span className="font-black text-emerald-700">{(parseFloat(testArea) * 30).toFixed(1)} kg</span>
                          </div>
                       </div>
                    </div>
                    <button onClick={() => { setStep(1); setRecommendation(null); setReportText(''); setReportFile(null); setBookingDate(''); setTestArea(''); }} className="w-full py-4 border-2 border-amber-600 text-amber-600 font-black rounded-2xl hover:bg-amber-50 uppercase tracking-widest text-[11px]">
                      Book New Test Slot
                    </button>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SoilTesting;