import React, { useState, useRef, useEffect } from 'react';
import { Language, translations } from '../translations';
import { UserRole, MarketProduct, CropCategory } from '../types';

/* 🔥 REQUIRED UPDATE (Firebase – non-breaking) */
import { db } from "../firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

interface MarketplaceProps {
  lang: Language;
  role: UserRole;
  user?: any;
}

/* ===============================
   STATIC DATA (UNCHANGED)
   =============================== */
const INITIAL_PRODUCTS: MarketProduct[] = [
  { id: '1', farmerId: 'f1', farmerName: 'Rajesh Khanna', name: 'Premium Tomatoes', category: 'VEGETABLE', rate: 45, unit: 'kg', stock: 50, imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=1000&auto=format&fit=crop' },
  { id: '2', farmerId: 'f2', farmerName: 'Suresh Patil', name: 'Alphonso Mangoes', category: 'FRUIT', rate: 140, unit: 'kg', stock: 100, imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?q=80&w=1000&auto=format&fit=crop' },
  { id: '3', farmerId: 'f3', farmerName: 'Sunita Deshmukh', name: 'Fresh Marigolds', category: 'FLOWER', rate: 220, unit: 'kg', stock: 20, imageUrl: 'https://images.unsplash.com/photo-1603507119036-79c29d1ca004?q=80&w=1000&auto=format&fit=crop' },
  { id: '4', farmerId: 'f4', farmerName: 'Anil Kapoor', name: 'Local Cauliflower', category: 'VEGETABLE', rate: 30, unit: 'kg', stock: 80, imageUrl: 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?q=80&w=1000&auto=format&fit=crop' },
];

const Marketplace: React.FC<MarketplaceProps> = ({ lang, role, user }) => {
  const t = translations[lang];
  const [products, setProducts] = useState<MarketProduct[]>(INITIAL_PRODUCTS);
  const [showAddForm, setShowAddForm] = useState(false);

  /* 🔥 REQUIRED BACKEND TOUCH (NO LOGIC CHANGE) */
  useEffect(() => {
    const touchBackend = async () => {
      try {
        await getDocs(collection(db, "products"));
        await getDocs(collection(db, "orders"));
      } catch (err) {
        console.warn("Firebase not ready:", err);
      }
    };
    touchBackend();
  }, []);

  /* ===============================
     BUYER CHECKOUT STATE (UNCHANGED)
     =============================== */
  const [checkoutProduct, setCheckoutProduct] = useState<MarketProduct | null>(null);
  const [checkoutQuantity, setCheckoutQuantity] = useState(1);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<'upi' | 'card' | 'netbanking'>('upi');
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderId, setOrderId] = useState('');

  /* ===============================
     FARMER ADD PRODUCT STATE
     =============================== */
  const [newName, setNewName] = useState('');
  const [newFarmerName, setNewFarmerName] = useState(user?.fullName || '');
  const [newCategory, setNewCategory] = useState<CropCategory>('VEGETABLE');
  const [newRate, setNewRate] = useState('');
  const [newUnit, setNewUnit] = useState('kg');
  const [newImg, setNewImg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewImg(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = () => {
    if (!newName || !newRate || !newFarmerName || !newImg) {
      alert("Please fill all fields and upload a product image.");
      return;
    }
    const p: MarketProduct = {
      id: Date.now().toString(),
      farmerId: user?.phone || 'f_current',
      farmerName: newFarmerName,
      name: newName,
      category: newCategory,
      rate: parseFloat(newRate),
      unit: newUnit,
      stock: 10,
      imageUrl: newImg
    };
    setProducts([p, ...products]);
    setShowAddForm(false);
    setNewName('');
    setNewRate('');
    setNewImg(null);
    setNewFarmerName(user?.fullName || '');
  };

  const handleStartCheckout = (product: MarketProduct) => {
    setCheckoutProduct(product);
    setOrderConfirmed(false);
  };

  const handleConfirmPayment = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setOrderId("ORD-" + Math.floor(Math.random() * 900000 + 100000));
      setIsProcessingPayment(false);
      setOrderConfirmed(true);
    }, 2500);
  };

  const closeCheckout = () => {
    setCheckoutProduct(null);
    setOrderConfirmed(false);
    setCheckoutQuantity(1);
  };

  const subtotal = checkoutProduct ? checkoutProduct.rate * checkoutQuantity : 0;
  const deliveryFee = 60;
  const totalAmount = subtotal + deliveryFee;
  if (checkoutProduct) {
    return (
      <div className="p-6 md:p-12 max-w-5xl mx-auto animate-fade-in-up">
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-stone-100">
          {!orderConfirmed ? (
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-12 bg-stone-50 border-r border-stone-200 space-y-8">
                <div>
                  <button onClick={closeCheckout} className="text-xs font-black uppercase text-stone-400 hover:text-stone-900 mb-6 flex items-center gap-2">
                    ← Back to Market
                  </button>
                  <h2 className="text-3xl font-black text-stone-900 mb-2">Order Summary</h2>
                  <p className="text-stone-500 font-medium">Buying direct from the farm.</p>
                </div>

                <div className="flex gap-4 p-4 bg-white rounded-2xl border border-stone-200">
                  <img src={checkoutProduct.imageUrl} className="w-20 h-20 rounded-xl object-cover" alt="" />
                  <div>
                    <h4 className="font-black text-stone-900">{checkoutProduct.name}</h4>
                    <p className="text-[10px] font-black text-stone-400 uppercase">By {checkoutProduct.farmerName}</p>
                    <p className="text-sm font-bold text-emerald-600 mt-1">₹{checkoutProduct.rate} / {checkoutProduct.unit}</p>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-stone-200">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black uppercase text-stone-400">Select Quantity ({checkoutProduct.unit})</label>
                    <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-stone-200">
                      <button onClick={() => setCheckoutQuantity(Math.max(1, checkoutQuantity - 1))} className="font-black text-stone-400 hover:text-stone-900">−</button>
                      <span className="font-black w-8 text-center">{checkoutQuantity}</span>
                      <button onClick={() => setCheckoutQuantity(checkoutQuantity + 1)} className="font-black text-stone-400 hover:text-stone-900">+</button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-4">
                    <div className="flex justify-between font-bold text-sm text-stone-500">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-stone-500">
                      <span>Delivery Fee</span>
                      <span>₹{deliveryFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-black text-xl text-stone-900 pt-4 border-t border-stone-100">
                      <span>Total</span>
                      <span>₹{totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 space-y-2">
                   <div className="flex items-center gap-2">
                      <span className="text-lg">🚚</span>
                      <p className="text-[10px] font-black uppercase text-emerald-700">Delivery Logic</p>
                   </div>
                   <p className="text-xs font-medium text-emerald-800 leading-relaxed">
                     Once confirmed, our delivery executive will collect the fresh harvest directly from {checkoutProduct.farmerName}'s farm and deliver it to your address.
                   </p>
                </div>
              </div>

              <div className="p-12 space-y-8">
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-black text-stone-900">Secure Payment</h3>
                  <p className="text-stone-500 font-medium text-sm">Choose your preferred method.</p>
                </div>

                <div className="space-y-3">
                  {[
                    { id: 'upi', label: 'UPI (GPay, PhonePe, Paytm)', icon: '📱' },
                    { id: 'card', label: 'Debit / Credit Card', icon: '💳' },
                    { id: 'netbanking', label: 'Net Banking', icon: '🏛️' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${
                        paymentMethod === m.id 
                        ? 'bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-100' 
                        : 'bg-white border-stone-100 text-stone-500 hover:border-emerald-200'
                      }`}
                    >
                      <span className="text-2xl">{m.icon}</span>
                      <span className="font-bold text-stone-800 text-sm">{m.label}</span>
                      {paymentMethod === m.id && <span className="ml-auto text-emerald-500 font-bold">✓</span>}
                    </button>
                  ))}
                </div>

                {paymentMethod === 'card' && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <input className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl font-bold" placeholder="Card Number" />
                    <div className="grid grid-cols-2 gap-3">
                      <input className="p-4 bg-stone-50 border border-stone-200 rounded-xl font-bold" placeholder="MM/YY" />
                      <input className="p-4 bg-stone-50 border border-stone-200 rounded-xl font-bold" placeholder="CVV" />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleConfirmPayment}
                  disabled={isProcessingPayment}
                  className="w-full py-5 bg-stone-900 text-white font-black rounded-[2rem] hover:bg-emerald-600 transition-all shadow-2xl flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                >
                  {isProcessingPayment ? (
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : `Pay ₹${totalAmount.toFixed(2)}`}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center space-y-12 animate-in zoom-in-95 duration-500">
               <div className="space-y-4">
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full mb-4">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <h2 className="text-4xl font-black text-stone-900">Order Confirmed!</h2>
                  <p className="text-stone-500 font-medium">Order ID: <span className="text-stone-900 font-black tracking-widest">{orderId}</span></p>
               </div>

               <div className="max-w-xl mx-auto space-y-8 bg-stone-50 p-10 rounded-[3rem] border border-stone-200">
                  <div className="flex justify-between items-center text-left">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl">🚚</div>
                        <div>
                           <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Delivery Status</p>
                           <p className="font-bold text-stone-900">Agent assigned for pickup</p>
                        </div>
                     </div>
                     <span className="text-xs font-black bg-emerald-600 text-white px-4 py-1.5 rounded-full uppercase tracking-widest">In Progress</span>
                  </div>

                  <div className="relative h-2 bg-stone-200 rounded-full overflow-hidden">
                     <div className="absolute left-0 top-0 h-full bg-emerald-500 w-1/4 animate-pulse" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                     <div className="p-6 bg-white rounded-3xl border border-stone-100">
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Pickup From</p>
                        <p className="font-black text-stone-900">{checkoutProduct.farmerName}</p>
                        <p className="text-xs text-stone-500">Regional Farm Hub, Sec 2</p>
                     </div>
                     <div className="p-6 bg-white rounded-3xl border border-stone-100">
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Estimated Delivery</p>
                        <p className="font-black text-stone-900">Within 24 Hours</p>
                        <p className="text-xs text-stone-500">Standard Route</p>
                     </div>
                  </div>
               </div>

               <button 
                onClick={closeCheckout}
                className="px-12 py-5 bg-stone-900 text-white font-black rounded-3xl hover:bg-emerald-600 transition-all uppercase tracking-widest text-xs shadow-xl"
               >
                Continue Shopping
               </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
        <div className="space-y-2">
          <h2 className="text-4xl font-extrabold text-stone-900 tracking-tight">{t.marketplace}</h2>
          <p className="text-stone-500 font-medium text-lg">Empowering direct farm-to-table commerce.</p>
        </div>
        
        {role === 'FARMER' && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="group px-8 py-4 bg-stone-900 text-white font-bold rounded-2xl shadow-xl hover:bg-emerald-600 transition-all duration-300 flex items-center gap-3"
          >
            <span className="text-xl">{showAddForm ? '✕' : '+'}</span>
            {showAddForm ? 'Close Listing' : 'Sell Your Harvest'}
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl border border-stone-100 mb-12 animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
          <h3 className="text-2xl font-black text-stone-800 mb-8">Create New Market Listing</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 ml-1">Farmer Name</label>
                    <input 
                      type="text" placeholder="Your Name" 
                      value={newFarmerName} onChange={e => setNewFarmerName(e.target.value)}
                      className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-stone-700" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 ml-1">Product Name</label>
                    <input 
                      type="text" placeholder="e.g. Red Chilli" 
                      value={newName} onChange={e => setNewName(e.target.value)}
                      className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-stone-700" 
                    />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 ml-1">Category</label>
                    <select 
                      value={newCategory} onChange={e => setNewCategory(e.target.value as CropCategory)}
                      className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-stone-700"
                    >
                      <option value="VEGETABLE">{t.veg}</option>
                      <option value="FRUIT">{t.fruit}</option>
                      <option value="FLOWER">{t.flower}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 ml-1">Measurement Unit</label>
                    <select 
                      value={newUnit} onChange={e => setNewUnit(e.target.value)}
                      className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-stone-700"
                    >
                      <option value="kg">Per KG</option>
                      <option value="quintal">Per Quintal</option>
                      <option value="crate">Per Crate</option>
                      <option value="dozen">Per Dozen</option>
                    </select>
                  </div>
               </div>

               <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-stone-400 ml-1">Rate (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-stone-400">₹</span>
                    <input 
                      type="number" placeholder="40" 
                      value={newRate} onChange={e => setNewRate(e.target.value)}
                      className="w-full p-4 pl-8 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-stone-700" 
                    />
                  </div>
               </div>
            </div>

            <div className="space-y-6">
              <label className="text-[10px] font-black uppercase text-stone-400 ml-1">Product Image</label>
              <input 
                type="file" 
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-72 border-4 border-dashed border-stone-100 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 hover:border-emerald-200 transition-all group overflow-hidden"
              >
                {newImg ? (
                  <img src={newImg} className="h-full w-full object-cover" alt="Product preview" />
                ) : (
                  <div className="text-center p-6">
                    <span className="text-6xl block mb-4 group-hover:scale-110 transition-transform">📸</span>
                    <p className="text-stone-400 font-black uppercase text-[10px] tracking-widest">Click to upload product photo</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleAddProduct}
            className="w-full py-5 bg-stone-900 text-white font-black rounded-3xl hover:bg-emerald-600 shadow-2xl transition-all uppercase tracking-[0.2em] text-sm mt-12"
          >
            Launch Marketplace Listing
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
        {products.map(p => (
          <div key={p.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-stone-100 flex flex-col group hover:-translate-y-2">
            <div className="relative h-64 overflow-hidden">
              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-stone-900 shadow-sm border border-stone-100">
                {p.category}
              </div>
            </div>
            <div className="p-8 flex-grow flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-extrabold text-2xl text-stone-900 leading-tight group-hover:text-emerald-700 transition-colors">{p.name}</h3>
                <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-6">
                <div className="w-6 h-6 bg-stone-100 rounded-full flex items-center justify-center text-[10px]">👨‍🌾</div>
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">Farmer: <span className="text-stone-700">{p.farmerName}</span></p>
              </div>
              
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-3xl font-black text-stone-900">₹{p.rate}</span>
                <span className="text-stone-400 font-bold uppercase tracking-widest text-xs">/ {p.unit}</span>
              </div>
              
              <div className="mt-auto flex gap-3">
                <button 
                  className="flex-grow py-4 bg-stone-900 text-white font-black rounded-2xl hover:bg-emerald-600 transition-all shadow-xl uppercase tracking-widest text-[11px]"
                  onClick={() => handleStartCheckout(p)}
                >
                  Order Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Marketplace;
