// Rolagem suave "manteiga" (Lenis) + integração com o GSAP
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let lenis = null;
if (window.Lenis && !reduceMotion) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true, touchMultiplier: 1.6 });
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  // links do menu deslizam suave até a seção
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    const href = a.getAttribute('href');
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (href === '#') lenis.scrollTo(0);
      else lenis.scrollTo(href, { offset: -72 });
    });
  });
}

// Vitrine de vídeos: pan horizontal conforme rola (GSAP ScrollTrigger)
(() => {
  const section = document.querySelector('.pan-section');
  if (!section || !window.gsap || !window.ScrollTrigger || reduceMotion) return;
  gsap.registerPlugin(ScrollTrigger);
  const track = section.querySelector('.pan-track');
  const bar = section.querySelector('.pan-progress i');
  section.classList.add('pan-active');
  const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
  gsap.to(track, {
    x: () => -dist(),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => '+=' + dist(),
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => { if (bar) bar.style.width = (self.progress * 100).toFixed(1) + '%'; },
    },
  });
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();

// Preloader: mostra o logo, segura o scroll e revela o site
(() => {
  const pre = document.getElementById('preloader');
  if (!pre) return;
  const root = document.documentElement;
  root.style.overflow = 'hidden';
  if (lenis) lenis.stop();
  const reveal = () => {
    if (pre.classList.contains('is-done')) return;
    pre.classList.add('is-done');
    root.style.overflow = '';
    if (lenis) lenis.start();
    document.body.classList.add('is-loaded');
    setTimeout(() => { if (pre.parentNode) pre.remove(); }, 950);
  };
  // revela por tempo fixo (não espera os vídeos carregarem)
  setTimeout(reveal, 2300);
})();

// Nav: fundo sólido após rolar
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// Menu mobile
const toggle = document.getElementById('navToggle');
const links = document.getElementById('navLinks');
toggle.addEventListener('click', () => {
  const open = links.classList.toggle('is-open');
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
});
links.addEventListener('click', (e) => {
  if (e.target.closest('a')) {
    links.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }
});

// Reveal on scroll (respeita prefers-reduced-motion via CSS)
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      // cascata: cada irmão .reveal entra um pouquinho depois do anterior
      const sibs = [...entry.target.parentElement.children].filter((c) => c.classList.contains('reveal'));
      const i = sibs.indexOf(entry.target);
      if (i > 0) entry.target.style.transitionDelay = Math.min(i * 0.06, 0.3) + 's';
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0, rootMargin: '0px 0px 12% 0px' });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

// Barra de progresso de rolagem (topo da tela)
(() => {
  const bar = document.querySelector('.scroll-progress i');
  if (!bar) return;
  const update = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const y = window.scrollY || h.scrollTop;
    bar.style.width = (max > 0 ? (y / max) * 100 : 0).toFixed(2) + '%';
  };
  if (lenis) lenis.on('scroll', update);
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

// Botão magnético + inclinação 3D dos cards (só em telas com mouse)
if (window.matchMedia('(pointer: fine)').matches && !reduceMotion) {
  document.querySelectorAll('.btn-primary').forEach((btn) => {
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * 0.28;
      const y = (e.clientY - (r.top + r.height / 2)) * 0.28;
      btn.style.transform = `translate(${x}px, ${y}px)`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
  });
  document.querySelectorAll('.tier-card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${px * 7}deg) rotateX(${-py * 7}deg) translateY(-6px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}

// Vídeos de resultado: clique para assistir; se o arquivo não existe, mostra "em breve"
document.querySelectorAll('.video-card').forEach((card) => {
  const video = card.querySelector('video');
  const btn = card.querySelector('.video-play');

  const markEmpty = () => card.classList.add('is-empty');
  if (video.error) markEmpty();
  video.addEventListener('error', markEmpty);

  btn.addEventListener('click', () => {
    document.querySelectorAll('.video-card.is-playing video').forEach((v) => {
      if (v !== video) v.pause();
    });
    card.classList.add('is-playing');
    video.controls = true;
    video.play();
  });
});

// Hero: garante o autoplay mesmo com as travas dos navegadores/celular
const heroVid = document.querySelector('.hero-video');
if (heroVid) {
  heroVid.muted = true;
  heroVid.setAttribute('muted', '');
  const playHero = () => { const p = heroVid.play(); if (p) p.catch(() => {}); };
  playHero();
  ['loadeddata', 'canplay', 'canplaythrough'].forEach((ev) => heroVid.addEventListener(ev, playHero));
  ['touchstart', 'pointerdown', 'scroll', 'click', 'keydown'].forEach((ev) =>
    window.addEventListener(ev, playHero, { once: true, passive: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) playHero(); });
}

// Vídeos: mostra o aviso "arraste" só quando os cards não cabem na tela
(() => {
  const carousel = document.querySelector('.videos-carousel');
  if (!carousel) return;
  const track = carousel.querySelector('.videos');
  const update = () => {
    carousel.classList.toggle('has-overflow', track.scrollWidth - track.clientWidth > 4);
  };
  window.addEventListener('resize', update);
  update();
})();

// Depoimentos: duplica o conteúdo da esteira para o loop ser contínuo
const testiTrack = document.querySelector('.testi-track');
if (testiTrack && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const originais = Array.from(testiTrack.children);
  originais.forEach((card) => {
    const clone = card.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    testiTrack.appendChild(clone);
  });
}

// Formulário de orçamento: monta a mensagem e abre o WhatsApp
const form = document.getElementById('formOrcamento');
const formError = document.getElementById('formError');
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const dados = new FormData(form);
  const nome = (dados.get('nome') || '').trim();
  const carro = (dados.get('carro') || '').trim();
  const servico = dados.get('servico') || '';
  const cidade = dados.get('cidade') || '';
  const local = dados.get('local') || '';
  const obs = (dados.get('obs') || '').trim();

  if (!nome || !carro || !servico || !cidade || !local) {
    formError.textContent = 'Preencha nome, carro, serviço, cidade e local antes de enviar.';
    formError.hidden = false;
    formError.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return;
  }
  formError.hidden = true;

  const linhas = [
    'Olá! Vim pelo site da Vertex Detail e quero um orçamento.',
    '',
    'Nome: ' + nome,
    'Carro: ' + carro,
    'Serviço: ' + servico,
    'Cidade: ' + cidade,
    'Local de atendimento: ' + local,
  ];
  if (obs) linhas.push('Observações: ' + obs);

  const url = 'https://wa.me/5512992088268?text=' + encodeURIComponent(linhas.join('\n'));
  window.open(url, '_blank', 'noopener');
});
