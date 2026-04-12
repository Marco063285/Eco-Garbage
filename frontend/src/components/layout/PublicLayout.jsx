import { useState, useEffect } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { Leaf, Menu, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function PublicLayout() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const dashLink = user?.role === 'admin' ? '/admin' : user?.role === 'collector' ? '/collector' : '/dashboard'

  const navLinks = [
    { label: 'Accueil', to: '/' },
    { label: 'Services', to: '/#services' },
    { label: 'Tarifs', to: '/#pricing' },
    { label: 'À propos', to: '/#about' },
  ]

  return (
    <div className="min-h-screen bg-[#f7faf8]">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-green-sm' : 'bg-transparent'}`}>
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
                <Link to={l.to} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-[#1A8A3C] hover:bg-[#E8F5EE] transition-all">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <button onClick={() => navigate(dashLink)} className="btn-primary">
                Mon tableau de bord
              </button>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">Connexion</Link>
                <Link to="/register" className="btn-primary">Commencer</Link>
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
              <Link key={l.label} to={l.to} onClick={() => setMobileOpen(false)}
                className="py-2.5 px-4 rounded-xl text-sm font-medium text-gray-600 hover:bg-[#E8F5EE] hover:text-[#1A8A3C]">
                {l.label}
              </Link>
            ))}
            <div className="flex gap-2 mt-2">
              <Link to="/login" className="btn-outline flex-1 justify-center" onClick={() => setMobileOpen(false)}>Connexion</Link>
              <Link to="/register" className="btn-primary flex-1 justify-center" onClick={() => setMobileOpen(false)}>S'inscrire</Link>
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
              <p className="text-sm text-white/50 leading-relaxed">Collecte de déchets à la demande. Ensemble, construisons des communautés plus propres.</p>
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
            <p>© 2026 EcoGarbage. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
