/**
 * BLDC Motor Lab - Technical Console Controller & Motion System
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // 1. Mobile Navigation Toggle
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      const isOpen = navLinks.classList.contains('open');
      mobileToggle.setAttribute('aria-expanded', isOpen);
    });

    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !mobileToggle.contains(e.target) && navLinks.classList.contains('open')) {
        navLinks.classList.remove('open');
        mobileToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // 2. Active Route Highlight
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navItems = document.querySelectorAll('.nav-item a');
  navItems.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // 3. Staggered Page-Load & Scroll-Trigger Reveals (IntersectionObserver)
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observerOptions = {
      root: null,
      rootMargin: '120px 0px 120px 0px',
      threshold: 0.05
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry, idx) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('in-view');
          }, idx * 40);
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    revealElements.forEach(el => revealObserver.observe(el));

    // Safety fallback: reveal all elements after 1s
    setTimeout(() => {
      revealElements.forEach(el => el.classList.add('in-view'));
    }, 1000);
  } else {
    // Fallback if reduced motion or no IntersectionObserver
    revealElements.forEach(el => el.classList.add('in-view'));
  }

  // 4. Signature Interaction: Technical Coordinate HUD & Inspection Crosshair
  const coordsStamp = document.querySelector('.hud-coords-stamp');
  const crosshair = document.querySelector('.hud-crosshair');

  if (coordsStamp && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let ticking = false;

    window.addEventListener('mousemove', (e) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const x = e.clientX;
          const y = e.clientY;
          coordsStamp.innerHTML = `
            <span>SYS_LOC [X:${String(x).padStart(4, '0')} Y:${String(y).padStart(4, '0')}]</span>
            <span style="color: #ECEFF4;">CAL: 50.00Hz</span>
          `;
          if (crosshair) {
            crosshair.style.left = `${x}px`;
            crosshair.style.top = `${y}px`;
          }
          ticking = false;
        });
        ticking = true;
      }
    });

    // Show crosshair only when over instrument panels and SVG diagrams
    const instrumentAreas = document.querySelectorAll('.motor-chassis-stage, .oscilloscope-stage, .chart-canvas-wrap, .comp-table');
    instrumentAreas.forEach(area => {
      area.addEventListener('mouseenter', () => {
        if (crosshair) crosshair.classList.add('active');
      });
      area.addEventListener('mouseleave', () => {
        if (crosshair) crosshair.classList.remove('active');
      });
    });
  }

  // 5. Global Toast Notification Helper
  window.showToast = function(message = 'Parameter copied to buffer') {
    let toast = document.querySelector('.toast-msg');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast-msg';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `
      <span style="color: var(--accent-amber); font-weight: 700;">[SYS_OK]</span>
      <span>${message}</span>
    `;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  };

  // 6. Code Copy Button Handler
  const copyButtons = document.querySelectorAll('.copy-btn');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        navigator.clipboard.writeText(targetElement.innerText).then(() => {
          window.showToast('Code buffer copied to clipboard');
        }).catch(() => {
          window.showToast('Buffer copy error');
        });
      }
    });
  });
});
