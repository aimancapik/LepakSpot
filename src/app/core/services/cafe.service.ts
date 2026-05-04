import { Injectable, inject, signal, computed } from '@angular/core';
import { Cafe, CafeClaim, CafeTag, DayKey } from '../models/cafe.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export type CafeOpenState = 'open' | 'closed' | 'unknown';

export interface CafeOpenStatus {
    state: CafeOpenState;
    label: string;
    isOpen: boolean;
}

interface OpeningRange {
    open: number;
    close: number;
}

interface OpeningRule {
    days: Set<number>;
    ranges: OpeningRange[];
    closed: boolean;
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DAY_TOKEN = '(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:sday)?)?|fri(?:day)?|sat(?:urday)?)';
const TIME_TOKEN = '(?:noon|midnight|\\d{3,4}\\s*(?:am|pm)?|\\d{1,2}(?::|\\.)\\d{1,2}\\s*(?:am|pm)?|\\d{1,2}\\s*(?:am|pm)?)';

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

    openStatus(cafe: Cafe, now = new Date()): CafeOpenStatus {
        if (cafe.operatingHours) {
            const keys: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            const todayHours = cafe.operatingHours[keys[now.getDay()]];
            if (todayHours) {
                if (todayHours.closed) return { state: 'closed', label: 'Closed', isOpen: false };
                const [openH, openM] = todayHours.open.split(':').map(Number);
                const [closeH, closeM] = todayHours.close.split(':').map(Number);
                const nowMins = now.getHours() * 60 + now.getMinutes();
                const isOpen = nowMins >= openH * 60 + openM && nowMins < closeH * 60 + closeM;
                return { state: isOpen ? 'open' : 'closed', label: isOpen ? 'Open' : 'Closed', isOpen };
            }
        }

        if (!cafe.openingHours?.trim()) {
            return { state: 'unknown', label: 'Hours unknown', isOpen: false };
        }

        const normalized = this.normalizeOpeningHours(cafe.openingHours);
        if (!normalized || /^(unknown|n\/a|na|tbd|varies|see google|check google)$/.test(normalized)) {
            return { state: 'unknown', label: 'Hours unknown', isOpen: false };
        }

        if (/\b(?:24\/7|always open|open 24 hours|24 hours|24hrs|24h)\b/.test(normalized)) {
            return { state: 'open', label: 'Open', isOpen: true };
        }

        const rules = this.parseOpeningRules(normalized);
        if (rules.length === 0) {
            return { state: 'unknown', label: 'Hours unknown', isOpen: false };
        }

        const today = now.getDay();
        const yesterday = (today + 6) % 7;
        const nowMins = now.getHours() * 60 + now.getMinutes();

        for (const rule of rules.filter(rule => !rule.closed)) {
            for (const range of rule.ranges) {
                if (range.close <= range.open && rule.days.has(yesterday) && nowMins < range.close) {
                    return { state: 'open', label: 'Open', isOpen: true };
                }
            }
        }

        if (rules.some(rule => rule.closed && rule.days.has(today))) {
            return { state: 'closed', label: 'Closed', isOpen: false };
        }

        for (const rule of rules.filter(rule => !rule.closed)) {
            for (const range of rule.ranges) {
                if (range.open === 0 && range.close === 1440 && rule.days.has(today)) {
                    return { state: 'open', label: 'Open', isOpen: true };
                }

                if (range.close > range.open && rule.days.has(today) && nowMins >= range.open && nowMins < range.close) {
                    return { state: 'open', label: 'Open', isOpen: true };
                }

                if (range.close <= range.open && rule.days.has(today) && nowMins >= range.open) {
                    return { state: 'open', label: 'Open', isOpen: true };
                }
            }
        }

        return { state: 'closed', label: 'Closed', isOpen: false };
    }

    /** Supports common formats like "8am-10pm Daily", "Mon-Fri 9:00-18:00", "Tue-Sun 10am-6pm | Closed Mon", and overnight ranges. */
    isOpenNow(cafe: Cafe): boolean {
        return this.openStatus(cafe).isOpen;
    }

