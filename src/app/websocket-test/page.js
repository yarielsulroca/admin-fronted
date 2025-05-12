'use client'
import { useEffect, useState, useRef } from 'react'
import axios from '@/lib/axios'

const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8090'

function getContentIcon(type) {
    if (type === 'video') return '🎬';
    if (type === 'image') return '🖼️';
    if (type === 'pdf') return '📄';
    return '📦';
}

export default function WebSocketTest() {
    const [headquarters, setHeadquarters] = useState([])
    const [clients, setClients] = useState([])
    const [contents, setContents] = useState([])
    const [selectedHeadquarters, setSelectedHeadquarters] = useState('')
    const [selectedClients, setSelectedClients] = useState([])
    const [selectedContents, setSelectedContents] = useState([])
    const [message, setMessage] = useState('')
    const [wsStatus, setWsStatus] = useState('desconectado')
    const [wsError, setWsError] = useState(null)
    const [wsResponse, setWsResponse] = useState(null)
    const [contentSearch, setContentSearch] = useState('')
    const [clientSearch, setClientSearch] = useState('')
    const [transmissionMode, setTransmissionMode] = useState('broadcast')
    const [activeConnections, setActiveConnections] = useState([])
    const wsRef = useRef(null)

    // Cargar sedes al iniciar
    useEffect(() => {
        axios.get('/api/headquarters').then(res => {
            setHeadquarters(res.data.data || res.data)
        })
    }, [])

    // Cargar clientes y contenidos al seleccionar sede
    useEffect(() => {
        if (selectedHeadquarters) {
            axios.get('/api/clients').then(res => {
                const filtered = (res.data.data || res.data).filter(c => c.headquarters_id == selectedHeadquarters)
                setClients(filtered)
            })
            axios.get('/api/contents').then(res => {
                const allContents = res.data.data || res.data
                // Si los contenidos tienen headquarters_id, filtra; si no, muestra todos
                const filtered = allContents.some(c => c.headquarters_id !== undefined)
                    ? allContents.filter(content => content.headquarters_id == selectedHeadquarters)
                    : allContents
                setContents(filtered)
            })
        } else {
            setClients([])
            setContents([])
        }
        setSelectedClients([])
        setSelectedContents([])
    }, [selectedHeadquarters])

    // Botón conectar manual
    const handleConnect = () => {
        setWsStatus('conectando')
        setWsError(null)
        setWsResponse(null)
        try {
            console.log('=== INICIANDO CONEXIÓN WEBSOCKET ===')
            console.log('URL del WebSocket:', wsUrl)
            const ws = new WebSocket(wsUrl)
            wsRef.current = ws

            ws.onopen = () => {
                console.log('WebSocket conectado exitosamente')
                setWsStatus('conectado')
                // Enviar mensaje de conexión como admin
                const connectMessage = {
                    type: 'admin_connect',
                    role: 'admin',
                    timestamp: new Date().toISOString()
                }
                ws.send(JSON.stringify(connectMessage))
            }

            ws.onclose = (event) => {
                console.log('WebSocket desconectado:', event.code, event.reason)
                setWsStatus('desconectado')
                setActiveConnections([])
            }

            ws.onerror = (error) => {
                console.error('Error en WebSocket:', error)
                setWsStatus('error')
                setWsError('Error de conexión WebSocket')
            }

            ws.onmessage = (event) => {
                console.log('Mensaje recibido del servidor:', event.data)
                try {
                    const data = JSON.parse(event.data)
                    if (data.type === 'connections_list') {
                        console.log('Lista de conexiones actualizada:', data.connections)
                        setActiveConnections(data.connections)
                        // Actualizar la lista de clientes visibles automáticamente
                        setClients(prevClients => {
                            // Solo mantener los clientes que están activos según la lista recibida
                            const activeIds = data.connections.map(conn => String(conn.client_id))
                            return prevClients.filter(c => activeIds.includes(String(c.id)))
                        })
                    } else {
                        setWsResponse(event.data)
                    }
                } catch (error) {
                    console.error('Error al procesar mensaje:', error)
                }
            }
        } catch (err) {
            console.error('Error al crear WebSocket:', err)
            setWsStatus('error')
            setWsError('No se pudo conectar al WebSocket')
        }
    }

    const handleTransmit = () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            console.error('WebSocket no está conectado');
            return;
        }

        if (!selectedClients.length) {
            console.error('No hay clientes seleccionados');
            return;
        }

        console.log('=== INICIANDO TRANSMISIÓN DE MENSAJE ===');
        console.log('WebSocket state:', wsRef.current.readyState);
        console.log('Clientes seleccionados:', selectedClients);
        console.log('Mensaje a enviar:', message);

        selectedClients.forEach(clientId => {
            const messageData = {
                type: 'text_message',
                client_id: clientId,
                message: message,
                timestamp: new Date().toISOString()
            };

            console.log('Enviando mensaje a cliente', clientId, ':', messageData);
            try {
                wsRef.current.send(JSON.stringify(messageData));
                console.log('Mensaje enviado exitosamente');
            } catch (error) {
                console.error('Error al enviar mensaje:', error);
            }
        });

        // Limpiar el mensaje después de enviarlo
        setMessage('');
    };

    // Filtrado de contenidos y clientes
    const filteredContents = contents.filter(c => c.title.toLowerCase().includes(contentSearch.toLowerCase()))
    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        (c.ip_address && c.ip_address.toLowerCase().includes(clientSearch.toLowerCase()))
    )

    // Seleccionar/deseleccionar todos los clientes visibles
    const handleSelectAllClients = () => {
        if (selectedClients.length === filteredClients.length) {
            setSelectedClients([])
        } else {
            setSelectedClients(filteredClients.map(c => String(c.id)))
        }
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Panel de Transmisión de Contenido</h1>
            
            {/* Panel de estado y conexiones */}
            <div className="mb-4 p-4 bg-white rounded-lg shadow">
                <div className="flex items-center gap-2 mb-4">
                    <button
                        className={`px-4 py-2 rounded text-white ${wsStatus === 'conectado' ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                        onClick={handleConnect}
                        disabled={wsStatus === 'conectado'}
                    >
                        {wsStatus === 'conectado' ? 'Conectado' : 'Conectar al WebSocket'}
                    </button>
                    <span className={`inline-block w-3 h-3 rounded-full ${
                        wsStatus === 'conectado' ? 'bg-green-500' :
                        wsStatus === 'conectando' ? 'bg-yellow-500' :
                        wsStatus === 'error' ? 'bg-red-500' :
                        'bg-gray-500'
                    }`} />
                    <span className="text-sm">
                        {wsStatus === 'conectado' ? 'Conectado al WebSocket' :
                            wsStatus === 'conectando' ? 'Conectando...' :
                            wsStatus === 'error' ? 'Error de conexión' :
                            'Desconectado'}
                    </span>
                </div>

                {/* Lista de conexiones activas */}
                <div className="mt-4">
                    <h2 className="text-lg font-semibold mb-2">Conexiones Activas</h2>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Conectado desde</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Último ping</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {activeConnections.map((conn, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-sm">{conn.client_id}</td>
                                        <td className="px-4 py-2 text-sm">{conn.role}</td>
                                        <td className="px-4 py-2 text-sm">{new Date(conn.connected_at).toLocaleString()}</td>
                                        <td className="px-4 py-2 text-sm">{new Date(conn.last_ping * 1000).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {activeConnections.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-4 py-2 text-sm text-gray-500 text-center">
                                            No hay conexiones activas
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="mb-4 mt-4">
                <label className="block mb-1 font-medium">Modo de transmisión:</label>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            value="broadcast"
                            checked={transmissionMode === 'broadcast'}
                            onChange={e => setTransmissionMode(e.target.value)}
                            disabled={wsStatus !== 'conectado'}
                        />
                        <span>Broadcast (todos los contenidos a todos los clientes)</span>
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            value="direct"
                            checked={transmissionMode === 'direct'}
                            onChange={e => setTransmissionMode(e.target.value)}
                            disabled={wsStatus !== 'conectado'}
                        />
                        <span>Directo (un contenido por cliente)</span>
                    </label>
                </div>
            </div>
            <div className="mb-4 mt-4">
                <label className="block mb-1 font-medium">Selecciona una sede:</label>
                <select className="w-full border rounded p-2" value={selectedHeadquarters} onChange={e => setSelectedHeadquarters(e.target.value)} disabled={wsStatus !== 'conectado'}>
                    <option value="">-- Selecciona --</option>
                    {headquarters.map(hq => (
                        <option key={hq.id} value={hq.id}>{hq.name}</option>
                    ))}
                </select>
            </div>
            <div className="mb-4">
                <label className="block mb-1 font-medium">Buscar contenido:</label>
                <input
                    type="text"
                    className="w-full border rounded p-2 mb-2"
                    placeholder="Buscar por título..."
                    value={contentSearch}
                    onChange={e => setContentSearch(e.target.value)}
                    disabled={!selectedHeadquarters || wsStatus !== 'conectado'}
                />
                <label className="block mb-1 font-medium">Selecciona contenidos:</label>
                <div className="border rounded p-2 h-32 overflow-y-auto bg-white">
                    {filteredContents.length === 0 && <div className="text-gray-400">No hay contenidos</div>}
                    {filteredContents.map(content => (
                        <label key={content.id} className="flex items-center gap-2 cursor-pointer py-1">
                            <input
                                type="checkbox"
                                value={content.id}
                                checked={selectedContents.includes(String(content.id))}
                                onChange={e => {
                                    if (e.target.checked) {
                                        setSelectedContents([...selectedContents, String(content.id)])
                                    } else {
                                        setSelectedContents(selectedContents.filter(id => id !== String(content.id)))
                                    }
                                }}
                                disabled={!selectedHeadquarters || wsStatus !== 'conectado'}
                            />
                            <span className="text-lg">{getContentIcon(content.type)}</span>
                            <span className="font-medium">{content.title}</span>
                            <span className="text-xs text-gray-500">({content.type})</span>
                        </label>
                    ))}
                </div>
            </div>
            <div className="mb-4">
                <label className="block mb-1 font-medium">Buscar cliente:</label>
                <input
                    type="text"
                    className="w-full border rounded p-2 mb-2"
                    placeholder="Buscar por nombre o IP..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    disabled={!selectedHeadquarters || wsStatus !== 'conectado'}
                />
                <div className="flex items-center justify-between mb-2">
                    <label className="block font-medium">Selecciona clientes:</label>
                    <button
                        onClick={handleSelectAllClients}
                        className="text-sm text-blue-600 hover:text-blue-800"
                        disabled={!selectedHeadquarters || wsStatus !== 'conectado'}
                    >
                        {selectedClients.length === filteredClients.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </button>
                </div>
                <div className="border rounded p-2 h-48 overflow-y-auto bg-white">
                    {filteredClients.length === 0 && <div className="text-gray-400">No hay clientes</div>}
                    {filteredClients.map(client => (
                        <label key={client.id} className="flex items-center gap-2 cursor-pointer py-1 border-b last:border-b-0">
                            <input
                                type="checkbox"
                                value={client.id}
                                checked={selectedClients.includes(String(client.id))}
                                onChange={e => {
                                    if (e.target.checked) {
                                        setSelectedClients([...selectedClients, String(client.id)])
                                    } else {
                                        setSelectedClients(selectedClients.filter(id => id !== String(client.id)))
                                    }
                                }}
                                disabled={!selectedHeadquarters || wsStatus !== 'conectado'}
                            />
                            <div className="flex-1">
                                <div className="font-medium">{client.name} <span className="text-xs text-gray-500">(ID: {client.id})</span></div>
                                <div className="text-sm text-gray-600">{client.ip_address}</div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${
                                client.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                                {client.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                        </label>
                    ))}
                </div>
            </div>
            <div className="mb-4">
                <label className="block mb-1 font-medium">Mensaje de texto (opcional):</label>
                <input
                    type="text"
                    className="w-full border rounded p-2"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    disabled={wsStatus !== 'conectado'}
                    placeholder="Escribe un mensaje para los clientes seleccionados"
                />
            </div>
            <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={handleTransmit}
                disabled={wsStatus !== 'conectado'}
            >
                Transmitir
            </button>
            {wsError && <div className="text-red-500 mb-2 mt-2">{wsError}</div>}
            {wsResponse && <div className="text-green-600 mb-2 mt-2">{wsResponse}</div>}
        </div>
    )
}