import React, { useState } from 'react';
import { Language, translations } from '../translations';
import { UserRole } from '../types';
import { useNavigate } from "react-router-dom";

/* 🔥 Firebase */
import { auth, db } from "../firebase/firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

interface AuthModuleProps {
  lang: Language;
  onLogin: (user: any) => void;
}

const AuthModule: React.FC<AuthModuleProps> = ({ lang, onLogin }) => {
  const t = translations[lang];
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>('FARMER');

  /* Form State (UNCHANGED) */
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    password: '',
    farmArea: '',
    address: ''
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /* 🧾 ROLE-BASED REDIRECT (UPDATED – ADMIN ADDED) */
  const redirectByRole = (userRole: UserRole) => {
    if (userRole === "ADMIN") navigate("/admin");
    else if (userRole === "FARMER") navigate("/farmer");
    else if (userRole === "AGENT") navigate("/agent");
    else navigate("/buyer");
  };

  /* SUBMIT */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    /* Required phone validation */
    if (!/^\d{10}$/.test(formData.phone)) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }

    try {
      /* Backend-only email conversion */
      const email = `${formData.phone}@krishiveda.com`;

      if (isLogin) {
        /* LOGIN */
        const cred = await signInWithEmailAndPassword(
          auth,
          email,
          formData.password
        );

        const snap = await getDoc(doc(db, "users", cred.user.uid));
        const userData = snap.data();

        if (!userData) {
          alert("User profile not found");
          return;
        }

        onLogin(userData);
        redirectByRole(userData.role as UserRole);

      } else {
        /* REGISTER */
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          formData.password
        );

        const userData = {
          ...formData,
          role,
          status: "ACTIVE",
          createdAt: new Date(),
        };

        await setDoc(doc(db, "users", cred.user.uid), userData);

        onLogin(userData);
        redirectByRole(role);
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 animate-fade-in-up">
      <div className="w-full max-w-lg bg-white rounded-[3rem] shadow-2xl border">

        {/* Header */}
        <div className="p-10 text-center border-b">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl mx-auto mb-6 flex items-center justify-center text-3xl">
            🚜
          </div>
          <h2 className="text-3xl font-black">{t.title}</h2>
        </div>

        {/* Form */}
        <div className="p-10">
          <div className="flex justify-center mb-8">
            <div className="bg-stone-100 p-1 rounded-xl flex">
              <button
                onClick={() => setIsLogin(true)}
                className={`px-6 py-2 text-xs font-black uppercase ${
                  isLogin ? "bg-white shadow rounded-lg" : "text-stone-400"
                }`}
              >
                {t.login}
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`px-6 py-2 text-xs font-black uppercase ${
                  !isLogin ? "bg-white shadow rounded-lg" : "text-stone-400"
                }`}
              >
                {t.register}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <input
                type="text"
                name="fullName"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full p-4 border rounded-xl"
              />
            )}

            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full p-4 border rounded-xl"
            />

            {!isLogin && (
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full p-4 border rounded-xl"
              >
                <option value="FARMER">{t.roleFarmer}</option>
                <option value="AGENT">{t.roleAgent}</option>
                <option value="BUYER">{t.roleBuyer}</option>
                <option value="ADMIN">Admin</option>
              </select>
            )}

            {!isLogin && role === "FARMER" && (
              <input
                type="number"
                name="farmArea"
                placeholder="Farm Area (Acres)"
                value={formData.farmArea}
                onChange={handleChange}
                required
                className="w-full p-4 border rounded-xl"
              />
            )}

            {!isLogin && (
              <textarea
                name="address"
                rows={2}
                placeholder="Address"
                value={formData.address}
                onChange={handleChange}
                required
                className="w-full p-4 border rounded-xl"
              />
            )}

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full p-4 border rounded-xl"
            />

            <button
              type="submit"
              className="w-full py-5 bg-stone-900 text-white font-black rounded-2xl uppercase tracking-widest"
            >
              {isLogin ? t.login : t.createAccount}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthModule;
