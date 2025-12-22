export interface AllTimeSlotItem {
  id: number;
  startTime: string;
  endTime: string;
  price: number;
  available: boolean;
  currency?: string;
}

export interface SlotsForDateResponse {
  date: string;
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
  startTime: string;
  endTime: string;
  price: number;
  createdAt: string;
  currency?: string;
}

export interface AdminBookingResponse {
  id: number;
  timeSlotId: number;
  courtId: number;
  courtName: string;
  activityName: string;
  startTime: string;
  endTime: string;
  price: number;
  createdAt: string;
  currency?: string;
  userId: number;
  username: string;
  userEmail?: string | null;
  userPhone?: string | null;
  paymentType?: string | null;
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

export interface RescheduleTimeSlotOptionResponse {
  timeSlotId: number;
  courtId: number;
  courtName: string;
  startTime: string;
  endTime: string;
  price: number;
  available: boolean;
  currency?: string | null;
  isCurrentSlot: boolean;
}

export interface RescheduleCourtOptionsResponse {
  courtId: number;
  courtName: string;
  isCurrentCourt: boolean;
  slots: RescheduleTimeSlotOptionResponse[];
}

export interface AdminBookingDetailsResponse {
  id: number;
  status: string;
  timeSlotId: number;
  courtId: number;
  courtName: string;
  courtPicture?: string | null;
  activityName: string;
  sportKey: string;
  clubId: number;
  clubName: string;
  startTime: string;
  endTime: string;
  price: number;
  currency?: string | null;
  createdAt: string;
  durationMinutes: number;
  userId: number;
  username: string;
  userEmail?: string | null;
  userPhone?: string | null;
  paymentType?: string | null;
}
