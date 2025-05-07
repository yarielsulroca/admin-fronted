import useSWR from 'swr'
import axios from '@/lib/axios'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export const useAuth = ({ middleware, redirectIfAuthenticated } = {}) => {
    const router = useRouter()
    const params = useParams()

    const { data: user, error, mutate } = useSWR('/api/user', () =>
        axios
            .get('/api/user')
            .then(res => res.data)
            .catch(error => {
                if (error.response?.status === 401) {
                    localStorage.removeItem('auth_token')
                    return null
                }
                throw error
            }),
    )

    const csrf = () => axios.get('/sanctum/csrf-cookie')

    const register = async ({ setErrors, ...props }) => {
        try {
            setErrors([])
            const response = await axios.post('/api/register', props)
            const { token, user } = response.data

            // Guardar el token en localStorage
            localStorage.setItem('auth_token', token)
            
            // Actualizar el estado del usuario
            await mutate(user)
            
            // Redirigir al dashboard
            router.push('/dashboard')
        } catch (error) {
            if (error.response?.status === 422) {
                setErrors(error.response.data.errors)
            }
        }
    }

    const login = async ({ setErrors, setStatus, ...props }) => {
        try {
            setErrors([])
            setStatus(null)

            const response = await axios.post('/api/login', props)
            const { token, user } = response.data

            // Guardar el token en localStorage
            localStorage.setItem('auth_token', token)
            
            // Actualizar el estado del usuario
            await mutate(user)
            
            // Redirigir al dashboard
            router.push('/dashboard')
        } catch (error) {
            if (error.response?.status === 422) {
                setErrors(error.response.data.errors)
            } else {
                setErrors({ email: ['Credenciales inválidas'] })
            }
        }
    }

    const forgotPassword = async ({ setErrors, setStatus, email }) => {
        await csrf()

        setErrors([])
        setStatus(null)

        axios
            .post('/forgot-password', { email })
            .then(response => setStatus(response.data.status))
            .catch(error => {
                if (error.response.status !== 422) throw error

                setErrors(error.response.data.errors)
            })
    }

    const resetPassword = async ({ setErrors, setStatus, ...props }) => {
        await csrf()

        setErrors([])
        setStatus(null)

        axios
            .post('/reset-password', { token: params.token, ...props })
            .then(response =>
                router.push('/login?reset=' + btoa(response.data.status)),
            )
            .catch(error => {
                if (error.response.status !== 422) throw error

                setErrors(error.response.data.errors)
            })
    }

    const resendEmailVerification = ({ setStatus }) => {
        axios
            .post('/email/verification-notification')
            .then(response => setStatus(response.data.status))
    }

    const logout = async () => {
        try {
            await axios.post('/api/logout')
            localStorage.removeItem('auth_token')
            await mutate(null)
            router.push('/login')
        } catch (error) {
            console.error('Error al cerrar sesión:', error)
        }
    }

    useEffect(() => {
        if (middleware === 'guest' && redirectIfAuthenticated && user) {
            router.push(redirectIfAuthenticated)
        }
        if (middleware === 'auth' && error) {
            logout()
        }
    }, [user, error])

    return {
        user,
        register,
        login,
        forgotPassword,
        resetPassword,
        resendEmailVerification,
        logout,
    }
}
