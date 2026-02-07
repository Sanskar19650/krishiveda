import React, { useEffect, useState } from 'react';
import { Language, translations } from '../translations';
import { UserRole } from '../types';

/* Firebase integration */
import { auth, db } from "../firebase/firebaseConfig";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

interface ProfileModuleProps {
  lang: Language;
  role: UserRole;
  onLogout: () => void;
}

const ProfileModule: React.FC<ProfileModuleProps> = ({ lang, role, onLogout }) => {
  const t = translations[lang];
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch dynamic user data from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          // Logic: Look for a document in 'users' collection with the UID
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            console.warn("No profile found in Firestore for this user.");
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.warn("Firebase logout failed:", error);
    } finally {
      onLogout();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const FarmerProfile = () => (
    <div className="space-y-8 animate-fade-in-up">
      <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl border border-stone-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 opacity-5 rounded-bl-full" />
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-32 h-32 bg-stone-100 rounded-[2rem] flex items-center justify-center text-5xl shadow-inner border-4 border-white">
            {userData?.profileEmoji || "👨‍🌾"}
          </div>
          <div className="flex-grow space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-black text-stone-900">{userData?.fullName || "User Name"}</h2>
                <p className="text-emerald-600 font-bold uppercase tracking-widest text-xs">
                  {t.roleFarmer} • ID: {userData?.farmerId || "N/A"}
                </p>
              </div>
              <button onClick={handleLogout} className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 hover:bg-rose-100 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-50">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{t.phoneNumber}</p>
                <p className="font-bold text-stone-800">{userData?.phone || "No phone linked"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{t.address}</p>
                <p className="font-bold text-stone-800">{userData?.address || "No address provided"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-emerald-600 p-8 rounded-[2rem] text-white shadow-lg shadow-emerald-200">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">{t.farmArea}</p>
          <p className="text-4xl font-black">{userData?.farmArea || "0"} <span className="text-lg">Acres</span></p>
          <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold opacity-70">Primary Crop</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase">{userData?.primaryCrop || "None"}</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-sm col-span-2">
          <h3 className="text-xl font-black text-stone-900 mb-6">{t.activityStats}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Authorized Crops", val: userData?.stats?.crops || "0", color: "text-emerald-600" },
              { label: "Active Listings", val: userData?.stats?.listings || "0", color: "text-sky-600" },
              { label: "Soil Health", val: userData?.stats?.soil || "N/A", color: "text-amber-600" },
              { label: "Total Earnings", val: `₹${userData?.stats?.earnings || "0"}`, color: "text-stone-900" },
            ].map((stat, i) => (
              <div key={i} className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-tighter mb-1">{stat.label}</p>
                <p className={`text-xl font-black ${stat.color}`}>{stat.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const AgentProfile = () => (
    <div className="space-y-8 animate-fade-in-up">
      <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl border border-stone-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500 opacity-5 rounded-bl-full" />
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-32 h-32 bg-sky-50 rounded-[2rem] flex items-center justify-center text-5xl shadow-inner border-4 border-white">
            {userData?.profileEmoji || "🚚"}
          </div>
          <div className="flex-grow space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-black text-stone-900">{userData?.fullName || "Agent Name"}</h2>
                <p className="text-sky-600 font-bold uppercase tracking-widest text-xs">Field Executive • ID: {userData?.agentId || "N/A"}</p>
              </div>
              <button onClick={handleLogout} className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 hover:bg-rose-100 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-stone-50">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{t.phoneNumber}</p>
                <p className="font-bold text-stone-800">{userData?.phone || "No phone"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Vehicle Number</p>
                <p className="font-bold text-stone-800">{userData?.vehicleNumber || "Not Assigned"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Operating Area</p>
                <p className="font-bold text-stone-800">{userData?.operatingArea || "Not Set"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-stone-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
          <h3 className="text-xl font-black mb-6">Agent Performance</h3>
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Completed Tasks</p>
                <p className="text-4xl font-black">{userData?.performance?.tasksCompleted || "0"}</p>
              </div>
              <span className="text-emerald-400 font-black text-sm mb-1">+{userData?.performance?.weeklyGain || "0"} this week</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                 <span className="opacity-50">Rating</span>
                 <span>{userData?.performance?.rating || "0.0"} / 5.0</span>
              </div>
              <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${(userData?.performance?.rating / 5) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm">
          <h3 className="text-xl font-black text-stone-900 mb-6">Assigned Queue</h3>
          <div className="space-y-4">
             {userData?.assignedTasks?.length > 0 ? (
               userData.assignedTasks.map((task: any, i: number) => (
                 <div key={i} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100 hover:border-sky-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${task.status === 'DONE' ? 'bg-emerald-100 text-emerald-600' : 'bg-sky-100 text-sky-600'}`}>
                        {task.type === 'Soil Pickup' ? '🧪' : '📦'}
                      </div>
                      <div>
                        <p className="font-black text-stone-800">{task.type}</p>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{task.loc}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-[10px] font-black tracking-[0.2em] uppercase ${task.status === 'DONE' ? 'text-emerald-600' : 'text-sky-600'}`}>{task.status}</p>
                      <p className="text-xs font-bold text-stone-500">{task.time}</p>
                    </div>
                 </div>
               ))
             ) : (
               <p className="text-stone-400 text-sm italic">No tasks currently assigned.</p>
             )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto">
      {role === 'FARMER' && <FarmerProfile />}
      {role === 'AGENT' && <AgentProfile />}
      {role !== 'FARMER' && role !== 'AGENT' && <GenericProfile lang={lang} t={t} onLogout={handleLogout} />}
    </div>
  );
};

const GenericProfile = ({ lang, t, onLogout }: any) => (
  <div className="p-20 text-center space-y-4">
     <div className="text-6xl">👋</div>
     <h2 className="text-3xl font-black text-stone-900">{translations[lang].roleBuyer} Profile</h2>
     <p className="text-stone-500 font-medium">Order history coming soon.</p>
     <button onClick={onLogout} className="text-rose-600 font-bold uppercase tracking-widest text-xs border border-rose-200 px-6 py-2 rounded-full hover:bg-rose-50 transition-colors">
       {t.logout}
     </button>
  </div>
);

export default ProfileModule;