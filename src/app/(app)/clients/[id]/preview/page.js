'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import axios from '@/lib/axios'
import Header from '@/app/(app)/Header'

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8090'

export default function ClientPreview() {
    const params = useParams()
    const { id } = params
    const [contents, setContents] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [wsStatus, setWsStatus] = useState('conectando')
    const wsRef = useRef(null)
    const reconnectTimeoutRef = useRef(null)
    const [clientInfo, setClientInfo] = useState(null)

    // Función para conectar WebSocket
    const connectWebSocket = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return

        const ws = new WebSocket(`${wsUrl}/client/${id}`)
        wsRef.current = ws

        ws.onopen = () => {
            console.log('WebSocket conectado')
            setWsStatus('conectado')
            ws.send(JSON.stringify({
                type: 'client_connect',
                client_id: id
            }))
        }

        ws.onclose = () => {
            console.log('WebSocket desconectado')
            setWsStatus('desconectado')
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000)
        }

        ws.onerror = (error) => {
            console.error('Error en WebSocket:', error)
            setWsStatus('error')
        }

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                console.log('Mensaje recibido:', data)

                switch (data.type) {
                    case 'content_update':
                        setContents(prevContents => {
                            const newContents = [...prevContents]
                            const index = newContents.findIndex(c => c.id === data.content.id)
                            if (index !== -1) {
                                newContents[index] = data.content
                            }
                            return newContents
                        })
                        break
                    case 'play_content':
                        setContents(prevContents => {
                            const contentIndex = prevContents.findIndex(c => c.id === data.content_id)
                            if (contentIndex !== -1) {
                                setCurrentIndex(contentIndex)
                            }
                            return prevContents
                        })
                        break
                    case 'status_update':
                        setWsStatus(data.status)
                        break
                    default:
                        console.log('Tipo de mensaje no manejado:', data.type)
                }
            } catch (error) {
                console.error('Error al procesar mensaje WebSocket:', error)
            }
        }
    }

    // Efecto para manejar la conexión WebSocket
    useEffect(() => {
        connectWebSocket()
        return () => {
            if (wsRef.current) {
                wsRef.current.close()
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }
        }
    }, [id])

    // Efecto para cargar los datos del cliente y sus contenidos
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [clientRes, contentsRes] = await Promise.all([
                    axios.get(`/api/clients/${id}`),
                    axios.get(`/api/clients/${id}/contents`)
                ])
                
                setClientInfo(clientRes.data)
                setContents(contentsRes.data.data || [])
                setLoading(false)
            } catch (err) {
                setError('Error al cargar los datos')
                setLoading(false)
            }
        }

        fetchData()
    }, [id])

    // Efecto para rotar automáticamente los contenidos cada 30 segundos
    useEffect(() => {
        if (contents.length > 1) {
            const interval = setInterval(() => {
                setCurrentIndex((prevIndex) => (prevIndex + 1) % contents.length)
            }, 30000)

            return () => clearInterval(interval)
        }
    }, [contents.length])

    // Función para iniciar la transmisión del contenido actual
    const startBroadcast = async () => {
        if (!contents[currentIndex] || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

        try {
            wsRef.current.send(JSON.stringify({
                type: 'broadcast_content',
                content_id: contents[currentIndex].id,
                client_id: id
            }))
            console.log('Solicitud de transmisión enviada')
        } catch (error) {
            console.error('Error al iniciar la transmisión:', error)
        }
    }

    // Efecto para iniciar la transmisión cuando cambia el contenido
    useEffect(() => {
        if (contents[currentIndex]) {
            startBroadcast()
        }
    }, [currentIndex, contents])

    if (loading) return (
        <div className="min-h-screen bg-gray-100">
            <Header title="Previsualización de Pantalla" />
            <div className="p-6">Cargando...</div>
        </div>
    )

    if (error) return (
        <div className="min-h-screen bg-gray-100">
            <Header title="Previsualización de Pantalla" />
            <div className="p-6 text-red-500">{error}</div>
        </div>
    )

    if (contents.length === 0) return (
        <div className="min-h-screen bg-gray-100">
            <Header title="Previsualización de Pantalla" />
            <div className="p-6">No hay contenidos asociados</div>
        </div>
    )

    const currentContent = contents[currentIndex]
    const fileUrl = currentContent.file_url && currentContent.file_url.startsWith('/storage')
        ? backendUrl + currentContent.file_url
        : currentContent.file_url

    return (
        <div className="min-h-screen bg-gray-100">
            <Header title="Previsualización de Pantalla" />
            
            <div className="p-6">
                {/* Información del cliente */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <h2 className="text-xl font-semibold mb-2">Información del Cliente</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Nombre</p>
                            <p className="font-medium">{clientInfo?.name}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">IP</p>
                            <p className="font-medium">{clientInfo?.ip_address}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">MAC</p>
                            <p className="font-medium">{clientInfo?.mac_address}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Estado</p>
                            <p className="font-medium">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    clientInfo?.is_allowed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                    {clientInfo?.is_allowed ? 'Activo' : 'Inactivo'}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Estado de WebSocket */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="flex items-center">
                        <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                            wsStatus === 'conectado' ? 'bg-green-500' :
                            wsStatus === 'conectando' ? 'bg-yellow-500' :
                            wsStatus === 'error' ? 'bg-red-500' :
                            'bg-gray-500'
                        }`}></span>
                        <span className="text-sm">
                            {wsStatus === 'conectado' ? 'Conectado' :
                             wsStatus === 'conectando' ? 'Conectando...' :
                             wsStatus === 'error' ? 'Error de conexión' :
                             'Desconectado'}
                        </span>
                    </div>
                </div>

                {/* Vista previa de la pantalla */}
                <div className="bg-gray-900 rounded-lg shadow-lg p-6">
                    <h1 className="text-2xl font-bold text-white mb-4">{currentContent.title}</h1>
                    <p className="mb-2 text-gray-300">{currentContent.description}</p>
                    <div className="mb-6">
                        {currentContent.type === 'video' && fileUrl.endsWith('.mp4') ? (
                            <video 
                                src={fileUrl} 
                                controls 
                                autoPlay 
                                width="100%" 
                                className="rounded-lg shadow-lg"
                                onEnded={() => setCurrentIndex((prevIndex) => (prevIndex + 1) % contents.length)}
                            />
                        ) : fileUrl ? (
                            <div className="relative">
                                <img 
                                    src={fileUrl} 
                                    alt={currentContent.title}
                                    className="w-full h-auto rounded-lg shadow-lg"
                                />
                            </div>
                        ) : (
                            <span className="text-gray-400">No hay archivo disponible</span>
                        )}
                    </div>
                    
                    {/* Indicadores de navegación */}
                    {contents.length > 1 && (
                        <div className="flex justify-center gap-2 mt-4">
                            {contents.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentIndex(index)}
                                    className={`w-3 h-3 rounded-full ${
                                        index === currentIndex ? 'bg-white' : 'bg-gray-500'
                                    }`}
                                    aria-label={`Ir al contenido ${index + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
} 