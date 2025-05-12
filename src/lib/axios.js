import Axios from 'axios'

const axiosInstance = Axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    withCredentials: true
})

// Interceptor para agregar el token a las peticiones
axiosInstance.interceptors.request.use(config => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
    }
    return config
})

// Lista de rutas públicas que no deben redirigir al login
const publicRoutes = [
    '/websocket-public',
    '/api/headquarters',
    '/api/clients',
    '/api/clients/disconnect'
]

// Función para verificar si una ruta es pública
const isPublicRoute = (path) => {
    return publicRoutes.some(route => {
        // Si la ruta termina con un ID numérico, considerarla pública
        if (route === '/api/clients' && /^\/api\/clients\/\d+$/.test(path)) {
            return true
        }
        return path.startsWith(route)
    })
}

// Interceptor para manejar errores de autenticación
axiosInstance.interceptors.response.use(
    response => response,
    error => {
        if (typeof window !== 'undefined') {
            if (error.response?.status === 401) {
                localStorage.removeItem('auth_token')
                const currentPath = window.location.pathname
                // Solo redirigir si no es una ruta pública
                if (!isPublicRoute(currentPath) && currentPath !== '/login') {
                    window.location.href = '/login'
                }
            }
        }
        return Promise.reject(error)
    }
)

//get clients
export const getClients = async () => {
    const response = await axiosInstance.get('/api/clients')
    return response.data
}

//get headquarters
export const getHeadquarters = async () => {
    const response = await axiosInstance.get('/api/headquarters')
    return response.data
}

export default axiosInstance
