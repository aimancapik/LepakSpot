import { Injectable, inject, signal, computed } from '@angular/core';
import {
    Firestore,
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
    Timestamp,
    updateDoc,
    increment,
} from '@angular/fire/firestore';
import { Cafe, CafeTag } from '../models/cafe.model';
import { AuthService } from './auth.service';

const MOCK_CAFES: Cafe[] = [
    {
        id: 'mock-vcr',
        name: 'VCR Café',
        address: 'Jalan Rembia, Bukit Bintang, KL',
        tags: ['wifi', 'aesthetic'],
        rating: 4.8,
        lat: 3.1478,
        lng: 101.7125,
        photos: ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop'],
        addedBy: 'system',
        createdAt: Timestamp.now(),
        crowdLevel: 'Packed',
        noiseLevel: 'Loud',
        wifiSpeed: 'Average',
        outletAvailability: 'Few',
        isLateNight: false,
        openingHours: '8am – 10pm, Mon–Sun',
        googleMapsUrl: 'https://maps.google.com/?q=3.1478,101.7125',
        perks: ['Free Croissant on 3rd Check-in', '10% off beans'],
        secretMenu: ['The Dirty Chai Volcano', 'Matcha Espresso Fusion'],
    },
    {
        id: 'mock-feeka',
        name: 'Feeka Coffee Roasters',
        address: 'Jalan Mesui, Bukit Bintang, KL',
        tags: ['aesthetic', 'chill'],
        rating: 4.6,
        lat: 3.1489,
        lng: 101.7098,
        photos: ['https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=600&h=400&fit=crop'],
        addedBy: 'system',
        createdAt: Timestamp.now(),
        crowdLevel: 'Moderate',
        noiseLevel: 'Chill Chatter',
        wifiSpeed: 'Fast',
        outletAvailability: 'Many',
        isLateNight: false,
        openingHours: '9am – 6pm, Mon–Fri | 10am – 6pm, Sat–Sun',
        googleMapsUrl: 'https://maps.google.com/?q=3.1489,101.7098',
        perks: ['Free Upsize on all Coffees'],
        secretMenu: ['Feeka Cloud Latte'],
    },
    {
        id: 'mock-lokl',
        name: 'LOKL Coffee Co.',
        address: 'Jalan Tun H S Lee, KL',
        tags: ['wifi', 'study', 'halal'],
        rating: 4.5,
        lat: 3.1466,
        lng: 101.6958,
        photos: ['https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=400&fit=crop'],
        addedBy: 'system',
        createdAt: Timestamp.now(),
        crowdLevel: 'Empty',
        noiseLevel: 'Library Quiet',
        wifiSpeed: 'Average',
        outletAvailability: 'Many',
        isLateNight: false,
        openingHours: '8am – 10pm, Daily',
        googleMapsUrl: 'https://maps.google.com/?q=3.1466,101.6958',
    },
    {
        id: 'mock-pulp',
        name: 'Pulp by Papa Palheta',
        address: 'Jalan Scott, Brickfields, KL',
        tags: ['aesthetic', 'wifi'],
        rating: 4.7,
        lat: 3.1318,
        lng: 101.6873,
        photos: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop'],
        addedBy: 'system',
        createdAt: Timestamp.now(),
        crowdLevel: 'Packed',
        noiseLevel: 'Chill Chatter',
        wifiSpeed: 'Fast',
        outletAvailability: 'Many',
        isLateNight: false,
        openingHours: '10am – 6pm, Tue–Sun | Closed Mon',
        googleMapsUrl: 'https://maps.google.com/?q=3.1318,101.6873',
    },
    {
        id: 'mock-brew',
        name: 'The Brew Culture',
        address: 'Damansara Uptown, PJ',
        tags: ['halal', 'study', 'chill'],
        rating: 4.4,
        lat: 3.1358,
        lng: 101.6217,
        photos: ['https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=600&h=400&fit=crop'],
        addedBy: 'system',
        createdAt: Timestamp.now(),
        crowdLevel: 'Moderate',
        noiseLevel: 'Loud',
        wifiSpeed: 'Average',
        outletAvailability: 'None',
        isLateNight: true,
        openingHours: '2pm – 2am, Daily',
        googleMapsUrl: 'https://maps.google.com/?q=3.1358,101.6217',
    },
];

