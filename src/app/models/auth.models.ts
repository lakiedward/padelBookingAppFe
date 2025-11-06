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
  username: string;
  email: string;
  roles: string[];
  profileImageUrl?: string;
}

export interface GoogleLoginRequest {
  idToken: string;
}