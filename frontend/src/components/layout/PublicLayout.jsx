import { useState, useEffect } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { Leaf, Menu, X, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

export default function PublicLayout() {
  const { t, i18n } = useTranslation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const dashLink = user?.role === 'admin' ? '/admin' : user?.role === 'collector' ? '/collector' : '/dashboard'
  const currentLang = i18n.language?.startsWith('en') ? 'EN' : 'FR'

  const navLinks = [
    { label: i18n.language?.startsWith('en') ? 'Home' : 'Accueil',    hash: null },
    { label: i18n.language?.startsWith('en') ? 'Services' : 'Services', hash: 'services' },
    { label: i18n.language?.startsWith('en') ? 'Pricing' : 'Tarifs',  hash: 'pricing' },
    { label: i18n.language?.startsWith('en') ? 'About' : 'À propos',  hash: 'about' },
  ]

  const handleNavClick = (e, hash) => {
    e.preventDefault()
    setMobileOpen(false)
    if (!hash) {
      location.pathname === '/' ? window.scrollTo({ top: 0, behavior: 'smooth' }) : navigate('/')
      return
    }
    const scrollToEl = () => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
    if (location.pathname === '/') scrollToEl()
    else { navigate('/'); setTimeout(scrollToEl, 150) }
  }

  const baseNav = scrolled
    ? 'bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-green-sm'
    : 'bg-transparent'

  return (
    <div className="min-h-screen bg-[#f7faf8]">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${baseNav}`}>
        <div className="max-w-6xl mx-auto px-6 h-[72px] flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-xl text-gray-900">
            <div className="w-9 h-9 bg-[#1A8A3C] rounded-xl flex items-center justify-center">
              <Leaf size={18} className="text-white" />
            </div>
            Eco<span className="text-[#1A8A3C]">Garbage</span>
          </Link>

          {/* Desktop nav */}
          <ul className="hidden md:flex items-center gap-1 ml-auto">
            {navLinks.map(l => (
              <li key={l.label}>
                <button onClick={(e) => handleNavClick(e, l.hash)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-[#1A8A3C] hover:bg-[#E8F5EE] transition-all">
                  {l.label}
                </button>
              </li>
            ))}
          </ul>

          {/* Controls */}
          <div className="hidden md:flex items-center gap-2">
            {/* Lang switcher */}
            <div className="relative">
              <button onClick={() => setLangOpen(o => !o)}
                className="flex items-center gap-1.5 p-2 rounded-xl text-gray-500 hover:bg-[#E8F5EE] hover:text-[#1A8A3C] transition-all text-xs font-bold">
                <Languages size={16} />{currentLang}
              </button>
              {langOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-32 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
                    {[{ code: 'fr', label: '???? Français' }, { code: 'en', label: '???? English' }].map(({ code, label }) => (
                      <button key={code} onClick={() => { i18n.changeLanguage(code); setLangOpen(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors
                          ${i18n.language?.startsWith(code) ? 'bg-[#E8F5EE] text-[#1A8A3C]' : 'text-gray-700 hover:bg-gray-50'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {user ? (
              <button onClick={() => navigate(dashLink)} className="btn-primary">
                {i18n.language?.startsWith('en') ? 'My dashboard' : 'Mon tableau de bord'}
              </button>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">{t('auth.login.submit')}</Link>
                <Link to="/register" className="btn-primary">{t('landing.hero.cta')}</Link>
              </>
            )}
          </div>

          <button className="md:hidden ml-auto p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 flex flex-col gap-2">
            {navLinks.map(l => (
              <button key={l.label} onClick={(e) => handleNavClick(e, l.hash)}
                className="py-2.5 px-4 rounded-xl text-sm font-medium text-gray-600 hover:bg-[#E8F5EE] hover:text-[#1A8A3C] text-left">
                {l.label}
              </button>
            ))}
            <div className="flex items-center gap-3 px-4 py-2">
              <button onClick={() => i18n.changeLanguage(i18n.language?.startsWith('en') ? 'fr' : 'en')}
                className="flex items-center gap-1.5 text-sm font-bold text-gray-500">
                <Languages size={16} /> {currentLang}
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <Link to="/login" className="btn-outline flex-1 justify-center" onClick={() => setMobileOpen(false)}>
                {t('auth.login.submit')}
              </Link>
              <Link to="/register" className="btn-primary flex-1 justify-center" onClick={() => setMobileOpen(false)}>
                {t('auth.register.submit')}
              </Link>
            </div>
          </div>
        )}
      </nav>

      <Outlet />

      {/* Footer */}
      <footer className="bg-gray-900 text-white pt-16 pb-6">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
            <div>
              <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg mb-3">
                <div className="w-8 h-8 bg-[#1A8A3C] rounded-lg flex items-center justify-center">
                  <Leaf size={16} className="text-white" />
                </div>
                EcoGarbage
              </Link>
              <p className="text-sm text-white/50 leading-relaxed">
                {t('landing.hero.desc')}
              </p>
            </div>
            {[
              { title: 'Services', links: ['Collecte immédiate','Collecte planifiée','Abonnement','Entreprises'] },
              { title: 'Plateforme', links: ['À propos','Tarifs','Contact','FAQ'] },
              { title: 'Contact', links: ['hello@eco-garbage.com','+237 6XX XXX XXX','Douala, Cameroun'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold mb-3">{col.title}</h4>
                <ul className="flex flex-col gap-2">
                  {col.links.map(l => (
                    <li key={l} className="text-sm text-white/45 hover:text-white/80 transition-colors cursor-pointer">{l}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 text-xs text-white/30">
            <p>© 2026 EcoGarbage. {i18n.language?.startsWith('en') ? 'All rights reserved.' : 'Tous droits réservés.'}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
