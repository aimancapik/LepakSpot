export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  points: number;
  badges: string[];
  totalCheckins: number;
  streak?: number;
  lastCheckinDate?: string;
  createdAt: string;
}
