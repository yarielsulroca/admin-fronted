'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import axios from '@/lib/axios'
import Link from 'next/link'

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/admin-contenido'
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8090'

export default function ContentStreamingCard({ onLoad }) {
    const [headquarters, setHeadquarters] = useState([])
    const [selectedHeadquarters, setSelectedHeadquarters] = useState('')
    const [allClients, setAllClients] = useState([])
    const [clients, setClients] = useState([])
    const [contents, setContents] = useState([])
    const [selectedContent, setSelectedContent] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [wsStatus, setWsStatus] = useState({})
    const [selectedClients, setSelectedClients] = useState([])
    const [isBroadcasting, setIsBroadcasting] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [broadcastUrls, setBroadcastUrls] = useState({})
    const wsRefs = useRef({})
    const reconnectTimeoutRefs = useRef({})
    const loadedRef = useRef(false)
    const initialLoadDoneRef = useRef(false)
    const reconnectAttempts = useRef({})

    // Función para cargar los clientes una sola vez
    const loadInitialData = useCallback(async () => {
        if (initialLoadDoneRef.current) return
        
        try {
            setLoading(true)
            console.log('Iniciando carga de datos...')
            
            const [hqRes, contentsRes, clientsRes] = await Promise.all([
                axios.get('/api/headquarters'),
                axios.get('/api/contents'),
                axios.get('/api/clients')
            ])
            
            console.log('Datos recibidos:', {
                headquarters: hqRes.data,
                contents: contentsRes.data,
                clients: clientsRes.data
            })

            const hqData = hqRes.data.data || hqRes.data || []
            const contentsData = contentsRes.data.data || contentsRes.data || []
            const clientsData = clientsRes.data.data || clientsRes.data || []

            setHeadquarters(hqData)
            setContents(contentsData)
            setAllClients(clientsData)
            setLoading(false)
            initialLoadDoneRef.current = true
            
            if (typeof onLoad === 'function' && !loadedRef.current) {
                loadedRef.current = true
                onLoad()
            }
        } catch (err) {
            console.error('Error al cargar los datos iniciales:', err)
            setError('Error al cargar los datos iniciales')
            setLoading(false)
            if (typeof onLoad === 'function' && !loadedRef.current) {
                loadedRef.current = true
                onLoad()
            }
        }
    }, [onLoad])

    useEffect(() => {
        loadInitialData()
        
        // Cleanup function
        return () => {
            Object.values(wsRefs.current).forEach(ws => {
                if (ws?.readyState === WebSocket.OPEN) {
                    ws.close()
                }
            })
            Object.values(reconnectTimeoutRefs.current).forEach(timeout => clearTimeout(timeout))
        }
    }, [loadInitialData])

    // Filtrar clientes cuando cambia la sede seleccionada
    useEffect(() => {
        if (selectedHeadquarters) {
            const filtered = allClients.filter(c => c.headquarters_id == selectedHeadquarters)
            setClients(filtered)
            setSelectedClients([])
            
            // Cerrar conexiones WebSocket anteriores
            Object.values(wsRefs.current).forEach(ws => ws?.close())
            wsRefs.current = {}
            setWsStatus({})

            // Establecer nuevas conexiones WebSocket para cada cliente
            filtered.forEach(client => {
                connectWebSocket(client.id)
            })
        } else {
            setClients([])
            setSelectedClients([])
            Object.values(wsRefs.current).forEach(ws => ws?.close())
            wsRefs.current = {}
            setWsStatus({})
        }
    }, [selectedHeadquarters, allClients])

    const connectWebSocket = (clientId) => {
        if (wsRefs.current[clientId]?.readyState === WebSocket.OPEN) {
            console.log(`WebSocket ya está conectado para cliente ${clientId}`)
            return
        }

        try {
            console.log(`Intentando conexión WebSocket para cliente ${clientId}:`, {
                url: wsUrl,
                clientId,
                timestamp: new Date().toISOString()
            })
            
            // Cerrar conexión existente si hay alguna
            if (wsRefs.current[clientId]) {
                wsRefs.current[clientId].close()
                delete wsRefs.current[clientId]
            }

            // Limpiar timeout de reconexión si existe
            if (reconnectTimeoutRefs.current[clientId]) {
                clearTimeout(reconnectTimeoutRefs.current[clientId])
                delete reconnectTimeoutRefs.current[clientId]
            }
            
            setWsStatus(prev => ({
                ...prev,
                [clientId]: 'conectando'
            }))

            const ws = new WebSocket(wsUrl)
            wsRefs.current[clientId] = ws

            // Implementar heartbeat para mantener la conexión viva
            let heartbeatInterval
            const startHeartbeat = () => {
                heartbeatInterval = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: 'heartbeat',
                            client_id: clientId,
                            timestamp: new Date().toISOString()
                        }))
                    }
                }, 15000) // Enviar heartbeat cada 15 segundos
            }

            // Agregar timeout para la conexión inicial
            const connectionTimeout = setTimeout(() => {
                if (ws.readyState !== WebSocket.OPEN) {
                    console.error(`Timeout de conexión para cliente ${clientId}. Estado actual:`, ws.readyState)
                    ws.close()
                    setWsStatus(prev => ({
                        ...prev,
                        [clientId]: 'error'
                    }))
                    setError(`No se pudo establecer conexión con el servidor WebSocket (${wsUrl}). Por favor, verifique que el servidor esté corriendo.`)
                    
                    // Intentar reconectar con backoff exponencial
                    const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts.current[clientId] || 0), 30000)
                    reconnectTimeoutRefs.current[clientId] = setTimeout(() => {
                        console.log(`Reintentando conexión para cliente ${clientId} después de ${backoffTime}ms...`)
                        reconnectAttempts.current[clientId] = (reconnectAttempts.current[clientId] || 0) + 1
                        connectWebSocket(clientId)
                    }, backoffTime)
                }
            }, 5000)

            ws.onopen = () => {
                clearTimeout(connectionTimeout)
                console.log(`WebSocket conectado para cliente ${clientId}`)
                setWsStatus(prev => ({
                    ...prev,
                    [clientId]: 'conectado'
                }))
                reconnectAttempts.current[clientId] = 0 // Resetear intentos de reconexión
                startHeartbeat() // Iniciar heartbeat

                // Enviar mensaje de conexión inicial
                const connectMessage = {
                    type: 'admin_connect',
                    client_id: clientId,
                    role: 'admin',
                    timestamp: new Date().toISOString(),
                    admin_info: {
                        connection_time: new Date().toISOString()
                    }
                }
                console.log(`Enviando mensaje de conexión para cliente ${clientId}:`, connectMessage)
                ws.send(JSON.stringify(connectMessage))
            }

            ws.onclose = (event) => {
                clearTimeout(connectionTimeout)
                clearInterval(heartbeatInterval) // Limpiar intervalo de heartbeat
                console.log(`WebSocket desconectado para cliente ${clientId}. Código:`, event.code, 'Razón:', event.reason)
                
                setWsStatus(prev => ({
                    ...prev,
                    [clientId]: 'desconectado'
                }))

                // Limpiar referencias
                delete wsRefs.current[clientId]
                
                // Intentar reconectar solo si no fue un cierre limpio
                if (event.code !== 1000 && event.code !== 1001) {
                    const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts.current[clientId] || 0), 30000)
                    console.log(`Programando reconexión para cliente ${clientId} en ${backoffTime}ms...`)
                    reconnectTimeoutRefs.current[clientId] = setTimeout(() => {
                        console.log(`Intentando reconexión para cliente ${clientId}...`)
                        reconnectAttempts.current[clientId] = (reconnectAttempts.current[clientId] || 0) + 1
                        connectWebSocket(clientId)
                    }, backoffTime)
                }
            }

            ws.onerror = (error) => {
                console.error(`Error en WebSocket para cliente ${clientId}:`, error)
                setWsStatus(prev => ({
                    ...prev,
                    [clientId]: 'error'
                }))
                setError(`Error de conexión WebSocket. Verifique que el servidor esté corriendo en ${wsUrl}`)
            }

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    console.log(`Mensaje recibido para cliente ${clientId}:`, data)
                    
                    switch(data.type) {
                        case 'broadcast_success':
                        case 'broadcast_received':
                            setSuccessMessage(`Contenido transmitido exitosamente a ${data.client_name || 'la pantalla'}`)
                            setTimeout(() => setSuccessMessage(''), 3000)
                            break
                        case 'broadcast_error':
                            setError(`Error en la transmisión: ${data.message || 'Error desconocido'}`)
                            break
                        case 'connection_established':
                        case 'admin_connected':
                            console.log(`Conexión establecida para cliente ${clientId}`)
                            setWsStatus(prev => ({
                                ...prev,
                                [clientId]: 'conectado'
                            }))
                            break
                        case 'connection_rejected':
                            console.error(`Conexión rechazada para cliente ${clientId}:`, data.reason)
                            setError(`Conexión rechazada: ${data.reason || 'No se proporcionó razón'}`)
                            ws.close(1000, 'Connection rejected by server')
                            break
                        case 'heartbeat_response':
                            console.log(`Heartbeat recibido para cliente ${clientId}`)
                            break
                        default:
                            console.log(`Mensaje no manejado de tipo: ${data.type}`)
                    }
                } catch (error) {
                    console.error('Error al procesar mensaje WebSocket:', error)
                }
            }
        } catch (error) {
            console.error(`Error al crear WebSocket para cliente ${clientId}:`, error)
            setWsStatus(prev => ({
                ...prev,
                [clientId]: 'error'
            }))
            setError(`Error al crear conexión WebSocket: ${error.message}`)
        }
    }

    const handleClientSelection = (clientId, event) => {
        if (event) {
            event.stopPropagation()
        }
        
        setSelectedClients(prev => {
            if (prev.includes(clientId)) {
                return prev.filter(id => id !== clientId)
            } else {
                return [...prev, clientId]
            }
        })
    }

    const handleSelectAllClients = () => {
        if (selectedClients.length === clients.length) {
            setSelectedClients([])
        } else {
            setSelectedClients(clients.map(client => client.id))
        }
    }

    const handleBroadcast = async () => {
        if (!selectedContent || !selectedHeadquarters || selectedClients.length === 0) return

        setIsBroadcasting(true)
        setError(null)
        
        try {
            const clientsToTransmit = selectedClients.length > 0 ? selectedClients : clients.map(c => c.id)
            const newBroadcastUrls = {}
            
            // Generar URLs primero
            for (const clientId of clientsToTransmit) {
                const client = clients.find(c => c.id === clientId)
                if (client) {
                    // Usar la URL del frontend (puerto 3000)
                    const viewUrl = new URL(`/clients/${clientId}/pantalla`, 'http://localhost:3000')
                    newBroadcastUrls[clientId] = viewUrl.toString()
                    console.log(`URL generada para cliente ${clientId}:`, viewUrl.toString())
                }
            }
            
            // Establecer URLs antes de la transmisión
            setBroadcastUrls(newBroadcastUrls)

            // Asegurarse de que los WebSockets estén conectados
            for (const clientId of clientsToTransmit) {
                if (!wsRefs.current[clientId] || wsRefs.current[clientId].readyState !== WebSocket.OPEN) {
                    console.log(`Reconectando WebSocket para cliente ${clientId}...`)
                    await new Promise(resolve => {
                        connectWebSocket(clientId)
                        // Esperar un momento para que se establezca la conexión
                        setTimeout(resolve, 1000)
                    })
                }
            }

            // Enviar contenido a través de WebSocket
            for (const clientId of clientsToTransmit) {
                const ws = wsRefs.current[clientId]
                if (ws?.readyState === WebSocket.OPEN) {
                    console.log(`Enviando contenido ${selectedContent} al cliente ${clientId}`)
                    ws.send(JSON.stringify({
                        type: 'broadcast_content',
                        content_id: selectedContent,
                        client_id: clientId,
                        timestamp: new Date().toISOString()
                    }))
                } else {
                    console.warn(`WebSocket no está conectado para el cliente ${clientId}. Estado:`, ws?.readyState)
                    setError(prev => {
                        const newError = `Cliente ${clientId} no conectado. Por favor, espere a que se establezca la conexión.`
                        return prev ? `${prev}\n${newError}` : newError
                    })
                }
            }

            setSuccessMessage('Iniciando transmisión de contenido...')
        } catch (error) {
            console.error('Error al iniciar la transmisión:', error)
            setError(`Error al iniciar la transmisión: ${error.message}`)
        } finally {
            setTimeout(() => setIsBroadcasting(false), 1000)
        }
    }

    const selectedContentData = contents.find(c => c.id === selectedContent)
    const fileUrl = selectedContentData?.file_url && selectedContentData.file_url.startsWith('/storage')
        ? backendUrl + selectedContentData.file_url
        : selectedContentData?.file_url

    if (loading) {
        return (
            <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Transmisión de Contenido</h3>
                    <Link 
                        href="/clients"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-blue-700 focus:bg-blue-700 active:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition ease-in-out duration-150"
                    >
                        Ver Clientes
                    </Link>
                </div>

                {error && (
                    <div className="bg-red-100 text-red-700 p-2 rounded mb-4">
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="bg-green-100 text-green-700 p-2 rounded mb-4">
                        {successMessage}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Sede</label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={selectedHeadquarters}
                            onChange={(e) => setSelectedHeadquarters(e.target.value)}
                        >
                            <option value="">Seleccionar sede</option>
                            {headquarters.map(hq => (
                                <option key={hq.id} value={hq.id}>{hq.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedHeadquarters && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Contenido</label>
                            <select
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={selectedContent}
                                onChange={(e) => setSelectedContent(e.target.value)}
                            >
                                <option value="">Seleccionar contenido</option>
                                {contents.map(content => (
                                    <option key={content.id} value={content.id}>{content.title}</option>
                                ))}
                            </select>

                            {selectedContent && fileUrl && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Vista previa</h4>
                                    {selectedContentData?.type === 'video' && fileUrl.endsWith('.mp4') ? (
                                        <video src={fileUrl} controls className="w-full max-h-48 object-contain" />
                                    ) : (
                                        <img src={fileUrl} alt={selectedContentData?.title} className="w-full max-h-48 object-contain" />
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {selectedHeadquarters && clients.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium text-gray-700">Estado de las pantallas</h4>
                                <button
                                    onClick={handleSelectAllClients}
                                    className="text-sm text-indigo-600 hover:text-indigo-800"
                                >
                                    {selectedClients.length === clients.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                                </button>
                            </div>
                            <div className="space-y-2">
                                {clients.map(client => (
                                    <div key={client.id} className="bg-gray-50 p-4 rounded">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedClients.includes(client.id)}
                                                    onChange={(e) => handleClientSelection(client.id, e)}
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm font-medium">{client.name}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                                    wsStatus[client.id] === 'conectado' ? 'bg-green-500' :
                                                    wsStatus[client.id] === 'conectando' ? 'bg-yellow-500' :
                                                    wsStatus[client.id] === 'error' ? 'bg-red-500' :
                                                    'bg-gray-500'
                                                }`} />
                                                <span className="text-xs text-gray-600">
                                                    {wsStatus[client.id] || 'desconectado'}
                                                </span>
                                            </div>
                                        </div>
                                        {broadcastUrls[client.id] && (
                                            <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                                                <p className="text-blue-700 font-medium mb-2">URL de visualización:</p>
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="text"
                                                        value={broadcastUrls[client.id]}
                                                        readOnly
                                                        className="flex-1 p-2 text-sm bg-white border rounded-md shadow-sm"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(broadcastUrls[client.id]);
                                                            setSuccessMessage('URL copiada al portapapeles');
                                                        }}
                                                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                                    >
                                                        Copiar URL
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedHeadquarters && selectedContent && clients.length > 0 && (
                        <button
                            onClick={handleBroadcast}
                            disabled={isBroadcasting || selectedClients.length === 0}
                            className={`w-full px-4 py-2 rounded-md text-white transition-colors ${
                                isBroadcasting || selectedClients.length === 0
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                            }`}
                        >
                            {isBroadcasting ? 'Transmitiendo...' : 'Transmitir contenido'}
                        </button>
                    )}

                    {selectedHeadquarters && clients.length === 0 && (
                        <div className="text-sm text-gray-500">
                            No hay pantallas disponibles en esta sede
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
} 