import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Language, translations } from '../translations';
import { UserRole, MarketProduct, CropCategory } from '../types';

/* 🔥 Firebase */
import { db } from "../firebase/firebaseConfig";
import { collection, addDoc, serverTimestamp, onSnapshot, query } from "firebase/firestore";

const loadRazorpay = () => {
  return new Promise<boolean>((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

interface MarketplaceProps {
  lang: Language;
  role: UserRole;
  user?: any;
}

const Marketplace: React.FC<MarketplaceProps> = ({ lang, role, user }) => {
  const t = translations[lang];
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | CropCategory>('ALL');

  useEffect(() => {
    const q = query(collection(db, "products"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MarketProduct[];
      const sorted = dbProducts.sort((a, b) => ((b as any).createdAt?.seconds || 0) - ((a as any).createdAt?.seconds || 0));
      setProducts(sorted);
    });
    return () => unsubscribe();
  }, []);

  const filteredProducts = useMemo(() => activeTab === 'ALL' ? products : products.filter(p => p.category === activeTab), [products, activeTab]);

  const [checkoutProduct, setCheckoutProduct] = useState<MarketProduct | null>(null);
  const [checkoutQuantity, setCheckoutQuantity] = useState(1);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderId, setOrderId] = useState('');

  const [newName, setNewName] = useState('');
  const [newFarmerName, setNewFarmerName] = useState(user?.fullName || '');
  const [newCategory, setNewCategory] = useState<CropCategory>('VEGETABLE');
  const [newRate, setNewRate] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newUnit, setNewUnit] = useState('kg'); // Default unit
  const [newImg, setNewImg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size < 800000) {
      const reader = new FileReader();
      reader.onloadend = () => setNewImg(reader.result as string);
      reader.readAsDataURL(file);
    } else if (file) { alert("Image too large (>800KB)"); }
  };

  const handleAddProduct = async () => {
    if (!user || !user.uid) {
      alert("Error: You are not properly logged in.");
      return;
    }
    if (!newName || !newRate || !newStock || !newImg) {
      alert("Please fill all fields.");
      return;
    }

    const productData = {
      farmerId: user.uid,
      farmerName: newFarmerName || user.fullName,
      name: newName,
      category: newCategory,
      rate: parseFloat(newRate),
      unit: newUnit, // Saved from the dropdown
      stock: parseFloat(newStock),
      imageUrl: newImg,
    };

    try {
      await addDoc(collection(db, "products"), { ...productData, createdAt: serverTimestamp() });
      setShowAddForm(false);
      setNewName(""); setNewRate(""); setNewStock(""); setNewImg(null); setNewUnit("kg");
      alert("Product posted successfully!");
    } catch (err: any) { 
        console.error(err); 
        alert("Error posting product.");
    }
  };

  const totalAmount = checkoutProduct ? (checkoutProduct.rate * checkoutQuantity) + 20 : 0;

  const handleConfirmPayment = async () => {
    setIsProcessingPayment(true);
    const loaded = await loadRazorpay();
    if (!loaded) return;
    const options = {
      key: "rzp_test_S65eOkVzHn838L",
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      name: "Krishi Vedah Market",
      handler: (response: any) => { setOrderId(response.razorpay_payment_id); setOrderConfirmed(true); setIsProcessingPayment(false); },
      prefill: { name: user?.fullName, contact: user?.phone },
      theme: { color: "#059669" },
    };
    new (window as any).Razorpay(options).open();
  };

  if (checkoutProduct) {
    return (
      <div className="p-6 md:p-12 max-w-5xl mx-auto">
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border">
          {!orderConfirmed ? (
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-12 bg-stone-50 border-r">
                <button onClick={() => setCheckoutProduct(null)} className="text-xs font-black mb-6">← BACK</button>
                <h2 className="text-3xl font-black mb-8">Order Summary</h2>
                <div className="p-6 bg-white rounded-3xl border flex gap-4">
                  <img src={checkoutProduct.imageUrl} className="w-24 h-24 rounded-2xl object-cover" />
                  <div>
                    <h4 className="font-black text-xl">{checkoutProduct.name}</h4>
                    <p className="text-emerald-600 font-black">₹{checkoutProduct.rate} / {checkoutProduct.unit}</p>
                  </div>
                </div>
              </div>
              <div className="p-12 space-y-8">
                <div className="flex justify-between text-2xl font-black pt-4 border-t">
                  <span>Total Pay</span>
                  <span>₹{totalAmount}</span>
                </div>
                <button onClick={handleConfirmPayment} className="w-full py-5 bg-stone-900 text-white font-black rounded-[2rem]">
                  {isProcessingPayment ? "Processing..." : `Pay ₹${totalAmount}`}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-20 text-center space-y-6">
              <h2 className="text-4xl font-black text-stone-900">Success!</h2>
              <p className="font-bold">Payment ID: {orderId}</p>
              <button onClick={() => { setCheckoutProduct(null); setOrderConfirmed(false); }} className="px-12 py-5 bg-stone-900 text-white font-black rounded-3xl">Back to Market</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-10 tracking-tight">
      <div className="flex justify-between items-center">
        <h2 className="text-5xl font-black">{t.marketplace}</h2>
        {role === 'FARMER' && (
          <button onClick={() => setShowAddForm(!showAddForm)} className="px-10 py-5 bg-stone-900 text-white font-black rounded-3xl">
            {showAddForm ? 'Close' : 'Sell Your Harvest'}
          </button>
        )}
      </div>

      <nav className="flex gap-3 bg-white p-2 rounded-[2rem] border w-fit">
        {(['ALL', 'VEGETABLE', 'FRUIT', 'FLOWER'] as const).map(cat => (
            <button key={cat} onClick={() => setActiveTab(cat)} className={`px-8 py-3 rounded-[1.5rem] text-xs font-black uppercase ${activeTab === cat ? 'bg-emerald-600 text-white' : 'text-stone-400'}`}>{cat}</button>
        ))}
      </nav>

      {showAddForm && (
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border mb-12 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              <input type="text" placeholder="Farmer Name" value={newFarmerName} onChange={e => setNewFarmerName(e.target.value)} className="w-full p-5 bg-stone-50 rounded-2xl font-bold" />
              
              <select value={newCategory} onChange={e => setNewCategory(e.target.value as CropCategory)} className="w-full p-5 bg-stone-50 rounded-2xl font-bold">
                  <option value="VEGETABLE">Vegetable</option>
                  <option value="FRUIT">Fruit</option>
                  <option value="FLOWER">Flower</option>
              </select>

              <input type="text" placeholder="Product Name (e.g. Fresh Tomatoes)" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-5 bg-stone-50 rounded-2xl font-bold" />
              
              {/* --- ⚖️ PRICE & UNIT DROPDOWN --- */}
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="number" 
                  placeholder="Price (₹)" 
                  value={newRate} 
                  onChange={e => setNewRate(e.target.value)} 
                  className="w-full p-5 bg-stone-50 rounded-2xl font-bold" 
                />
                <select 
                  value={newUnit} 
                  onChange={e => setNewUnit(e.target.value)} 
                  className="w-full p-5 bg-stone-50 rounded-2xl font-bold text-stone-600"
                >
                    <option value="kg">per kg</option>
                    <option value="Dozen">per Dozen</option>
                    <option value="Bunch">per Bunch</option>
                    <option value="Piece">per Piece</option>
                    <option value="Quintal">per Quintal</option>
                    <option value="Gram">per 100g</option>
                </select>
              </div>

              <input type="number" placeholder="Total Available Stock" value={newStock} onChange={e => setNewStock(e.target.value)} className="w-full p-5 bg-emerald-50 rounded-2xl font-bold" />
            </div>

            <div onClick={() => fileInputRef.current?.click()} className="h-80 border-4 border-dashed rounded-[3rem] flex items-center justify-center cursor-pointer bg-stone-50 overflow-hidden relative group">
              {newImg ? (
                <img src={newImg} className="h-full w-full object-cover" />
              ) : (
                <div className="text-center">
                   <p className="text-stone-300 font-bold uppercase text-xs">📸 Upload Photo</p>
                   <p className="text-stone-300 text-[10px] mt-1">Recommended: Square Photo</p>
                </div>
              )}
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
            </div>
          </div>
          <button onClick={handleAddProduct} className="w-full py-6 bg-stone-900 text-white font-black rounded-[2rem] mt-10 uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all">Post to Market</button>
        </div>
      )}

      {/* --- PRODUCT GRID --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {filteredProducts.map(p => (
            <div key={p.id} className="bg-white rounded-[3rem] overflow-hidden border hover:shadow-2xl transition-all group">
              <div className="h-72 relative">
                  <img src={p.imageUrl} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute top-6 right-6 bg-white/90 px-4 py-2 rounded-full font-black text-[9px] uppercase tracking-widest">{p.category}</div>
              </div>
              <div className="p-10">
                <h3 className="font-black text-2xl truncate">{p.name}</h3>
                <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest">By {p.farmerName}</p>
                <div className="mt-6 mb-2 flex items-baseline gap-1">
                    <span className="text-4xl font-black">₹{p.rate}</span>
                    <span className="text-stone-400 font-bold text-sm">/ {p.unit}</span>
                </div>
                <p className="text-emerald-600 font-black text-[10px] mb-8 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-lg w-fit">{p.stock} {p.unit} left</p>
                <button onClick={() => setCheckoutProduct(p)} className="w-full py-5 bg-stone-900 text-white font-black rounded-[1.5rem] hover:bg-emerald-600 transition-all shadow-lg">Buy Now</button>
              </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default Marketplace;