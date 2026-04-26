export type CafeTag = 'wifi' | 'aesthetic' | 'halal' | 'study' | 'chill';
export type CrowdLevel = 'Empty' | 'Moderate' | 'Packed';
export type NoiseLevel = 'Library Quiet' | 'Chill Chatter' | 'Loud';
export type WifiSpeed = 'Fast' | 'Average' | 'Slow' | 'None';
export type OutletAvailability = 'Many' | 'Few' | 'None';
export type ClaimStatus = 'unclaimed' | 'pending' | 'claimed';

export interface Cafe {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    tags: CafeTag[];
    rating: number;
    photos: string[];
    addedBy: string;
    createdAt: string;
    crowdLevel?: CrowdLevel;
    noiseLevel?: NoiseLevel;
    wifiSpeed?: WifiSpeed;
    outletAvailability?: OutletAvailability;
    isLateNight?: boolean;
    perks?: string[];
    secretMenu?: string[];
    sceneSnaps?: { url: string; tag: string }[];
    openingHours?: string;
    googleMapsUrl?: string;
    socialLinks?: { tiktok?: string; facebook?: string; other?: string };
    pendingApproval?: boolean;
    approvedAt?: string;
    submittedBy?: string;
    ownerId?: string;
    claimStatus?: ClaimStatus;
    hasActiveDeal?: boolean;
}
