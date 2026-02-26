import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      <!-- Top Navigation Header -->
      <header class="sticky top-0 z-10 flex items-center bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md p-4 justify-between border-b border-primary/10">
        <div routerLink="/" class="text-primary flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 cursor-pointer">
          <span class="material-symbols-outlined">arrow_back</span>
        </div>
        <h2 class="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center">My Profile</h2>
        <div class="flex w-10 items-center justify-end">
          <button class="flex size-10 cursor-pointer items-center justify-center rounded-full bg-primary/10 text-primary">
            <span class="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto">
        <!-- User Profile Header -->
        <div class="flex p-6 @container">
          <div class="flex w-full flex-col gap-6 items-center">
            <div class="flex gap-4 flex-col items-center">
              <div class="relative">
                <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-32 w-32 border-4 border-primary/20" data-alt="Professional headshot of a smiling young woman" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuAQDm-cItHT9bTmahIV_y1aDs6kWjjlLzEW8jnQOhJMb4iw0dMOm54BPamhxiedFHGb6oozyjxFhQsSGyGQm82dTdaLd-7pHo9Ob-zC99OyVLjkd6trIS9LNRcRTsuFa88nse625hWRLnR8m6iqmpfvZWQWYWHCy4ZCKLJLkdk9AcbRGj9gIZjY36qiW8oqAtb1J7u4ELizIgHC39PFFZ3Gtr1zDpcmGMFOtDXjzEOLbvfuS_JSHF1f3esBY01RCD4YvTlzpJ1ke1Q");'>
                </div>
                <div class="absolute bottom-1 right-1 bg-primary text-white p-1 rounded-full flex items-center justify-center border-2 border-background-light">
                  <span class="material-symbols-outlined text-sm">verified</span>
                </div>
              </div>
              <div class="flex flex-col items-center justify-center">
                <p class="text-slate-900 dark:text-slate-100 text-2xl font-bold tracking-tight text-center">Sarah Lim</p>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-primary font-semibold">1,250 pts</span>
                  <span class="w-1 h-1 rounded-full bg-primary/40"></span>
                  <p class="text-slate-500 dark:text-slate-400 font-medium">Coffee Enthusiast</p>
                </div>
              </div>
            </div>

            <!-- Quick Stats -->
            <div class="flex w-full justify-around py-4 border-y border-primary/10">
              <div class="flex flex-col items-center">
                <span class="text-lg font-bold text-slate-900 dark:text-slate-100">24</span>
                <span class="text-xs text-slate-500 uppercase tracking-wider">Cafes</span>
              </div>
              <div class="flex flex-col items-center border-x border-primary/10 px-8">
                <span class="text-lg font-bold text-slate-900 dark:text-slate-100">12</span>
                <span class="text-xs text-slate-500 uppercase tracking-wider">Badges</span>
              </div>
              <div class="flex flex-col items-center">
                <span class="text-lg font-bold text-slate-900 dark:text-slate-100">8</span>
                <span class="text-xs text-slate-500 uppercase tracking-wider">Streaks</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Badge Collection -->
        <section class="px-4 py-2">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-slate-900 dark:text-slate-100 text-lg font-bold tracking-tight">Badge Collection</h3>
            <button class="text-primary text-sm font-semibold">View All</button>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <!-- Caffeine King - Unlocked -->
            <div class="flex flex-col items-center gap-3 rounded-xl border border-primary/10 bg-white dark:bg-background-dark/50 p-4 shadow-sm">
              <div class="text-primary bg-primary/10 p-3 rounded-full">
                <span class="material-symbols-outlined text-2xl">crown</span>
              </div>
              <div class="flex flex-col items-center gap-1 text-center">
                <h4 class="text-slate-900 dark:text-slate-100 text-xs font-bold leading-tight">Caffeine King</h4>
                <p class="text-primary text-[10px] font-bold uppercase tracking-tighter">Unlocked</p>
              </div>
            </div>
            <!-- Early Bird - Unlocked -->
            <div class="flex flex-col items-center gap-3 rounded-xl border border-primary/10 bg-white dark:bg-background-dark/50 p-4 shadow-sm">
              <div class="text-primary bg-primary/10 p-3 rounded-full">
                <span class="material-symbols-outlined text-2xl">wb_sunny</span>
              </div>
              <div class="flex flex-col items-center gap-1 text-center">
                <h4 class="text-slate-900 dark:text-slate-100 text-xs font-bold leading-tight">Early Bird</h4>
                <p class="text-primary text-[10px] font-bold uppercase tracking-tighter">Unlocked</p>
              </div>
            </div>
            <!-- Halal Hunter - Locked -->
            <div class="flex flex-col items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-background-dark/20 p-4 opacity-60">
              <div class="text-slate-400 dark:text-slate-600 bg-slate-200 dark:bg-slate-800 p-3 rounded-full">
                <span class="material-symbols-outlined text-2xl">lock</span>
              </div>
              <div class="flex flex-col items-center gap-1 text-center">
                <h4 class="text-slate-500 dark:text-slate-400 text-xs font-bold leading-tight">Halal Hunter</h4>
                <p class="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">Locked</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Café History -->
        <section class="px-4 py-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-slate-900 dark:text-slate-100 text-lg font-bold tracking-tight">Recent Activity</h3>
            <button class="text-primary text-sm font-semibold">History</button>
          </div>
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-4 p-3 bg-white dark:bg-background-dark/50 rounded-xl border border-primary/5">
              <div class="size-12 rounded-lg bg-cover bg-center" data-alt="Modern cozy cafe interior with wood accents" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuCnFMoRRdOUHI-SIDqPsE_oYeJ2nf5duASSUN8jxc84XXsngUP8Re428NWSiFkUMJxr7ztc5GzK4enj85_K4L39x4y6reOe-ItUqwT-QlXSYCJB9MAF_3T5zydxKTJWn5pyc_KX7h8fAyju-Y4Rdp0TN7o5z4wdzhFr6O-HHDcOUuOQ7GTQNvakCkPeFnqmu3sLm4VxANzGb4poBrwDOciJNaBPktbrpu-HR5XkMeShnJEWbM5EDB-5-9zF5tJeVtroyUZ2-GTed-8');"></div>
              <div class="flex-1">
                <h4 class="text-slate-900 dark:text-slate-100 font-bold text-sm">VCR Café</h4>
                <p class="text-slate-500 dark:text-slate-400 text-xs">2 hours ago</p>
              </div>
              <div class="text-right">
                <span class="text-primary font-bold text-sm">+25 pts</span>
              </div>
            </div>
            <div class="flex items-center gap-4 p-3 bg-white dark:bg-background-dark/50 rounded-xl border border-primary/5">
              <div class="size-12 rounded-lg bg-cover bg-center" data-alt="Bustling city coffee shop counter" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuDmOgzg_HClzR4YGKiyaFMpffVztzXow4NhFDPDPiB_lZKntR_jDyzeIZAgfslfyz219ktpp2aotbkI592Ts0vLCaTLgNU4Sk6_RcvvdmxmsDHOqZIULsd_Mp5g94hdi3R8lGprkHsjDPc4qJqgCAs-VFXIWXbz8drOb38NvMuyV4XcLTq_azipC3vpVs-4V5TbUMa56y9oh-Osq68CgFawVWhMGVz7-VKET1pOrYWHbFPJy-VvfsYjZ14CKQckUOewlea39I1e2fw');"></div>
              <div class="flex-1">
                <h4 class="text-slate-900 dark:text-slate-100 font-bold text-sm">Feeka Coffee Roasters</h4>
                <p class="text-slate-500 dark:text-slate-400 text-xs">Yesterday</p>
              </div>
              <div class="text-right">
                <span class="text-primary font-bold text-sm">+15 pts</span>
              </div>
            </div>
            <div class="flex items-center gap-4 p-3 bg-white dark:bg-background-dark/50 rounded-xl border border-primary/5">
              <div class="size-12 rounded-lg bg-cover bg-center" data-alt="Latte art on a wooden table" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAHz_V_iqIZQpUDF3ko9J4r6FDo5BgGVkO-sZ-uhIbwJCwbvmSgP-os2GfGa7mJprGjLYasPS3mC9cx6pjIL1gEhZVpL-SC5DH_vZxabUnkpVxXyj5GjT_j-HQN0W3Gar1OUWFqkv-Ud-5Q7AtENkQ_qYvDP-g5yOpgWJX3u4ao5md-fNNhSXASkcsX0JjZhTk_5es3HSUgv2B1m6vCE7-kSROGizP2pop857X4pHTKHJu4WFoPYQi5N24StpY0U88T7QK9aMPjxps');"></div>
              <div class="flex-1">
                <h4 class="text-slate-900 dark:text-slate-100 font-bold text-sm">LOKL Coffee Co.</h4>
                <p class="text-slate-500 dark:text-slate-400 text-xs">3 days ago</p>
              </div>
              <div class="text-right">
                <span class="text-primary font-bold text-sm">+20 pts</span>
              </div>
            </div>
          </div>
        </section>
        <div class="h-24"></div>
      </main>

      <!-- Bottom Navigation Bar -->
      <nav class="fixed bottom-0 left-0 right-0 border-t border-primary/10 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md px-4 pb-6 pt-2">
        <div class="flex items-center justify-between max-w-md mx-auto">
          <a routerLink="/" class="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400">
            <span class="material-symbols-outlined text-2xl">map</span>
            <p class="text-[10px] font-semibold uppercase tracking-wider">Explore</p>
          </a>
          <a routerLink="/create" class="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400">
            <span class="material-symbols-outlined text-2xl">trophy</span>
            <p class="text-[10px] font-semibold uppercase tracking-wider">Rewards</p>
          </a>
          <a routerLink="/vote" class="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400">
            <span class="material-symbols-outlined text-2xl">history</span>
            <p class="text-[10px] font-semibold uppercase tracking-wider">History</p>
          </a>
          <a routerLink="/profile" class="flex flex-1 flex-col items-center justify-center gap-1 text-primary">
            <span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">person</span>
            <p class="text-[10px] font-semibold uppercase tracking-wider">Profile</p>
          </a>
        </div>
      </nav>
    </div>
  `
})
export class ProfileComponent {}
