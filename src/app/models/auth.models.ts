export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  username: string;
  email: string;
  roles: string[];
  message: string;
  token: string;
  profileImageUrl?: string;
}

export interface User {
  id?: string;
  username: string;
  email: string;
  roles: string[];
  profileImageUrl?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  preferredPlayTime?: 'morning' | 'afternoon' | 'evening';
  dominantHand?: 'left' | 'right' | 'ambidextrous';
  bio?: string;
  location?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
}

export interface GoogleLoginRequest {
  idToken: string;
}