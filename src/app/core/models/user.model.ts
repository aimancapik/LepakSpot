import { Timestamp } from '@angular/fire/firestore';

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  points: number;
  badges: string[];
  totalCheckins: number;
  createdAt: Timestamp;
}
