import api from './api'

export const stockService = {
  getAll: () => api.get('/admin/stock'),
  getByProduct: (productId) => api.get(`/admin/stock/${productId}`),
  update: (productId, data) => api.put(`/admin/stock/${productId}`, data),
  getLogs: (productId, params) => api.get(`/admin/stock/${productId}/logs`, { params }),
}
