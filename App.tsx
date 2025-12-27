
import React, { useState } from 'react';
import { translations, Language } from './translations';
import { UserRole } from './types';
import Header from './components/Header';
import SowingModule from './modules/SowingModule';
import SoilTesting from './modules/SoilTesting';
import Marketplace from './modules/Marketplace';
import LiveRates from './modules/LiveRates';
import AdminPanel from './modules/AdminPanel';
import ProfileModule from './modules/ProfileModule';
import AuthModule from './modules/AuthModule';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('english');
  const [user, setUser] = useState<any>(null); // State to store logged-in user
  const [role, setRole] = useState<UserRole>('FARMER');
  const [activeTab, setActiveTab] = useState<string>('home');
  const t = translations[lang];

  const handleLogin = (userData: any) => {
    setUser(userData);
    setRole(userData.role);
    setActiveTab('home');
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('home');
  };

  const renderContent = () => {
    if (!user) {
      return <AuthModule lang={lang} onLogin={handleLogin} />;
    }

    switch (activeTab) {
      case 'home':
        return (
          <div className="flex flex-col items-center justify-center py-16 px-4 max-w-7xl mx-auto animate-fade-in-up">
            <div className="mb-16 text-center space-y-4">
              <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-black rounded-full tracking-widest uppercase">
                Welcome back, {user.fullName || user.phone}!
              </span>
              <h1 className="text-5xl md:text-7xl font-extrabold text-stone-900 tracking-tight leading-[1.1]">
                Revolutionizing <span className="text-emerald-600">Agriculture</span>
              </h1>
              <p className="text-lg md:text-xl text-stone-500 max-w-2xl mx-auto font-medium leading-relaxed">
                Integrated digital ecosystem for farmers. Record sowing, test soil, 
                and trade products with the power of Artificial Intelligence.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
              {[
                { id: 'sowing', title: t.navSowing, icon: '🌱', color: 'from-emerald-500 to-teal-600', desc: 'AI-Powered Sowing Insights' },
                { id: 'soil', title: t.navSoil, icon: '🧪', color: 'from-amber-500 to-orange-600', desc: 'Expert Soil Analysis' },
                { id: 'market', title: t.navMarket, icon: '🛒', color: 'from-sky-500 to-blue-600', desc: 'Direct-to-Buyer Market' },
                { id: 'rates', title: t.navRates, icon: '📈', color: 'from-indigo-500 to-violet-600', desc: 'Real-time Mandi Rates' }
              ].map(card => (
                <button
                  key={card.id}
                  onClick={() => setActiveTab(card.id)}
                  className="group relative flex flex-col items-start p-8 rounded-[2rem] bg-white border border-stone-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 text-left overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-10 transition-opacity rounded-bl-full`} />
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center text-2xl shadow-lg mb-6 group-hover:rotate-12 transition-transform duration-500`}>
                    {card.icon}
                  </div>
                  <h3 className="text-xl font-extrabold text-stone-800 mb-2">{card.title}</h3>
                  <p className="text-sm text-stone-500 font-medium leading-snug">{card.desc}</p>
                  <div className="mt-6 flex items-center text-stone-900 font-bold text-xs uppercase tracking-widest gap-2">
                    Explore Module
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      case 'sowing': return <SowingModule lang={lang} />;
      case 'soil': return <SoilTesting lang={lang} user={user} />;
      case 'market': return <Marketplace lang={lang} role={role} user={user} />;
      case 'rates': return <LiveRates lang={lang} />;
      case 'admin': return <AdminPanel lang={lang} />;
      case 'profile': return <ProfileModule lang={lang} role={role} onLogout={handleLogout} />;
      default: return <div className="p-8">Coming Soon</div>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-emerald-200 selection:text-emerald-900">
      <Header 
        lang={lang} 
        setLang={setLang} 
        role={role} 
        setRole={setRole} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isLoggedIn={!!user}
        onLogout={handleLogout}
      />
      <main className="flex-grow">
        {renderContent()}
      </main>
      <footer className="py-12 px-4 border-t border-stone-200 bg-white">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center text-white text-sm">🚜</div>
             <span className="font-bold text-stone-900">Krishivedaḥ (कृषिवेदः)</span>
          </div>
          <div className="text-stone-400 text-sm font-medium">
            &copy; 2024 • Built for the Farmers of Bharat
          </div>
          <div className="flex gap-4 text-stone-400 text-sm font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-emerald-600">Privacy</a>
            <a href="#" className="hover:text-emerald-600">Terms</a>
            <a href="#" className="hover:text-emerald-600">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
