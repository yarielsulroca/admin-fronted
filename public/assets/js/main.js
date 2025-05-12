// Configuración principal de la aplicación
(function() {
    'use strict';

    // Configuración global
    window.APP = {
        debug: window._env_?.NODE_ENV !== 'production',
        baseUrl: window._env_?.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
        wsUrl: window._env_?.NEXT_PUBLIC_WS_URL || 'ws://localhost:8090'
    };

    // Inicialización cuando el DOM está listo
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Aplicación inicializada');
    });
})(); 