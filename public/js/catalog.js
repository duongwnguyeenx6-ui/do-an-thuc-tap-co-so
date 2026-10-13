import { normalizeText } from './utils.js';

export function createComponent(context) {
  const { state, genres, escapeHtml, money, canEditStory, hasAuthorAccess, mainHeader, renderAccountPanel, renderAuthModal } = context;

  function filteredStories() {
    return state.stories.filter((story) => {
      const genreMatches = state.genre === 'Tất cả' || story.theLoai === state.genre;
      const statusMatches = !state.fullOnly || story.trangThai === 'Full';
      const favoriteMatches = !state.favoritesOnly || state.favorites.includes(Number(story.maTruyen));
      return genreMatches && statusMatches && favoriteMatches;
    });
  }

  function storyCard(story) {
    const favorite = state.favorites.includes(Number(story.maTruyen));
    const ownsStory = Boolean(state.user && Number(story.ownerId) === Number(state.user.id));
    const canEdit = canEditStory(story);
    const canDelete = Boolean(state.user && (state.user.role === 'admin' || (state.user.role === 'author' && ownsStory)));
    const cover = story.coverImage
      ? `<img src="${escapeHtml(story.coverImage)}" alt="Bìa ${escapeHtml(story.tieuDe)}" loading="lazy">`
      : `<span>${escapeHtml(story.tieuDe)}</span>`;
    const readable = Number(story.gia || 0) === 0 || story.canRead;
    const readButton = Number(story.gia || 0) > 0 && !readable
      ? `<button class="button button-secondary story-buy-button" data-action="${state.user ? 'purchase-story' : 'open-auth'}" data-id="${story.maTruyen}" ${state.user ? '' : 'data-mode="login"'}>Mua ${money(story.gia)}đ</button>`
      : `<button class="button button-primary story-buy-button" data-action="story-detail" data-id="${story.maTruyen}">Đọc truyện</button>`;
    return `
      <article class="story-card" data-id="${story.maTruyen}" data-action="open-story" data-story-search="${escapeHtml(normalizeText(`${story.tieuDe} ${story.tacGia} ${story.theLoai}`))}">
        <div class="story-cover">${cover}<button class="favorite-button ${favorite ? 'is-favorite' : ''}" data-action="toggle-favorite" data-id="${story.maTruyen}" aria-label="${favorite ? 'Bỏ lưu truyện' : 'Lưu truyện'}">${favorite ? '♥' : '♡'}</button></div>
        <div class="story-body"><div class="story-meta"><span class="tag">${escapeHtml(story.theLoai)}</span><span class="story-status">${escapeHtml(story.trangThai)}</span></div>
          <h3>${escapeHtml(story.tieuDe)}</h3>
          <p class="story-author">${escapeHtml(story.tacGia)}</p><p class="story-desc">${escapeHtml(story.moTa || '')}</p>
          <div class="story-footer"><span>${Number(story.gia || 0) > 0 ? `${money(story.gia)}đ` : 'Miễn phí'}</span>${readButton}</div>
          ${canEdit || canDelete ? `<div class="story-owner-actions">${canEdit ? `<button class="button button-secondary" data-action="open-writer" data-id="${story.maTruyen}">Sửa truyện</button>` : ''}${canDelete ? `<button class="button button-danger" data-action="delete-story" data-id="${story.maTruyen}">Xóa truyện</button>` : ''}</div>` : ''}
        </div>
      </article>`;
  }

  function renderGenres() {
    const allGenres = [...new Set([...genres, ...state.stories.map((story) => story.theLoai).filter(Boolean)])];
    return ['Tất cả', ...allGenres].map((genre) => `
      <button class="filter-pill ${state.genre === genre ? 'active' : ''}" data-filter="${escapeHtml(genre)}">${escapeHtml(genre)}</button>`).join('');
  }

  function renderFilteredStories() {
    const stories = filteredStories();
    return stories.length ? stories.map(storyCard).join('') : '<p class="empty-chapters">Chưa có truyện phù hợp.</p>';
  }

  function renderAdminSummary() {
    const summary = state.adminSummary;
    const topStories = (summary.topStories || []).slice(0, 5);
    return `
      <section class="admin-panel" id="ranking"><h3>Doanh thu hệ thống</h3>
        <div class="stats-grid"><div class="stat-box"><strong>${money(summary.totalRevenue)}đ</strong><span>Tổng doanh thu</span></div><div class="stat-box"><strong>${summary.totalSales || 0}</strong><span>Số giao dịch</span></div><div class="stat-box"><strong>${topStories.length}</strong><span>Truyện bán chạy</span></div></div>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Truyện</th><th>Doanh thu</th><th>Bán</th></tr></thead><tbody>
          ${topStories.length ? topStories.map((story) => `<tr><td>${escapeHtml(story.tieuDe)}</td><td>${money(story.total)}đ</td><td>${story.sales}</td></tr>`).join('') : '<tr><td colspan="3">Chưa có giao dịch nào.</td></tr>'}
        </tbody></table></div>
      </section>`;
  }

  function renderOpeningScreen() {
    return `<section class="opening-screen" aria-label="Màn hình chào mừng Sọt Truyện"><div class="opening-stars" aria-hidden="true"></div><div class="opening-brand"><span class="opening-spark" aria-hidden="true">✦</span><h1 class="opening-title"><span>SỌT</span><span>TRUYỆN</span></h1><p class="opening-tagline">MỞ CÁNH CỬA · BƯỚC VÀO THẾ GIỚI TRUYỆN</p></div><button class="opening-enter" type="button" data-action="opening-login" aria-label="Vào Sọt Truyện và đăng nhập"><span>Chạm để bắt đầu</span><span aria-hidden="true">↓</span></button></section>`;
  }

  function renderHome() {
    const opening = state.showOpening ? renderOpeningScreen() : '';
    if (!state.user) return `${renderAuthModal()}${opening}`;

    const featuredStories = state.stories.slice(0, 5);
    const featuredIndex = featuredStories.length
      ? ((Number(state.featuredIndex) || 0) % featuredStories.length)
      : 0;
    state.featuredIndex = featuredIndex;
    const adminPanel = state.user?.role === 'admin' ? '<div id="adminStatsContainer"></div>' : '';
    const featured = featuredStories.length ? `
      <div class="featured-carousel" data-active-index="${featuredIndex}" aria-label="Truyện đề cử hôm nay" aria-live="off">
        <div class="featured-carousel-track" style="transform: translate3d(-${featuredIndex * 100}%, 0, 0)">
          ${featuredStories.map((story, index) => `<article class="hero-feature" data-featured-slide data-action="open-story" data-id="${story.maTruyen}" aria-hidden="${index !== featuredIndex}">
            <div class="hero-feature-art">${story.coverImage ? `<img src="${escapeHtml(story.coverImage)}" alt="Bìa ${escapeHtml(story.tieuDe)}" loading="${index === 0 ? 'eager' : 'lazy'}">` : `<span>${escapeHtml(story.tieuDe)}</span>`}</div>
            <div class="hero-feature-copy"><span class="hero-feature-label">Đề cử hôm nay</span><h2>${escapeHtml(story.tieuDe)}</h2><p>${escapeHtml(story.tacGia)}</p><span class="hero-feature-link">Xem truyện <span aria-hidden="true">→</span></span></div>
          </article>`).join('')}
        </div>
        ${featuredStories.length > 1 ? `<div class="featured-carousel-controls" aria-label="Chọn truyện đề cử">
          <button class="featured-carousel-arrow" type="button" data-action="featured-prev" aria-label="Truyện đề cử trước">←</button>
          <div class="featured-carousel-dots">${featuredStories.map((story, index) => `<button class="featured-carousel-dot${index === featuredIndex ? ' active' : ''}" type="button" data-action="featured-go" data-index="${index}" aria-label="Đến truyện đề cử ${index + 1}" aria-pressed="${index === featuredIndex}"></button>`).join('')}</div>
          <span class="featured-carousel-count"><span data-featured-current>${featuredIndex + 1}</span> / ${featuredStories.length}</span>
          <button class="featured-carousel-arrow" type="button" data-action="featured-next" aria-label="Truyện đề cử tiếp theo">→</button>
        </div>` : ''}
      </div>` : '<div class="hero-feature hero-feature-empty"><span class="eyebrow">Thư viện</span><strong>Khám phá những câu chuyện đầu tiên</strong></div>';
    return `${mainHeader('home')}${renderAccountPanel()}
      <main class="page-shell home-page">
        <section class="hero container"><div class="hero-content"><span class="eyebrow">Không gian đọc truyện</span><h1>Chọn một câu chuyện, bắt đầu hành trình mới.</h1><p>Khám phá truyện mới, lưu lại những bộ truyện yêu thích và tiếp tục đọc bất cứ lúc nào.</p><div class="hero-actions"><button class="button button-primary" data-action="scroll-to" data-target="latest">Khám phá truyện</button><span class="hero-addon">${state.stories.length} câu chuyện đang chờ bạn</span></div></div>${featured}</section>
        <section class="container genre-section" id="genres"><div class="section-heading"><div><span class="eyebrow">Khám phá</span><h2>Thể loại</h2></div></div><div class="filter-row"><span class="filter-marker" aria-hidden="true"></span>${renderGenres()}</div></section>
        <section class="container story-section" id="latest"><div class="section-heading"><div><span class="eyebrow">Thư viện</span><h2>${state.favoritesOnly ? 'Truyện đã lưu' : state.fullOnly ? 'Truyện đã hoàn thành' : 'Truyện mới cập nhật'}</h2></div><div class="section-actions"><span class="filter-marker" aria-hidden="true"></span><button class="filter-pill ${!state.favoritesOnly ? 'active' : ''}" data-action="show-all-stories">Tất cả truyện</button><button class="filter-pill ${state.favoritesOnly ? 'active' : ''}" data-action="show-favorites">Đã lưu (${state.favorites.length})</button></div></div>
          <div class="story-grid" id="storyGrid">${renderFilteredStories()}</div><p class="search-empty" hidden>Không tìm thấy truyện phù hợp.</p>
        </section>${adminPanel}
      </main>${renderAuthModal()}${opening}`;
  }


  return { renderHome, renderAdminSummary, renderFilteredStories };
}
