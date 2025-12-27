import React, { useState, useRef } from 'react';
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

interface SoilTestingProps {
  lang: Language;
  user?: any;
}

const SoilTesting: React.FC<SoilTestingProps> = ({ lang, user }) => {
  const t = translations[lang];

  // Steps: 1: Booking, 2: Payment, 3: Collection/Lab, 4: Upload Report, 5: AI Results
  const [step, setStep] = useState(1);

  // Booking Form State
  const [farmerName, setFarmerName] = useState(user?.fullName || '');
  const [testArea, setTestArea] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [location, setLocation] = useState(user?.address || '');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Tracking, Firestore & AI State
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null); // Firestore Document ID
  const [loading, setLoading] = useState(false);
  const [reportText, setReportText] = useState('');
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [reportFile, setReportFile] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ===============================
     STEP 1: BOOKING (Firestore Create)
     =============================== */
  const handleBook = async () => {
    if (!farmerName || !testArea || !bookingDate || !location) return;

    try {
      const ref = await addDoc(collection(db, "soil_tests"), {
        farmerName,
        testArea: parseFloat(testArea),
        bookingDate,
        location,
        userId: user?.uid || null,
        status: "BOOKED",
        createdAt: serverTimestamp()
      });

      setDocId(ref.id);
      setStep(2); // Go to Payment
    } catch (error) {
      console.error("Booking failed:", error);
      alert("Error saving booking. Please check your connection.");
    }
  };

  /* ===============================
     STEP 2: PAYMENT (Firestore Update)
     =============================== */
  const handlePayment = async () => {
    setIsProcessingPayment(true);

    // Simulate Payment Gateway delay
    setTimeout(async () => {
      const refNo = "KV-" + Math.floor(Math.random() * 90000 + 10000);
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
        setStep(3); // Go to Tracking
      } catch (error) {
        console.error("Payment update failed:", error);
        setIsProcessingPayment(false);
      }
    }, 2000);
  };

  /* ===============================
     STEP 4: REPORT UPLOAD (Firestore Update)
     =============================== */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setReportFile(base64);

      // Simulation of data extraction
      const extractedText = `Soil Test Results for Sample ${bookingRef || "KV-X"} (Owner: ${farmerName}, Area: ${testArea} Acres): Nitrogen: Low (180kg/ha), Phosphorus: Medium (22kg/ha), Potassium: High (350kg/ha), pH: 6.2, Organic Carbon: 0.35%, Micronutrients: Zinc Deficiency.`;
      setReportText(extractedText);

      if (docId) {
        await updateDoc(doc(db, "soil_tests", docId), {
          reportFile: base64,
          reportText: extractedText,
          status: "REPORT_UPLOADED"
        });
      }
    };
    reader.readAsDataURL(file);
  };

  /* ===============================
     STEP 5: AI ANALYSIS (Firestore Update)
     =============================== */
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
    } catch (e) {
      console.error(e);
      alert("AI Analysis failed. Please try again.");
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

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto animate-fade-in-up">
      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-amber-900/10 overflow-hidden border border-stone-100">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-700 p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10">
            <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">Laboratory Service</span>
            <h2 className="text-4xl md:text-5xl font-black mb-3 leading-tight">{t.soilTitle}</h2>
            <p className="text-lg font-medium opacity-90 max-w-xl">From field collection to AI-driven nutrient prescriptions.</p>
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
                          onChange={(e) => setFarmerName(e.target.value)}
                          placeholder="Farmer's Full Name"
                          className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-stone-700"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-stone-400 ml-1">Area (Acres)</label>
                          <input 
                            type="number"
                            value={testArea}
                            onChange={(e) => setTestArea(e.target.value)}
                            placeholder="e.g. 5"
                            className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-stone-700"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-stone-400 ml-1">Preferred Date</label>
                          <input 
                            type="date"
                            value={bookingDate}
                            onChange={(e) => setBookingDate(e.target.value)}
                            className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-stone-700"
                          />
                        </div>
                      </div>
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-stone-400 ml-1">{t.address} & Landmark</label>
                    <textarea 
                      rows={8}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Enter the farm location address..."
                      className="w-full p-6 bg-stone-50 border border-stone-200 rounded-3xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-stone-700 shadow-inner resize-none"
                    />
                 </div>
              </div>
              <button 
                onClick={handleBook}
                disabled={!farmerName || !testArea || !bookingDate || !location}
                className="w-full py-5 bg-stone-900 text-white font-black rounded-[2rem] hover:bg-amber-600 transition-all shadow-2xl disabled:bg-stone-200 disabled:text-stone-400 uppercase tracking-[0.2em] text-sm mt-4"
              >
                Proceed to Secure Payment
              </button>
            </div>
          )}

          {/* Step 2: Payment Gateway */}
          {step === 2 && (
            <div className="max-w-xl mx-auto space-y-8 py-8 animate-in fade-in zoom-in-95 duration-500">
               <div className="text-center space-y-2">
                  <h3 className="text-3xl font-black text-stone-900">Secure Payment</h3>
                  <p className="text-stone-500 font-medium">Service Fee: <span className="text-stone-900 font-black">₹400.00</span></p>
               </div>

               <div className="bg-stone-50 rounded-[2.5rem] p-8 border border-stone-200 space-y-6">
                  <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black uppercase text-stone-400 ml-1">Choose Payment Method</label>
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          { id: 'upi', label: 'UPI / Google Pay / PhonePe', icon: '📱' },
                          { id: 'card', label: 'Debit / Credit Card', icon: '💳' },
                          { id: 'netbanking', label: 'Net Banking', icon: '🏛️' }
                        ].map((method) => (
                           <button
                              key={method.id}
                              onClick={() => setPaymentMethod(method.id as any)}
                              className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${
                                paymentMethod === method.id 
                                ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-100' 
                                : 'bg-transparent border-stone-200 text-stone-500'
                              }`}
                           >
                              <span className="text-2xl">{method.icon}</span>
                              <span className="font-bold text-stone-800">{method.label}</span>
                              {paymentMethod === method.id && <span className="ml-auto text-emerald-500">✓</span>}
                           </button>
                        ))}
                      </div>
                  </div>
               </div>

               <button
                  onClick={handlePayment}
                  disabled={isProcessingPayment}
                  className="w-full py-5 bg-emerald-600 text-white font-black rounded-[2rem] hover:bg-emerald-700 transition-all shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
               >
                  {isProcessingPayment ? 'Verifying Payment...' : 'Pay ₹400.00 Now'}
               </button>
            </div>
          )}

          {/* Step 3: Tracking */}
          {step === 3 && (
            <div className="text-center space-y-8 py-12 animate-in fade-in duration-700">
              <div className="relative text-7xl">🚛</div>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full tracking-[0.2em] uppercase mb-2">Payment Verified</div>
                <h3 className="text-3xl font-black text-stone-900 mb-2">Tracking ID: {bookingRef}</h3>
                <p className="text-stone-500 font-medium max-w-md mx-auto text-lg leading-relaxed">
                  Our executive is scheduled for {new Date(bookingDate).toLocaleDateString()}.
                </p>
              </div>
              <button 
                onClick={() => setStep(4)}
                className="px-10 py-4 bg-stone-900 text-white font-black rounded-full hover:bg-emerald-600 transition-all uppercase tracking-widest text-xs shadow-xl"
              >
                I have received my Report
              </button>
            </div>
          )}

          {/* Step 4: Upload Report */}
          {step === 4 && (
            <div className="space-y-8 animate-in fade-in duration-700">
               <div className="text-center max-w-xl mx-auto space-y-4 mb-10">
                  <h3 className="text-3xl font-black text-stone-900">4. Submit Lab Report</h3>
                  <p className="text-stone-500 font-medium leading-relaxed">Upload your report file here for AI analysis.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />
                     <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-64 border-4 border-dashed border-stone-100 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 transition-all"
                     >
                        {reportFile ? <p className="text-emerald-600 font-black">📄 Report Selected</p> : <p className="text-stone-400 font-black">Tap to upload lab report</p>}
                     </div>
                  </div>

                  <div className="space-y-4">
                     <textarea 
                        rows={6}
                        value={reportText}
                        onChange={(e) => setReportText(e.target.value)}
                        placeholder="Manual lab values..."
                        className="w-full p-6 bg-stone-50 border border-stone-200 rounded-[2.5rem] font-bold text-stone-700 shadow-inner resize-none"
                     />
                  </div>
               </div>

               <button 
                onClick={handleAnalyzeReport}
                disabled={loading || !reportText}
                className="w-full py-5 bg-stone-900 text-white font-black rounded-[2rem] hover:bg-emerald-600 transition-all shadow-2xl disabled:bg-stone-200 uppercase tracking-[0.2em] text-sm"
              >
                {loading ? 'AI ANALYZING...' : 'GENERATE CUSTOM FERTILIZER PLAN'}
              </button>
            </div>
          )}

          {/* Step 5: AI Results */}
          {step === 5 && (
            <div className="space-y-8 animate-in zoom-in-95 duration-500">
              <h3 className="text-3xl font-black text-stone-900">Prescription for {testArea} Acres</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 prose prose-stone max-w-none bg-stone-50/50 p-10 rounded-[2.5rem] border border-stone-200 whitespace-pre-wrap font-medium text-lg shadow-inner">
                    {recommendation}
                 </div>
                 <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                       <h4 className="text-sm font-black text-stone-400 uppercase mb-4">Total Requirement</h4>
                       <p className="font-bold text-stone-700">Urea: {(parseFloat(testArea) * 45).toFixed(1)} kg</p>
                       <p className="font-bold text-stone-700">DAP: {(parseFloat(testArea) * 30).toFixed(1)} kg</p>
                    </div>
                    <button 
                      onClick={() => { setStep(1); setRecommendation(null); setReportText(''); setReportFile(null); }}
                      className="w-full py-4 border-2 border-amber-600 text-amber-600 font-black rounded-2xl hover:bg-amber-50 uppercase tracking-widest text-[11px]"
                    >
                      Book New Soil Test
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