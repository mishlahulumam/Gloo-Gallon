import api from './api'

export const subscriptionService = {
  getMy: () => api.get('/customer/subscriptions'),
  create: (data) => api.post('/customer/subscriptions', data),
  update: (id, data) => api.put(`/customer/subscriptions/${id}`, data),
  cancel: (id) => api.put(`/customer/subscriptions/${id}/cancel`),
  getAll: (params) => api.get('/admin/subscriptions', { params }),
}
