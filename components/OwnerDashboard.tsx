import React, { useState, useEffect } from 'react';
import { User, Salon, Booking, Service, BookingStatus } from '../types';
import { SalonService, BookingService } from '../services/mockBackend';
import { Calendar, Clock, Scissors, Check, X, LogOut, Phone, User as UserIcon, CalendarOff, Power, PlusCircle, Trash2, Copy } from 'lucide-react';

interface Props {
  user: User;
  onLogout: () => void;
}

const OwnerDashboard: React.FC<Props> = ({ user, onLogout }) => {
  const [salon, setSalon] = useState<Salon | undefined>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [activeTab, setActiveTab] = useState<'bookings' | 'services' | 'slots'>('bookings');

  // Service Form
  const [newService, setNewService] = useState({ name: '', price: '', duration: '30' });
  
  // Availability Management
  const [manageDate, setManageDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customSlotTime, setCustomSlotTime] = useState<string>('');

  useEffect(() => {
    if (user.salonId) {
      loadData(user.salonId);
    }
  }, [user]);

  const loadData = async (id: string) => {
    const s = await SalonService.getById(id);
    setSalon(s);
    if (s) setServices(s.services);
    
    const b = await BookingService.getBySalon(id);
    // Sort bookings: Pending first, then by date
    b.sort((a, b) => {
      if (a.status === BookingStatus.PENDING && b.status !== BookingStatus.PENDING) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    setBookings(b);
  };

  const handleStatusUpdate = async (id: string, status: BookingStatus) => {
    await BookingService.updateStatus(id, status);
    if (user.salonId) loadData(user.salonId);
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon) return;
    const service: Service = {
      id: `srv_${Date.now()}`,
      name: newService.name,
      price: Number(newService.price),
      durationMins: Number(newService.duration)
    };
    const updatedServices = [...services, service];
    await SalonService.updateServices(salon.id, updatedServices);
    setServices(updatedServices);
    setNewService({ name: '', price: '', duration: '30' });
  };

  const handleRemoveService = async (id: string) => {
    if (!salon) return;
    const updatedServices = services.filter(s => s.id !== id);
    await SalonService.updateServices(salon.id, updatedServices);
    setServices(updatedServices);
  };
  
  const toggleClosedDate = async () => {
    if (!salon) return;
    const isClosed = salon.closedDates?.includes(manageDate);
    await SalonService.toggleDateClosed(salon.id, manageDate, !isClosed);
    loadData(salon.id);
  };

  const handleAddCustomSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon || !customSlotTime) return;
    
    await SalonService.addCustomSlot(salon.id, manageDate, customSlotTime);
    setCustomSlotTime('');
    loadData(salon.id);
  };

  const handleRemoveCustomSlot = async (time: string) => {
    if (!salon) return;
    await SalonService.removeCustomSlot(salon.id, manageDate, time);
    loadData(salon.id);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`Copied ${text} to clipboard!`);
  };

  const timeSlots = salon ? SalonService.generateSlots(salon.openTime, salon.closeTime) : [];
  const customSlotsForDate = salon?.customSlots?.filter(s => s.date === manageDate).map(s => s.time) || [];

  if (!salon) return <div className="p-10 text-center">Loading Salon Data from Database...</div>;

  const isSelectedDateClosed = salon.closedDates?.includes(manageDate);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">{salon.name}</h1>
           <p className="text-sm text-gray-500">Owner Dashboard • {user.name}</p>
        </div>
        <button onClick={onLogout} className="text-rose-600 font-medium hover:text-rose-700 flex items-center gap-2">
           <LogOut size={18} /> Logout
        </button>
      </nav>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-2">
            <button onClick={() => setActiveTab('bookings')} 
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 font-medium ${activeTab === 'bookings' ? 'bg-slate-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                <Calendar size={20} /> Bookings
            </button>
            <button onClick={() => setActiveTab('services')} 
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 font-medium ${activeTab === 'services' ? 'bg-slate-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                <Scissors size={20} /> Services & Pricing
            </button>
             <button onClick={() => setActiveTab('slots')} 
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 font-medium ${activeTab === 'slots' ? 'bg-slate-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                <Clock size={20} /> Availability & Slots
            </button>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
            {activeTab === 'bookings' && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold mb-4">Manage Bookings</h2>
                    {bookings.length === 0 ? <p className="text-gray-500 italic">No bookings found.</p> : 
                     bookings.map(booking => (
                        <div key={booking.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide
                                        ${booking.status === BookingStatus.PENDING ? 'bg-yellow-100 text-yellow-700' : 
                                          booking.status === BookingStatus.CONFIRMED ? 'bg-green-100 text-green-700' : 
                                          'bg-red-100 text-red-700'}`}>
                                        {booking.status}
                                    </span>
                                    <span className="text-gray-400 text-sm">#{booking.id}</span>
                                </div>
                                <h3 className="font-bold text-lg text-slate-800">{booking.serviceName}</h3>
                                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                    <span className="flex items-center gap-1"><Calendar size={14} /> {booking.date}</span>
                                    <span className="flex items-center gap-1"><Clock size={14} /> {booking.time}</span>
                                </div>
                                <div className="mt-3 flex items-center gap-4">
                                     <div className="flex items-center gap-1 text-sm font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded">
                                        <UserIcon size={14} /> {booking.customerName}
                                     </div>
                                     <div className="flex items-center gap-1 text-sm font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded group">
                                        <Phone size={14} /> {booking.customerPhone}
                                        <button onClick={() => copyToClipboard(booking.customerPhone)} className="ml-1 text-gray-400 hover:text-rose-600 transition" title="Copy Number">
                                            <Copy size={12} />
                                        </button>
                                     </div>
                                </div>
                            </div>

                            {booking.status === BookingStatus.PENDING && (
                                <div className="flex gap-2 w-full md:w-auto">
                                    <button onClick={() => handleStatusUpdate(booking.id, BookingStatus.CANCELLED)} 
                                        className="flex-1 md:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100">
                                        <X size={18} /> Reject
                                    </button>
                                    <button onClick={() => handleStatusUpdate(booking.id, BookingStatus.CONFIRMED)} 
                                        className="flex-1 md:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 shadow-sm">
                                        <Check size={18} /> Confirm
                                    </button>
                                </div>
                            )}
                             {booking.status === BookingStatus.CONFIRMED && (
                                 <button onClick={() => alert(`Reminder sent to ${booking.customerPhone}!`)} className="text-sm text-rose-600 hover:underline">
                                    Send Reminder
                                 </button>
                             )}
                        </div>
                     ))
                    }
                </div>
            )}

            {activeTab === 'services' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                     <h2 className="text-xl font-bold mb-6">Service Menu</h2>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {services.map(s => (
                            <div key={s.id} className="p-4 border rounded-lg relative group hover:border-rose-200 transition">
                                <h3 className="font-bold">{s.name}</h3>
                                <p className="text-gray-600">₹{s.price} • {s.durationMins} mins</p>
                                <button onClick={() => handleRemoveService(s.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                     </div>

                     <div className="border-t pt-6">
                        <h3 className="font-medium text-gray-700 mb-4">Add New Service</h3>
                        <form onSubmit={handleAddService} className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full">
                                <label className="text-xs text-gray-500">Service Name</label>
                                <input required value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} 
                                    className="w-full border p-2 rounded outline-none focus:border-rose-500" placeholder="e.g. Hair Spa" />
                            </div>
                            <div className="w-24">
                                <label className="text-xs text-gray-500">Price (₹)</label>
                                <input required type="number" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} 
                                    className="w-full border p-2 rounded outline-none focus:border-rose-500" placeholder="0" />
                            </div>
                            <div className="w-32">
                                <label className="text-xs text-gray-500">Duration (m)</label>
                                <select value={newService.duration} onChange={e => setNewService({...newService, duration: e.target.value})}
                                    className="w-full border p-2 rounded outline-none focus:border-rose-500">
                                    <option value="15">15 min</option>
                                    <option value="30">30 min</option>
                                    <option value="45">45 min</option>
                                    <option value="60">60 min</option>
                                </select>
                            </div>
                            <button type="submit" className="bg-rose-600 text-white px-6 py-2 rounded hover:bg-rose-700 w-full md:w-auto">Add</button>
                        </form>
                     </div>
                </div>
            )}

            {activeTab === 'slots' && (
                <div className="space-y-6">
                    {/* Availability Control Panel */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                           <CalendarOff className="text-rose-500" size={22} /> Manage Availability
                        </h2>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="w-full md:w-auto">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
                                <input 
                                    type="date" 
                                    value={manageDate} 
                                    onChange={e => setManageDate(e.target.value)}
                                    className="w-full md:w-48 p-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" 
                                />
                            </div>
                            <div className="flex-1">
                                {isSelectedDateClosed ? (
                                    <div className="flex items-center gap-3 bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-100">
                                        <Power size={18} />
                                        <span className="font-medium">Shop is marked as CLOSED on this date.</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-100">
                                        <Check size={18} />
                                        <span className="font-medium">Shop is OPEN on this date.</span>
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={toggleClosedDate}
                                className={`px-6 py-2.5 rounded-lg font-bold text-white transition shadow-sm w-full md:w-auto
                                    ${isSelectedDateClosed ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}
                            >
                                {isSelectedDateClosed ? 'Mark as Open' : 'Mark as Closed'}
                            </button>
                        </div>
                    </div>
                    
                    {/* Manual Slot Addition */}
                    {!isSelectedDateClosed && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <PlusCircle className="text-slate-800" size={22} /> Add Custom Time Slot
                            </h2>
                            <p className="text-sm text-gray-500 mb-4">
                                Manually add a specific time slot for the selected date ({manageDate}). This is useful for early morning or late night appointments.
                            </p>
                            <form onSubmit={handleAddCustomSlot} className="flex gap-4 items-end max-w-md">
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-500 mb-1">Time</label>
                                    <input 
                                        type="time" 
                                        required
                                        value={customSlotTime} 
                                        onChange={e => setCustomSlotTime(e.target.value)}
                                        className="w-full p-2 border rounded focus:border-rose-500 outline-none" 
                                    />
                                </div>
                                <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800 font-medium">
                                    Add Slot
                                </button>
                            </form>

                            {customSlotsForDate.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-sm font-bold text-gray-700 mb-2">Custom Slots Added for {manageDate}:</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {customSlotsForDate.sort().map(time => (
                                            <div key={time} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                                                {time}
                                                <button onClick={() => handleRemoveCustomSlot(time)} className="text-indigo-400 hover:text-red-500">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <h2 className="text-xl font-bold mb-4">Daily Slot Structure</h2>
                        <p className="text-sm text-gray-500 mb-6">Generated automatically based on opening hours ({salon.openTime} - {salon.closeTime}) with a break 12:30-13:30.</p>
                        
                        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            {timeSlots.map((time, idx) => (
                                <div key={idx} className="bg-slate-50 text-slate-700 text-center py-2 rounded text-sm font-medium border">
                                    {time}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;