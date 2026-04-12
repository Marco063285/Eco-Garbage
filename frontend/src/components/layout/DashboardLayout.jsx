import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import {
  Leaf, LayoutDashboard, Plus, ListOrdered, CreditCard,
  MessageSquare, Bell, Settings, LogOut, Truck, Users,
  BarChart3, Tag, ChevronLeft, ChevronRight, Menu, X
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { notifApi } from '../../services/api'
import toast from 'react-hot-toast'

const NAV = {
  user: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', exact: true },
    { to: '/dashboard/new-request', icon: Plus, label: 'Nouvelle collecte' },
    { to: '/dashboard/requests', icon: ListOrdered, label: 'Mes demandes' },
    { to: '/dashboard/payments', icon: CreditCard, label: 'Paiements' },
    { to: '/dashboard/complaints', icon: MessageSquare, label: 'Réclamations' },
    { to: '/dashboard/notifications', icon: Bell, label: 'Notifications', badge: true },
    { to: '/dashboard/profile', icon: Settings, label: 'Profil' },
  ],
  collector: [
    { to: '/collector', icon: LayoutDashboard, label: 'Tableau de bord', exact: true },
    { to: '/collector/tasks', icon: Truck, label: 'Mes tâches' },
    { to: '/collector/notifications', icon: Bell, label: 'Notifications', badge: true },
    { to: '/collector/profile', icon: Settings, label: 'Profil' },
  ],
  admin: [
    { to: '/admin', icon: LayoutDashboard, label: 'Tableau de bord', exact: true },
    { to: '/admin/users', icon: Users, label: 'Utilisateurs' },
    { to: '/admin/requests', icon: ListOrdered, label: 'Collectes' },
    { to: '/admin/categories', icon: Tag, label: 'Catégories' },
    { to: '/admin/complaints', icon: MessageSquare, label: 'Réclamations' },
    { to: '/admin/reports', icon: BarChart3, label: 'Rapports' },
    { to: '/admin/notifications', icon: Bell, label: 'Notifications', badge: true },
    { to: '/admin/profile', icon: Settings, label: 'Profil' },
  ],
}

const ROLE_LABELS = { user: 'Utilisateur', collector: 'Collecteur', admin: 'Administrateur' }

export default function DashboardLayout({ role }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    notifApi.list().then(r => setUnread(r.data.unreadCount || 0)).catch(() => {})
    const interval = setInterval(() => {
      notifApi.list().then(r => setUnread(r.data.unreadCount || 0)).catch(() => {})
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    logout()
    toast.success('Déconnecté avec succès')
    navigate('/login')
  }

  const navItems = NAV[role] || []
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  const Sidebar = ({ mobile = false }) => (
    <aside className={`
      ${mobile ? 'fixed inset-0 z-50 flex' : `fixed top-0 left-0 h-full z-40 flex flex-col transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[240px]'}`}
    `}>
      {mobile && <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />}
      <div className={`${mobile ? 'relative w-[240px]' : 'w-full'} h-full bg-white border-r border-gray-100 flex flex-col shadow-green-sm`}>
        {/* Brand */}
        <div className={`h-[70px] flex items-center border-b border-gray-50 px-4 gap-3 flex-shrink-0`}>
          <div className="w-9 h-9 bg-[#1A8A3C] rounded-xl flex items-center justify-center flex-shrink-0">
            <Leaf size={18} className="text-white" />
          </div>
          {(!collapsed || mobile) && (
            <span className="font-display font-bold text-gray-900 text-lg">
              Eco<span className="text-[#1A8A3C]">Garbage</span>
            </span>
          )}
        </div>

        {/* User info */}
        {(!collapsed || mobile) && (
          <div className="px-4 py-3 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#E8F5EE] rounded-full flex items-center justify-center text-[#1A8A3C] font-bold text-sm flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-[#1A8A3C] font-medium">{ROLE_LABELS[role]}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''} ${collapsed && !mobile ? 'justify-center px-0' : ''}`
              }
            >
              <div className="relative flex-shrink-0">
                <item.icon size={18} />
                {item.badge && unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
              {(!collapsed || mobile) && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-4 border-t border-gray-50 pt-3">
          <button
            onClick={handleLogout}
            className={`sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-600 ${collapsed && !mobile ? 'justify-center px-0' : ''}`}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {(!collapsed || mobile) && <span>Déconnexion</span>}
          </button>
        </div>

        {/* Collapse button desktop */}
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:border-[#1A8A3C] hover:text-[#1A8A3C] transition-all"
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        )}
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-[#f7faf8] flex">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && <Sidebar mobile />}

      {/* Main */}
      <main className={`flex-1 min-w-0 transition-all duration-300 ${collapsed ? 'md:ml-[72px]' : 'md:ml-[240px]'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100 h-[70px] flex items-center px-6 gap-4">
          <button className="md:hidden p-2 rounded-xl hover:bg-gray-100" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <NavLink to={role === 'admin' ? '/admin/notifications' : role === 'collector' ? '/collector/notifications' : '/dashboard/notifications'}
            className="relative p-2 rounded-xl hover:bg-[#E8F5EE] text-gray-500 hover:text-[#1A8A3C] transition-all">
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </NavLink>
          <div className="flex items-center gap-2.5 pl-3 border-l border-gray-100">
            <div className="w-8 h-8 bg-[#E8F5EE] rounded-full flex items-center justify-center text-[#1A8A3C] font-bold text-xs">
              {initials}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-gray-800 leading-none">{user?.name?.split(' ')[0]}</p>
              <p className="text-xs text-gray-400 mt-0.5">{ROLE_LABELS[role]}</p>
            </div>
          </div>
        </header>

        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
