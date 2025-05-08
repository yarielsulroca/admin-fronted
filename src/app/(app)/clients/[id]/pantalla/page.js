'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import axios from '@/lib/axios'

// URLs para el backend y WebSocket
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8090'

export default function ClientScreen() {
    const params = useParams()
    const { id } = params
    const [content, setContent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [wsStatus, setWsStatus] = useState('conectando')
    const wsRef = useRef(null)
    const reconnectTimeoutRef = useRef(null)

    const connectWebSocket = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            console.log('WebSocket ya está conectado')
            return
        }

        try {
            // Conectar directamente al WebSocket sin /client/
            console.log('Configuración de conexión WebSocket:', {
                url: wsUrl,
                clientId: id,
                timestamp: new Date().toISOString()
            })
            
            setWsStatus('conectando')
            
            const ws = new WebSocket(wsUrl)
            wsRef.current = ws

            // Agregar timeout para la conexión
            const connectionTimeout = setTimeout(() => {
                if (ws.readyState !== WebSocket.OPEN) {
                    console.error('Timeout de conexión WebSocket')
                    ws.close()
                    setWsStatus('error')
                    setError('No se pudo establecer conexión con el servidor (timeout)')
                }
            }, 5000)

            ws.onopen = () => {
                clearTimeout(connectionTimeout)
                console.log('WebSocket conectado exitosamente')
                setWsStatus('conectado')
                
                // Enviar mensaje de conexión inicial
                try {
                    const connectMessage = {
                        type: 'client_connect',
                        client_id: id,
                        timestamp: new Date().toISOString(),
                        client_info: {
                            id: id,
                            connection_time: new Date().toISOString()
                        }
                    }
                    console.log('Enviando mensaje de conexión:', connectMessage)
                    ws.send(JSON.stringify(connectMessage))
                } catch (error) {
                    console.error('Error al enviar mensaje de conexión:', error)
                    setError('Error al inicializar la conexión')
                }
            }

            ws.onclose = (event) => {
                clearTimeout(connectionTimeout)
                console.log('WebSocket desconectado. Código:', event.code, 'Razón:', event.reason)
                setWsStatus('desconectado')
                
                // Limpiar timeout anterior si existe
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current)
                }

                // Intentar reconectar solo si no fue un cierre limpio
                if (event.code !== 1000 && event.code !== 1001) {
                    console.log('Programando reconexión...')
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log('Intentando reconexión...')
                        connectWebSocket()
                    }, 5000)
                }
            }

            ws.onerror = (error) => {
                console.error('Error en WebSocket:', error)
                setWsStatus('error')
                setError('Error de conexión WebSocket')
            }

            ws.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data)
                    console.log('Mensaje recibido:', data)

                    switch (data.type) {
                        case 'broadcast_content':
                            console.log('Recibiendo contenido:', data.content_id)
                            setWsStatus('recibiendo contenido')
                            try {
                                const response = await axios.get(`/api/contents/${data.content_id}`)
                                console.log('Contenido recibido:', response.data)
                                setContent(response.data)
                                
                                // Enviar confirmación de recepción
                                const confirmMessage = {
                                    type: 'broadcast_received',
                                    content_id: data.content_id,
                                    client_id: id,
                                    timestamp: new Date().toISOString(),
                                    status: 'success'
                                }
                                console.log('Enviando confirmación de recepción:', confirmMessage)
                                ws.send(JSON.stringify(confirmMessage))
                                setWsStatus('conectado')
                            } catch (err) {
                                console.error('Error al cargar el contenido:', err)
                                setError('Error al cargar el contenido')
                                setWsStatus('error')
                                
                                // Enviar mensaje de error
                                ws.send(JSON.stringify({
                                    type: 'broadcast_error',
                                    content_id: data.content_id,
                                    client_id: id,
                                    error: err.message,
                                    timestamp: new Date().toISOString()
                                }))
                            }
                            break
                        case 'content_update':
                            console.log('Actualizando contenido:', data.content)
                            setContent(data.content)
                            break
                        case 'status_update':
                            console.log('Actualizando estado:', data.status)
                            setWsStatus(data.status)
                            break
                        case 'connection_established':
                            console.log('Conexión establecida con el servidor')
                            setWsStatus('conectado')
                            break
                        default:
                            console.log('Mensaje no manejado:', data)
                    }
                } catch (error) {
                    console.error('Error al procesar mensaje WebSocket:', error)
                }
            }
        } catch (error) {
            console.error('Error al crear WebSocket:', error)
            setWsStatus('error')
            setError('Error al crear conexión WebSocket')
        }
    }

    useEffect(() => {
        // Verificar si el cliente está autorizado
        axios.get(`/api/clients/${id}`)
            .then(res => {
                if (!res.data.is_allowed) {
                    setError('Esta pantalla no está autorizada')
                    return
                }
                setLoading(false)
                connectWebSocket()
            })
            .catch(err => {
                setError('Error al cargar la información del cliente')
                setLoading(false)
            })

        return () => {
            if (wsRef.current) {
                wsRef.current.close()
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }
        }
    }, [id])

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-white text-xl">Cargando...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-red-500 text-xl">{error}</div>
            </div>
        )
    }

    const fileUrl = content?.file_url && content.file_url.startsWith('/storage')
        ? backendUrl + content.file_url
        : content?.file_url

    return (
        <div className="min-h-screen bg-black flex flex-col">
            {/* Barra de estado */}
            <div className="fixed top-0 left-0 right-0 bg-gray-900 bg-opacity-75 p-2 flex justify-between items-center">
                <div className="flex items-center">
                    <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                        wsStatus === 'conectado' ? 'bg-green-500' :
                        wsStatus === 'conectando' ? 'bg-yellow-500' :
                        wsStatus === 'recibiendo contenido' ? 'bg-blue-500' :
                        wsStatus === 'error' ? 'bg-red-500' :
                        'bg-gray-500'
                    }`} />
                    <span className="text-white text-sm">
                        {wsStatus === 'conectado' ? 'Conectado' :
                         wsStatus === 'conectando' ? 'Conectando...' :
                         wsStatus === 'recibiendo contenido' ? 'Recibiendo contenido...' :
                         wsStatus === 'error' ? 'Error de conexión' :
                         'Desconectado'}
                    </span>
                </div>
                {content && (
                    <div className="text-white text-sm">
                        {content.title}
                    </div>
                )}
            </div>

            {/* Contenido */}
            <div className="flex-1 flex items-center justify-center">
                {content && fileUrl ? (
                    content.type === 'video' && fileUrl.endsWith('.mp4') ? (
                        <video
                            key={fileUrl}
                            src={fileUrl}
                            className="max-h-screen max-w-full"
                            autoPlay
                            controls={false}
                            loop
                            muted={false}
                            onEnded={(e) => e.target.play()}
                        />
                    ) : (
                        <img
                            src={fileUrl}
                            alt={content.title}
                            className="max-h-screen max-w-full object-contain"
                        />
                    )
                ) : (
                    <div className="text-white text-xl">
                        Esperando contenido...
                    </div>
                )}
            </div>
        </div>
    )
} 