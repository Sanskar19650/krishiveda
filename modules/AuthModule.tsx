import React, { useState } from "react";
import { Language, translations } from "../translations";
import { UserRole } from "../types";
import { useNavigate } from "react-router-dom";

/* 🔥 Firebase */
import { auth, db } from "../firebase/firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

/* ============================
   ADMIN CONFIG
============================ */
const ADMIN_EMAILS = ["adminkrishiveda@gmail.com"];

interface AuthModuleProps {
  lang: Language;
  onLogin: (user: any) => void;
}

const AuthModule: React.FC<AuthModuleProps> = ({ lang, onLogin }) => {
  const t = translations[lang];
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>("FARMER");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    fullName: "",
    identifier: "", 
    phone: "",      
    email: "",      
    password: "",
    farmArea: "",
    areaUnit: "Acres",
    address: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;

    if (isLogin) {
      if (!formData.identifier.trim()) {
        newErrors.identifier = "Email or Phone is required";
      }
    } else {
      if (formData.fullName.trim().length < 3) newErrors.fullName = "Name too short";
      if (!phoneRegex.test(formData.phone)) newErrors.phone = "Enter a valid 10-digit phone";
      if (!emailRegex.test(formData.email)) newErrors.email = "Enter a valid email address";
      if (role === "FARMER" && (!formData.farmArea || Number(formData.farmArea) <= 0)) {
        newErrors.farmArea = "Enter a valid area";
      }
    }
    if (formData.password.length < 6) newErrors.password = "Password must be 6+ characters";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resolveLoginEmail = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.includes("@")) return trimmed;
    if (/^\d{10}$/.test(trimmed)) return `${trimmed}@krishiveda.com`;
    return trimmed; 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (isLogin) {
        const targetEmail = resolveLoginEmail(formData.identifier);
        const cred = await signInWithEmailAndPassword(auth, targetEmail, formData.password);
        
        const userRef = doc(db, "users", cred.user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists() && ADMIN_EMAILS.includes(targetEmail)) {
          const adminData = { uid: cred.user.uid, email: targetEmail, role: "ADMIN", status: "ACTIVE" };
          await setDoc(userRef, adminData);
          onLogin(adminData);
          return;
        }

        if (!snap.exists()) throw new Error("Database record missing.");
        
        // ✅ CRITICAL: Pass the Auth UID to the user object
        onLogin({ ...snap.data(), uid: cred.user.uid });
      } 
      else {
        const cred = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);

        const userData = {
          uid: cred.user.uid, // ✅ CRITICAL
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email.trim(),
          role,
          status: "ACTIVE",
          farmArea: role === "FARMER" ? formData.farmArea : "",
          areaUnit: role === "FARMER" ? formData.areaUnit : "",
          address: formData.address,
          createdAt: serverTimestamp(),
        };

        await setDoc(doc(db, "users", cred.user.uid), userData);
        onLogin(userData);
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  const ErrorMsg = ({ name }: { name: string }) => 
    errors[name] ? <p className="text-red-500 text-xs mt-1 ml-2 font-bold">{errors[name]}</p> : null;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-[3rem] shadow-2xl border overflow-hidden">
        <div className="p-10 text-center bg-white border-b">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl shadow-lg">🚜</div>
          <h2 className="text-3xl font-black text-stone-900">{isLogin ? t.login : t.register}</h2>
        </div>

        <div className="p-10">
          <div className="flex justify-center mb-10 bg-stone-100 p-1.5 rounded-2xl">
              <button type="button" onClick={() => setIsLogin(true)} className={`flex-1 py-3 text-xs font-black uppercase rounded-xl ${isLogin ? "bg-white shadow-md text-emerald-600" : "text-stone-400"}`}>{t.login}</button>
              <button type="button" onClick={() => setIsLogin(false)} className={`flex-1 py-3 text-xs font-black uppercase rounded-xl ${!isLogin ? "bg-white shadow-md text-emerald-600" : "text-stone-400"}`}>{t.register}</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <input type="text" name="fullName" placeholder="Full Name" value={formData.fullName} onChange={handleChange} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl outline-none" />
                <ErrorMsg name="fullName" />
                <input type="tel" name="phone" placeholder="Phone" value={formData.phone} onChange={handleChange} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl outline-none" />
                <ErrorMsg name="phone" />
                <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl outline-none" />
                <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold">
                  <option value="FARMER">Farmer</option>
                  <option value="BUYER">Buyer</option>
                </select>
                <textarea name="address" placeholder="Address" value={formData.address} onChange={handleChange} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl resize-none" />
              </>
            )}

            {isLogin && (
              <input type="text" name="identifier" placeholder="Phone or Email" value={formData.identifier} onChange={handleChange} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl outline-none" />
            )}

            <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl outline-none" />
            <button type="submit" className="w-full py-5 bg-stone-900 text-white font-black rounded-[1.5rem] uppercase tracking-widest hover:bg-emerald-700 transition-all">
              {isLogin ? t.login : t.createAccount}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthModule;