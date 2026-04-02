import api from './api'

export const addressService = {
  getMyAddresses: () => api.get('/customer/addresses'),
  create: (data) => api.post('/customer/addresses', data),
  update: (id, data) => api.put(`/customer/addresses/${id}`, data),
  delete: (id) => api.delete(`/customer/addresses/${id}`),
  setDefault: (id) => api.put(`/customer/addresses/${id}/default`),
}
