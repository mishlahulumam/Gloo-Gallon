import api from './api'

export const customerService = {
  getAll: (params) => api.get('/admin/customers', { params }),
  getById: (id) => api.get(`/admin/customers/${id}`),
  getGallonLoans: (id) => api.get(`/admin/customers/${id}/gallon-loans`),
}
