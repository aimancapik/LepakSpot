import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="font-display bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      <!-- Header Section -->
      <header class="flex items-center bg-background-light dark:bg-background-dark p-4 pb-2 justify-between sticky top-0 z-50">
        <div class="flex size-12 shrink-0 items-center">
          <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary/20" data-alt="Portrait of a smiling woman in a cafe" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuCBhAog46DhhoJ9nI4dShO81BH39WPy90ajOAtdNEbvBIXLeK_5ProwOVKUfeWoP6io-q4EARSbld6c2jRllrq6apce-T6t7wcXo9EqylsFgiU56e5UnNTRUILwL_jQnOFrw58EqikDWamJ2f2wZxKmU3SApT1JtVNlMnfMHgKd7s0dm75g9vWS1Ku8ucCgofD-1KiQUOavUcXbcSLxMkozhAMgv3SrTH3cnBUxHpE2VPQR9wlh0lKeCPb-tFNy2NKjsN5EJsuJhps");'></div>
        </div>
        <h2 class="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 px-3">Hi Sarah, find a spot</h2>
        <div class="flex w-12 items-center justify-end">
          <button class="flex size-10 cursor-pointer items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm text-slate-700 dark:text-slate-200">
            <span class="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </header>

      <!-- Search Bar -->
      <div class="px-4 py-3">
        <label class="flex flex-col min-w-40 h-12 w-full">
          <div class="flex w-full flex-1 items-stretch rounded-xl h-full shadow-sm">
            <div class="text-primary flex border-none bg-white dark:bg-slate-800 items-center justify-center pl-4 rounded-l-xl">
              <span class="material-symbols-outlined">search</span>
            </div>
            <input class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-0 border-none bg-white dark:bg-slate-800 h-full placeholder:text-slate-400 px-4 rounded-l-none pl-2 text-base font-normal" placeholder="Search cafes..." value=""/>
          </div>
        </label>
      </div>

      <!-- Filter Chips -->
      <div class="flex gap-3 px-4 py-2 overflow-x-auto no-scrollbar">
        <div class="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-sage-muted/20 text-sage-muted border border-sage-muted/30 px-4">
          <span class="material-symbols-outlined text-sm">wifi</span>
          <p class="text-sm font-semibold leading-normal">WiFi</p>
        </div>
        <div class="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-sage-muted/20 text-sage-muted border border-sage-muted/30 px-4">
          <span class="material-symbols-outlined text-sm">verified</span>
          <p class="text-sm font-semibold leading-normal">Halal</p>
        </div>
        <div class="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-sage-muted/20 text-sage-muted border border-sage-muted/30 px-4">
          <span class="material-symbols-outlined text-sm">auto_awesome</span>
          <p class="text-sm font-semibold leading-normal">Aesthetic</p>
        </div>
        <div class="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-sage-muted/20 text-sage-muted border border-sage-muted/30 px-4">
          <span class="material-symbols-outlined text-sm">book</span>
          <p class="text-sm font-semibold leading-normal">Study</p>
        </div>
        <div class="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-sage-muted/20 text-sage-muted border border-sage-muted/30 px-4">
          <span class="material-symbols-outlined text-sm">potted_plant</span>
          <p class="text-sm font-semibold leading-normal">Chill</p>
        </div>
      </div>

      <!-- Nearby Cafés Section -->
      <main class="flex-1 overflow-y-auto px-4 pb-24">
        <div class="flex items-center justify-between pb-4 pt-6">
          <h2 class="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight tracking-[-0.015em]">Nearby Cafés</h2>
          <button class="text-primary text-sm font-bold">See all</button>
        </div>

        <!-- Café Cards -->
        <div class="grid gap-6">
          <!-- Card 1 -->
          <div class="group flex flex-col gap-3 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-md">
            <div class="relative w-full aspect-[16/9] overflow-hidden">
              <div class="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" data-alt="Modern minimalist cafe interior with wooden furniture" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuBKo1xFLcb9ojSNBwkBZg8lHXyXQwsoGQfB4luRElLn9pXZkMemdtsn9nrO4xc8ZS8VS-pNIDPx-TVDV26Br3i5MQpAQOnhuFYJrBBhhVmv8mfYHHahTxbKfzBnEPnpJ2XNkf_Dqrgykunaw_x3rGY3WQMZTcuZl-XJUmqt-DeFX0tNQSMAnqd1Iamr7I4zhQ-N85DkTW8eY2grmoYExkiRHlgrE4WTUI8X46AtydoWn6RipuYaXw8eB1hWYGbt81VnpzPi2JcnPGw");'></div>
              <div class="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-full px-2 py-1 flex items-center gap-1 shadow-sm">
                <span class="material-symbols-outlined text-primary text-sm">star</span>
                <span class="text-xs font-bold text-slate-800">4.8</span>
              </div>
            </div>
            <div class="px-4 pb-4">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">The Roast Lab</h3>
                  <p class="text-sm text-slate-500 mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-xs">location_on</span> 0.5km away
                  </p>
                </div>
              </div>
              <div class="flex gap-2 mt-3">
                <span class="px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">WiFi</span>
                <span class="px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">Aesthetic</span>
              </div>
            </div>
          </div>

          <!-- Card 2 -->
          <div class="group flex flex-col gap-3 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-md">
            <div class="relative w-full aspect-[16/9] overflow-hidden">
              <div class="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" data-alt="Cozy espresso bar with warm ambient lighting" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuCXQsHcPYDDAGg0K_8zrGNqIuSiR8p_lGxnwRR6z-KffWqFZrx6cANi211t6xlwBgy5ErfdTy4DmBOJtKxsz07ii7iT6vk7tuAd8SqFl3veUYIG2Hk0MzXnbBCqBex3GPOUOaYlQq8hnaUJD9shKlQ0P_lgZETeSChDxN-xJQOnZM5xn0CV8UqzIESOKBKLCtsTitZU9iGOFyKIzYfsXHoWlMjj0AUTDVTR6waBvf0F3-IR6pxXEgRPWXLyAS9KNwcews9bSV34He4");'></div>
              <div class="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-full px-2 py-1 flex items-center gap-1 shadow-sm">
                <span class="material-symbols-outlined text-primary text-sm">star</span>
                <span class="text-xs font-bold text-slate-800">4.6</span>
              </div>
            </div>
            <div class="px-4 pb-4">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">Brew &amp; Co.</h3>
                  <p class="text-sm text-slate-500 mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-xs">location_on</span> 1.2km away
                  </p>
                </div>
              </div>
              <div class="flex gap-2 mt-3">
                <span class="px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">Study</span>
                <span class="px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">Halal</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- Floating Action Button -->
      <div class="fixed bottom-24 right-4 z-40">
        <button routerLink="/create" class="flex h-14 items-center gap-2 rounded-full bg-primary px-6 text-white shadow-xl hover:bg-primary/90 transition-colors">
          <span class="material-symbols-outlined">timer</span>
          <span class="font-bold">Start a Session</span>
        </button>
      </div>

      <!-- Bottom Navigation Bar -->
      <nav class="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 pb-6 pt-2 z-50">
        <div class="flex justify-between items-center max-w-md mx-auto">
          <a routerLink="/" class="flex flex-1 flex-col items-center gap-1 text-primary">
            <span class="material-symbols-outlined fill-1">home</span>
            <p class="text-[10px] font-bold">Home</p>
          </a>
          <a routerLink="/create" class="flex flex-1 flex-col items-center gap-1 text-slate-400 dark:text-slate-500">
            <span class="material-symbols-outlined">explore</span>
            <p class="text-[10px] font-medium">Explore</p>
          </a>
          <a routerLink="/vote" class="flex flex-1 flex-col items-center gap-1 text-slate-400 dark:text-slate-500">
            <span class="material-symbols-outlined">timer</span>
            <p class="text-[10px] font-medium">Sessions</p>
          </a>
          <a routerLink="/profile" class="flex flex-1 flex-col items-center gap-1 text-slate-400 dark:text-slate-500">
            <span class="material-symbols-outlined">person</span>
            <p class="text-[10px] font-medium">Profile</p>
          </a>
        </div>
      </nav>
    </div>
  `
})
export class HomeComponent {}