    private normalizeOpeningHours(hours: string): string {
        return hours
            .toLowerCase()
            .replace(/â€“|–|—|−/g, '-')
            .replace(/\ba\.m\./g, 'am')
            .replace(/\bp\.m\./g, 'pm')
            .replace(/\b(to|until|til|till|through|thru)\b/g, '-')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private parseOpeningRules(hours: string): OpeningRule[] {
        const rules: OpeningRule[] = [];
        for (const segment of this.splitOpeningSegments(hours)) {
            const days = this.daysForSegment(segment);
            const closed = /\bclosed\b/.test(segment);
            const ranges = this.timeRangesForSegment(segment);

            if (closed && ranges.length === 0) {
                rules.push({ days, ranges: [], closed: true });
                continue;
            }

            if (ranges.length > 0) {
                rules.push({ days, ranges, closed: false });
            }
        }
        return rules;
    }

    private splitOpeningSegments(hours: string): string[] {
        const baseSegments = hours.split(/\s*(?:\||;|\n)\s*/).filter(Boolean);
        const segments: string[] = [];

        for (const base of baseSegments) {
            const parts = base.split(new RegExp(`,(?=\\s*(?:${DAY_TOKEN}|weekday|weekend|daily|every day|closed))`, 'i'));
            for (const part of parts) {
                const trimmed = part.trim();
                if (!trimmed) continue;

                if (segments.length > 0 && !this.hasTimeRange(trimmed) && !/\bclosed\b/.test(trimmed)) {
                    segments[segments.length - 1] = `${segments[segments.length - 1]}, ${trimmed}`;
                } else {
                    segments.push(trimmed);
                }
            }
        }

        return segments;
    }

    private daysForSegment(segment: string): Set<number> {
        const mentioned = this.extractDays(segment);
        const days = mentioned ?? new Set(ALL_DAYS);
        const exceptMatch = segment.match(/\b(?:except|excluding)\s+(.+)$/);
        if (exceptMatch) {
            const exceptDays = this.extractDays(exceptMatch[1]);
            exceptDays?.forEach(day => days.delete(day));
        }
        return days;
    }

    private extractDays(text: string): Set<number> | null {
        const days = new Set<number>();

        if (/\b(?:daily|every day|everyday|mon-sun)\b/.test(text)) {
            ALL_DAYS.forEach(day => days.add(day));
        }
        if (/\bweekdays?\b/.test(text)) {
            [1, 2, 3, 4, 5].forEach(day => days.add(day));
        }
        if (/\bweekends?\b/.test(text)) {
            [0, 6].forEach(day => days.add(day));
        }

        const rangeRegex = new RegExp(`\\b${DAY_TOKEN}\\b\\s*-\\s*\\b${DAY_TOKEN}\\b`, 'gi');
        for (const match of text.matchAll(rangeRegex)) {
            this.addDayRange(days, this.dayIndex(match[1]), this.dayIndex(match[2]));
        }

        const dayRegex = new RegExp(`\\b${DAY_TOKEN}\\b`, 'gi');
        for (const match of text.matchAll(dayRegex)) {
            days.add(this.dayIndex(match[1]));
        }

        return days.size > 0 ? days : null;
    }

    private addDayRange(days: Set<number>, start: number, end: number): void {
        let day = start;
        days.add(day);
        while (day !== end) {
            day = (day + 1) % 7;
            days.add(day);
        }
    }

    private dayIndex(day: string): number {
        const key = day.slice(0, 3).toLowerCase();
        if (key === 'sun') return 0;
        if (key === 'mon') return 1;
        if (key === 'tue') return 2;
        if (key === 'wed') return 3;
        if (key === 'thu') return 4;
        if (key === 'fri') return 5;
        return 6;
    }

    private timeRangesForSegment(segment: string): OpeningRange[] {
        if (/\b(?:24\/7|always open|open 24 hours|24 hours|24hrs|24h)\b/.test(segment)) {
            return [{ open: 0, close: 1440 }];
        }

        const ranges: OpeningRange[] = [];
        const rangeRegex = new RegExp(`(${TIME_TOKEN})\\s*-\\s*(${TIME_TOKEN})`, 'gi');

        for (const match of segment.matchAll(rangeRegex)) {
            const range = this.parseTimeRange(match[1], match[2]);
            if (range) ranges.push(range);
        }

        return ranges;
    }

    private hasTimeRange(text: string): boolean {
        return new RegExp(`(${TIME_TOKEN})\\s*-\\s*(${TIME_TOKEN})`, 'i').test(text)
            || /\b(?:24\/7|always open|open 24 hours|24 hours|24hrs|24h)\b/.test(text);
    }

    private parseTimeRange(openText: string, closeText: string): OpeningRange | null {
        const closeMeridiem = this.meridiem(closeText);
        const openMeridiem = this.meridiem(openText) ?? this.inferOpenMeridiem(openText, closeText, closeMeridiem);
        const open = this.parseTimeToken(openText, openMeridiem);
        const close = this.parseTimeToken(closeText, this.meridiem(closeText) ?? this.inferCloseMeridiem(closeText, openText, openMeridiem));

        if (open === null || close === null || open === close) return null;
        return { open, close };
    }

    private meridiem(text: string): 'am' | 'pm' | null {
        const match = text.toLowerCase().match(/\b(am|pm)\b/);
        return match ? match[1] as 'am' | 'pm' : null;
    }

    private inferOpenMeridiem(openText: string, _closeText: string, closeMeridiem: 'am' | 'pm' | null): 'am' | 'pm' | null {
        if (!closeMeridiem) return null;
        const openHour = this.rawHour(openText);
        if (openHour === null) return closeMeridiem;

        if (closeMeridiem === 'am') {
            return openHour >= 6 ? 'pm' : 'am';
        }

        if (openHour >= 7 && openHour <= 11) return 'am';
        return 'pm';
    }

    private inferCloseMeridiem(closeText: string, openText: string, openMeridiem: 'am' | 'pm' | null): 'am' | 'pm' | null {
        if (!openMeridiem) return null;
        const openHour = this.rawHour(openText);
        const closeHour = this.rawHour(closeText);
        if (openHour === null || closeHour === null) return openMeridiem;

        if (openMeridiem === 'am' && closeHour <= openHour) return 'pm';
        return openMeridiem;
    }

    private rawHour(text: string): number | null {
        const cleaned = text.toLowerCase().replace(/\b(am|pm)\b/g, '').trim();
        if (cleaned === 'noon') return 12;
        if (cleaned === 'midnight') return 12;
        const digits = cleaned.replace(/\s/g, '');
        if (/^\d{3,4}$/.test(digits)) return Math.floor(parseInt(digits, 10) / 100);
        const match = digits.match(/^(\d{1,2})/);
        return match ? parseInt(match[1], 10) : null;
    }

    private parseTimeToken(text: string, fallbackMeridiem: 'am' | 'pm' | null = null): number | null {
        const lower = text.toLowerCase().trim();
        if (lower === 'noon') return 12 * 60;
        if (lower === 'midnight') return 0;

        const explicitMeridiem = this.meridiem(lower);
        const meridiem = explicitMeridiem ?? fallbackMeridiem;
        const cleaned = lower.replace(/\b(am|pm)\b/g, '').replace(/\s/g, '').trim();

        let hour: number;
        let minute = 0;

        if (cleaned.includes(':') || cleaned.includes('.')) {
            const [hourPart, minutePart = '0'] = cleaned.split(/[:.]/);
            hour = parseInt(hourPart, 10);
            minute = parseInt(minutePart, 10);
        } else if (/^\d{3,4}$/.test(cleaned)) {
            const numeric = parseInt(cleaned, 10);
            hour = Math.floor(numeric / 100);
            minute = numeric % 100;
        } else if (/^\d{1,2}$/.test(cleaned)) {
            hour = parseInt(cleaned, 10);
        } else {
            return null;
        }

        if (Number.isNaN(hour) || Number.isNaN(minute) || minute < 0 || minute > 59) return null;

        if (meridiem) {
            if (hour < 1 || hour > 12) return null;
            if (meridiem === 'pm' && hour !== 12) hour += 12;
            if (meridiem === 'am' && hour === 12) hour = 0;
        } else if (hour > 23) {
            return null;
        }

        return hour * 60 + minute;
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

    async getNearby() {
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
            } catch (error: unknown) {
                console.error('Failed to get cafe by id:', error);
            }
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
            } catch (error: unknown) {
                console.error('Failed to get cafe by id in batch:', error);
            }
        }
        return results;
    }

    async submitCafe(data: Partial<Cafe>): Promise<string> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        const now = new Date().toISOString();
        const isAdmin = !!user.isAdmin;

        const cafe: Partial<Cafe> = {
            name: data.name || '',
            address: data.address || '',
            lat: data.lat || 0,
            lng: data.lng || 0,
            tags: data.tags || [],
            rating: 0,
            photos: data.photos || [],
            videoUrl: data.videoUrl,
            addedBy: user.uid,
            submittedBy: user.uid,
            createdAt: now,
            pendingApproval: !isAdmin,
            approvedAt: isAdmin ? now : undefined,
            openingHours: data.openingHours,
            wifiSpeed: data.wifiSpeed,
            outletAvailability: data.outletAvailability,
            crowdLevel: data.crowdLevel,
            noiseLevel: data.noiseLevel,
            isLateNight: data.isLateNight || false,
            perks: data.perks || [],
            secretMenu: data.secretMenu || [],
            menu: data.menu || [],
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

        const cafe = await this.getCafeById(id);
        if (!cafe) throw new Error('Cafe not found');
        if (!this.canEditCafe(cafe, user.uid)) {
            throw new Error('You can edit your submission only until it is claimed. Claimed cafes can only be edited by the verified owner.');
        }

        const { error } = await this.supabase.client
            .from('cafes')
            .update(data)
            .eq('id', id);
        if (error) throw error;
        this.nearbyCafes.update(cafes =>
            cafes.map(c => c.id === id ? { ...c, ...data } : c)
        );
    }

    canCurrentUserEditCafe(cafe: Cafe): boolean {
        const user = this.authService.currentUser();
        return !!user && this.canEditCafe(cafe, user.uid);
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

    async getMyCafeClaims(): Promise<CafeClaim[]> {
        const user = this.authService.currentUser();
        if (!user) return [];
        const { data, error } = await this.supabase.client
            .from('cafe_claims')
            .select('*')
            .eq('userId', user.uid)
            .order('createdAt', { ascending: false });
        if (error) throw error;
        return (data || []) as CafeClaim[];
    }

    async getCafeClaims(status: 'all' | 'pending' | 'approved' | 'rejected' = 'pending'): Promise<CafeClaim[]> {
        this.assertAdmin();
        let query = this.supabase.client
            .from('cafe_claims')
            .select('*')
            .order('createdAt', { ascending: false });
        if (status !== 'all') query = query.eq('status', status);
        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as CafeClaim[];
    }

    async approveCafeClaim(claim: CafeClaim): Promise<void> {
        const admin = this.assertAdmin();
        const reviewedAt = new Date().toISOString();

        const cafe = await this.getCafeById(claim.cafeId);
        const wasPending = !!cafe?.pendingApproval;
        const cafeUpdate: Partial<Cafe> = {
            ownerId: claim.userId,
            claimStatus: 'claimed' as const,
        };
        if (wasPending) {
            cafeUpdate.pendingApproval = false;
            cafeUpdate.approvedAt = reviewedAt;
        }

        const { error: cafeError } = await this.supabase.client
            .from('cafes')
            .update(cafeUpdate)
            .eq('id', claim.cafeId);
        if (cafeError) throw cafeError;

        const { error: claimError } = await this.supabase.client
            .from('cafe_claims')
            .update({
                status: 'approved',
                reviewedBy: admin.uid,
                reviewedAt,
            })
            .eq('id', claim.id);
        if (claimError) throw claimError;

        this.nearbyCafes.update(cafes =>
            cafes.map(c => c.id === claim.cafeId ? { ...c, ...cafeUpdate } : c)
        );
    }

    async getPendingCafes(): Promise<Cafe[]> {
        this.assertAdmin();
        const { data, error } = await this.supabase.client
            .from('cafes')
            .select('*')
            .eq('pendingApproval', true)
            .order('createdAt', { ascending: false });
        if (error) throw error;
        return (data || []) as Cafe[];
    }

    async getPendingCafesCount(): Promise<number> {
        this.assertAdmin();
        const { count, error } = await this.supabase.client
            .from('cafes')
            .select('id', { count: 'exact', head: true })
            .eq('pendingApproval', true);
        if (error) throw error;
        return count || 0;
    }

    async approveCafe(cafeId: string): Promise<void> {
        this.assertAdmin();
        const approvedAt = new Date().toISOString();
        const { error } = await this.supabase.client
            .from('cafes')
            .update({ pendingApproval: false, approvedAt })
            .eq('id', cafeId);
        if (error) throw error;
        this.nearbyCafes.update(cafes =>
            cafes.map(c => c.id === cafeId ? { ...c, pendingApproval: false, approvedAt } : c)
        );
    }

    async rejectCafe(cafeId: string): Promise<void> {
        this.assertAdmin();
        const { error } = await this.supabase.client
            .from('cafes')
            .delete()
            .eq('id', cafeId)
            .eq('pendingApproval', true);
        if (error) throw error;
        this.nearbyCafes.update(cafes => cafes.filter(c => c.id !== cafeId));
    }

    async rejectCafeClaim(claim: CafeClaim, reason: string): Promise<void> {
        const admin = this.assertAdmin();
        const reviewedAt = new Date().toISOString();
        const rejectionReason = reason.trim();
        if (!rejectionReason) throw new Error('Rejection reason is required.');

        const { error: claimError } = await this.supabase.client
            .from('cafe_claims')
            .update({
                status: 'rejected',
                rejectionReason,
                reviewedBy: admin.uid,
                reviewedAt,
            })
            .eq('id', claim.id);
        if (claimError) throw claimError;

        const { error: cafeError } = await this.supabase.client
            .from('cafes')
            .update({ claimStatus: 'unclaimed' as const })
            .eq('id', claim.cafeId)
            .eq('claimStatus', 'pending');
        if (cafeError) throw cafeError;

        this.nearbyCafes.update(cafes =>
            cafes.map(c => c.id === claim.cafeId ? { ...c, claimStatus: 'unclaimed' } : c)
        );
    }

    async appealCafeClaim(claim: CafeClaim, appealMessage: string): Promise<void> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');
        if (claim.userId !== user.uid) throw new Error('You can only appeal your own claim.');
        if (claim.status !== 'rejected') throw new Error('Only rejected claims can be appealed.');

        const message = appealMessage.trim();
        if (!message) throw new Error('Appeal message is required.');
        const appealedAt = new Date().toISOString();

        const { error: claimError } = await this.supabase.client
            .from('cafe_claims')
            .update({
                status: 'pending',
                appealMessage: message,
                appealedAt,
                reviewedBy: null,
                reviewedAt: null,
            })
            .eq('id', claim.id)
            .eq('userId', user.uid)
            .eq('status', 'rejected');
        if (claimError) throw claimError;

        const { error: cafeError } = await this.supabase.client
            .from('cafes')
            .update({ claimStatus: 'pending' as const })
            .eq('id', claim.cafeId)
            .neq('claimStatus', 'claimed');
        if (cafeError) throw cafeError;
    }

    async createClaimDocumentUrl(documentPath: string): Promise<string> {
        this.assertAdmin();
        const { data, error } = await this.supabase.client.storage
            .from('cafe-claim-documents')
            .createSignedUrl(documentPath, 60 * 5);
        if (error) throw error;
        return data.signedUrl;
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

    async submitCafeClaim(
        id: string,
        request: {
            claimantName: string;
            role: string;
            contact: string;
            ssmNumber: string;
            documentPath: string;
            documentName: string;
            proofUrl?: string;
            message?: string;
        }
    ): Promise<void> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        const cafe = await this.getCafeById(id);
        if (!cafe) throw new Error('Cafe not found');
        if (cafe.claimStatus === 'claimed') throw new Error('Cafe already claimed');
        if (cafe.claimStatus === 'pending') throw new Error('This cafe already has a pending claim.');

        const claim = {
            cafeId: id,
            cafeName: cafe.name,
            userId: user.uid,
            claimantName: request.claimantName.trim(),
            role: request.role.trim(),
            contact: request.contact.trim(),
            ssmNumber: request.ssmNumber.trim(),
            documentPath: request.documentPath,
            documentName: request.documentName,
            proofUrl: request.proofUrl?.trim() || null,
            message: request.message?.trim() || null,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };

        const { error: claimError } = await this.supabase.client
            .from('cafe_claims')
            .insert(claim);
        if (claimError) throw claimError;

        const updates = { claimStatus: 'pending' as const };
        const { error } = await this.supabase.client
            .from('cafes')
            .update(updates)
            .eq('id', id);
        if (error) throw error;

        this.nearbyCafes.update(cafes =>
            cafes.map(c => c.id === id ? { ...c, ...updates } : c)
        );
    }

    private canEditCafe(cafe: Cafe, userId: string): boolean {
        const isUnclaimed = !cafe.claimStatus || cafe.claimStatus === 'unclaimed';
        return (cafe.ownerId === userId && cafe.claimStatus === 'claimed')
            || (isUnclaimed && (cafe.submittedBy === userId || cafe.addedBy === userId));
    }

    private assertAdmin() {
        const user = this.authService.currentUser();
        if (!user?.isAdmin) throw new Error('Admin access required.');
        return user;
    }

    async updateCafeAsOwner(id: string, data: Partial<Cafe>): Promise<void> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await this.supabase.client
            .from('cafes')
            .update(data)
            .eq('id', id)
            .eq('ownerId', user.uid)
            .eq('claimStatus', 'claimed');
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

        const ratings = (reviewsResult.data || []).map((r: { rating: number }) => r.rating);
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
