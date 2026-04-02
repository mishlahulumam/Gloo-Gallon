import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'

import useAuthStore from './store/authStore'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AdminLayout from './components/layout/AdminLayout'
import CustomerLayout from './components/layout/CustomerLayout'

import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'

import AdminDashboard from './pages/admin/DashboardPage'
import AdminOrders from './pages/admin/OrdersPage'
import AdminProducts from './pages/admin/ProductsPage'
import AdminStock from './pages/admin/StockPage'
import AdminCustomers from './pages/admin/CustomersPage'
import AdminDrivers from './pages/admin/DriversPage'
import AdminDeliveries from './pages/admin/DeliveriesPage'
import AdminPayments from './pages/admin/PaymentsPage'
import AdminReports from './pages/admin/ReportsPage'

import CustomerHome from './pages/customer/HomePage'
import CustomerOrders from './pages/customer/OrdersPage'
import CustomerOrderDetail from './pages/customer/OrderDetailPage'
import CustomerPayment from './pages/customer/PaymentPage'
import CustomerSubscriptions from './pages/customer/SubscriptionsPage'
import CustomerAddresses from './pages/customer/AddressesPage'
import CustomerProfile from './pages/customer/ProfilePage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
})

function AppRoutes() {
  const { isAuthenticated, user, fetchProfile } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchProfile()
    }
  }, [isAuthenticated, user, fetchProfile])

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated && user
          ? <Navigate to={user.role === 'admin' ? '/admin' : '/customer'} replace />
          : <LoginPage />
      } />
      <Route path="/register" element={
        isAuthenticated && user
          ? <Navigate to="/customer" replace />
          : <RegisterPage />
      } />

      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="stock" element={<AdminStock />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="drivers" element={<AdminDrivers />} />
        <Route path="deliveries" element={<AdminDeliveries />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="reports" element={<AdminReports />} />
      </Route>

      <Route path="/customer" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerLayout />
        </ProtectedRoute>
      }>
        <Route index element={<CustomerHome />} />
        <Route path="orders" element={<CustomerOrders />} />
        <Route path="orders/:id" element={<CustomerOrderDetail />} />
        <Route path="orders/:id/pay" element={<CustomerPayment />} />
        <Route path="subscriptions" element={<CustomerSubscriptions />} />
        <Route path="addresses" element={<CustomerAddresses />} />
        <Route path="profile" element={<CustomerProfile />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
