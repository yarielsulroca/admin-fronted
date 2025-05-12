'use client'
import { useState, useRef, useEffect } from 'react'
import axios from '@/lib/axios'
import dynamic from 'next/dynamic'

const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8090'

export default function WebSocketPublic() {
    const [clientName, setClientName] = useState('public-' + Math.random().toString(36).substring(2, 10))
    const [clientId, setClientId] = useState(null)
    const [wsStatus, setWsStatus] = useState('desconectado')
    const [wsError, setWsError] = useState(null)
    const [headquarters, setHeadquarters] = useState([])
    const [selectedHeadquarters, setSelectedHeadquarters] = useState('')
    const [ipAddress, setIpAddress] = useState('')
    const [location, setLocation] = useState('Desconocida')
    const [messages, setMessages] = useState([])
    const [currentContent, setCurrentContent] = useState(null)
    const [clientStatus, setClientStatus] = useState({ is_active: true, is_allowed: true })
    const wsRef = useRef(null)
    const contentRef = useRef(null)
    const reconnectTimeoutRef = useRef(null)
    const statusCheckIntervalRef = useRef(null)
    const [wsResponse, setWsResponse] = useState('')
    const [lastPing, setLastPing] = useState(null)
    const [connectionTime, setConnectionTime] = useState(null)
    const clientIdRef = useRef(null)

    // Función para verificar el estado del cliente
    const checkClientStatus = async () => {
        if (!clientId) return

        try {
            const response = await axios.get(`/api/clients/${clientId}`)
            const { is_active, is_allowed } = response.data

            // Si el estado ha cambiado
            if (is_active !== clientStatus.is_active || is_allowed !== clientStatus.is_allowed) {
                setClientStatus({ is_active, is_allowed })
                
                // Si el cliente fue desactivado o no tiene permiso
                if (!is_active || !is_allowed) {
                    setWsStatus('desconectado')
                    setWsError('Cliente desactivado o sin permisos')
                    if (wsRef.current) {
                        wsRef.current.close()
                    }
                }
            }
        } catch (error) {
            console.error('Error al verificar estado del cliente:', error)
        }
    }

    // Iniciar verificación periódica del estado
    useEffect(() => {
        let intervalId = null

        if (clientId) {
            // Verificar cada 5 segundos
            intervalId = setInterval(checkClientStatus, 5000)
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId)
            }
        }
    }, [clientId, clientStatus.is_active, clientStatus.is_allowed])

    // Función para reconectar
    const reconnect = () => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
        }
        reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Intentando reconectar...')
            if (wsRef.current) {
                wsRef.current.close()
            }
            handleConnect()
        }, 5000)
    }

    // Obtener IP pública automáticamente
    useEffect(() => {
        fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => setIpAddress(data.ip))
            .catch(() => setIpAddress('0.0.0.0'))
    }, [])

    // Obtener ubicación geográfica automáticamente (opcional)
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    setLocation(`Lat: ${position.coords.latitude}, Lon: ${position.coords.longitude}`)
                },
                () => setLocation('Desconocida')
            )
        }
    }, [])

    // Cargar sedes al iniciar
    useEffect(() => {
        axios.get('/api/headquarters').then(res => {
            setHeadquarters(res.data.data || res.data)
        })
    }, [])

    // Scroll al contenido cuando cambia
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [currentContent])

    // Limpiar al desmontar
    useEffect(() => {
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                // Enviar mensaje de desconexión antes de cerrar
                const disconnectMessage = {
                    type: 'client_disconnect',
                    client_id: clientId,
                    timestamp: new Date().toISOString()
                }
                console.log('Enviando mensaje de desconexión:', disconnectMessage)
                wsRef.current.send(JSON.stringify(disconnectMessage))
                wsRef.current.close()
            }
        }
    }, [clientId])

    const handleConnect = async () => {
        setWsStatus('conectando')
        setWsError(null)
        try {
            console.log('Iniciando conexión...')
            // Buscar si ya existe un cliente con la misma IP, sede y nombre
            const searchParams = new URLSearchParams({
                ip_address: ipAddress,
                headquarters_id: selectedHeadquarters,
                name: clientName
            }).toString();
            const searchRes = await axios.get(`/api/clients?${searchParams}`)
            let idNum = null
            if (Array.isArray(searchRes.data) && searchRes.data.length > 0) {
                // Si existe, reactivarlo y usar su ID
                const existingClient = searchRes.data[0]
                console.log('Cliente existente encontrado:', existingClient)
                try {
                    await axios.patch(`/api/clients/${existingClient.id}`, {
                        is_active: true,
                        updated_at: new Date().toISOString()
                    })
                    idNum = existingClient.id
                } catch (error) {
                    console.error('Error al actualizar cliente:', error)
                    // Si hay un error 401, intentar crear un nuevo cliente
                    if (error.response?.status === 401) {
                        console.log('Error de autorización, creando nuevo cliente...')
                        const res = await axios.post('/api/clients', {
                            name: clientName,
                            is_allowed: true,
                            headquarters_id: Number(selectedHeadquarters),
                            ip_address: ipAddress,
                            location: location
                        })
                        idNum = res.data.id
                        console.log('Nuevo cliente registrado con ID:', idNum)
                    } else {
                        throw error
                    }
                }
            } else {
                // Si no existe, crear uno nuevo
                const res = await axios.post('/api/clients', {
                    name: clientName,
                    is_allowed: true,
                    headquarters_id: Number(selectedHeadquarters),
                    ip_address: ipAddress,
                    location: location
                })
                idNum = res.data.id
                console.log('Cliente registrado con ID:', idNum)
            }
            setClientId(idNum)
            clientIdRef.current = idNum
            setClientStatus({ is_active: true, is_allowed: true })

            // Conectar al WebSocket usando el id numérico
            console.log('Conectando a WebSocket:', wsUrl)
            const ws = new WebSocket(wsUrl)
            wsRef.current = ws

            ws.onopen = () => {
                console.log('=== CONEXIÓN WEBSOCKET ESTABLECIDA ===');
                console.log('Enviando identificación...');
                setWsStatus('conectado');
                setConnectionTime(new Date());
                const connectMessage = {
                    type: 'client_connect',
                    client_id: idNum,
                    timestamp: new Date().toISOString()
                };
                console.log('Mensaje de conexión:', connectMessage);
                ws.send(JSON.stringify(connectMessage));
                console.log('Mensaje de conexión enviado');

                // Iniciar heartbeat
                const heartbeatInterval = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        const heartbeat = {
                            type: 'heartbeat',
                            client_id: idNum,
                            timestamp: new Date().toISOString()
                        };
                        ws.send(JSON.stringify(heartbeat));
                    }
                }, 30000); // Cada 30 segundos

                // Limpiar intervalo al cerrar
                ws.addEventListener('close', () => {
                    clearInterval(heartbeatInterval);
                });
            };

            ws.onclose = (event) => {
                console.log('WebSocket desconectado:', event.code, event.reason);
                setWsStatus('desconectado');
                // Enviar mensaje de desconexión al backend
                if (clientId) {
                    axios.post('/api/clients/disconnect', { client_id: clientId })
                        .then(() => console.log('Cliente desconectado del backend'))
                        .catch(err => console.error('Error al desconectar cliente:', err));
                }
                reconnect();
            };

            ws.onerror = (error) => {
                console.error('Error en WebSocket:', error);
                setWsStatus('error');
                setWsError('Error de conexión WebSocket');
                // Enviar mensaje de desconexión al backend
                if (clientId) {
                    axios.post('/api/clients/disconnect', { client_id: clientId })
                        .then(() => console.log('Cliente desconectado del backend'))
                        .catch(err => console.error('Error al desconectar cliente:', err));
                }
                reconnect();
            };

            ws.onmessage = (event) => {
                console.log('=== MENSAJE RECIBIDO EN CLIENTE ===');
                console.log('Mensaje raw:', event.data);
                try {
                    const data = JSON.parse(event.data);
                    console.log('Mensaje parseado:', data);

                    if (data.type === 'heartbeat_response') {
                        setLastPing(new Date());
                        return;
                    }

                    if (data.type === 'welcome') {
                        setCurrentContent({
                            type: 'system',
                            content: data.message,
                            timestamp: data.timestamp || new Date().toISOString()
                        });
                        setMessages(prev => [
                            ...prev,
                            {
                                type: 'system',
                                content: data.message,
                                timestamp: data.timestamp || new Date().toISOString()
                            }
                        ]);
                        console.log('Mensaje de bienvenida recibido:', data.message);
                        return;
                    }

                    if (data.type === 'connection_established') {
                        setCurrentContent({
                            type: 'system',
                            content: '¡Conexión establecida con el servidor!',
                            timestamp: data.timestamp || new Date().toISOString()
                        });
                        setMessages(prev => [
                            ...prev,
                            {
                                type: 'system',
                                content: '¡Conexión establecida con el servidor!',
                                timestamp: data.timestamp || new Date().toISOString()
                            }
                        ]);
                        console.log('Conexión establecida con el servidor');
                        return;
                    }

                    // Verificar si el mensaje es para este cliente
                    console.log('Comparando data.client_id:', data.client_id, 'con clientId:', clientIdRef.current);
                    if (data.client_id && String(data.client_id) !== String(clientIdRef.current)) {
                        console.log('Mensaje ignorado - no es para este cliente');
                        return;
                    }

                    if (data.type === 'text_message') {
                        console.log('Procesando mensaje de texto:', data);
                        // Actualizar el contenido actual
                        setCurrentContent({
                            type: 'text',
                            content: data.message,
                            timestamp: data.timestamp
                        });
                        // Agregar mensaje al historial
                        setMessages(prev => [
                            ...prev,
                            {
                                type: 'text',
                                content: data.message,
                                timestamp: data.timestamp || new Date().toISOString()
                            }
                        ]);
                        console.log('Mensaje agregado al historial y contenido actual actualizado');
                    } else if (data.type === 'direct_content') {
                        console.log('Procesando contenido directo:', data);
                        setCurrentContent(data.content);
                        // Agregar contenido al historial
                        setMessages(prev => [...prev, {
                            type: data.content.type,
                            content: data.content,
                            timestamp: data.timestamp || new Date().toISOString()
                        }]);
                    } else if (data.type === 'broadcast_content') {
                        console.log('Procesando contenido broadcast:', data);
                        setCurrentContent(data.content);
                        // Agregar contenido al historial
                        setMessages(prev => [...prev, {
                            type: data.content.type,
                            content: data.content,
                            timestamp: data.timestamp || new Date().toISOString()
                        }]);
                    } else if (data.type === 'client_disconnect') {
                        console.log('Procesando mensaje de desconexión:', data);
                        // Agregar mensaje de desconexión al historial
                        setMessages(prev => [...prev, {
                            type: 'system',
                            content: 'Cliente desconectado',
                            timestamp: data.timestamp || new Date().toISOString()
                        }]);
                    }
                    console.log('=== FIN DE PROCESAMIENTO DE MENSAJE ===');
                } catch (error) {
                    console.error('Error al procesar mensaje:', error);
                }
            };
        } catch (err) {
            console.error('Error al conectar:', err)
            setWsStatus('error')
            setWsError('No se pudo registrar o conectar el cliente')
            reconnect()
        }
    }

    const renderContent = (content) => {
        console.log('Renderizando contenido:', content)
        if (!content) {
            return <div className="text-gray-500 text-xl">Esperando contenido...</div>
        }
        
        if (content.type === 'text') {
            return (
                <div className="text-gray-900 text-2xl p-8 bg-gray-100 rounded-lg shadow-lg text-center">
                    {content.content || content.message}
                </div>
            )
        }
        
        if (content.type === 'system') {
            return (
                <div className="text-gray-600 text-xl p-8 bg-yellow-50 rounded-lg shadow-lg text-center">
                    {content.content}
                </div>
            )
        }
        
        if (content.type === 'video' && content.file_url) {
            const fileUrl = content.file_url.startsWith('/storage') 
                ? `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}${content.file_url}` 
                : content.file_url
            console.log('URL del video:', fileUrl)
            return (
                <video
                    src={fileUrl}
                    className="max-h-[60vh] max-w-full rounded-lg shadow-lg"
                    autoPlay
                    controls
                    loop
                    muted={false}
                    style={{ background: '#000' }}
                    onError={(e) => console.error('Error al cargar video:', e)}
                />
            )
        }
        if (content.type === 'image' && content.file_url) {
            const fileUrl = content.file_url.startsWith('/storage') 
                ? `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}${content.file_url}` 
                : content.file_url
            console.log('URL de la imagen:', fileUrl)
            return (
                <img
                    src={fileUrl}
                    alt={content.title || 'Imagen'}
                    className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-lg"
                    style={{ background: '#000' }}
                    onError={(e) => console.error('Error al cargar imagen:', e)}
                />
            )
        }
        console.log('Tipo de contenido no soportado:', content.type)
        return <div className="text-gray-500">Tipo de contenido no soportado: {content.type}</div>
    }

    useEffect(() => {
        window.wsRef = wsRef.current;
    }, [wsRef.current]);

    return (
        <div className="min-h-screen flex flex-col bg-gray-900">
            {/* Barra de estado fija en la parte superior */}
            <div className="fixed top-0 left-0 right-0 bg-gray-800 text-white p-4 z-50">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className={`inline-block w-3 h-3 rounded-full ${
                                wsStatus === 'conectado' ? 'bg-green-500' :
                                wsStatus === 'conectando' ? 'bg-yellow-500' :
                                wsStatus === 'error' ? 'bg-red-500' :
                                'bg-gray-500'
                            }`} />
                            <span>
                                {wsStatus === 'conectado' ? 'Conectado al WebSocket' :
                                    wsStatus === 'conectando' ? 'Conectando...' :
                                    wsStatus === 'error' ? 'Error de conexión' :
                                    'Desconectado'}
                            </span>
                        </div>
                        {lastPing && (
                            <div className="text-sm text-gray-400">
                                Último ping: {lastPing.toLocaleTimeString()}
                            </div>
                        )}
                        {connectionTime && (
                            <div className="text-sm text-gray-400">
                                Conectado desde: {connectionTime.toLocaleTimeString()}
                            </div>
                        )}
                    </div>
                    {typeof clientId !== 'undefined' && (
                        <div className="text-sm font-mono bg-gray-700 px-3 py-1 rounded">
                            ID: {clientId ? clientId : 'Detectando...'}
                        </div>
                    )}
                </div>
                {wsError && (
                    <div className="mt-2 text-red-400 text-sm">
                        Error: {wsError}
                    </div>
                )}
            </div>

            {/* Contenido principal */}
            <div className="flex flex-col md:flex-row mt-16">
                {/* Panel de control */}
                <div className="w-full md:w-80 bg-white p-4 shadow-lg">
                    <h2 className="text-xl font-bold mb-4">Panel de Control</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Nombre de cliente:</label>
                            <input
                                type="text"
                                className="border rounded p-2 w-full"
                                value={clientName}
                                onChange={e => setClientName(e.target.value)}
                                disabled={wsStatus === 'conectado'}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Sede:</label>
                            <select
                                className="border rounded p-2 w-full"
                                value={selectedHeadquarters}
                                onChange={e => setSelectedHeadquarters(e.target.value)}
                                disabled={wsStatus === 'conectado'}
                            >
                                <option value="">-- Selecciona --</option>
                                {headquarters.map(hq => (
                                    <option key={hq.id} value={hq.id}>{hq.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">IP:</label>
                            <div className="font-mono text-sm text-blue-700">{ipAddress || 'Detectando...'}</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Ubicación:</label>
                            <div className="font-mono text-sm text-green-700">{location || 'Detectando...'}</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">ID del cliente:</label>
                            <div className="font-mono text-sm text-purple-700">{clientId ? clientId : 'Detectando...'}</div>
                        </div>
                        <button
                            className={`w-full px-4 py-2 rounded text-white ${
                                wsStatus === 'conectado' ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                            onClick={handleConnect}
                            disabled={wsStatus === 'conectado' || !selectedHeadquarters}
                        >
                            {wsStatus === 'conectado' ? 'Conectado' : 'Conectar al WebSocket'}
                        </button>
                        {wsError && <div className="text-red-500 text-sm mt-2">{wsError}</div>}
                    </div>
                </div>

                {/* Área de contenido */}
                <div className="flex-1 p-4">
                    <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
                        <h2 className="text-xl font-bold mb-4">Contenido Actual</h2>
                        <div ref={contentRef} className="min-h-[200px] flex items-center justify-center">
                            {renderContent(currentContent)}
                        </div>
                    </div>

                    {/* Historial de mensajes */}
                    <div className="bg-white rounded-lg shadow-lg p-4">
                        <h2 className="text-xl font-bold mb-4">Historial de Mensajes</h2>
                        <div className="space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className="border-b pb-4">
                                    <div className="text-sm text-gray-500 mb-2">
                                        {new Date(msg.timestamp).toLocaleString()}
                                    </div>
                                    {renderContent(msg.content)}
                                </div>
                            ))}
                            {messages.length === 0 && (
                                <div className="text-gray-500 text-center py-4">
                                    No hay mensajes en el historial
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 