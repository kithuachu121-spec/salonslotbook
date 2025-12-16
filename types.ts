export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
}

export enum SalonStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export interface Service {
  id: string;
  name: string;
  price: number;
  durationMins: number;
}

export interface Salon {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  location: string;
  openTime: string; // "09:00"
  closeTime: string; // "18:00"
  services: Service[];
  status: SalonStatus;
  lastActivityDate: string; // ISO Date string
  password?: string; // Stored for simulation purposes only
  closedDates: string[]; // Array of YYYY-MM-DD representing closed days
  customSlots: { date: string; time: string }[]; // Manually added slots
  ownerPhone?: string; // Owner's login phone
  bookingCount?: number; // Total slots booked
  image?: string; // Base64 string of the salon image
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  phone?: string;
  salonId?: string; // If owner
}

export interface Booking {
  id: string;
  salonId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  price: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: BookingStatus;
  createdAt: string;
  customerConfirmed?: boolean; // True if customer confirmed via 10-min warning notification
  salonName?: string; // Populated via join for customer views
}

export interface Review {
  id: string;
  salonId: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
}