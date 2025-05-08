import { useState, useEffect } from 'react'
import axios from '@/lib/axios'

export default function AssociateContentModal({ contentId, open, onClose }) {
    const [headquarters, setHeadquarters] = useState([])
    const [clients, setClients] = useState([])
    const [selectedHeadquarters, setSelectedHeadquarters] = useState('')
    const [selectedClient, setSelectedClient] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (open) {
            axios.get('/api/headquarters').then(res => {
                setHeadquarters(res.data.data || res.data)
            })
        }
    }, [open])

    useEffect(() => {
        if (selectedHeadquarters) {
            axios.get('/api/clients').then(res => {
                const filtered = (res.data.data || res.data).filter(c => c.headquarters_id == selectedHeadquarters)
                setClients(filtered)
            })
        } else {
            setClients([])
        }
    }, [selectedHeadquarters])

    const handleAssociate = async () => {
        setLoading(true)
        setError(null)
        setMessage(null)
        try {
            await axios.post(`/api/clients/${selectedClient}/attach-content`, { content_id: contentId })
            setMessage('Contenido asociado correctamente')
        } catch (err) {
            setError('Error al asociar el contenido')
        }
        setLoading(false)
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
                <h2 className="text-lg font-bold mb-4">Asociar contenido a cliente</h2>
                {message && <div className="bg-green-100 text-green-700 p-2 rounded mb-2">{message}</div>}
                {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-2">{error}</div>}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Sede</label>
                    <select
                        className="block w-full border rounded p-2"
                        value={selectedHeadquarters}
                        onChange={e => setSelectedHeadquarters(e.target.value)}
                    >
                        <option value="">Selecciona una sede</option>
                        {headquarters.map(hq => (
                            <option key={hq.id} value={hq.id}>{hq.name}</option>
                        ))}
                    </select>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Cliente</label>
                    <select
                        className="block w-full border rounded p-2"
                        value={selectedClient}
                        onChange={e => setSelectedClient(e.target.value)}
                        disabled={!selectedHeadquarters}
                    >
                        <option value="">Selecciona un cliente</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                        onClick={onClose}
                        type="button"
                    >
                        Cancelar
                    </button>
                    <button
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        onClick={handleAssociate}
                        disabled={!selectedClient || loading}
                        type="button"
                    >
                        Asociar
                    </button>
                </div>
            </div>
        </div>
    )
} 