@Injectable({ providedIn: 'root' })
export class CafeService {
    private firestore = inject(Firestore);
    private authService = inject(AuthService);
    private readonly cafesRef = collection(this.firestore, 'cafes');
    private readonly usersRef = collection(this.firestore, 'users');

    nearbyCafes = signal<Cafe[]>(MOCK_CAFES);
    selectedTags = signal<CafeTag[]>([]);
    showLateNightOnly = signal(false);
    searchQuery = signal('');

    filteredCafes = computed(() => {
        const tags = this.selectedTags();
        const lateNight = this.showLateNightOnly();
        const query = this.searchQuery().toLowerCase().trim();
        let cafes = this.nearbyCafes().filter(c => !c.pendingApproval);

        if (lateNight) {
            cafes = cafes.filter(c => c.isLateNight);
        }

        if (query) {
            cafes = cafes.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.address.toLowerCase().includes(query)
            );
        }

        if (tags.length === 0) return cafes;
        return cafes.filter((c) => tags.some((t) => c.tags.includes(t)));
    });

    toggleTag(tag: CafeTag) {
        this.selectedTags.update((tags) =>
            tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]
        );
    }

    toggleLateNight() {
        this.showLateNightOnly.update(v => !v);
    }

    async getNearby(_lat?: number, _lng?: number, _radiusKm = 5) {
        try {
            const snapshot = await getDocs(this.cafesRef);
            if (snapshot.empty) {
                this.nearbyCafes.set(MOCK_CAFES);
            } else {
                const cafes = snapshot.docs.map(
                    (d) => ({ id: d.id, ...d.data() } as Cafe)
                );
                this.nearbyCafes.set(cafes);
            }
        } catch {
            this.nearbyCafes.set(MOCK_CAFES);
        }
    }

    async getCafeById(id: string): Promise<Cafe | null> {
        // Check in-memory cache first
        const cached = this.nearbyCafes().find(c => c.id === id);
        if (cached) return cached;

        // Check mock data
        const mock = MOCK_CAFES.find(c => c.id === id);
        if (mock) return mock;

        try {
            const cafeDoc = await getDoc(doc(this.firestore, `cafes/${id}`));
            if (cafeDoc.exists()) {
                return { id: cafeDoc.id, ...cafeDoc.data() } as Cafe;
            }
        } catch {
            // ignore
        }
        return null;
    }

    async getCafesByIds(ids: string[]): Promise<Cafe[]> {
        const results: Cafe[] = [];
        for (const id of ids) {
            const existing = this.nearbyCafes().find((c) => c.id === id);
            if (existing) {
                results.push(existing);
                continue;
            }
            try {
                const cafeDoc = await getDoc(doc(this.firestore, `cafes/${id}`));
                if (cafeDoc.exists()) {
                    results.push({ id: cafeDoc.id, ...cafeDoc.data() } as Cafe);
                }
            } catch {
                // skip
            }
        }
        return results;
    }

    /** Submit a new cafe suggestion. Awards 100 pts to the submitting user. */
    async submitCafe(data: Partial<Cafe>): Promise<string> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        const newDoc = doc(this.cafesRef);
        const cafe: Cafe = {
            id: newDoc.id,
            name: data.name || '',
            address: data.address || '',
            lat: data.lat || 0,
            lng: data.lng || 0,
            tags: data.tags || [],
            rating: 0,
            photos: data.photos || [],
            addedBy: user.uid,
            submittedBy: user.uid,
            createdAt: Timestamp.now(),
            pendingApproval: false, // show immediately, trust users
            openingHours: data.openingHours,
            wifiSpeed: data.wifiSpeed,
            outletAvailability: data.outletAvailability,
            crowdLevel: data.crowdLevel,
            noiseLevel: data.noiseLevel,
            isLateNight: data.isLateNight || false,
            perks: data.perks || [],
            secretMenu: data.secretMenu || [],
            googleMapsUrl: data.googleMapsUrl,
        };

        await setDoc(newDoc, cafe);

        // Award 100 pts
        const userRef = doc(this.usersRef, user.uid);
        await updateDoc(userRef, { points: increment(100) });

        // Refresh user in auth service
        const updatedSnap = await getDoc(userRef);
        if (updatedSnap.exists()) {
            this.authService.currentUser.set({ uid: user.uid, ...updatedSnap.data() } as any);
        }

        // Add to local list so it appears immediately
        this.nearbyCafes.update(cafes => [...cafes, cafe]);

        return newDoc.id;
    }
}
