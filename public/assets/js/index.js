// Lógica específica de la aplicación
(function() {
    'use strict';

    // Funciones de utilidad
    const utils = {
        formatDate: (date) => {
            return new Date(date).toLocaleDateString('es-ES');
        },
        formatTime: (date) => {
            return new Date(date).toLocaleTimeString('es-ES');
        }
    };

    // Exponer utilidades globalmente
    window.APP = window.APP || {};
    window.APP.utils = utils;

    // Inicialización cuando el DOM está listo
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Funcionalidades específicas inicializadas');
    });
})(); 