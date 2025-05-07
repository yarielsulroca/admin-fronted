import Axios from 'axios'

const axios = Axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    withCredentials: true
})

// Interceptor para agregar el token a las peticiones
axios.interceptors.request.use(config => {
    const token = localStorage.getItem('auth_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Interceptor para manejar errores de autenticación
axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token')
            if (window.location.pathname !== '/login') {
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
    
)
//get clients
export const getClients = async () => {
    const response = await axios.get('/api/clients')
    return response.data
}

//get headquarters
export const getHeadquarters = async () => {
    const response = await axios.get('/api/headquarters')
    return response.data
}


export default axios
