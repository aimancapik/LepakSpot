import { Directive, ElementRef, Input, OnInit, Renderer2, inject } from '@angular/core';

@Directive({
  selector: '[appFadeUp]',
  standalone: true
})
export class FadeUpDirective implements OnInit {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);

  @Input('appFadeUp') index?: any;
  @Input() delay = 0.1; // base delay in seconds
  @Input() stagger = 0.05; // stagger delay in seconds

  ngOnInit() {
    this.renderer.addClass(this.el.nativeElement, 'animate-fade-up');
    
    let finalDelay = this.delay;
    if (this.index !== undefined && this.index !== '') {
      const idx = typeof this.index === 'string' ? parseInt(this.index, 10) : this.index;
      if (!isNaN(idx)) {
        finalDelay = this.delay + (idx * this.stagger);
      }
    }
    
    this.renderer.setStyle(this.el.nativeElement, 'animation-delay', `${finalDelay}s`);
    this.renderer.setStyle(this.el.nativeElement, 'animation-fill-mode', 'both');
  }
}
