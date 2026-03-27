// ═══════ SEASONAL PARTICLE SYSTEM ═══════
class SeasonalParticles {
  constructor() {
    this.season = this.detectSeason();
    this.particles = [];
    this.canvas = null;
    this.ctx = null;
    this.init();
  }

  detectSeason() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  init() {
    this.createCanvas();
    this.spawnParticles();
    this.animate();
    document.body.appendChild(this.canvas);
  }

  createCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'seasonal-particles';
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx = this.canvas.getContext('2d');
    
    Object.assign(this.canvas.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '1',
      pointerEvents: 'none',
      opacity: this.getSeasonOpacity()
    });
  }

  getSeasonOpacity() {
    switch(this.season) {
      case 'spring': return '0.6';
      case 'summer': return '0.4';
      case 'fall': return '0.5';
      case 'winter': return '0.7';
      default: return '0.5';
    }
  }

  spawnParticles() {
    const count = this.season === 'winter' ? 80 : this.season === 'summer' ? 60 : 50;
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle());
    }
  }

  createParticle() {
    const x = Math.random() * this.canvas.width;
    const y = Math.random() * (this.canvas.height + 100) - 100;
    
    if (this.season === 'spring') {
      return {
        x, y, vx: (Math.random() - 0.5) * 2, vy: Math.random() * 1.5 + 0.5,
        size: Math.random() * 3 + 2, opacity: Math.random() * 0.7 + 0.3,
        rotation: Math.random() * Math.PI * 2, rotationSpeed: (Math.random() - 0.5) * 0.1,
        life: 1, maxLife: Math.random() * 8 + 12
      };
    } else if (this.season === 'summer') {
      return {
        x, y, vx: (Math.random() - 0.5) * 1, vy: Math.random() * 0.5 + 0.2,
        size: Math.random() * 2 + 1, opacity: Math.random() * 0.8 + 0.2,
        glow: Math.random() * 10 + 5, life: 1, maxLife: Math.random() * 10 + 15
      };
    } else if (this.season === 'fall') {
      return {
        x, y, vx: (Math.random() - 0.5) * 3, vy: Math.random() * 1.5 + 0.5,
        size: Math.random() * 4 + 3, opacity: Math.random() * 0.8 + 0.4,
        rotation: Math.random() * Math.PI * 2, rotationSpeed: (Math.random() - 0.5) * 0.2,
        wobble: Math.random() * 2, wobbleSpeed: Math.random() * 0.05 + 0.02,
        wobbleAmount: 0, life: 1, maxLife: Math.random() * 10 + 15
      };
    } else {
      return {
        x, y, vx: (Math.random() - 0.5) * 1.5, vy: Math.random() * 1 + 0.5,
        size: Math.random() * 3 + 1, opacity: Math.random() * 0.9 + 0.1,
        rotation: Math.random() * Math.PI * 2, rotationSpeed: (Math.random() - 0.5) * 0.15,
        life: 1, maxLife: Math.random() * 12 + 18
      };
    }
  }

  drawSpringBlossom(x, y, size, rotation, opacity) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(rotation);
    this.ctx.globalAlpha = opacity;
    this.ctx.fillStyle = '#ff99cc';
    for (let i = 0; i < 5; i++) {
      this.ctx.save();
      this.ctx.rotate((i / 5) * Math.PI * 2);
      this.ctx.fillRect(-size/4, -size/2, size/2, size);
      this.ctx.restore();
    }
    this.ctx.restore();
  }

  drawFirefly(x, y, size, opacity, glow) {
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, glow);
    gradient.addColorStop(0, 'rgba(255, 255, 150, 0.6)');
    gradient.addColorStop(1, 'rgba(255, 255, 100, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x - glow, y - glow, glow * 2, glow * 2);
    this.ctx.fillStyle = '#ffff99';
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawLeaf(x, y, size, rotation, opacity) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(rotation);
    this.ctx.globalAlpha = opacity;
    this.ctx.fillStyle = `hsl(${20 + Math.random() * 30}, 80%, 50%)`;
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, size * 0.8, size * 1.2, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(139, 69, 19, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -size * 1.2);
    this.ctx.lineTo(0, size * 1.2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawSnowflake(x, y, size, rotation, opacity) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(rotation);
    this.ctx.globalAlpha = opacity;
    this.ctx.strokeStyle = '#e0f7ff';
    this.ctx.lineWidth = 1.5;
    this.ctx.lineCap = 'round';
    
    for (let i = 0; i < 6; i++) {
      this.ctx.save();
      this.ctx.rotate((i / 6) * Math.PI * 2);
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(0, -size);
      this.ctx.stroke();
      for (let j = 1; j <= 3; j++) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, -size * (j / 3));
        this.ctx.lineTo(-size * 0.3, -size * (j / 3 + 0.2));
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(0, -size * (j / 3));
        this.ctx.lineTo(size * 0.3, -size * (j / 3 + 0.2));
        this.ctx.stroke();
      }
      this.ctx.restore();
    }
    this.ctx.restore();
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      
      if (this.season === 'spring') {
        p.rotation += p.rotationSpeed;
        p.vy += 0.02;
      } else if (this.season === 'summer') {
        p.vy += Math.sin(p.y * 0.01) * 0.05;
      } else if (this.season === 'fall') {
        p.rotation += p.rotationSpeed;
        p.wobbleAmount += p.wobbleSpeed;
        p.x += Math.sin(p.wobbleAmount) * 0.5;
        p.vy += 0.015;
      } else if (this.season === 'winter') {
        p.rotation += p.rotationSpeed;
        p.vy += 0.01;
        p.vx += (Math.random() - 0.5) * 0.1;
      }
      
      p.life -= 1 / p.maxLife;
      p.opacity = p.life * 0.8;
      
      if (p.y > this.canvas.height + 50 || p.life <= 0) {
        this.particles.splice(i, 1);
        this.particles.push(this.createParticle());
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const p of this.particles) {
      if (this.season === 'spring') this.drawSpringBlossom(p.x, p.y, p.size, p.rotation, p.opacity);
      else if (this.season === 'summer') this.drawFirefly(p.x, p.y, p.size, p.opacity, p.glow);
      else if (this.season === 'fall') this.drawLeaf(p.x, p.y, p.size, p.rotation, p.opacity);
      else this.drawSnowflake(p.x, p.y, p.size, p.rotation, p.opacity);
    }
  }

  animate() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.animate());
  }
}

// ═══════ REVEAL ANIMATION ON SCROLL ═══════
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -100px 0px' };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('in');
  });
}, observerOptions);

// ═══════ INITIALIZE ALL SYSTEMS ═══════
document.addEventListener('DOMContentLoaded', () => {
  // Initialize seasonal particles
  new SeasonalParticles();
  
  // Initialize scroll reveals
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
});
