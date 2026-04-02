import api from './api'

export const orderService = {
  getAll: (params) => api.get('/admin/orders', { params }),
  getById: (id) => api.get(`/admin/orders/${id}`),
  updateStatus: (id, data) => api.put(`/admin/orders/${id}/status`, data),

  getMyOrders: (params) => api.get('/customer/orders', { params }),
  create: (data) => api.post('/customer/orders', data),
  cancel: (id) => api.put(`/customer/orders/${id}/cancel`),
  getOrderDetail: (id) => api.get(`/customer/orders/${id}`),
}
