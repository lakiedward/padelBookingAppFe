export interface AllTimeSlotItem {
  id: number;
  startTime: string; // ISO DateTime string
  endTime: string;   // ISO DateTime string
  price: number;
  available: boolean;
}

export interface SlotsForDateResponse {
  date: string; // ISO Date string (YYYY-MM-DD)
  courtId: number;
  courtName: string;
  items: AllTimeSlotItem[];
}

export interface BookingSummaryResponse {
  id: number;
  timeSlotId: number;
  courtId: number;
  courtName: string;
  activityName: string;
  startTime: string; // ISO DateTime string
  endTime: string;   // ISO DateTime string
  price: number;
  createdAt: string; // ISO DateTime string
}

export interface CreateBookingRequest {
  timeSlotId: number;
}

export interface BookingResponse {
  id: number;
  userId: number;
  username: string;
  timeSlot: {
    id: number;
    courtId: number;
    courtName: string;
    activityName: string;
    startTime: string;
    endTime: string;
    price: number;
    available: boolean;
  };
  createdAt: string;
}
