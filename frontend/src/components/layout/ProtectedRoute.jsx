import { Navigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const redirectTo = user.role === 'admin' ? '/admin' : '/customer'
    return <Navigate to={redirectTo} replace />
  }

  return children
}
