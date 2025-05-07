'use client'
import Loader from '@/components/Loader'
import { useState, useEffect } from 'react'
import axios from '@/lib/axios'

export default function ClientsTable() {
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [form, setForm] = useState({
        name: '',
        ip_address: '',
        mac_address: '',
        is_allowed: true,
        location: '',
        description: '',
        headquarters_id: '',
    })
    const [editing, setEditing] = useState(null)
    const [message, setMessage] = useState(null)

    useEffect(() => {
        fetchClients()
    }, [])

    const fetchClients = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await axios.get('/api/clients')
            setClients(res.data.data)
        } catch (err) {
            setError('Error al cargar los clientes')
        }
        setLoading(false)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        try {
            if (editing) {
                await axios.put(`/api/clients/${editing.id}`, form)
                setMessage('Cliente actualizado correctamente')
            } else {
                await axios.post('/api/clients', form)
                setMessage('Cliente creado correctamente')
            }
            setForm({
                name: '',
                ip_address: '',
                mac_address: '',
                is_allowed: true,
                location: '',
                description: '',
                headquarters_id: '',
            })
            setEditing(null)
            fetchClients()
        } catch (err) {
            setError('Error al guardar el cliente')
        }
    }

    const handleEdit = (client) => {
        setEditing(client)
        setForm({
            name: client.name || '',
            ip_address: client.ip_address || '',
            mac_address: client.mac_address || '',
            is_allowed: client.is_allowed ?? true,
            location: client.location || '',
            description: client.description || '',
            headquarters_id: client.headquarters_id || '',
        })
    }

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar este cliente?')) return
        try {
            await axios.delete(`/api/clients/${id}`)
            setMessage('Cliente eliminado correctamente')
            fetchClients()
        } catch (err) {
            setError('Error al eliminar el cliente')
        }
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold">Clientes</h2>
            {message && <div className="bg-green-100 text-green-700 p-2 rounded">{message}</div>}
            {error && <div className="bg-red-100 text-red-700 p-2 rounded">{error}</div>}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow flex flex-col sm:flex-row flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium">Nombre</label>
                    <input
                        type="text"
                        className="mt-1 block w-full border rounded p-2"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        required
                    />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium">Dirección IP</label>
                    <input
                        type="text"
                        className="mt-1 block w-full border rounded p-2"
                        value={form.ip_address}
                        onChange={e => setForm({ ...form, ip_address: e.target.value })}
                    />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium">MAC Address</label>
                    <input
                        type="text"
                        className="mt-1 block w-full border rounded p-2"
                        value={form.mac_address}
                        onChange={e => setForm({ ...form, mac_address: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Activo</label>
                    <input
                        type="checkbox"
                        className="mt-2"
                        checked={form.is_allowed}
                        onChange={e => setForm({ ...form, is_allowed: e.target.checked })}
                    />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium">Ubicación</label>
                    <input
                        type="text"
                        className="mt-1 block w-full border rounded p-2"
                        value={form.location}
                        onChange={e => setForm({ ...form, location: e.target.value })}
                    />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium">Descripción</label>
                    <textarea
                        className="mt-1 block w-full border rounded p-2"
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                    />
                </div>
                <div className="flex-1 min-w-[120px]">
                    <label className="block text-sm font-medium">ID de Sede</label>
                    <input
                        type="number"
                        className="mt-1 block w-full border rounded p-2"
                        value={form.headquarters_id}
                        onChange={e => setForm({ ...form, headquarters_id: e.target.value })}
                    />
                </div>
                <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    {editing ? 'Actualizar' : 'Crear'}
                </button>
                {editing && (
                    <button
                        type="button"
                        className="ml-2 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                        onClick={() => {
                            setEditing(null)
                            setForm({
                                name: '',
                                ip_address: '',
                                mac_address: '',
                                is_allowed: true,
                                location: '',
                                description: '',
                                headquarters_id: '',
                            })
                        }}
                    >
                        Cancelar
                    </button>
                )}
            </form>

            {/* Tabla */}
            <div className="overflow-x-auto">
                {loading ? (
                    <Loader />
                ) : (
                    <table className="min-w-full bg-white rounded shadow">
                        <thead>
                            <tr>
                                <th className="px-4 py-2">ID</th>
                                <th className="px-4 py-2">Nombre</th>
                                <th className="px-4 py-2">IP</th>
                                <th className="px-4 py-2">MAC</th>
                                <th className="px-4 py-2">Activo</th>
                                <th className="px-4 py-2">Ubicación</th>
                                <th className="px-4 py-2">Descripción</th>
                                <th className="px-4 py-2">Sede</th>
                                <th className="px-4 py-2">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map(client => (
                                <tr key={client.id} className="border-t">
                                    <td className="px-4 py-2">{client.id}</td>
                                    <td className="px-4 py-2">{client.name}</td>
                                    <td className="px-4 py-2">{client.ip_address}</td>
                                    <td className="px-4 py-2">{client.mac_address}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${client.is_allowed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {client.is_allowed ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">{client.location}</td>
                                    <td className="px-4 py-2">{client.description}</td>
                                    <td className="px-4 py-2">{client.headquarters_id}</td>
                                    <td className="px-4 py-2 flex gap-2">
                                        <button
                                            className="bg-yellow-400 text-white px-2 py-1 rounded hover:bg-yellow-500"
                                            onClick={() => handleEdit(client)}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                                            onClick={() => handleDelete(client.id)}
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}