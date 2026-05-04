export type CafeTag = 'wifi' | 'aesthetic' | 'halal' | 'study' | 'chill';
export type CrowdLevel = 'Empty' | 'Moderate' | 'Packed';
export type NoiseLevel = 'Library Quiet' | 'Chill Chatter' | 'Loud';
export type WifiSpeed = 'Fast' | 'Average' | 'Slow' | 'None';
export type OutletAvailability = 'Many' | 'Few' | 'None';
export type ClaimStatus = 'unclaimed' | 'pending' | 'claimed';
export type CafeClaimStatus = 'pending' | 'approved' | 'rejected';
export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface DayHours {
    open: string;    // "09:00"
    close: string;   // "22:00"
    closed: boolean;
}

export type OperatingHours = Record<DayKey, DayHours>;

export interface MenuItem {
    name: string;
    price: number;
    currency?: string;
    category?: string;
    photoUrl?: string;
}

export interface Cafe {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    tags: CafeTag[];
    rating: number;
    photos: string[];
    videoUrl?: string | null;
    addedBy: string;
    createdAt: string;
    crowdLevel?: CrowdLevel;
    noiseLevel?: NoiseLevel;
    wifiSpeed?: WifiSpeed;
    outletAvailability?: OutletAvailability;
    isLateNight?: boolean;
    perks?: string[];
    secretMenu?: string[];
    menu?: MenuItem[];
    sceneSnaps?: { url: string; tag: string }[];
    openingHours?: string;
    operatingHours?: OperatingHours;
    googleMapsUrl?: string;
    socialLinks?: { tiktok?: string; facebook?: string; other?: string };
    pendingApproval?: boolean;
    approvedAt?: string;
    submittedBy?: string;
    ownerId?: string;
    claimStatus?: ClaimStatus;
    hasActiveDeal?: boolean;
}

export interface CafeClaim {
    id: string;
    cafeId: string;
    cafeName: string;
    userId: string;
    claimantName: string;
    role: string;
    contact: string;
    ssmNumber: string;
    documentPath: string;
    documentName?: string | null;
    proofUrl?: string | null;
    message?: string | null;
    status: CafeClaimStatus;
    rejectionReason?: string | null;
    appealMessage?: string | null;
    appealedAt?: string | null;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    createdAt: string;
}
