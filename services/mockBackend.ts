import { User, Salon, Booking, Review, UserRole, SalonStatus, BookingStatus, Service } from '../types';
import { createClient } from '@supabase/supabase-js';

/* 
  ===================================================================
  🚀 SUPABASE SETUP - UPDATED SCHEMA (RUN THIS SQL)
  ===================================================================
  
  -- 1. DROP OLD TABLES IF THEY EXIST (OPTIONAL, DATA WILL BE LOST)
  -- DROP TABLE IF EXISTS bookings;
  -- DROP TABLE IF EXISTS salon_credentials;
  -- DROP TABLE IF EXISTS salons_public;
  -- DROP TABLE IF EXISTS users;
  -- DROP TABLE IF EXISTS reviews;

  -- 2. CREATE PUBLIC SALON DATA TABLE (No passwords here)
  CREATE TABLE salons_public (
    id text PRIMARY KEY,
    name text,
    location text,
    public_phone text, -- Phone number displayed to customers
    open_time text,
    close_time text,
    services jsonb DEFAULT '[]',
    status text,
    last_activity_date text,
    closed_dates jsonb DEFAULT '[]',
    custom_slots jsonb DEFAULT '[]'
  );

  -- 3. CREATE PRIVATE CREDENTIALS TABLE (Passwords & Owner Details)
  CREATE TABLE salon_credentials (
    salon_id text REFERENCES salons_public(id) ON DELETE CASCADE PRIMARY KEY,
    owner_name text,
    login_phone text, -- Used for login
    private_email text,
    password text -- Plain text as per requirements (use hashing in production)
  );

  -- 4. CREATE USERS TABLE
  CREATE TABLE users (
    id text PRIMARY KEY,
    email text,
    role text,
    name text,
    phone text
  );

  -- 5. CREATE BOOKINGS TABLE
  CREATE TABLE bookings (
    id text PRIMARY KEY,
    salon_id text REFERENCES salons_public(id) ON DELETE CASCADE,
    customer_id text, -- Loose reference to users(id)
    customer_name text,
    customer_phone text,
    service_id text,
    service_name text,
    price numeric,
    date text,
    time text,
    status text,
    created_at text,
    customer_confirmed boolean DEFAULT false
  );

  -- 6. CREATE REVIEWS TABLE
  CREATE TABLE reviews (
    id text PRIMARY KEY,
    salon_id text REFERENCES salons_public(id) ON DELETE CASCADE,
    customer_id text,
    customer_name text,
    rating numeric,
    comment text,
    date text
  );
  
  ===================================================================
*/

const SUPABASE_URL = 'https://arpjgqhqoslnholyrxkl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BjFHJRpn79MEacsOjf8-CQ__pSSVS5H';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const STORAGE_KEYS = {
  CURRENT_USER: 'luxebook_current_user',
  SAVED_CREDENTIALS: 'luxebook_saved_credentials',
};

// --- Auth Service ---

export interface SavedCredential {
  role: string;
  email: string;
  salonId?: string;
  password?: string;
  name?: string;
  timestamp: number;
}

export const AuthService = {
  getSavedCredentials: (): SavedCredential[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.SAVED_CREDENTIALS);
    return stored ? JSON.parse(stored) : [];
  },

  saveCredential: (cred: Omit<SavedCredential, 'timestamp'>) => {
    let saved = AuthService.getSavedCredentials();
    saved = saved.filter(c => {
      if (cred.role !== c.role) return true;
      if (cred.role === 'owner') return c.salonId !== cred.salonId;
      return c.email !== cred.email;
    });
    saved.unshift({ ...cred, timestamp: Date.now() });
    if (saved.length > 5) saved.pop();
    localStorage.setItem(STORAGE_KEYS.SAVED_CREDENTIALS, JSON.stringify(saved));
  },

  removeCredential: (role: string, identifier: string) => {
    let saved = AuthService.getSavedCredentials();
    saved = saved.filter(c => {
       if (c.role !== role) return true;
       if (role === 'owner') return c.salonId !== identifier;
       return c.email !== identifier;
    });
    localStorage.setItem(STORAGE_KEYS.SAVED_CREDENTIALS, JSON.stringify(saved));
  },

  loginAdmin: async (user: string, pass: string): Promise<User | null> => {
    if (user === 'admin2025' && pass === 'admin123') {
      const admin: User = { id: 'admin_1', email: 'admin@bookmysalon.com', role: UserRole.ADMIN };
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(admin));
      return admin;
    }
    return null;
  },

  loginOwner: async (salonId: string, phone: string, pass: string): Promise<User | null> => {
    // 1. Authenticate against the SECURE credentials table
    const { data: creds, error } = await supabase
      .from('salon_credentials')
      .select('*, salons_public(*)') // Join to get public details if auth succeeds
      .eq('salon_id', salonId)
      .eq('login_phone', phone)
      .eq('password', pass)
      .single();

    if (error || !creds || !creds.salons_public) {
      console.error("Login failed:", error);
      return null;
    }

    const publicData = creds.salons_public;

    const owner: User = { 
      id: `owner_${publicData.id}`, 
      email: creds.private_email, 
      role: UserRole.OWNER, 
      salonId: publicData.id,
      name: creds.owner_name,
      phone: creds.login_phone
    };
    
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(owner));
    
    AuthService.saveCredential({
      role: 'owner',
      email: phone,
      password: pass,
      salonId: salonId,
      name: publicData.name
    });

    return owner;
  },

  loginCustomer: async (email: string): Promise<User> => {
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', UserRole.CUSTOMER)
      .single();
    
    if (!user) {
      const newUser = {
        id: `cust_${Date.now()}`,
        email,
        role: UserRole.CUSTOMER
      };
      const { data } = await supabase.from('users').insert(newUser).select().single();
      user = data;
    }

    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      AuthService.saveCredential({
        role: 'customer',
        email: email,
        name: user.name || email.split('@')[0]
      });
      return user as User;
    }
    throw new Error("Login failed");
  },

  updateCustomerProfile: async (userId: string, phone: string, name: string) => {
    const { data } = await supabase
      .from('users')
      .update({ phone, name })
      .eq('id', userId)
      .select()
      .single();
      
    if (data) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(data));
    }
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return stored ? JSON.parse(stored) : null;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
};

