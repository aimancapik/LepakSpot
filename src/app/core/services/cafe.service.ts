import { Injectable, inject, signal, computed } from '@angular/core';
import { Cafe, CafeTag } from '../models/cafe.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

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
        createdAt: new Date().toISOString(),
        crowdLevel: 'Packed',
        noiseLevel: 'Loud',
        wifiSpeed: 'Average',
        outletAvailability: 'Few',
        isLateNight: false,
        openingHours: '8am – 10pm, Mon–Sun',
        googleMapsUrl: 'https://maps.google.com/?q=3.1478,101.7125',
        perks: ['Free Croissant on 3rd Check-in', '10% off beans'],
        secretMenu: ['The Dirty Chai Volcano', 'Matcha Espresso Fusion'],
        sceneSnaps: [
            { url: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&fit=crop', tag: 'Cozy Corner' },
            { url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&fit=crop', tag: 'Art Vibes' },
            { url: 'https://images.unsplash.com/photo-1525610553991-2bede1a236e2?w=800&fit=crop', tag: 'Late Night' }
        ]
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
        createdAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
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
    private supabase = inject(SupabaseService);
    private authService = inject(AuthService);

    nearbyCafes = signal<Cafe[]>(MOCK_CAFES);
    selectedTags = signal<CafeTag[]>([]);
    showLateNightOnly = signal(false);
    showOpenNowOnly = signal(false);
    searchQuery = signal('');
    sortBy = signal<'default' | 'rating' | 'nearest'>('default');

    // User location for distance calc
    userLat = signal<number | null>(null);
    userLng = signal<number | null>(null);

    filteredCafes = computed(() => {
        const tags = this.selectedTags();
        const lateNight = this.showLateNightOnly();
        const openNow = this.showOpenNowOnly();
        const query = this.searchQuery().toLowerCase().trim();
        const sort = this.sortBy();
        const uLat = this.userLat();
        const uLng = this.userLng();
        let cafes = this.nearbyCafes().filter((c: Cafe) => !c.pendingApproval);

        if (lateNight) cafes = cafes.filter((c: Cafe) => c.isLateNight);
        if (openNow) cafes = cafes.filter((c: Cafe) => this.isOpenNow(c));

        if (query) {
            cafes = cafes.filter((c: Cafe) =>
                c.name.toLowerCase().includes(query) ||
                c.address.toLowerCase().includes(query)
            );
        }

        if (tags.length > 0) {
            cafes = cafes.filter((c: Cafe) => tags.some((t: CafeTag) => c.tags.includes(t)));
        }

        if (sort === 'rating') {
            cafes = [...cafes].sort((a: Cafe, b: Cafe) => (b.rating ?? 0) - (a.rating ?? 0));
        } else if (sort === 'nearest' && uLat !== null && uLng !== null) {
            cafes = [...cafes].sort((a: Cafe, b: Cafe) =>
                this.distanceKm(uLat!, uLng!, a.lat, a.lng) - this.distanceKm(uLat!, uLng!, b.lat, b.lng)
            );
        }

        return cafes;
    });

    /** Parses opening hours like "8am – 10pm, Daily" to check if currently open */
    isOpenNow(cafe: Cafe): boolean {
        if (!cafe.openingHours) return true;
        const now = new Date();
        const nowMins = now.getHours() * 60 + now.getMinutes();
        const segment = cafe.openingHours.split('|')[0];
        const match = segment.match(/(\d+(?::\d+)?(?:am|pm))\s*[–\-]\s*(\d+(?::\d+)?(?:am|pm))/i);
        if (!match) return true;
        const open = this.parseTimeMins(match[1]);
        let close = this.parseTimeMins(match[2]);
        if (close <= open) close += 24 * 60; // overnight
        const adjustedNow = nowMins < open ? nowMins + 24 * 60 : nowMins;
        return adjustedNow >= open && adjustedNow < close;
    }

    private parseTimeMins(t: string): number {
        const pm = /pm/i.test(t);
        const cleaned = t.replace(/(am|pm)/i, '').trim();
        const [hStr, mStr] = cleaned.split(':');
        let h = parseInt(hStr, 10);
        const m = mStr ? parseInt(mStr, 10) : 0;
        if (pm && h !== 12) h += 12;
        if (!pm && h === 12) h = 0;
        return h * 60 + m;
    }

    /** Haversine distance in km */
    distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /** Returns a formatted distance label e.g. "1.2 km" or "800 m" */
    distanceLabel(cafe: Cafe): string | null {
        const uLat = this.userLat();
        const uLng = this.userLng();
        if (uLat === null || uLng === null) return null;
        const d = this.distanceKm(uLat, uLng, cafe.lat, cafe.lng);
        return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;
    }

    /** Request browser geolocation and store in signals */
    requestUserLocation(): Promise<void> {
        return new Promise(resolve => {
            if (!navigator.geolocation) { resolve(); return; }
            navigator.geolocation.getCurrentPosition(
                pos => {
                    this.userLat.set(pos.coords.latitude);
                    this.userLng.set(pos.coords.longitude);
                    resolve();
                },
                () => resolve(),
                { timeout: 6000 }
            );
        });
    }

    toggleTag(tag: CafeTag) {
        this.selectedTags.update(tags =>
            tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]
        );
    }

    toggleLateNight() {
        this.showLateNightOnly.update(v => !v);
    }

    toggleOpenNow() {
        this.showOpenNowOnly.update(v => !v);
    }

    async getNearby(_lat?: number, _lng?: number, _radiusKm = 5) {
        try {
            const { data, error } = await this.supabase.client
                .from('cafes')
                .select('*');

            if (error || !data || data.length === 0) {
                this.nearbyCafes.set(MOCK_CAFES);
            } else {
                this.nearbyCafes.set(data as Cafe[]);
            }
        } catch {
            this.nearbyCafes.set(MOCK_CAFES);
        }
    }

    async getCafeById(id: string): Promise<Cafe | null> {
        if (!id.startsWith('mock-')) {
            try {
                const { data } = await this.supabase.client
                    .from('cafes')
                    .select('*')
                    .eq('id', id)
                    .single();
                if (data) return data as Cafe;
            } catch { }
        }

        const cached = this.nearbyCafes().find(c => c.id === id);
        if (cached) return cached;

        return MOCK_CAFES.find(c => c.id === id) ?? null;
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
                const { data } = await this.supabase.client
                    .from('cafes').select('*').eq('id', id).single();
                if (data) results.push(data as Cafe);
            } catch { }
        }
        return results;
    }

    async submitCafe(data: Partial<Cafe>): Promise<string> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        const cafe: Partial<Cafe> = {
            name: data.name || '',
            address: data.address || '',
            lat: data.lat || 0,
            lng: data.lng || 0,
            tags: data.tags || [],
            rating: 0,
            photos: data.photos || [],
            addedBy: user.uid,
            submittedBy: user.uid,
            createdAt: new Date().toISOString(),
            pendingApproval: true,
            openingHours: data.openingHours,
            wifiSpeed: data.wifiSpeed,
            outletAvailability: data.outletAvailability,
            crowdLevel: data.crowdLevel,
            noiseLevel: data.noiseLevel,
            isLateNight: data.isLateNight || false,
            perks: data.perks || [],
            secretMenu: data.secretMenu || [],
            sceneSnaps: data.sceneSnaps || [],
            googleMapsUrl: data.googleMapsUrl,
        };

        const { data: inserted, error } = await this.supabase.client
            .from('cafes').insert(cafe).select('id').single();

        if (error) throw error;
        const newId = inserted!.id;

        await this.supabase.client
            .from('users')
            .update({ points: (user.points || 0) + 100 })
            .eq('uid', user.uid);

        await this.authService.refreshCurrentUser();
        this.nearbyCafes.update(cafes => [...cafes, { ...cafe, id: newId } as Cafe]);
        return newId;
    }

    async updateCafe(id: string, data: Partial<Cafe>): Promise<void> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');
        const { error } = await this.supabase.client
            .from('cafes')
            .update(data)
            .eq('id', id)
            .eq('submittedBy', user.uid);
        if (error) throw error;
        this.nearbyCafes.update(cafes =>
            cafes.map(c => c.id === id ? { ...c, ...data } : c)
        );
    }

    async getMySubmissions(): Promise<Cafe[]> {
        const user = this.authService.currentUser();
        if (!user) return [];
        const { data } = await this.supabase.client
            .from('cafes')
            .select('*')
            .eq('submittedBy', user.uid)
            .order('createdAt', { ascending: false });
        return (data || []) as Cafe[];
    }

    async getNewThisWeek(): Promise<Cafe[]> {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data } = await this.supabase.client
            .from('cafes')
            .select('*')
            .eq('pendingApproval', false)
            .gte('approvedAt', weekAgo)
            .order('approvedAt', { ascending: false });
        return (data || []) as Cafe[];
    }

    async updateVibeData(id: string, updates: { crowdLevel?: string; noiseLevel?: string }): Promise<void> {
        const { error } = await this.supabase.client.from('cafes').update(updates).eq('id', id);
        if (error) throw error;
        this.nearbyCafes.update(cafes =>
            cafes.map(c => c.id === id ? { ...c, ...updates } as Cafe : c)
        );
    }

    async claimCafe(id: string): Promise<void> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        const cafe = await this.getCafeById(id);
        if (!cafe) throw new Error('Cafe not found');
        if (cafe.claimStatus === 'claimed') throw new Error('Cafe already claimed');

        const updates = { ownerId: user.uid, claimStatus: 'claimed' as const };
        const { error } = await this.supabase.client
            .from('cafes')
            .update(updates)
            .eq('id', id);
        if (error) throw error;

        this.nearbyCafes.update(cafes =>
            cafes.map(c => c.id === id ? { ...c, ...updates } : c)
        );
    }

    async updateCafeAsOwner(id: string, data: Partial<Cafe>): Promise<void> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await this.supabase.client
            .from('cafes')
            .update(data)
            .eq('id', id)
            .eq('ownerId', user.uid);
        if (error) throw error;

        this.nearbyCafes.update(cafes =>
            cafes.map(c => c.id === id ? { ...c, ...data } : c)
        );
    }

    async getOwnerStats(cafeId: string): Promise<{ totalCheckins: number; totalSessions: number; avgRating: number }> {
        const [checkinsResult, sessionsResult, reviewsResult] = await Promise.all([
            this.supabase.client
                .from('checkins')
                .select('id', { count: 'exact', head: true })
                .eq('cafeId', cafeId),
            this.supabase.client
                .from('sessions')
                .select('id', { count: 'exact', head: true })
                .eq('winnerId', cafeId),
            this.supabase.client
                .from('reviews')
                .select('rating')
                .eq('cafeId', cafeId),
        ]);

        const ratings = (reviewsResult.data || []).map((r: any) => r.rating);
        const avgRating = ratings.length
            ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
            : 0;

        return {
            totalCheckins: checkinsResult.count ?? 0,
            totalSessions: sessionsResult.count ?? 0,
            avgRating: Math.round(avgRating * 10) / 10,
        };
    }
}
