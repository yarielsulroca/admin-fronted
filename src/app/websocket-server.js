// Esto es un archivo placeholder para el servidor WebSocket real
// En producción, este endpoint sería reemplazado por un servidor WebSocket real
// Este archivo existe para que las rutas en el cliente no fallen

if (typeof window !== 'undefined') {
    console.log('[WebSocket Server] Este es un archivo placeholder.');
    console.log('[WebSocket Server] Para pruebas, usa el servidor simulado en /websocket-test');
    
    // Redirigir automáticamente a la ruta de pruebas de WebSocket
    window.addEventListener('DOMContentLoaded', () => {
        const isWebSocketPath = window.location.pathname.includes('websocket-server');
        if (isWebSocketPath) {
            console.info('[WebSocket Server] Redirigiendo a la página de pruebas WebSocket...');
            setTimeout(() => {
                window.location.href = '/websocket-test';
            }, 2000);
        }
    });
}
