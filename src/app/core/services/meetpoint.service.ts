import { Injectable, inject } from '@angular/core';
import { MemberLocation } from '../models/session.model';
import { Cafe } from '../models/cafe.model';
import { CafeService } from './cafe.service';

export interface MeetpointResult {
    midpoint: { lat: number; lng: number };
    nearbyCafes: Cafe[];
}

@Injectable({ providedIn: 'root' })
export class MeetpointService {
    private cafeService = inject(CafeService);

    /** Calculate geographic centroid of member locations */
    calculateMidpoint(locations: Record<string, MemberLocation>): { lat: number; lng: number } {
        const entries = Object.values(locations);
        if (entries.length === 0) return { lat: 3.139, lng: 101.6869 }; // default KL center
        if (entries.length === 1) return { lat: entries[0].lat, lng: entries[0].lng };

        const sumLat = entries.reduce((acc, loc) => acc + loc.lat, 0);
        const sumLng = entries.reduce((acc, loc) => acc + loc.lng, 0);
        return {
            lat: sumLat / entries.length,
            lng: sumLng / entries.length,
        };
    }

    /** Find cafes within a given radius (km) of the midpoint */
    findCafesNearMidpoint(midpoint: { lat: number; lng: number }, radiusKm = 2): Cafe[] {
        const allCafes = this.cafeService.nearbyCafes();
        return allCafes
            .filter(c => !c.pendingApproval)
            .filter(c => this.cafeService.distanceKm(midpoint.lat, midpoint.lng, c.lat, c.lng) <= radiusKm)
            .sort((a, b) =>
                this.cafeService.distanceKm(midpoint.lat, midpoint.lng, a.lat, a.lng) -
                this.cafeService.distanceKm(midpoint.lat, midpoint.lng, b.lat, b.lng)
            );
    }

    /** Full calculation: midpoint + nearby cafes */
    calculate(locations: Record<string, MemberLocation>, radiusKm = 2): MeetpointResult {
        const midpoint = this.calculateMidpoint(locations);
        const nearbyCafes = this.findCafesNearMidpoint(midpoint, radiusKm);
        return { midpoint, nearbyCafes };
    }

    /** Distance label from midpoint to a cafe */
    distanceFromMidpoint(midpoint: { lat: number; lng: number }, cafe: Cafe): string {
        const d = this.cafeService.distanceKm(midpoint.lat, midpoint.lng, cafe.lat, cafe.lng);
        return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
    }

    /** Max travel distance for any member to a given cafe */
    maxTravelDistance(locations: Record<string, MemberLocation>, cafe: Cafe): string {
        const entries = Object.values(locations);
        if (entries.length === 0) return '—';
        const maxD = Math.max(...entries.map(loc =>
            this.cafeService.distanceKm(loc.lat, loc.lng, cafe.lat, cafe.lng)
        ));
        return maxD < 1 ? `${Math.round(maxD * 1000)}m` : `${maxD.toFixed(1)}km`;
    }
}
