import { createComponent as createAuthViews } from './auth.js';
import { createComponent as createCatalogViews } from './catalog.js';
import { createComponent as createAdminViews } from './admin.js';
import { createComponent as createRankingViews } from './rankings.js';
import { createComponent as createWriterViews } from './writer.js';
import { createComponent as createReaderViews } from './reader.js';
import { createPaymentViews } from './payments.js';

export function createViews(context) {
  const auth = createAuthViews(context);
  const sharedContext = { ...context, renderAuthModal: auth.renderAuthModal };
  const catalog = createCatalogViews(sharedContext);
  const admin = createAdminViews({ ...sharedContext, renderAdminSummary: catalog.renderAdminSummary });
  const rankings = createRankingViews(sharedContext);
  const writer = createWriterViews(sharedContext);
  const reader = createReaderViews(sharedContext);
  const payments = createPaymentViews(sharedContext);
  const { root, state, getStory, loadAdminSummary, loadAdminPayments, loadRankings, loadStoryReviews, updateSearchResults } = context;
  let featuredCarouselTimer = null;

  function stopFeaturedCarousel() {
    if (featuredCarouselTimer !== null) {
      window.clearInterval(featuredCarouselTimer);
      featuredCarouselTimer = null;
    }
  }

  function setupFeaturedCarousel() {
    stopFeaturedCarousel();
    const carousel = root.querySelector('.featured-carousel');
    const track = carousel?.querySelector('.featured-carousel-track');
    const slides = carousel?.querySelectorAll('[data-featured-slide]');
    if (!carousel || !track || !slides || slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    featuredCarouselTimer = window.setInterval(() => {
      if (document.hidden) return;
      const currentIndex = Number(carousel.dataset.activeIndex) || 0;
      const nextIndex = (currentIndex + 1) % slides.length;
      state.featuredIndex = nextIndex;
      carousel.dataset.activeIndex = String(nextIndex);
      track.style.transform = `translate3d(-${nextIndex * 100}%, 0, 0)`;
      slides.forEach((slide, index) => slide.setAttribute('aria-hidden', String(index !== nextIndex)));
      carousel.querySelectorAll('.featured-carousel-dot').forEach((dot, index) => {
        const active = index === nextIndex;
        dot.classList.toggle('active', active);
        dot.setAttribute('aria-pressed', String(active));
      });
      const currentLabel = carousel.querySelector('[data-featured-current]');
      if (currentLabel) currentLabel.textContent = String(nextIndex + 1);
    }, 4500);
  }

  function render() {
    stopFeaturedCarousel();
    const story = getStory();
    if (!state.user) root.innerHTML = catalog.renderHome();
    else if (state.screen === 'detail' && story) root.innerHTML = reader.renderStoryDetail(story);
    else if (state.screen === 'reader') root.innerHTML = reader.renderReader(story);
    else if (state.screen === 'writer') root.innerHTML = writer.renderWriter();
    else if (state.screen === 'admin') root.innerHTML = admin.renderAdmin();
    else if (state.screen === 'rankings') root.innerHTML = rankings.renderRankings();
    else root.innerHTML = catalog.renderHome();
    if (state.user) root.innerHTML += payments.renderPaymentModal();
    if (['home', 'admin'].includes(state.screen) && state.user?.role === 'admin') loadAdminSummary();
    if (state.screen === 'admin' && state.user?.role === 'admin') loadAdminPayments();
    if (state.screen === 'rankings') loadRankings();
    if (state.screen === 'home') updateSearchResults();
    if (state.screen === 'detail' && state.storyId) loadStoryReviews(state.storyId);
    if (state.screen === 'home' && state.user) setupFeaturedCarousel();
  }

  return {
    render,
    renderAdminSummary: catalog.renderAdminSummary,
    renderFilteredStories: catalog.renderFilteredStories,
    renderPendingPayments: admin.renderPendingPayments,
    renderRankingColumns: rankings.renderRankingColumns,
    renderReviewsPanel: reader.renderReviewsPanel,
  };
}