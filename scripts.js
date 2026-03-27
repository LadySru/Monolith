// ═══════ REACTIVE CURSOR SYSTEM ═══════
class ReactiveCursor {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.isClicking = false;
    this.isHovering = false;
    this.currentState = 'default';
    this.easing = 0.15;
    this.init();
  }

  init() {
    this.createCursorElement();
    this.createStyleSheet();
    this.attachEventListeners();
    this.animate();
  }

  createCursorElement() {
    let cursor = document.getElementById('cur');
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.id = 'cur';
      document.body.appendChild(cursor);
    }
    Object.assign(cursor.style, {
      width: '12px', height: '12px', background: 'var(--teal)',
      borderRadius: '50%', position: 'fixed', pointerEvents: 'none',
      zIndex: '9999', transition: 'all 0.1s ease-out',
      mixBlendMode: 'screen',
      boxShadow: '0 0 8px var(--teal), 0 0 20px rgba(0,255,231,0.4)'
    });
    document.body.style.cursor = 'none';
  }

  createStyleSheet() {
    const style = document.createElement('style');
    style.textContent = 
      @keyframes pulseRipple { 
        from { width:30px; height:30px; opacity:1; border-color:var(--teal); }
        to { width:60px; height:60px; opacity:0; border-color:rgba(0,255,231,0); }
      }
      @keyframes clickBurst {
        0% { width:20px; height:20px; opacity:1; transform:translate(-50%,-50%) scale(1); }
        100% { width:40px; height:40px; opacity:0; transform:translate(-50%,-50%) scale(1.5); }
      }
      @keyframes trailFade { from { opacity:1; } to { opacity:0; } }
    ;
    document.head.appendChild(style);
  }

  attachEventListeners() {
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mousedown', () => this.onMouseDown());
    document.addEventListener('mouseup', () => this.onMouseUp());
    document.addEventListener('mouseover', (e) => this.onMouseOver(e));
    document.addEventListener('mouseout', (e) => this.onMouseOut(e));
    document.addEventListener('click', (e) => this.onClick(e));
  }

  onMouseMove(e) {
    this.targetX = e.clientX;
    this.targetY = e.clientY;
    if (Math.random() > 0.6) this.addTrailParticle(this.x, this.y);
    const element = document.elementFromPoint(e.clientX, e.clientY);
    this.updateStateBasedOnElement(element);
  }

  onMouseDown() {
    this.isClicking = true;
    this.currentState = 'click';
    this.updateCursorStyle();
  }

  onMouseUp() {
    this.isClicking = false;
    this.currentState = this.isHovering ? 'hover' : 'default';
    this.updateCursorStyle();
  }

  onMouseOver(e) {
    const target = e.target;
    if (target.matches('a, button, input[type=\"button\"], input[type=\"submit\"]')) {
      this.isHovering = true;
      this.currentState = 'hover';
      this.createHoverRipple(this.x, this.y);
    } else if (target.matches('input, textarea')) {
      this.currentState = 'text';
    }
    this.updateCursorStyle();
  }

  onMouseOut(e) {
    const target = e.target;
    if (target.matches('a, button, input[type=\"button\"], input[type=\"submit\"]')) {
      this.isHovering = false;
      this.currentState = 'default';
    }
    this.updateCursorStyle();
  }

  onClick(e) {
    this.createClickEffect(e.clientX, e.clientY);
  }

  updateStateBasedOnElement(element) {
    if (!element) return;
    if (element.matches('a, button, input[type=\"button\"], input[type=\"submit\"]')) {
      if (this.currentState !== 'click') this.currentState = 'hover';
    } else if (element.matches('input, textarea')) {
      this.currentState = 'text';
    } else {
      if (!this.isClicking) this.currentState = 'default';
    }
  }

  updateCursorStyle() {
    const cursor = document.getElementById('cur');
    if (!cursor) return;
    switch(this.currentState) {
      case 'hover':
        Object.assign(cursor.style, {
          width: '28px', height: '28px', background: 'transparent',
          border: '1.5px solid var(--teal)',
          boxShadow: '0 0 12px var(--teal), 0 0 24px rgba(0,255,231,0.5), inset 0 0 8px rgba(0,255,231,0.3)'
        });
        break;
      case 'click':
        Object.assign(cursor.style, {
          width: '18px', height: '18px', background: 'var(--teal)',
          border: 'none',
          boxShadow: '0 0 16px var(--teal), 0 0 32px rgba(0,255,231,0.6)'
        });
        break;
      case 'text':
        Object.assign(cursor.style, {
          width: '2px', height: '20px', background: 'var(--teal)',
          border: 'none', boxShadow: '0 0 8px var(--teal)'
        });
        break;
      default:
        Object.assign(cursor.style, {
          width: '12px', height: '12px', background: 'var(--teal)',
          border: 'none',
          boxShadow: '0 0 8px var(--teal), 0 0 20px rgba(0,255,231,0.4)'
        });
    }
  }

  addTrailParticle(x, y) {
    const trail = document.createElement('div');
    Object.assign(trail.style, {
      position: 'fixed', left: x + 'px', top: y + 'px',
      width: '6px', height: '6px', background: 'var(--teal)',
      borderRadius: '50%', pointerEvents: 'none', zIndex: '9998',
      transform: 'translate(-50%, -50%)',
      animation: 'trailFade 0.5s ease-out forwards', opacity: '0.6'
    });
    document.body.appendChild(trail);
    setTimeout(() => trail.remove(), 500);
  }

  createHoverRipple(x, y) {
    const ripple = document.createElement('div');
    Object.assign(ripple.style, {
      position: 'fixed', left: x + 'px', top: y + 'px',
      width: '30px', height: '30px', border: '2px solid var(--teal)',
      borderRadius: '50%', pointerEvents: 'none', zIndex: '9998',
      transform: 'translate(-50%, -50%)',
      animation: 'pulseRipple 0.6s ease-out forwards'
    });
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  createClickEffect(x, y) {
    const effect = document.createElement('div');
    Object.assign(effect.style, {
      position: 'fixed', left: x + 'px', top: y + 'px',
      width: '20px', height: '20px', background: 'var(--teal)',
      borderRadius: '50%', pointerEvents: 'none', zIndex: '9997',
      transform: 'translate(-50%, -50%)',
      animation: 'clickBurst 0.4s ease-out forwards'
    });
    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 400);
  }

  animate() {
    const cursor = document.getElementById('cur');
    if (!cursor) return;
    this.x += (this.targetX - this.x) * this.easing;
    this.y += (this.targetY - this.y) * this.easing;
    cursor.style.left = this.x + 'px';
    cursor.style.top = this.y + 'px';
    requestAnimationFrame(() => this.animate());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ReactiveCursor();
  const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -100px 0px' };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('in');
    });
  }, observerOptions);
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
});
