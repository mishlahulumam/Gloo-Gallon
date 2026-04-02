import api from './api'

export const deliveryService = {
  getAll: (params) => api.get('/admin/deliveries', { params }),
  assign: (data) => api.post('/admin/deliveries', data),
  updateStatus: (id, data) => api.put(`/admin/deliveries/${id}/status`, data),
}
