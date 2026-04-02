import api from './api'

export const driverService = {
  getAll: (params) => api.get('/admin/drivers', { params }),
  getById: (id) => api.get(`/admin/drivers/${id}`),
  create: (data) => api.post('/admin/drivers', data),
  update: (id, data) => api.put(`/admin/drivers/${id}`, data),
  delete: (id) => api.delete(`/admin/drivers/${id}`),
}
