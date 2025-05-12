'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import axios from '@/lib/axios'
import Header from '@/app/(app)/Header'

// Configuración de URLs para WebSocket
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8090';

// Número máximo de mensajes a mostrar
const MAX_MESSAGES = 50

// Componente para mostrar mensaje cuando falla la conexión WebSocket
const WebSocketErrorMessage = ({ onRetry }) => (
    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <div className="flex items-start">
            <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Problemas de conexión WebSocket</h3>
                <div className="mt-2 text-sm text-yellow-700">
                    <p>No se pudo establecer una conexión con el servidor WebSocket. Esto puede deberse a:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-1">
                        <li>El servidor WebSocket no está ejecutándose</li>
                        <li>La URL de conexión es incorrecta</li>
                        <li>Existe un problema de red o firewall</li>
                    </ul>
                </div>
                <div className="mt-3">
                    <button
                        onClick={onRetry}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                    >
                        Reintentar conexión
                    </button>
                </div>
            </div>
        </div>
    </div>
);

// Componente para mostrar el contenido según su tipo
const ContentDisplay = ({ content, fileUrl }) => {
    if (!content || !fileUrl) return null;

    const fileExtension = fileUrl.split('.').pop().toLowerCase();
    const isVideo = content.type === 'video' || ['mp4', 'webm', 'ogg'].includes(fileExtension);
    const isDocument = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileExtension);
    const isImage = content.type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);

    if (isVideo) {
        return (
            <video 
                src={fileUrl} 
                controls 
                autoPlay 
                width="100%" 
                className="rounded-lg shadow-lg"
                onEnded={(e) => e.target.play()}
                loop
                muted={false}
            />
        );
    }

    if (isDocument) {
        return (
            <div className="w-full h-[600px] rounded-lg shadow-lg overflow-hidden">
                <iframe
                    src={`${fileUrl}#toolbar=0`}
                    className="w-full h-full"
                    title={content.title}
                />
            </div>
        );
    }

    if (isImage) {
        return (
            <div className="relative">
                <img 
                    src={fileUrl} 
                    alt={content.title}
                    className="w-full h-auto rounded-lg shadow-lg object-contain"
                />
            </div>
        );
    }

    return (
        <div className="p-4 bg-gray-100 rounded-lg">
            <p className="text-gray-600">Tipo de archivo no soportado: {fileExtension}</p>
            <a 
                href={fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline mt-2 inline-block"
            >
                Descargar archivo
            </a>
        </div>
    );
};

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
    const [isConnected, setIsConnected] = useState(false)
    const [messages, setMessages] = useState([])
    const [socket, setSocket] = useState(null)
    const reconnectAttemptsRef = useRef(0)
    const maxReconnectAttempts = 5
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const maxRetries = 3;
    const [loadedComponents, setLoadedComponents] = useState({
        client: false,
        contents: false,
        websocket: false
    });

    // Función para conectar WebSocket
    const connectWebSocket = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        try {
            const wsEndpoint = `${wsUrl}/client/${id}`;
            console.log('Intentando conectar WebSocket a:', wsEndpoint);
            
            wsRef.current = new WebSocket(wsEndpoint);
            
            wsRef.current.onopen = () => {
                console.log('WebSocket conectado exitosamente');
                setIsConnected(true);
                setWsStatus('conectado');
                reconnectAttemptsRef.current = 0;
                setRetryCount(0);
                setLoadedComponents(prev => ({ ...prev, websocket: true }));
                
                wsRef.current.send(JSON.stringify({
                    type: 'identification',
                    clientId: id,
                    timestamp: new Date().toISOString()
                }));
            };
            
            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Mensaje WebSocket recibido:', data);
                    
                    switch (data.type) {
                        case 'broadcast_content':
                            handleContentBroadcast(data);
                            break;
                        case 'text_message':
                            handleTextMessage(data);
                            break;
                        default:
                            setMessages(prev => {
                                const newMessages = [...prev, data];
                                if (newMessages.length > MAX_MESSAGES) {
                                    return newMessages.slice(-MAX_MESSAGES);
                                }
                                return newMessages;
                            });
                    }
                } catch (error) {
                    console.error('Error al procesar mensaje WebSocket:', error);
                }
            };
            
            wsRef.current.onclose = (event) => {
                console.log('WebSocket desconectado:', event.code, event.reason);
                setIsConnected(false);
                setWsStatus('desconectado');
                setLoadedComponents(prev => ({ ...prev, websocket: false }));
                
                if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
                    console.log(`Reintentando conexión WebSocket en ${delay/1000} segundos...`);
                    
                    setTimeout(() => {
                        reconnectAttemptsRef.current++;
                        connectWebSocket();
                    }, delay);
                } else {
                    console.log('Máximo número de intentos de reconexión WebSocket alcanzado');
                    setIsOfflineMode(true);
                }
            };
            
            wsRef.current.onerror = (error) => {
                console.error('Error en conexión WebSocket:', error);
                setWsStatus('error');
                setIsOfflineMode(true);
            };
            
            setSocket(wsRef.current);
            
        } catch (error) {
            console.error('Error al crear conexión WebSocket:', error);
            setWsStatus('error');
            setIsOfflineMode(true);
        }
    }

    // Función para manejar mensajes de texto
    const handleTextMessage = (data) => {
        setMessages(prev => {
            const newMessage = {
                ...data,
                timestamp: new Date().toISOString()
            };
            const newMessages = [...prev, newMessage];
            if (newMessages.length > MAX_MESSAGES) {
                return newMessages.slice(-MAX_MESSAGES);
            }
            return newMessages;
        });
    };

    // Función auxiliar para manejar transmisiones de contenido
    const handleContentBroadcast = (data) => {
        const contentIndex = contents.findIndex(c => c.id === data.content_id);
        
        if (contentIndex !== -1) {
            setCurrentIndex(contentIndex);
            console.log(`Mostrando contenido #${data.content_id}`);
            
            if (wsRef.current && wsRef.current.readyState === 1) {
                wsRef.current.send(JSON.stringify({
                    type: 'broadcast_received',
                    content_id: data.content_id,
                    client_id: id,
                    timestamp: new Date().toISOString(),
                    status: 'success'
                }));
            }
        } else {
            console.error(`Contenido #${data.content_id} no encontrado`);
            
            if (wsRef.current && wsRef.current.readyState === 1) {
                wsRef.current.send(JSON.stringify({
                    type: 'broadcast_error',
                    content_id: data.content_id,
                    client_id: id,
                    timestamp: new Date().toISOString(),
                    error: `Contenido #${data.content_id} no encontrado`
                }));
            }
        }
    };

    // Función para cargar datos con reintentos
    const fetchData = async () => {
        try {
            console.log('Intentando cargar datos del cliente:', id);
            console.log('URL del backend:', backendUrl);
            
            const [clientRes, contentsRes] = await Promise.all([
                axios.get(`${backendUrl}/api/clients/${id}`),
                axios.get(`${backendUrl}/api/clients/${id}/contents`)
            ]);
            
            console.log('Respuesta del cliente:', clientRes.data);
            console.log('Respuesta de contenidos:', contentsRes.data);
            
            setClientInfo(clientRes.data);
            setContents(contentsRes.data.data || []);
            setLoading(false);
            setError(null);
            setRetryCount(0);
            setLoadedComponents(prev => ({
                ...prev,
                client: true,
                contents: true
            }));
        } catch (err) {
            console.error('Error al cargar datos:', err);
            console.error('Detalles del error:', {
                status: err.response?.status,
                statusText: err.response?.statusText,
                data: err.response?.data,
                url: err.config?.url
            });
            
            if (retryCount < maxRetries) {
                console.log(`Reintentando carga de datos (${retryCount + 1}/${maxRetries})...`);
                setRetryCount(prev => prev + 1);
                setTimeout(fetchData, 2000 * Math.pow(2, retryCount));
            } else {
                setError(`No se pudo conectar con el servidor (${err.response?.status || 'Error desconocido'}). Modo offline activado.`);
                setLoading(false);
                setIsOfflineMode(true);
            }
        }
    };

    // Efecto para cargar los datos del cliente y sus contenidos
    useEffect(() => {
        fetchData();
    }, [id]);

    // Efecto para manejar la conexión WebSocket
    useEffect(() => {
        connectWebSocket();
        
        return () => {
            if (wsRef.current) {
                try {
                    wsRef.current.close();
                } catch (error) {
                    console.error('Error al cerrar WebSocket:', error);
                }
            }
            
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [id]);

    // Función para alternar pantalla completa
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-100">
            <Header title="Previsualización de Pantalla" />
            <div className="p-6">
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3">Cargando datos del cliente...</span>
                </div>
                <div className="mt-4 text-center text-sm text-gray-500">
                    <p>Conectando a: {backendUrl}</p>
                    <p>WebSocket: {wsUrl}</p>
                </div>
            </div>
        </div>
    );

    if (error && !contents.length) return (
        <div className="min-h-screen bg-gray-100">
            <Header title="Previsualización de Pantalla" />
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error de conexión</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>{error}</p>
                                {isOfflineMode && (
                                    <p className="mt-2">
                                        La aplicación está funcionando en modo offline. Algunas funcionalidades pueden estar limitadas.
                                    </p>
                                )}
                            </div>
                            <div className="mt-4">
                                <button
                                    onClick={() => {
                                        setRetryCount(0);
                                        fetchData();
                                    }}
                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    Reintentar conexión
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (contents.length === 0) return (
        <div className="min-h-screen bg-gray-100">
            <Header title="Previsualización de Pantalla" />
            <div className="p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">Sin contenidos</h3>
                            <div className="mt-2 text-sm text-yellow-700">
                                <p>No hay contenidos asociados a este cliente.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const currentContent = contents[currentIndex]
    const fileUrl = currentContent.file_url && currentContent.file_url.startsWith('/storage')
        ? backendUrl + currentContent.file_url
        : currentContent.file_url

    return (
        <div className="min-h-screen bg-gray-100">
            <Header title="Previsualización de Pantalla" />
            
            <div className="p-6">
                {wsStatus === 'error' && (
                    <WebSocketErrorMessage 
                        onRetry={() => {
                            reconnectAttemptsRef.current = 0;
                            connectWebSocket();
                        }} 
                    />
                )}
                
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
                    <div className="flex items-center justify-between">
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
                            <span className="ml-4 text-xs text-gray-500">
                                URL: {wsUrl}
                            </span>
                        </div>
                        <button
                            onClick={toggleFullscreen}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                            {isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                        </button>
                    </div>
                </div>

                {/* Vista previa de la pantalla */}
                <div className="bg-gray-900 rounded-lg shadow-lg p-6">
                    <h1 className="text-2xl font-bold text-white mb-4">{currentContent.title}</h1>
                    <p className="mb-2 text-gray-300">{currentContent.description}</p>
                    <div className="mb-6">
                        <ContentDisplay content={currentContent} fileUrl={fileUrl} />
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

                {/* Mensajes recibidos */}
                <div className="mt-6 border rounded-lg bg-gray-50 p-4">
                    <h2 className="text-lg font-semibold mb-4">Mensajes Recibidos</h2>
                    
                    {messages.length === 0 ? (
                        <div className="text-center py-8 bg-white rounded border">
                            <p className="text-gray-500">No hay mensajes para mostrar</p>
                            <p className="text-sm mt-2 text-gray-400">Los mensajes enviados a este cliente aparecerán aquí</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {messages.map((msg, index) => (
                                <div 
                                    key={index}
                                    className={`p-4 rounded-lg ${
                                        msg.type === 'error' 
                                            ? 'bg-red-50 border border-red-100' 
                                            : msg.type === 'text_message'
                                            ? 'bg-blue-50 border border-blue-100'
                                            : msg.targetClientId === id
                                            ? 'bg-green-50 border border-green-100'
                                            : 'bg-white border'
                                    }`}
                                >
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium">
                                            {msg.clientId === 'server' 
                                                ? 'Sistema' 
                                                : `Cliente ${msg.clientId}`}
                                        </span>
                                        <span className="text-gray-500">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className="mt-1">
                                        {msg.type === 'text_message' ? (
                                            <div className="text-blue-800">{msg.message}</div>
                                        ) : (
                                            msg.message || JSON.stringify(msg)
                                        )}
                                    </div>
                                    {msg.targetClientId && (
                                        <div className="mt-2 text-sm text-green-600">
                                            Mensaje directo para cliente #{msg.targetClientId}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="mt-6 text-sm text-gray-500">
                    <p className="mt-2 text-xs text-gray-400">
                        API Backend: {backendUrl} • WebSocket: {wsUrl}
                    </p>
                </div>
            </div>
        </div>
    )
} 