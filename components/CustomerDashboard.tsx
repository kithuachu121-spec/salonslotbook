import React, { useState, useEffect } from 'react';
import { User, Salon, Booking, Service, BookingStatus } from '../types';
import { SalonService, BookingService, AuthService } from '../services/mockBackend';
import { Search, MapPin, Star, Calendar as CalIcon, Clock, ChevronRight, User as UserIcon, LogOut, CalendarOff, Bell, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Props {
  user: User;
  onLogout: () => void;
  onUserUpdate?: () => void;
}

const CustomerDashboard: React.FC<Props> = ({ user, onLogout, onUserUpdate }) => {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [view, setView] = useState<'browse' | 'details' | 'history'>('browse');
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [profileError, setProfileError] = useState('');
  
  // Booking Flow State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isProfileComplete, setIsProfileComplete] = useState(!!(user.phone && user.name));
  const [profileForm, setProfileForm] = useState({ name: user.name || '', phone: user.phone || '' });
  const [takenSlots, setTakenSlots] = useState<string[]>([]);

  // Reminder State
  const [reminderBooking, setReminderBooking] = useState<Booking | null>(null);

  useEffect(() => {
    loadSalons();
  }, [user]);

  const loadSalons = async () => {
    const allSalons = await SalonService.getAll();
    setSalons(allSalons.filter(s => s.status === 'ACTIVE'));
    refreshBookings();
  };

  // Polling for notifications (10 min warning)
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      
      const upcoming = myBookings.find(b => {
        // Must be confirmed, not yet customer-confirmed (this notification), and not cancelled
        if (b.status !== BookingStatus.CONFIRMED || b.customerConfirmed) return false;
        
        // Parse Local Date Time from booking
        const [year, month, day] = b.date.split('-').map(Number);
        const [hours, minutes] = b.time.split(':').map(Number);
        const bookingTime = new Date(year, month - 1, day, hours, minutes);
        
        const diffMs = bookingTime.getTime() - now.getTime();
        const diffMins = diffMs / (1000 * 60);

        // Notify if within 0 to 10 minutes
        return diffMins > 0 && diffMins <= 10;
      });

      if (upcoming) {
          setReminderBooking(upcoming);
      }
    };

    // Check every 10 seconds
    const timer = setInterval(checkReminders, 10000);
    // Also check immediately
    if (myBookings.length > 0) checkReminders();

    return () => clearInterval(timer);
  }, [myBookings]);

  // Effect to load taken slots when selecting date/salon
  useEffect(() => {
    const fetchSlots = async () => {
        if (selectedSalon && selectedDate) {
            // We need to fetch all bookings for this day to know which slots are taken.
            // Optimized approach: Get bookings by salon, filter client side or backend side.
            // Since backend function `isSlotTaken` is one-off, let's fetch all salon bookings for the day.
            // For now using the existing getBySalon and filtering.
            const bookings = await BookingService.getBySalon(selectedSalon.id);
            const taken = bookings
                .filter(b => b.date === selectedDate && b.status !== BookingStatus.CANCELLED)
                .map(b => b.time);
            setTakenSlots(taken);
        }
    };
    fetchSlots();
  }, [selectedSalon, selectedDate]);

  const refreshBookings = async () => {
    const b = await BookingService.getByCustomer(user.id);
    setMyBookings(b);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    if (!/^\d{10}$/.test(profileForm.phone.trim())) {
      setProfileError('Please enter a valid 10-digit phone number.');
      return;
    }
    if (!profileForm.name.trim()) {
      setProfileError('Please enter your full name.');
      return;
    }
    await AuthService.updateCustomerProfile(user.id, profileForm.phone, profileForm.name);
    setIsProfileComplete(true);
    if (onUserUpdate) onUserUpdate();
  };

  const initiateBooking = (salon: Salon) => {
    setSelectedSalon(salon);
    setView('details');
    // Reset booking selection
    setSelectedService(null);
    setSelectedDate('');
    setSelectedTime('');
  };

  const confirmBooking = async () => {
    if (!selectedSalon || !selectedService || !selectedDate || !selectedTime) return;

    await BookingService.create({
      salonId: selectedSalon.id,
      customerId: user.id,
      customerName: user.name || profileForm.name || 'Valued Customer',
      customerPhone: user.phone || profileForm.phone || 'No Phone',
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      price: selectedService.price,
      date: selectedDate,
      time: selectedTime,
    });

    alert('Booking Request Sent! The salon owner has been notified.');
    setView('history');
    refreshBookings();
  };

  // Notification Handlers
  const handleReminderConfirm = async () => {
    if (reminderBooking) {
        await BookingService.confirmArrival(reminderBooking.id);
        alert('Thank you for confirming! See you soon.');
        setReminderBooking(null);
        refreshBookings();
    }
  };

  const handleReminderCancel = async () => {
    if (reminderBooking) {
        await BookingService.updateStatus(reminderBooking.id, BookingStatus.CANCELLED);
        alert('Booking cancelled.');
        setReminderBooking(null);
        refreshBookings();
    }
  };

  // Helper to get next 7 days, excluding Tuesdays
  const getNext7Days = () => {
    const dates = [];
    let d = new Date();
    
    while (dates.length < 7) {
      // 0 = Sunday, 1 = Monday, 2 = Tuesday, ...
      if (d.getDay() !== 2) {
        dates.push(d.toISOString().split('T')[0]);
      }
      // Move to next day
      d.setDate(d.getDate() + 1);
    }
    return dates;
  };

  if (!isProfileComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
            <h2 className="text-2xl font-bold mb-2">Complete Your Profile</h2>
            <p className="text-gray-500 mb-6">Before you book, please provide your contact details so salons can reach you.</p>
            
            {profileError && (
               <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm mb-4 flex items-center gap-2 text-left">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  {profileError}
               </div>
            )}

            <form onSubmit={handleProfileUpdate} className="space-y-4 text-left">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input required className="w-full border p-2 rounded focus:ring-2 focus:ring-rose-500 outline-none" value={profileForm.name} onChange={e => {setProfileForm({...profileForm, name: e.target.value}); setProfileError('');}} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input required type="tel" className="w-full border p-2 rounded focus:ring-2 focus:ring-rose-500 outline-none" value={profileForm.phone} onChange={e => {setProfileForm({...profileForm, phone: e.target.value}); setProfileError('');}} placeholder="10-digit number" />
                </div>
                <button className="w-full bg-rose-600 text-white py-3 rounded-lg font-bold hover:bg-rose-700">Save & Continue</button>
            </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 relative">
        {/* Notification Modal */}
        {reminderBooking && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-bounce-short">
                    <div className="bg-rose-600 p-4 text-white flex items-center gap-3">
                        <Bell className="animate-pulse" />
                        <h3 className="font-bold text-lg">Upcoming Appointment</h3>
                    </div>
                    <div className="p-6">
                        <p className="text-gray-600 mb-4">
                            You have an appointment for <span className="font-bold text-slate-800">{reminderBooking.serviceName}</span> starting in less than 10 minutes at <span className="font-bold text-slate-800">{reminderBooking.time}</span>.
                        </p>
                        <p className="text-sm text-gray-500 mb-6">Please confirm your arrival or cancel the slot.</p>
                        
                        <div className="flex flex-col gap-3">
                            <button onClick={handleReminderConfirm} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2">
                                <CheckCircle size={20} /> Confirm Booking
                            </button>
                            <button onClick={handleReminderCancel} className="w-full py-3 bg-gray-100 text-red-600 border border-gray-200 rounded-xl font-bold hover:bg-red-50 flex items-center justify-center gap-2">
                                <XCircle size={20} /> Cancel Booking
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Header */}
        <div className="bg-white sticky top-0 z-10 shadow-sm">
            <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
                <div className="font-bold text-xl text-slate-800">Book My Salon</div>
                <div className="flex gap-4">
                     <button onClick={() => setView('browse')} className={`text-sm font-medium ${view !== 'history' ? 'text-rose-600' : 'text-gray-500'}`}>Explore</button>
                     <button onClick={() => setView('history')} className={`text-sm font-medium ${view === 'history' ? 'text-rose-600' : 'text-gray-500'}`}>My Bookings</button>
                     <button onClick={onLogout} className="text-gray-400 hover:text-red-500"><LogOut size={20} /></button>
                </div>
            </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
            
            {view === 'browse' && (
                <>
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Find the best salons near you</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {salons.map(salon => (
                            <div key={salon.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100 group">
                                <div className="h-32 bg-slate-200 flex items-center justify-center text-gray-400 relative">
                                    <span className="text-3xl font-light">Image Placeholder</span>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                    <h3 className="absolute bottom-3 left-4 text-white font-bold text-xl drop-shadow-md">{salon.name}</h3>
                                </div>
                                <div className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="flex items-center gap-1 text-gray-600 text-sm mb-2"><MapPin size={14} className="text-rose-500" /> {salon.location}</p>
                                            <p className="text-xs text-gray-400">Hours: {salon.openTime} - {salon.closeTime}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                                        {salon.services.slice(0, 3).map(s => (
                                            <span key={s.id} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md whitespace-nowrap">{s.name}</span>
                                        ))}
                                    </div>
                                    <button onClick={() => initiateBooking(salon)} className="w-full mt-4 bg-slate-900 text-white py-2 rounded-lg font-medium hover:bg-slate-800 transition">
                                        View & Book
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {view === 'details' && selectedSalon && (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <button onClick={() => setView('browse')} className="p-4 text-gray-500 hover:text-slate-900 text-sm flex items-center gap-1">← Back to salons</button>
                    
                    <div className="px-6 pb-6 pt-4">
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">{selectedSalon.name}</h1>
                        <p className="text-gray-500 flex items-center gap-2"><MapPin size={16} /> {selectedSalon.location}</p>
                        
                        <div className="mt-8">
                            <h3 className="font-bold text-lg mb-4">1. Select Service</h3>
                            <div className="space-y-2">
                                {selectedSalon.services.map(s => (
                                    <div key={s.id} onClick={() => setSelectedService(s)}
                                        className={`p-4 rounded-lg border cursor-pointer flex justify-between items-center transition ${selectedService?.id === s.id ? 'border-rose-500 bg-rose-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <div>
                                            <p className="font-medium text-slate-800">{s.name}</p>
                                            <p className="text-sm text-gray-500">{s.durationMins} mins</p>
                                        </div>
                                        <p className="font-bold text-slate-900">₹{s.price}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedService && (
                            <div className="mt-8">
                                <h3 className="font-bold text-lg mb-4">2. Select Date & Time</h3>
                                <p className="text-sm text-rose-600 mb-2">Note: Salons are closed on Tuesdays.</p>
                                <div className="flex gap-2 overflow-x-auto pb-4">
                                    {getNext7Days().map(date => (
                                        <button key={date} onClick={() => { setSelectedDate(date); setSelectedTime(''); }}
                                            className={`px-4 py-2 rounded-lg border whitespace-nowrap transition ${selectedDate === date ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600'}`}>
                                            {new Date(date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                                        </button>
                                    ))}
                                </div>
                                
                                {selectedDate && (
                                    <div className="mt-4">
                                        {selectedSalon.closedDates?.includes(selectedDate) ? (
                                            <div className="p-6 bg-red-50 border border-red-100 rounded-lg text-center text-red-600 flex flex-col items-center gap-2">
                                                <CalendarOff size={32} />
                                                <span className="font-bold">Salon Closed</span>
                                                <span className="text-sm">The salon owner has marked this day as closed. Please select another date.</span>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                                                {(() => {
                                                    // Merge Standard Slots + Custom Slots
                                                    const standardSlots = SalonService.generateSlots(selectedSalon.openTime, selectedSalon.closeTime);
                                                    const customSlots = selectedSalon.customSlots
                                                        ?.filter(s => s.date === selectedDate)
                                                        .map(s => s.time) || [];
                                                    
                                                    // Combine and sort
                                                    const allSlots = Array.from(new Set([...standardSlots, ...customSlots])).sort();

                                                    return allSlots.map(time => {
                                                        const isTaken = takenSlots.includes(time);
                                                        const isCustom = customSlots.includes(time);
                                                        return (
                                                            <button key={time} disabled={isTaken} onClick={() => setSelectedTime(time)}
                                                                className={`py-2 text-sm rounded border 
                                                                    ${isTaken ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 
                                                                    selectedTime === time ? 'bg-rose-600 text-white border-rose-600' : 
                                                                    'hover:border-rose-300 text-gray-700'}
                                                                    ${isCustom && !isTaken && selectedTime !== time ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : ''}
                                                                `}>
                                                                {time}
                                                            </button>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-8 border-t pt-6">
                            <button 
                                disabled={!selectedService || !selectedDate || !selectedTime}
                                onClick={confirmBooking}
                                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition shadow-lg">
                                Confirm Booking
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {view === 'history' && (
                <div>
                    <h2 className="text-2xl font-bold mb-6">My Bookings</h2>
                    <div className="space-y-4">
                        {myBookings.length === 0 ? <p className="text-gray-500">No bookings yet.</p> : 
                        myBookings.map(b => (
                            <div key={b.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-lg">{b.serviceName}</h3>
                                        <p className="text-gray-500 text-sm mb-2">at {b.salonName || 'Salon'}</p>
                                        <div className="flex items-center gap-3 text-sm text-slate-700">
                                            <span className="flex items-center gap-1"><CalIcon size={14}/> {b.date}</span>
                                            <span className="flex items-center gap-1"><Clock size={14}/> {b.time}</span>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                        b.status === BookingStatus.CONFIRMED ? 'bg-green-100 text-green-700' : 
                                        b.status === BookingStatus.PENDING ? 'bg-yellow-100 text-yellow-700' : 
                                        'bg-red-100 text-red-700'
                                    }`}>
                                        {b.status}
                                    </span>
                                </div>
                                {b.status === BookingStatus.COMPLETED && (
                                    <button className="mt-4 text-rose-600 text-sm font-medium hover:underline">Write a Review</button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default CustomerDashboard;