// --- Salon Service ---

export const SalonService = {
  getAll: async (): Promise<Salon[]> => {
    // Fetch public info AND join credentials to get Owner Name and Password for the Admin dashboard
    const { data: salons } = await supabase
      .from('salons_public')
      .select('*, salon_credentials(owner_name, private_email, login_phone, password)');

    if (!salons) return [];

    // Fetch all bookings to count them per salon (robust approach for mock backend)
    const { data: allBookings } = await supabase.from('bookings').select('salon_id');
    const bookingCounts: Record<string, number> = {};
    if (allBookings) {
        allBookings.forEach((b: any) => {
            bookingCounts[b.salon_id] = (bookingCounts[b.salon_id] || 0) + 1;
        });
    }

    const now = new Date();
    const updatedSalons: Salon[] = [];

    for (const s of salons) {
      // Handle Auto-Inactivity Logic
      const lastActive = new Date(s.last_activity_date);
      const diffTime = Math.abs(now.getTime() - lastActive.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      let finalStatus = s.status;
      if (diffDays > 5 && s.status !== SalonStatus.INACTIVE) {
        finalStatus = SalonStatus.INACTIVE;
        await supabase.from('salons_public').update({ status: SalonStatus.INACTIVE }).eq('id', s.id);
      }

      // Safely handle mapped relationship which can be object or array depending on Supabase version/config
      const creds = Array.isArray(s.salon_credentials) 
        ? s.salon_credentials[0] 
        : s.salon_credentials;

      // Map DB structure to Frontend Interface
      updatedSalons.push({
        id: s.id,
        name: s.name,
        location: s.location,
        phone: s.public_phone,
        email: creds?.private_email || '', 
        ownerName: creds?.owner_name || 'Unknown',
        ownerPhone: creds?.login_phone || s.public_phone, 
        password: creds?.password, // Include password for Admin view
        openTime: s.open_time,
        closeTime: s.close_time,
        services: s.services,
        status: finalStatus,
        lastActivityDate: s.last_activity_date,
        closedDates: s.closed_dates || [],
        customSlots: s.custom_slots || [],
        bookingCount: bookingCounts[s.id] || 0
      });
    }
    
    return updatedSalons;
  },

  getById: async (id: string): Promise<Salon | undefined> => {
    const { data: s } = await supabase
        .from('salons_public')
        .select('*, salon_credentials(owner_name, private_email, login_phone)')
        .eq('id', id)
        .single();
        
    if (!s) return undefined;

    // Safely handle mapped relationship
    const creds = Array.isArray(s.salon_credentials) 
      ? s.salon_credentials[0] 
      : s.salon_credentials;

    return {
      id: s.id,
      name: s.name,
      location: s.location,
      phone: s.public_phone,
      email: creds?.private_email || '',
      ownerName: creds?.owner_name || 'Verified Owner',
      ownerPhone: creds?.login_phone || s.public_phone,
      openTime: s.open_time,
      closeTime: s.close_time,
      services: s.services,
      status: s.status,
      lastActivityDate: s.last_activity_date,
      closedDates: s.closed_dates || [],
      customSlots: s.custom_slots || []
    };
  },

  register: async (data: Omit<Salon, 'id' | 'status' | 'lastActivityDate' | 'closedDates' | 'customSlots'>): Promise<Salon> => {
    const newId = `salon_${Date.now().toString().slice(-6)}`;
    
    // 1. Insert Public Data
    const publicPayload = {
      id: newId,
      name: data.name,
      location: data.location,
      public_phone: data.phone, // Salon contact phone
      open_time: data.openTime,
      close_time: data.closeTime,
      services: data.services,
      status: SalonStatus.ACTIVE,
      last_activity_date: new Date().toISOString(),
      closed_dates: [],
      custom_slots: []
    };

    const { error: publicError } = await supabase.from('salons_public').insert(publicPayload);
    if (publicError) throw publicError;

    // 2. Insert Private Credentials (Password, Salon ID, Owner details)
    const credentialsPayload = {
      salon_id: newId,
      owner_name: data.ownerName,
      login_phone: data.phone, // Using same phone for login initially
      private_email: data.email,
      password: data.password 
    };

    const { error: credError } = await supabase.from('salon_credentials').insert(credentialsPayload);
    
    // Rollback if credentials fail (basic manual rollback)
    if (credError) {
        await supabase.from('salons_public').delete().eq('id', newId);
        throw credError;
    }

    return {
      ...data,
      id: newId,
      status: SalonStatus.ACTIVE,
      lastActivityDate: publicPayload.last_activity_date,
      closedDates: [],
      customSlots: []
    };
  },

  delete: async (salonId: string): Promise<void> => {
    // Explicitly delete all related data to ensure complete removal
    
    // 1. Delete Reviews
    const { error: reviewError } = await supabase.from('reviews').delete().eq('salon_id', salonId);
    if (reviewError) console.error("Error deleting reviews:", reviewError);

    // 2. Delete Bookings
    const { error: bookingError } = await supabase.from('bookings').delete().eq('salon_id', salonId);
    if (bookingError) throw new Error(bookingError.message || "Failed to delete bookings");

    // 3. Delete Credentials (explicitly, though cascade usually handles it)
    const { error: credError } = await supabase.from('salon_credentials').delete().eq('salon_id', salonId);
    if (credError) console.error("Error deleting credentials:", credError);

    // 4. Delete Public Salon Record
    const { error: salonError } = await supabase.from('salons_public').delete().eq('id', salonId);
    if (salonError) throw new Error(salonError.message || "Failed to delete salon public record");

    // 5. Clean up Local Storage
    AuthService.removeCredential('owner', salonId);
  },

  updateServices: async (salonId: string, services: Service[]) => {
    await supabase.from('salons_public').update({ 
      services, 
      last_activity_date: new Date().toISOString() 
    }).eq('id', salonId);
  },

  toggleDateClosed: async (salonId: string, date: string, isClosed: boolean) => {
    const { data: salon } = await supabase.from('salons_public').select('closed_dates').eq('id', salonId).single();
    if (!salon) return;
    
    let newDates: string[] = salon.closed_dates || [];
    if (isClosed) {
        if (!newDates.includes(date)) newDates.push(date);
    } else {
        newDates = newDates.filter(d => d !== date);
    }
    
    await supabase.from('salons_public').update({ 
      closed_dates: newDates, 
      last_activity_date: new Date().toISOString() 
    }).eq('id', salonId);
  },

  addCustomSlot: async (salonId: string, date: string, time: string) => {
    const { data: salon } = await supabase.from('salons_public').select('custom_slots').eq('id', salonId).single();
    if (!salon) return;

    const slots = salon.custom_slots || [];
    if (!slots.some((slot: any) => slot.date === date && slot.time === time)) {
      const newSlots = [...slots, { date, time }];
      await supabase.from('salons_public').update({ 
        custom_slots: newSlots, 
        last_activity_date: new Date().toISOString() 
      }).eq('id', salonId);
    }
  },

  removeCustomSlot: async (salonId: string, date: string, time: string) => {
    const { data: salon } = await supabase.from('salons_public').select('custom_slots').eq('id', salonId).single();
    if (!salon) return;

    const slots = salon.custom_slots || [];
    const newSlots = slots.filter((slot: any) => !(slot.date === date && slot.time === time));
    await supabase.from('salons_public').update({ 
        custom_slots: newSlots, 
        last_activity_date: new Date().toISOString() 
    }).eq('id', salonId);
  },

  generateSlots: (openTime: string, closeTime: string): string[] => {
    const slots: string[] = [];
    if (!openTime || !closeTime) return [];
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    let currentTotalMins = openH * 60 + openM;
    const endTotalMins = closeH * 60 + closeM;
    const lunchStart = 12 * 60 + 30;
    const lunchEnd = 13 * 60 + 30;
    while (currentTotalMins < endTotalMins) {
      const isLunch = (currentTotalMins >= lunchStart && currentTotalMins < lunchEnd);
      if (!isLunch) {
        const h = Math.floor(currentTotalMins / 60);
        const m = currentTotalMins % 60;
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
      currentTotalMins += 30;
      if (currentTotalMins >= lunchStart && currentTotalMins < lunchEnd) {
        currentTotalMins = lunchEnd;
      }
    }
    return slots;
  }
};

// --- Booking Service ---

export const BookingService = {
  create: async (booking: Omit<Booking, 'id' | 'status' | 'createdAt'>) => {
    const newId = `bk_${Date.now()}`;
    const dbPayload = {
      id: newId,
      salon_id: booking.salonId,
      customer_id: booking.customerId,
      customer_name: booking.customerName,
      customer_phone: booking.customerPhone,
      service_id: booking.serviceId,
      service_name: booking.serviceName,
      price: booking.price,
      date: booking.date,
      time: booking.time,
      status: BookingStatus.PENDING,
      created_at: new Date().toISOString(),
      customer_confirmed: false
    };

    const { data, error } = await supabase.from('bookings').insert(dbPayload).select().single();
    if (error) throw error;
    
    await supabase.from('salons_public').update({ last_activity_date: new Date().toISOString() }).eq('id', booking.salonId);

    return {
      ...data,
      salonId: data.salon_id,
      customerId: data.customer_id,
      customerName: data.customer_name,
      customerPhone: data.customer_phone,
      serviceId: data.service_id,
      serviceName: data.service_name,
      createdAt: data.created_at,
      customerConfirmed: data.customer_confirmed
    };
  },

  getBySalon: async (salonId: string): Promise<Booking[]> => {
    const { data } = await supabase.from('bookings').select('*').eq('salon_id', salonId);
    if (!data) return [];
    return data.map((b: any) => ({
      ...b,
      salonId: b.salon_id,
      customerId: b.customer_id,
      customerName: b.customer_name,
      customerPhone: b.customer_phone,
      serviceId: b.service_id,
      serviceName: b.service_name,
      createdAt: b.created_at,
      customerConfirmed: b.customer_confirmed
    }));
  },

  getByCustomer: async (customerId: string): Promise<Booking[]> => {
    // Join with salons_public to get the salon name
    const { data } = await supabase
        .from('bookings')
        .select('*, salons_public(name)')
        .eq('customer_id', customerId);
        
    if (!data) return [];
    
    return data.map((b: any) => ({
      ...b,
      salonId: b.salon_id,
      customerId: b.customer_id,
      customerName: b.customer_name,
      customerPhone: b.customer_phone,
      serviceId: b.service_id,
      serviceName: b.service_name,
      createdAt: b.created_at,
      customerConfirmed: b.customer_confirmed,
      salonName: b.salons_public?.name // Map the joined data
    }));
  },

  updateStatus: async (bookingId: string, status: BookingStatus) => {
    const { data } = await supabase.from('bookings').update({ status }).eq('id', bookingId).select('salon_id').single();
    if (data && status === BookingStatus.CONFIRMED) {
       await supabase.from('salons_public').update({ last_activity_date: new Date().toISOString() }).eq('id', data.salon_id);
    }
  },

  confirmArrival: async (bookingId: string) => {
    await supabase.from('bookings').update({ customer_confirmed: true }).eq('id', bookingId);
  },

  isSlotTaken: async (salonId: string, date: string, time: string): Promise<boolean> => {
    const { data } = await supabase
      .from('bookings')
      .select('id')
      .eq('salon_id', salonId)
      .eq('date', date)
      .eq('time', time)
      .neq('status', BookingStatus.CANCELLED);
    
    return data && data.length > 0;
  }
};

export const ReviewService = {
  create: async (review: Omit<Review, 'id' | 'date'>) => {
    const newId = `rev_${Date.now()}`;
    const payload = {
      id: newId,
      salon_id: review.salonId,
      customer_id: review.customerId,
      customer_name: review.customerName,
      rating: review.rating,
      comment: review.comment,
      date: new Date().toISOString().split('T')[0]
    };
    
    const { error } = await supabase.from('reviews').insert(payload);
    if (error) throw error;
    
    return payload;
  }
};

export const AdminService = {
  resetSystem: async () => {
    // Dangerous Operation: Wipes all data to give a fresh start
    // Using .neq('id', '0') to select all rows effectively
    await supabase.from('reviews').delete().neq('id', '0');
    await supabase.from('bookings').delete().neq('id', '0');
    await supabase.from('salon_credentials').delete().neq('salon_id', '0');
    await supabase.from('salons_public').delete().neq('id', '0');
    await supabase.from('users').delete().neq('role', 'ADMIN');
    localStorage.clear();
  }
};