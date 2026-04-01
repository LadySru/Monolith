// ═══════ PARTICLE CONTROLS ═══════
(function() {
  const toggle = document.getElementById('particleToggle');
  const slider = document.getElementById('particleSlider');
  const intensityValue = document.getElementById('intensityValue');

  if (!toggle || !slider) return;

  // Load saved settings
  const savedIntensity = parseInt(localStorage.getItem('particleIntensity') || '100', 10);
  const savedEnabled = localStorage.getItem('particleEnabled') !== 'false';

  // Initialize UI with saved settings
  function initializeUI() {
    slider.value = savedIntensity;
    intensityValue.textContent = savedIntensity;

    if (savedEnabled) {
      toggle.classList.add('enabled');
    } else {
      toggle.classList.remove('enabled');
    }

    updateParticleSystem();
  }

  // Handle toggle switch
  toggle.addEventListener('click', () => {
    const isCurrentlyEnabled = toggle.classList.contains('enabled');
    const newState = !isCurrentlyEnabled;

    toggle.classList.toggle('enabled');
    localStorage.setItem('particleEnabled', newState);

    if (newState) {
      // Re-enable with current intensity
      const intensity = parseInt(slider.value, 10);
      if (window.particleSystem) {
        window.particleSystem.setIntensity(intensity);
      }
    } else {
      // Disable particles
      if (window.particleSystem) {
        window.particleSystem.setIntensity(0);
      }
    }
  });

  // Handle intensity slider
  slider.addEventListener('input', (e) => {
    const intensity = parseInt(e.target.value, 10);
    intensityValue.textContent = intensity;
    localStorage.setItem('particleIntensity', intensity);

    if (window.particleSystem) {
      if (intensity > 0) {
        // Enable particles if they were disabled
        if (!toggle.classList.contains('enabled')) {
          toggle.classList.add('enabled');
          localStorage.setItem('particleEnabled', 'true');
        }
        window.particleSystem.setIntensity(intensity);
      } else {
        // Disable particles if intensity is 0
        toggle.classList.remove('enabled');
        localStorage.setItem('particleEnabled', 'false');
        if (window.particleSystem) {
          window.particleSystem.setIntensity(0);
        }
      }
    }
  });

  // Initialize when particle system is ready
  function updateParticleSystem() {
    if (window.particleSystem) {
      if (savedEnabled && savedIntensity > 0) {
        window.particleSystem.setIntensity(savedIntensity);
      } else {
        window.particleSystem.setIntensity(0);
      }
    } else {
      // Retry after a short delay if particle system hasn't initialized yet
      setTimeout(updateParticleSystem, 100);
    }
  }

  // Initialize after a short delay to ensure particle system is loaded
  setTimeout(initializeUI, 50);
})();
