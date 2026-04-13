import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Layouts
import PublicLayout from './components/layout/PublicLayout'
import DashboardLayout from './components/layout/DashboardLayout'

// Auth Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

// Public Pages
import LandingPage from './pages/LandingPage'

// User Pages
import UserDashboard from './pages/user/Dashboard'
import NewRequest from './pages/user/NewRequest'
import MyRequests from './pages/user/MyRequests'
import RequestDetail from './pages/user/RequestDetail'
import Payments from './pages/user/Payments'
import Complaints from './pages/user/Complaints'
import Profile from './pages/user/Profile'
import Notifications from './pages/user/Notifications'

// Collector Pages
import CollectorDashboard from './pages/collector/Dashboard'
import CollectorTasks from './pages/collector/Tasks'
import TaskDetail from './pages/collector/TaskDetail'

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminRequests from './pages/admin/Requests'
import AdminCategories from './pages/admin/Categories'
import AdminComplaints from './pages/admin/Complaints'
import AdminReports from './pages/admin/Reports'

// Guards
function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="w-8 h-8 border-4 border-[#1A8A3C] border-t-transparent rounded-full spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />
    if (user.role === 'collector') return <Navigate to="/collector" replace />
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
      </Route>

      {/* Auth */}
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* User */}
      <Route path="/dashboard" element={<PrivateRoute roles={['user']}><DashboardLayout role="user" /></PrivateRoute>}>
        <Route index element={<UserDashboard />} />
        <Route path="new-request" element={<NewRequest />} />
        <Route path="requests" element={<MyRequests />} />
        <Route path="requests/:uuid" element={<RequestDetail />} />
        <Route path="payments" element={<Payments />} />
        <Route path="complaints" element={<Complaints />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Collector */}
      <Route path="/collector" element={<PrivateRoute roles={['collector']}><DashboardLayout role="collector" /></PrivateRoute>}>
        <Route index element={<CollectorDashboard />} />
        <Route path="tasks" element={<CollectorTasks />} />
        <Route path="tasks/:uuid" element={<TaskDetail />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<PrivateRoute roles={['admin']}><DashboardLayout role="admin" /></PrivateRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="requests" element={<AdminRequests />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="complaints" element={<AdminComplaints />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
