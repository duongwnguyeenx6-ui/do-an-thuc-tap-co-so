import { createLayoutViews } from './js/layout.js';
import { createViews } from './js/views.js';
import { normalizeText } from './js/utils.js';

(() => {
        'use strict';

        const root = document.getElementById('app');
        const genres = ['Huyền Huyễn', 'Tiên Hiệp', 'Đấu Phá Thương Khung', 'Lịch Sử', 'Kỳ Ảo', 'Hành Động'];
        let lampPull = null;
        let ignoreLampClick = false;
        let lampBubbleTimer = null;
        let authFlipBubbleTimer = null;
        let authModeSwitchToken = 0;

        function readStorage(key, fallback) {
            try {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : fallback;
            } catch {
                return fallback;
            }
        }

        const state = {
            screen: 'home',
            stories: [],
            storyId: null,
            chapterIndex: 0,
            genre: 'Tất cả',
            fullOnly: false,
            favoritesOnly: false,
            favorites: [],
            query: '',
            featuredIndex: 0,
            expandedDescriptions: [],
            editingStory: false,
            editingChapter: null,
            accountOpen: false,
            editingAccount: false,
            readerScale: Number(localStorage.getItem('coChuReader') || 1),
            authMode: null,
            authLampOn: false,
            authNotice: '',
            resetToken: '',
            user: readStorage('nguoiDung', null),
            token: localStorage.getItem('token'),
            account: { user: null, purchases: [] },
            adminSummary: { totalRevenue: 0, totalSales: 0, topStories: [] },
            pendingPayments: [],
            paymentOrder: null,
            paymentPollTimer: null,
            rankings: null,
            rankingsLoading: false,
            showOpening: true,
        };

        function escapeHtml(value) {
            return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
            })[character]);
        }

        function money(value) {
            return Number(value || 0).toLocaleString('vi-VN');
        }

        function formatDate(value) {
            if (!value) return 'Chưa cập nhật';
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('vi-VN');
        }

        function hasAuthorAccess() {
            return Boolean(state.user && ['author', 'admin'].includes(state.user.role));
        }

        function canEditStory(story) {
            return Boolean(state.user && ['author', 'admin'].includes(state.user.role) && story && Number(story.ownerId) === Number(state.user.id));
        }

        function getStory(id = state.storyId) {
            return state.stories.find((story) => Number(story.maTruyen) === Number(id)) || null;
        }

        function authHeaders(extra = {}) {
            return {
                ...extra,
                ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
            };
        }

        async function api(url, options = {}) {
            const headers = authHeaders(options.headers || {});
            if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
            const response = await fetch(url, {...options, headers });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                const error = new Error(result.message || `Yêu cầu thất bại (${response.status}).`);
                error.status = response.status;
                throw error;
            }
            return result;
        }

        function setUser(user, token) {
            state.user = user;
            state.token = token;
            localStorage.setItem('nguoiDung', JSON.stringify(user));
            localStorage.setItem('token', token);
        }

        function clearUser() {
            stopPaymentPolling();
            state.user = null;
            state.token = null;
            state.favorites = [];
            state.screen = 'home';
            state.storyId = null;
            state.editingStory = false;
            state.editingChapter = null;
            state.account = { user: null, purchases: [] };
            state.accountOpen = false;
            state.paymentOrder = null;
            state.showOpening = true;
            localStorage.removeItem('nguoiDung');
            localStorage.removeItem('token');
        }

  function toggleLamp(button) {
      state.authLampOn = !state.authLampOn;
      const scene = button.closest('.auth-card');
      const modal = button.closest('.auth-modal');
      scene?.classList.toggle('is-lamp-on', state.authLampOn);
      modal?.classList.toggle('is-lamp-on', state.authLampOn);
      modal?.classList.add('is-toggling-lamp');
      window.clearTimeout(lampBubbleTimer);
      lampBubbleTimer = window.setTimeout(() => modal?.classList.remove('is-toggling-lamp'), 2000);
      button.setAttribute('aria-pressed', String(state.authLampOn));
      button.setAttribute('aria-label', state.authLampOn ? 'Tắt đèn và ẩn biểu mẫu' : 'Bật đèn và mở biểu mẫu');
  }

  function handleLampPointerDown(event) {
      const button = event.target.closest('.lamp-cord-toggle');
      if (!button || event.button !== 0) return;
      lampPull = { button, pointerId: event.pointerId, startY: event.clientY, distance: 0 };
      button.classList.add('is-pulling');
      button.setPointerCapture(event.pointerId);
  }

  function handleLampPointerMove(event) {
      if (!lampPull || event.pointerId !== lampPull.pointerId) return;
      lampPull.distance = Math.max(0, Math.min(60, event.clientY - lampPull.startY));
      lampPull.button.style.transform = `translateY(${lampPull.distance}px)`;
      lampPull.button.closest('.lamp-wrapper')?.querySelector('.cord-line')
          ?.setAttribute('y2', String(190 + lampPull.distance));
  }

  function finishLampPull(event) {
      if (!lampPull || event.pointerId !== lampPull.pointerId) return;
      const { button, distance } = lampPull;
      lampPull = null;
      button.classList.remove('is-pulling');
      button.style.transform = '';
      button.closest('.lamp-wrapper')?.querySelector('.cord-line')?.setAttribute('y2', '190');
      if (distance > 20) {
          ignoreLampClick = true;
          toggleLamp(button);
          window.setTimeout(() => { ignoreLampClick = false; }, 0);
      }
  }

  function cancelLampPull(event) {
      if (!lampPull || event.pointerId !== lampPull.pointerId) return;
      const { button } = lampPull;
      lampPull = null;
      button.classList.remove('is-pulling');
      button.style.transform = '';
      button.closest('.lamp-wrapper')?.querySelector('.cord-line')?.setAttribute('y2', '190');
  }

  const { mainHeader, renderAccountPanel } = createLayoutViews({ state, escapeHtml, hasAuthorAccess, formatDate, money });

  const { render, renderAdminSummary, renderFilteredStories, renderPendingPayments, renderRankingColumns, renderReviewsPanel } = createViews({
    root, state, genres, escapeHtml, money, formatDate, canEditStory, getStory,
    hasAuthorAccess, mainHeader, renderAccountPanel,
    loadAdminSummary, loadAdminPayments, loadRankings, loadStoryReviews, updateSearchResults,
  });

  async function loadStories() {
    const stories = await api('/api/stories');
    state.stories = Array.isArray(stories) ? stories : [];
    if (!getStory() && state.stories.length) state.storyId = state.stories[0].maTruyen;
    render();
  }

  async function loadFavorites() {
    if (!state.user) {
      state.favorites = [];
      return;
    }
    const result = await api('/api/favorites');
    state.favorites = Array.isArray(result.favorites) ? result.favorites : [];
  }

  async function migrateLegacyFavorites() {
    const storedFavorites = localStorage.getItem('truyenYeuThich');
    if (!storedFavorites) return;

    const favoriteIds = readStorage('truyenYeuThich', []);
    if (Array.isArray(favoriteIds)) {
      for (const storyId of new Set(favoriteIds.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))) {
        try {
          await api(`/api/favorites/${storyId}`, { method: 'POST' });
        } catch (error) {
          if (error.status !== 404) throw error;
        }
      }
    }
    localStorage.removeItem('truyenYeuThich');
  }

  async function loadAdminSummary() {
    try {
      state.adminSummary = await api('/api/admin/summary');
      const target = document.getElementById('adminStatsContainer');
      if (target) target.innerHTML = renderAdminSummary();
    } catch (error) {
      console.warn('Không tải được thống kê:', error);
    }
  }

  async function loadAdminPayments() {
    try {
      const result = await api('/api/admin/payment-orders');
      state.pendingPayments = result.paymentOrders || [];
      const target = document.getElementById('pendingPaymentsContainer');
      if (target) target.innerHTML = renderPendingPayments();
    } catch (error) {
      console.warn('Không tải được đơn chờ thanh toán:', error);
    }
  }

  async function loadRankings() {
    if (state.rankingsLoading) return;
    state.rankingsLoading = true;
    try {
      state.rankings = await api('/api/rankings');
    } catch (error) {
      state.rankings = { error: error.message };
    } finally {
      state.rankingsLoading = false;
      const target = document.getElementById('rankingBoard');
      if (target) target.innerHTML = renderRankingColumns();
    }

  }

  async function loadStoryReviews(storyId) {
    const panel = root.querySelector(`#storyReviewsPanel[data-story-id="${storyId}"]`);
    if (!panel) return;
    try {
      const result = await api(`/api/stories/${storyId}/reviews`);
      if (panel.isConnected && state.screen === 'detail' && Number(state.storyId) === Number(storyId)) {
        panel.outerHTML = renderReviewsPanel(storyId, result);
      }
    } catch (error) {
      if (panel.isConnected) {
        panel.textContent = `Không tải được đánh giá: ${error.message}`;
        panel.className = 'story-reviews-loading error';
      }
    }
  }

  async function loadAccount() {
    state.account = await api('/api/account');
    state.user = { ...state.user, ...(state.account.user || {}) };
    localStorage.setItem('nguoiDung', JSON.stringify(state.user));
  }

  function updateSearchResults() {
    const input = document.getElementById('searchInput');
    const suggestions = document.getElementById('searchSuggestions');
    if (!input || !suggestions) return;
    const query = normalizeText(state.query.trim());
    const matches = state.stories.filter((story) => normalizeText(`${story.tieuDe} ${story.tacGia} ${story.theLoai}`).includes(query));
    suggestions.replaceChildren();
    if (query) {
      const choices = matches.slice(0, 6);
      if (choices.length) {
        choices.forEach((story) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'search-suggestion';
          button.dataset.action = 'open-story';
          button.dataset.id = String(story.maTruyen);
          button.setAttribute('role', 'option');
          button.innerHTML = `<span class="search-suggestion-title">${escapeHtml(story.tieuDe)}</span><span class="search-suggestion-meta">${escapeHtml(story.tacGia)} · ${escapeHtml(story.theLoai)}</span>`;
          suggestions.append(button);
        });
      } else {
        const empty = document.createElement('div');
        empty.className = 'search-suggestion-empty';
        empty.textContent = 'Không tìm thấy truyện';
        suggestions.append(empty);
      }
    }
    suggestions.hidden = !query;
    input.setAttribute('aria-expanded', String(Boolean(query)));
    let visible = 0;
    document.querySelectorAll('.story-card').forEach((card) => {
      const show = !query || card.dataset.storySearch.includes(query);
      card.hidden = !show;
      if (show) visible += 1;
    });
    const emptyResult = document.querySelector('.search-empty');
    if (emptyResult) emptyResult.hidden = !query || visible > 0;
  }

  function updateGenreFilter(genre) {
    state.genre = genre;
    state.favoritesOnly = false;

    const filterRow = root.querySelector('.filter-row');
    filterRow?.querySelectorAll('[data-filter]').forEach((button) => {
      button.classList.toggle('active', button.dataset.filter === genre);
    });
    const activeButton = filterRow?.querySelector('.filter-pill.active');
    if (activeButton) moveFilterMarker(activeButton);

    const storyGrid = root.querySelector('#storyGrid');
    if (storyGrid) storyGrid.innerHTML = renderFilteredStories();
    const sectionTitle = root.querySelector('#latest .section-heading h2');
    if (sectionTitle) {
      sectionTitle.textContent = state.fullOnly ? 'Truyện đã hoàn thành' : 'Truyện mới cập nhật';
    }
    updateSearchResults();
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Không đọc được file ảnh.'));
      reader.readAsDataURL(file);
    });
  }

  async function attachSelectedImage(formData, inputId) {
    const input = document.getElementById(inputId);
    if (input?.files?.[0]) formData.coverImage = await readFileAsDataUrl(input.files[0]);
    return formData;
  }

  function showFormMessage(id, message, type = 'error') {
    const target = document.getElementById(id);
    if (!target) return;
    target.textContent = message;
    target.className = `${target.className.split(' ')[0]} ${type}`;
  }

  async function handleAuthSubmit(form) {
    const values = Object.fromEntries(new FormData(form));
    const mode = state.authMode;
    const endpoints = {
      login: ['/api/auth/login', { email: values.email, password: values.password }],
      register: ['/api/auth/register', values],
      forgot: ['/api/auth/forgot-password', { email: values.email }],
      reset: ['/api/auth/reset-password', { token: values.token, password: values.newPassword }],
    };
    const [url, payload] = endpoints[mode];
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const result = await api(url, { method: 'POST', body: JSON.stringify(payload) });
      if (mode === 'login') {
        setUser(result.user, result.token);
        state.screen = 'home';
        state.storyId = null;
        state.chapterIndex = 0;
        state.genre = 'Tất cả';
        state.fullOnly = false;
        state.favoritesOnly = false;
        state.query = '';
        state.editingStory = false;
        state.editingChapter = null;
        state.accountOpen = false;
        state.authMode = null;
        state.authLampOn = false;
        state.authNotice = '';
        await migrateLegacyFavorites();
        await loadFavorites();
        await loadStories();
      } else if (mode === 'forgot') {
        state.resetToken = result.resetToken || '';
        state.authMode = 'reset';
        state.authNotice = 'Mã đặt lại đã được tạo. Hãy đặt mật khẩu mới.';
        render();
      } else {
        state.authMode = 'login';
        state.authNotice = mode === 'register' ? 'Đăng ký thành công. Bạn có thể đăng nhập.' : result.message;
        render();
      }
    } catch (error) {
      showFormMessage('authMessage', error.message);
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  }

  async function handleStorySubmit(form, editing) {
    const values = Object.fromEntries(new FormData(form));
    const fileId = editing ? 'editStoryFile' : 'storyFile';
    const messageId = editing ? 'storyEditMessage' : 'storyMessage';
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      await attachSelectedImage(values, fileId);
      const story = getStory();
      await api(editing ? `/api/stories/${story.maTruyen}` : '/api/stories', {
        method: editing ? 'PUT' : 'POST', body: JSON.stringify(values),
      });
      state.editingStory = false;
      state.editingChapter = null;
      state.screen = 'home';
      await loadStories();
    } catch (error) {
      showFormMessage(messageId, error.message);
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  }

  async function handleChapterSubmit(form) {
    const story = getStory();
    if (!story) return;
    const editing = state.editingChapter !== null;
    const suffix = editing ? `/${state.editingChapter}` : '';
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      await api(`/api/stories/${story.maTruyen}/chapters${suffix}`, {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      state.editingChapter = null;
      await loadStories();
      state.screen = 'writer';
      state.editingStory = true;
      render();
    } catch (error) {
      showFormMessage('chapterMessage', error.message);
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  }

  async function handleAccountSubmit(form) {
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const result = await api('/api/account', {
        method: 'PUT',
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      state.user = result.user;
      state.account.user = result.user;
      state.editingAccount = false;
      localStorage.setItem('nguoiDung', JSON.stringify(state.user));
      render();
    } catch (error) {
      showFormMessage('accountMessage', error.message);
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  }

  async function handleReviewSubmit(form) {
    const storyId = Number(form.dataset.storyId);
    const values = Object.fromEntries(new FormData(form));
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    const confirmation = root.querySelector(`#storyReviewsPanel[data-story-id="${storyId}"] [data-review-confirmation]`);
    const confirmButton = confirmation?.querySelector('[data-action="confirm-review-submission"]');
    confirmation?.setAttribute('hidden', '');
    if (confirmButton) confirmButton.disabled = true;
    try {
      await api(`/api/stories/${storyId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating: Number(values.rating), comment: values.comment }),
      });
      await loadStoryReviews(storyId);
      root.querySelector(`#storyReviewsPanel[data-story-id="${storyId}"] [data-review-thanks]`)?.removeAttribute('hidden');
    } catch (error) {
      showFormMessage('reviewMessage', error.message, 'error');
    } finally {
      if (button.isConnected) button.disabled = false;
      if (confirmButton?.isConnected) confirmButton.disabled = false;
    }
  }

  async function handleSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!['authForm', 'storyForm', 'storyEditForm', 'chapterForm', 'accountForm', 'storyReviewForm'].includes(form.id)) return;
    event.preventDefault();
    if (form.id === 'authForm') await handleAuthSubmit(form);
    if (form.id === 'storyForm') await handleStorySubmit(form, false);
    if (form.id === 'storyEditForm') await handleStorySubmit(form, true);
    if (form.id === 'chapterForm') await handleChapterSubmit(form);
    if (form.id === 'accountForm') await handleAccountSubmit(form);
    if (form.id === 'storyReviewForm') {
      if (!form.reportValidity()) return;
      const confirmation = form.closest('#storyReviewsPanel')?.querySelector('[data-review-confirmation]');
      confirmation?.removeAttribute('hidden');
      confirmation?.querySelector('[data-action="cancel-review-confirmation"]')?.focus();
    }
  }

  function handleReviewRatingChange(event) {
    if (event.target.name !== 'rating') return;
    const form = event.target.closest('#storyReviewForm');
    if (!form) return;
    const rating = Number(event.target.value);
    form.querySelectorAll('.review-star-option').forEach((option) => {
      option.classList.toggle('selected', Number(option.querySelector('input').value) <= rating);
    });
  }

  async function toggleFavorite(id) {
    if (!state.user) {
      state.showOpening = false;
      state.authMode = 'login';
      state.authNotice = 'Đăng nhập để lưu truyện yêu thích vào tài khoản của bạn.';
      render();
      return;
    }
    const storyId = Number(id);
    const isFavorite = state.favorites.includes(storyId);
    try {
      const result = await api(`/api/favorites/${storyId}`, {
        method: isFavorite ? 'DELETE' : 'POST',
      });
      state.favorites = Array.isArray(result.favorites) ? result.favorites : [];
      render();
    } catch (error) {
      window.alert(error.message);
    }
  }

  async function purchaseStory(id) {
    if (!state.user) {
      state.authMode = 'login';
      render();
      return;
    }
    try {
      const result = await api(`/api/stories/${id}/purchase`, { method: 'POST', body: '{}' });
      state.paymentOrder = result.paymentOrder;
      startPaymentPolling();
      render();
    } catch (error) {
      window.alert(error.message);
    }
  }

  function stopPaymentPolling() {
    if (state.paymentPollTimer !== null) {
      clearInterval(state.paymentPollTimer);
      state.paymentPollTimer = null;
    }
  }

  function startPaymentPolling() {
    stopPaymentPolling();
    if (!state.paymentOrder || state.paymentOrder.status === 'paid') return;
    const orderId = Number(state.paymentOrder.id);
    let attempts = 0;
    state.paymentPollTimer = setInterval(async () => {
      attempts += 1;
      try {
        const result = await api(`/api/payment-orders/${orderId}`);
        if (!state.paymentOrder || Number(state.paymentOrder.id) !== orderId) return;
        state.paymentOrder = result.paymentOrder;
        if (state.paymentOrder.status === 'paid') {
          stopPaymentPolling();
          await loadStories();
        }
      } catch (error) {
        console.warn('Không kiểm tra được trạng thái thanh toán:', error);
      }
      if (attempts >= 120) stopPaymentPolling();
    }, 5000);
  }

  async function refreshPayment(id) {
    const result = await api(`/api/payment-orders/${id}`);
    if (!state.paymentOrder || Number(state.paymentOrder.id) !== Number(id)) return;
    state.paymentOrder = result.paymentOrder;
    if (state.paymentOrder.status === 'paid') {
      stopPaymentPolling();
      await loadStories();
    } else {
      render();
    }
  }

  async function simulatePayment(id) {
    try {
      const result = await api(`/api/payment-orders/${id}/demo-confirm`, {
        method: 'POST',
        body: '{}',
      });
      state.paymentOrder = result.paymentOrder;
      stopPaymentPolling();
      state.screen = 'detail';
      state.storyId = Number(result.paymentOrder.storyId);
      await loadStories();
    } catch (error) {
      window.alert(error.message);
    }
  }

  async function confirmPayment(id) {
    if (!window.confirm('Chỉ xác nhận sau khi đã kiểm tra tài khoản ngân hàng và thấy tiền vào đúng số tiền. Tiếp tục?')) return;
    try {
      const result = await api(`/api/admin/payment-orders/${id}/confirm`, {
        method: 'POST',
        body: '{}',
      });
      if (state.paymentOrder && Number(state.paymentOrder.id) === Number(id)) {
        state.paymentOrder = result.paymentOrder;
        stopPaymentPolling();
      }
      await Promise.all([loadAdminPayments(), loadStories()]);
    } catch (error) {
      window.alert(error.message);
    }
  }

  async function recordStoryRead(id, chapterNumber) {
    try {
      await api(`/api/stories/${id}/reads`, {
        method: 'POST',
        body: JSON.stringify({ chapterNumber }),
      });
    } catch (error) {
      if (![403, 404].includes(error.status)) console.warn('Không ghi nhận được lượt đọc:', error);
    }
  }

  async function deleteStory(id) {
    if (!window.confirm('Xóa truyện này cùng toàn bộ chương? Thao tác không thể hoàn tác.')) return;
    try {
      await api(`/api/stories/${id}`, { method: 'DELETE' });
      state.storyId = null;
      state.screen = 'home';
      state.editingStory = false;
      await loadStories();
    } catch (error) {
      window.alert(error.message);
    }
  }

  async function deleteChapter(index) {
    const story = getStory();
    if (!story || !window.confirm('Xóa chương này? Thao tác không thể hoàn tác.')) return;
    try {
      await api(`/api/stories/${story.maTruyen}/chapters/${index}`, { method: 'DELETE' });
      state.editingChapter = null;
      await loadStories();
      state.screen = 'writer';
      state.editingStory = true;
      render();
    } catch (error) {
      window.alert(error.message);
    }
  }

  async function logout() {
    try {
      if (state.token) await api('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Không thể đăng xuất trên máy chủ:', error);
    }
    clearUser();
    render();
  }

  async function handleAction(action, element, event) {
    const { id, mode, chapter, filter, target, return: returnScreen } = element.dataset;
    if (element.matches('a')) event.preventDefault();

    switch (action) {
      case 'home':
        authModeSwitchToken += 1;
        state.screen = 'home'; state.authMode = null; render(); break;
      case 'open-auth':
        switchAuthMode(mode || 'login'); break;
      case 'toggle-lamp': {
        toggleLamp(element);
        break;
      }
      case 'toggle-role-menu': {
        const picker = element.closest('.auth-role-picker');
        const menu = picker?.querySelector('.auth-role-menu');
        if (picker && menu) {
          const isOpen = picker.classList.toggle('is-open');
          menu.hidden = !isOpen;
          element.setAttribute('aria-expanded', String(isOpen));
        }
        break;
      }
      case 'select-auth-role': {
        const picker = element.closest('.auth-role-picker');
        const selectedRole = element.dataset.roleValue;
        const roleNames = { reader: 'Độc giả', author: 'Tác giả' };
        const valueInput = picker?.querySelector('input[name="role"]');
        const trigger = picker?.querySelector('.auth-role-trigger');
        const menu = picker?.querySelector('.auth-role-menu');
        if (picker && valueInput && trigger && menu && roleNames[selectedRole]) {
          valueInput.value = selectedRole;
          trigger.querySelector('span').textContent = roleNames[selectedRole];
          trigger.setAttribute('aria-expanded', 'false');
          picker.classList.remove('is-open');
          menu.hidden = true;
          menu.querySelectorAll('[role="option"]').forEach((option) => {
            option.setAttribute('aria-selected', String(option === element));
          });
          trigger.focus();
        }
        break;
      }
      case 'opening-login':
        authModeSwitchToken += 1;
        state.showOpening = false;
        state.authMode = 'login';
        state.authLampOn = false;
        state.authNotice = '';
        render();
        break;
      case 'close-auth':
        authModeSwitchToken += 1;
        state.authMode = null; state.authLampOn = false; state.authNotice = '';
        if (!state.user) state.showOpening = true;
        render(); break;
      case 'toggle-account-panel':
        state.accountOpen = !state.accountOpen;
        state.editingAccount = false;
        if (state.accountOpen) {
          try { await loadAccount(); } catch (error) { console.warn(error); }
        }
        render(); break;
      case 'edit-account':
        state.editingAccount = true; render(); break;
      case 'cancel-account-edit':
        state.editingAccount = false; render(); break;
      case 'logout': await logout(); break;
      case 'open-story':
      case 'story-detail':
        state.storyId = Number(id); state.screen = 'detail'; render(); break;
      case 'cancel-review-confirmation': {
        const dialog = element.closest('[data-review-confirmation]');
        dialog?.setAttribute('hidden', '');
        dialog?.closest('#storyReviewsPanel')?.querySelector('#storyReviewForm [type="submit"]')?.focus();
        break;
      }
      case 'confirm-review-submission': {
        const form = root.querySelector(`#storyReviewsPanel[data-story-id="${id}"] #storyReviewForm`);
        if (form) await handleReviewSubmit(form);
        break;
      }
      case 'close-review-thanks': {
        const dialog = element.closest('[data-review-thanks]');
        dialog?.setAttribute('hidden', '');
        break;
      }
      case 'featured-prev':
      case 'featured-next':
      case 'featured-go': {
        const carousel = element.closest('.featured-carousel');
        const currentIndex = Number(carousel?.dataset.activeIndex) || 0;
        if (carousel) {
          const nextIndex = action === 'featured-prev'
            ? currentIndex - 1
            : action === 'featured-next'
              ? currentIndex + 1
              : Number(element.dataset.index);
          setFeaturedSlide(carousel, nextIndex);
        }
        break;
      }
      case 'read-story':
        state.storyId = Number(id); state.chapterIndex = Number(element.dataset.chapter || 0); state.screen = 'reader';
        void recordStoryRead(state.storyId, state.chapterIndex + 1);
        render(); break;
      case 'open-rankings':
        state.screen = 'rankings'; render(); break;
      case 'refresh-rankings':
        state.rankings = null; void loadRankings(); break;
      case 'open-admin':
        if (state.user?.role === 'admin') { state.screen = 'admin'; render(); }
        break;
      case 'open-writer':
        if (id ? !canEditStory(getStory(id)) : !hasAuthorAccess()) break;
        state.storyId = id ? Number(id) : state.storyId;
        state.editingStory = Boolean(id);
        state.editingChapter = null;
        state.screen = 'writer'; render(); break;
      case 'cancel-write':
        state.editingStory = false; state.editingChapter = null;
        state.screen = returnScreen === 'detail' ? 'detail' : 'home'; render(); break;
      case 'delete-story': await deleteStory(id); break;
      case 'edit-chapter':
        state.editingChapter = Number(chapter); state.screen = 'writer'; state.editingStory = true; render();
        document.getElementById('chapterForm')?.scrollIntoView({ behavior: 'smooth' }); break;
      case 'cancel-edit-chapter':
        state.editingChapter = null; render(); break;
      case 'delete-chapter': await deleteChapter(Number(chapter)); break;
      case 'toggle-favorite': await toggleFavorite(id); break;
      case 'show-favorites': state.favoritesOnly = true; render(); break;
      case 'show-all-stories': state.favoritesOnly = false; state.fullOnly = false; render(); break;
      case 'filter-full': state.fullOnly = true; state.screen = 'home'; render(); document.getElementById('latest')?.scrollIntoView({ behavior: 'smooth' }); break;
      case 'purchase-story': await purchaseStory(id); break;
      case 'close-payment':
        if (state.paymentOrder?.status === 'paid') {
          state.screen = 'detail';
          state.storyId = Number(state.paymentOrder.storyId);
        }
        stopPaymentPolling();
        state.paymentOrder = null;
        render();
        break;
      case 'refresh-payment':
        try { await refreshPayment(id); } catch (error) { window.alert(error.message); }
        break;
      case 'demo-confirm-payment': await simulatePayment(id); break;
      case 'confirm-payment': await confirmPayment(id); break;
      case 'reader-font-up':
      case 'reader-font-down':
        state.readerScale = Math.max(0.85, Math.min(1.5, state.readerScale + (action === 'reader-font-up' ? 0.1 : -0.1)));
        localStorage.setItem('coChuReader', String(state.readerScale));
        document.querySelector('.reader-body')?.style.setProperty('--reader-scale', state.readerScale); break;
      case 'scroll-to':
        if (!document.getElementById(target) && state.screen !== 'home') {
          state.screen = 'home';
          render();
          requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' }));
        } else {
          document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
        }
        break;
      case 'retry': await start(); break;
      case 'toggle-description':
        state.expandedDescriptions = state.expandedDescriptions.includes(Number(id))
          ? state.expandedDescriptions.filter((item) => item !== Number(id))
          : [...state.expandedDescriptions, Number(id)];
        render(); break;
      default:
        if (filter !== undefined) { state.genre = filter; render(); }
    }
  }

  function switchAuthMode(mode) {
    const modal = document.querySelector('.auth-modal');
    const currentContent = modal?.querySelector('.auth-card-content');
    if (!modal || !currentContent || !state.authLampOn || mode === state.authMode) {
      state.authMode = mode;
      state.authNotice = '';
      render();
      return;
    }

    const transitionToken = ++authModeSwitchToken;
    modal.classList.add('is-auth-flipping');
    window.clearTimeout(authFlipBubbleTimer);
    authFlipBubbleTimer = window.setTimeout(() => modal.classList.remove('is-auth-flipping'), 2200);
    currentContent.classList.add('is-auth-transition-out');
    window.setTimeout(() => {
      if (transitionToken !== authModeSwitchToken) return;
      state.authMode = mode;
      state.authNotice = '';
      render();
      const nextContent = document.querySelector('.auth-modal .auth-card-content');
      if (!nextContent || !state.authLampOn) return;
      nextContent.classList.add('is-auth-transition-in');
      window.setTimeout(() => nextContent.classList.remove('is-auth-transition-in'), 700);
    }, 460);
  }

  function handleClick(event) {
    if (!event.target.closest('.auth-role-picker')) {
      document.querySelectorAll('.auth-role-picker.is-open').forEach((picker) => {
        picker.classList.remove('is-open');
        picker.querySelector('.auth-role-menu').hidden = true;
        picker.querySelector('.auth-role-trigger').setAttribute('aria-expanded', 'false');
      });
    }
    const actionElement = event.target.closest('[data-action]');
    if (actionElement && root.contains(actionElement)) {
      if (actionElement.dataset.action === 'toggle-lamp' && ignoreLampClick) {
        ignoreLampClick = false;
        return;
      }
      void handleAction(actionElement.dataset.action, actionElement, event);
      return;
    }
    const filterElement = event.target.closest('[data-filter]');
    if (filterElement && root.contains(filterElement)) updateGenreFilter(filterElement.dataset.filter);
    if (event.target.classList.contains('auth-modal')) {
      authModeSwitchToken += 1;
      state.authMode = null;
      state.authLampOn = false;
      if (!state.user) state.showOpening = true;
      render();
    }
  }

  function handleAuthKeydown(event) {
    if (event.key !== 'Escape') return;
    const picker = event.target.closest('.auth-role-picker.is-open');
    if (!picker) return;
    picker.classList.remove('is-open');
    picker.querySelector('.auth-role-menu').hidden = true;
    const trigger = picker.querySelector('.auth-role-trigger');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  }

  function handleInput(event) {
    if (event.target.id !== 'searchInput') return;
    state.query = event.target.value;
    updateSearchResults();
  }

  function moveNavMarker(link) {
    const nav = link.closest('.main-nav');
    const marker = nav?.querySelector('.nav-marker');
    if (!nav || !marker) return;

    const navBounds = nav.getBoundingClientRect();
    const linkBounds = link.getBoundingClientRect();
    marker.style.left = `${linkBounds.left - navBounds.left + nav.scrollLeft}px`;
    marker.style.width = `${linkBounds.width}px`;
    marker.classList.add('is-visible');
  }

  function restoreNavMarker(nav) {
    const activeLink = nav.querySelector('a.active');
    const marker = nav.querySelector('.nav-marker');
    if (activeLink) moveNavMarker(activeLink);
    else marker?.classList.remove('is-visible');
  }

  function handleNavPointerOver(event) {
    const link = event.target.closest?.('.main-nav a');
    if (link) moveNavMarker(link);
  }

  function handleNavPointerOut(event) {
    const nav = event.target.closest?.('.main-nav');
    if (nav && !nav.contains(event.relatedTarget)) restoreNavMarker(nav);
  }

  function handleNavFocusIn(event) {
    const link = event.target.closest?.('.main-nav a');
    if (link) moveNavMarker(link);
  }

  function handleNavFocusOut(event) {
    const nav = event.target.closest?.('.main-nav');
    if (nav && !nav.contains(event.relatedTarget)) restoreNavMarker(nav);
  }

  function moveFilterMarker(button) {
    const group = button.closest('.filter-row, .section-actions');
    const marker = group?.querySelector('.filter-marker');
    if (!group || !marker) return;

    const groupBounds = group.getBoundingClientRect();
    const buttonBounds = button.getBoundingClientRect();
    marker.style.left = `${buttonBounds.left - groupBounds.left + group.scrollLeft}px`;
    marker.style.top = `${buttonBounds.top - groupBounds.top + group.scrollTop}px`;
    marker.style.width = `${buttonBounds.width}px`;
    marker.style.height = `${buttonBounds.height}px`;
    marker.classList.add('is-visible');
    group.classList.add('has-marker');
  }

  function restoreFilterMarker(group) {
    const activeButton = group.querySelector('.filter-pill.active');
    const marker = group.querySelector('.filter-marker');
    if (activeButton) moveFilterMarker(activeButton);
    else {
      marker?.classList.remove('is-visible');
      group.classList.remove('has-marker');
    }
  }

  function handleFilterPointerOver(event) {
    const button = event.target.closest?.('.filter-row .filter-pill, .section-actions .filter-pill');
    if (button) moveFilterMarker(button);
  }

  function handleFilterPointerOut(event) {
    const group = event.target.closest?.('.filter-row, .section-actions');
    if (group && !group.contains(event.relatedTarget)) restoreFilterMarker(group);
  }

  function handleFilterFocusIn(event) {
    const button = event.target.closest?.('.filter-row .filter-pill, .section-actions .filter-pill');
    if (button) moveFilterMarker(button);
  }

  function handleFilterFocusOut(event) {
    const group = event.target.closest?.('.filter-row, .section-actions');
    if (group && !group.contains(event.relatedTarget)) restoreFilterMarker(group);
  }

  function setFeaturedSlide(carousel, index) {
    const slides = carousel.querySelectorAll('[data-featured-slide]');
    const track = carousel.querySelector('.featured-carousel-track');
    if (!track || !slides.length) return;

    const nextIndex = (index + slides.length) % slides.length;
    state.featuredIndex = nextIndex;
    carousel.dataset.activeIndex = String(nextIndex);
    track.style.transform = `translate3d(-${nextIndex * 100}%, 0, 0)`;
    slides.forEach((slide, slideIndex) => {
      slide.setAttribute('aria-hidden', String(slideIndex !== nextIndex));
    });
    carousel.querySelectorAll('.featured-carousel-dot').forEach((dot, dotIndex) => {
      const active = dotIndex === nextIndex;
      dot.classList.toggle('active', active);
      dot.setAttribute('aria-pressed', String(active));
    });
    const currentLabel = carousel.querySelector('[data-featured-current]');
    if (currentLabel) currentLabel.textContent = String(nextIndex + 1);
  }

  async function start() {
    root.innerHTML = '<main class="page-shell container"><p>Đang tải truyện...</p></main>';
    try {
      if (state.token) {
        try {
          await loadAccount();
          await migrateLegacyFavorites();
          await loadFavorites();
        } catch (error) {
          if ([401, 404].includes(error.status)) clearUser();
          else throw error;
        }
      } else if (state.user) {
        clearUser();
      }
      await loadStories();
    } catch (error) {
      root.innerHTML = `<main class="page-shell container"><section class="admin-panel"><h2>Chưa kết nối được máy chủ</h2><p>${escapeHtml(error.message)}</p><button class="button button-primary" data-action="retry">Thử lại</button></section></main>`;
    }
  }

  root.addEventListener('click', handleClick);
  root.addEventListener('pointerover', handleNavPointerOver);
  root.addEventListener('pointerout', handleNavPointerOut);
  root.addEventListener('focusin', handleNavFocusIn);
  root.addEventListener('focusout', handleNavFocusOut);
  root.addEventListener('pointerover', handleFilterPointerOver);
  root.addEventListener('pointerout', handleFilterPointerOut);
  root.addEventListener('focusin', handleFilterFocusIn);
  root.addEventListener('focusout', handleFilterFocusOut);
  root.addEventListener('keydown', handleAuthKeydown);
  root.addEventListener('pointerdown', handleLampPointerDown);
  root.addEventListener('pointermove', handleLampPointerMove);
  root.addEventListener('pointerup', finishLampPull);
  root.addEventListener('pointercancel', cancelLampPull);
  root.addEventListener('input', handleInput);
  root.addEventListener('change', handleReviewRatingChange);
  root.addEventListener('submit', (event) => { void handleSubmit(event); });
  start();
})();