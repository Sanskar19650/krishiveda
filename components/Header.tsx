import React, { useState } from 'react';
import { Language, translations } from '../translations';
import { UserRole } from '../types';

interface HeaderProps {
  lang: Language;
  setLang: (l: Language) => void;
  role: UserRole;
  setRole: (r: UserRole) => void;
  activeTab: string;
  setActiveTab: (t: string) => void;
  isLoggedIn: boolean;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({
  lang,
  setLang,
  role,
  setRole,
  activeTab,
  setActiveTab,
  isLoggedIn,
  onLogout
}) => {
  const t = translations[lang];
  const [open, setOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const navItems = [
    { id: 'home', label: t.navHome, icon: '🏠' },
    { id: 'sowing', label: t.navSowing, icon: '🌱' },
    { id: 'soil', label: t.navSoil, icon: '🧪' },
    { id: 'market', label: t.navMarket, icon: '🛒' },
    { id: 'rates', label: t.navRates, icon: '📈' },
    ...(role === 'ADMIN'
      ? [{ id: 'admin', label: t.navAdmin, icon: '⚙️' }]
      : []),
    { id: 'profile', label: t.navProfile, icon: '👤' }
  ];

  /* Swipe handlers */
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    if (e.touches[0].clientX - touchStartX > 80) {
      setOpen(false);
      setTouchStartX(null);
    }
  };

  return (
    <>
      {/* ================= TOP NAVBAR ================= */}
      <header className="sticky top-0 z-50 glass border-b border-white/20 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">

            {/* LEFT SECTION (TOGGLE + LOGO) */}
            <div className="flex items-center gap-3">
              {isLoggedIn && (
                <button
                  onClick={() => setOpen(true)}
                  className="lg:hidden text-2xl"
                  aria-label="Open Menu"
                >
                  ☰
                </button>
              )}

              <div
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setActiveTab('home')}
              >
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
                  <span className="text-xl">🚜</span>
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-stone-900">
                    {t.title}
                  </h1>
                  <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold">
                    Smart Agriculture
                  </p>
                </div>
              </div>
            </div>

            {/* DESKTOP NAV */}
            {isLoggedIn && (
              <nav className="hidden lg:flex items-center space-x-1 bg-stone-100/50 p-1 rounded-full border border-stone-200/50">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold ${
                      activeTab === item.id
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-stone-500 hover:bg-white/50'
                    }`}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </nav>
            )}

            {/* RIGHT SECTION */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-xl border">
                <span className="text-xs font-bold text-stone-400">LANG</span>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Language)}
                  className="bg-transparent text-sm font-bold outline-none"
                >
                  <option value="english">EN</option>
                  <option value="hindi">हिन्दी</option>
                  <option value="marathi">मराठी</option>
                </select>
              </div>

              {isLoggedIn && (
                <button
                  onClick={onLogout}
                  className="hidden lg:block px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-black uppercase"
                >
                  {t.logout}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ================= MOBILE SIDEBAR ================= */}
      {open && (
        <div className="fixed inset-0 z-50 flex">

          {/* OVERLAY */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* SIDEBAR */}
          <div
            className="relative w-72 bg-white h-full shadow-xl p-6 flex flex-col"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-lg">Menu</h2>
              <button onClick={() => setOpen(false)}>✖</button>
            </div>

            <div className="flex flex-col gap-2">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold ${
                    activeTab === item.id
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'hover:bg-stone-100'
                  }`}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t">
              <button
                onClick={() => {
                  onLogout();
                  setOpen(false);
                }}
                className="w-full py-3 bg-rose-100 text-rose-600 rounded-xl font-black uppercase"
              >
                {t.logout}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
