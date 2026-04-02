import api from './api'

export const paymentService = {
  initiate: (data) => api.post('/customer/payments/initiate', data),
  getHistory: (params) => api.get('/admin/payments', { params }),
  confirmManual: (id) => api.put(`/admin/payments/${id}/confirm`),
  getMidtransConfig: () => api.get('/config/midtrans'),
}
