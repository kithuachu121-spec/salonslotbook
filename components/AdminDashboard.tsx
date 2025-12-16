import React, { useState, useEffect } from 'react';
import { SalonService } from '../services/mockBackend';
import { Salon, SalonStatus, Service } from '../types';
import { LogOut, Plus, Store, AlertCircle, CheckCircle, Search } from 'lucide-react';

interface Props {
  onLogout: () => void;
}

const AdminDashboard: React.FC<Props> = ({ onLogout }) => {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'register'>('list');
  const [regPassword, setRegPassword] = useState('');
  const [isAuthenticatedReg, setIsAuthenticatedReg] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [formError, setFormError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Registration Form State
  const [formData, setFormData] = useState<{
    name: string;
    ownerName: string;
    email: string;
    phone: string;
    location: string;
    openTime: string;
    closeTime: string;
    ownerPassword: string;
  }>({
    name: '', ownerName: '', email: '', phone: '', location: '', 
    openTime: '09:00', closeTime: '18:00', ownerPassword: ''
  });

  useEffect(() => {
    loadSalons();
  }, []);

  const loadSalons = async () => {
    setIsLoading(true);
    const data = await SalonService.getAll();
    setSalons(data);
    setIsLoading(false);
  };

  const getErrorMessage = (error: any) => {
    if (!error) return "Unknown error";
    if (typeof error === 'string') return error;
    if (error?.message && typeof error.message === 'string') return error.message;
    if (error?.error_description && typeof error.error_description === 'string') return error.error_description;
    if (error?.details && typeof error.details === 'string') return error.details;
    
    try {
        return JSON.stringify(error);
    } catch (e) {
        return "An unexpected error occurred";
    }
  };

  const handleRegisterAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (regPassword === 'admin123') {
      setIsAuthenticatedReg(true);
    } else {
      setAuthError('Incorrect Password. Please try again.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    // VALIDATION: Email must be @gmail.com
    if (!formData.email.trim().endsWith('@gmail.com')) {
      setFormError('Owner Email must be a valid @gmail.com address.');
      return;
    }

    // VALIDATION: Phone must be 10 digits
    if (!/^\d{10}$/.test(formData.phone.trim())) {
      setFormError('Owner Phone must be exactly 10 digits.');
      return;
    }

    // Default services for new salon
    const defaultServices: Service[] = [
      { id: `s_${Date.now()}_1`, name: 'Consultation', price: 0, durationMins: 15 }
    ];

    try {
        const newSalon = await SalonService.register({
            name: formData.name,
            ownerName: formData.ownerName,
            email: formData.email, 
            phone: formData.phone,
            location: formData.location,
            openTime: formData.openTime,
            closeTime: formData.closeTime,
            password: formData.ownerPassword,
            services: defaultServices
        });

        alert(`Salon Registered! ID: ${newSalon.id}. Pass this to the owner.`);
        setFormData({ name: '', ownerName: '', email: '', phone: '', location: '', openTime: '09:00', closeTime: '18:00', ownerPassword: '' });
        setActiveTab('list');
        setIsAuthenticatedReg(false);
        setRegPassword('');
        setFormError('');
        loadSalons();
    } catch (e) {
        console.error(e);
        setFormError(`Registration failed: ${getErrorMessage(e)}`);
    }
  };

  const filteredSalons = salons.filter(salon => 
    salon.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    salon.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-slate-900 text-white p-4 shadow-lg flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
            <Store className="w-6 h-6 text-rose-500" />
            <h1 className="text-xl font-bold">Book My Salon Admin</h1>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 text-sm hover:text-rose-400 transition">
          <LogOut size={16} /> Logout
        </button>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
            <div className="flex gap-4">
            <button 
                onClick={() => { setActiveTab('list'); loadSalons(); }}
                className={`px-6 py-2 rounded-lg font-medium transition ${activeTab === 'list' ? 'bg-rose-600 text-white' : 'bg-white text-gray-600 shadow'}`}
            >
                Salon Overview
            </button>
            <button 
                onClick={() => setActiveTab('register')}
                className={`px-6 py-2 rounded-lg font-medium transition flex items-center gap-2 ${activeTab === 'register' ? 'bg-rose-600 text-white' : 'bg-white text-gray-600 shadow'}`}
            >
                <Plus size={18} /> Register New Salon
            </button>
            </div>
        </div>

        {activeTab === 'list' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center gap-4">
                 <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search salons or owners..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none text-sm"
                    />
                 </div>
            </div>

            {isLoading ? (
                <div className="p-8 text-center text-gray-500">Loading Salons from Database...</div>
            ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                    <tr>
                        <th className="p-4 font-semibold text-gray-600">Salon Name</th>
                        <th className="p-4 font-semibold text-gray-600">ID</th>
                        <th className="p-4 font-semibold text-gray-600">Owner Name</th>
                        <th className="p-4 font-semibold text-gray-600">Owner Phone</th>
                        <th className="p-4 font-semibold text-gray-600">Password</th>
                        <th className="p-4 font-semibold text-gray-600">Total Bookings</th>
                        <th className="p-4 font-semibold text-gray-600">Status</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredSalons.length === 0 ? (
                        <tr><td colSpan={7} className="p-6 text-center text-gray-400">No salons found matching your search.</td></tr>
                    ) : (
                        filteredSalons.map(salon => (
                        <tr key={salon.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                            <td className="p-4 font-bold text-slate-800">
                                {salon.name}
                            </td>
                            <td className="p-4 text-sm font-mono bg-gray-50 rounded text-gray-500">{salon.id}</td>
                            <td className="p-4 text-sm">{salon.ownerName}</td>
                            <td className="p-4 text-sm font-medium">{salon.ownerPhone}</td>
                            <td className="p-4 text-sm font-mono text-gray-500 bg-gray-100 rounded px-2 py-1 w-max">{salon.password || 'N/A'}</td>
                            <td className="p-4 text-center">
                                <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full font-bold text-xs shadow-sm">
                                    {salon.bookingCount}
                                </span>
                            </td>
                            <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${salon.status === SalonStatus.ACTIVE ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {salon.status === SalonStatus.ACTIVE ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                {salon.status}
                            </span>
                            </td>
                        </tr>
                        ))
                    )}
                    </tbody>
                </table>
                </div>
            )}
          </div>
        )}

        {activeTab === 'register' && (
          <div className="bg-white rounded-xl shadow-md p-8 max-w-2xl mx-auto">
             {!isAuthenticatedReg ? (
               <div className="text-center py-10">
                 <h2 className="text-2xl font-bold mb-4">Admin Authentication Required</h2>
                 <p className="text-gray-500 mb-6">Enter the master password to register a new salon.</p>
                 
                 {authError && (
                    <div className="bg-red-50 text-red-600 p-2 rounded mb-4 text-sm inline-flex items-center gap-2">
                        <AlertCircle size={16} /> {authError}
                    </div>
                 )}

                 <form onSubmit={handleRegisterAuth} className="flex gap-2 justify-center max-w-sm mx-auto">
                   <input type="password" value={regPassword} onChange={e => {setRegPassword(e.target.value); setAuthError('');}} 
                     className="border p-2 rounded w-full outline-none focus:border-rose-500" placeholder="Password" />
                   <button className="bg-rose-600 text-white px-6 py-2 rounded hover:bg-rose-700 font-bold">Verify</button>
                 </form>
               </div>
             ) : (
               <form onSubmit={handleRegisterSubmit} className="space-y-4">
                 <h2 className="text-2xl font-bold mb-6">Register New Salon</h2>
                 
                 {formError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-start gap-2 text-sm">
                        <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                        <span>{formError}</span>
                    </div>
                 )}

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Salon Name</label>
                        <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                            className="w-full border p-2 rounded mt-1 outline-none focus:border-rose-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Owner Name</label>
                        <input required value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} 
                            className="w-full border p-2 rounded mt-1 outline-none focus:border-rose-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Owner Email</label>
                        <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} 
                            className="w-full border p-2 rounded mt-1 outline-none focus:border-rose-500" placeholder="example@gmail.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Owner Phone</label>
                        <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} 
                            className="w-full border p-2 rounded mt-1 outline-none focus:border-rose-500" placeholder="10-digit number" />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Location</label>
                        <input required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} 
                            className="w-full border p-2 rounded mt-1 outline-none focus:border-rose-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Opening Time</label>
                        <input type="time" required value={formData.openTime} onChange={e => setFormData({...formData, openTime: e.target.value})} 
                            className="w-full border p-2 rounded mt-1 outline-none focus:border-rose-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Closing Time</label>
                        <input type="time" required value={formData.closeTime} onChange={e => setFormData({...formData, closeTime: e.target.value})} 
                            className="w-full border p-2 rounded mt-1 outline-none focus:border-rose-500" />
                    </div>

                    <div className="col-span-2">
                         <label className="block text-sm font-medium text-gray-700">Set Owner Password</label>
                         <input required value={formData.ownerPassword} onChange={e => setFormData({...formData, ownerPassword: e.target.value})} 
                            className="w-full border p-2 rounded mt-1 bg-yellow-50 outline-none focus:border-yellow-400" placeholder="Create a temporary password" />
                    </div>
                 </div>
                 <button className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 mt-4 transition">
                    Register Salon
                 </button>
               </form>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;