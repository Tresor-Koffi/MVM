import axios from 'axios';

const api = axios.create({ baseURL: process.env.REACT_APP_API_URL + '/api' || '/api' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mvm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mvm_token');
      localStorage.removeItem('mvm_user');
      window.location.href = '/admin/login';
    }
    return Promise.reject(err);
  }
);

export default api;
