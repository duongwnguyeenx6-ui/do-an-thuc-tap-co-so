export function createComponent(context) {
  const { state, escapeHtml, money, mainHeader, renderAuthModal } = context;

  function renderRankingColumn(title, description, icon, stories, metric, suffix) {
    const list = stories.length
      ? `<ol class="ranking-list">
          ${stories.map((story, index) => {
            const rank = index + 1;
            const rankBadge = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
            return `
            <li class="ranking-item ranking-item--top-${rank}" data-action="open-story" data-id="${story.maTruyen}" role="button" tabindex="0" title="Xem truyện: ${escapeHtml(story.tieuDe)}">
              <div class="ranking-position-wrap">
                <span class="ranking-position ranking-position-${rank}">
                  ${String(rank).padStart(2, '0')}
                </span>
                ${rankBadge ? `<span class="ranking-crown" aria-hidden="true">${rankBadge}</span>` : ''}
              </div>
              <div class="ranking-cover-wrap">
                ${story.coverImage
                  ? `<img class="ranking-cover" src="${escapeHtml(story.coverImage)}" alt="Bìa ${escapeHtml(story.tieuDe)}" loading="lazy">`
                  : `<span class="ranking-cover ranking-cover-empty">📖</span>`}
              </div>
              <div class="ranking-info">
                <strong class="ranking-title">${escapeHtml(story.tieuDe)}</strong>
                <small class="ranking-author">✍ ${escapeHtml(story.tacGia)}</small>
              </div>
              <div class="ranking-metric">
                <strong class="ranking-metric-num">${Number(story[metric] || 0).toLocaleString('vi-VN')}</strong>
                <small class="ranking-metric-unit">${suffix}</small>
                ${story.doanhThu ? `<span class="ranking-revenue">${money(story.doanhThu)}đ</span>` : ''}
              </div>
            </li>`;
          }).join('')}
        </ol>`
      : `<div class="ranking-empty">
          <span class="ranking-empty-icon">${metric === 'reads' ? '📖' : '💰'}</span>
          <p>${metric === 'reads' ? 'Chưa có lượt đọc. Lượt đọc sẽ được ghi nhận khi độc giả mở chương.' : 'Chưa có giao dịch mua truyện nào.'}</p>
        </div>`;

    return `
      <section class="ranking-column">
        <header class="ranking-column-header">
          <span class="ranking-column-icon">${icon}</span>
          <div class="ranking-column-title-group">
            <span class="eyebrow ranking-eyebrow">Bảng vàng Top 3</span>
            <h2>${title}</h2>
            <p>${description}</p>
          </div>
        </header>
        ${list}
      </section>`;
  }

  function renderRankingColumns() {
    if (!state.rankings) {
      return `
        <div class="ranking-loading">
          <div class="ranking-spinner"></div>
          <p>Đang tổng hợp dữ liệu bảng xếp hạng...</p>
        </div>`;
    }
    if (state.rankings.error) {
      return `<div class="ranking-empty"><p>${escapeHtml(state.rankings.error)}</p></div>`;
    }
    return `
      <div class="ranking-columns">
        ${renderRankingColumn('Được đọc nhiều nhất', 'Xếp theo tổng lượt mở chương từ độc giả', '📖', state.rankings.mostRead || [], 'reads', 'lượt đọc')}
        ${renderRankingColumn('Bán chạy nhất', 'Xếp theo tổng số đơn giao dịch thành công', '🏆', state.rankings.bestSelling || [], 'sales', 'lượt mua')}
      </div>`;
  }

  function renderRankings() {
    return `${mainHeader('ranking')}
      <main class="page-shell container ranking-page">
        <header class="ranking-intro">
          <div class="ranking-intro__text">
            <span class="eyebrow">Cộng đồng độc giả</span>
            <h1>Bảng xếp hạng truyện</h1>
            <p>Vinh danh những tác phẩm được độc giả đón đọc nhiều nhất và sở hữu doanh thu dẫn đầu.</p>
          </div>
          <button class="button button-secondary ranking-refresh-btn" data-action="refresh-rankings">
            ↻ Cập nhật bảng
          </button>
        </header>
        <div id="rankingBoard">${renderRankingColumns()}</div>
      </main>${renderAuthModal()}`;
  }


  return { renderRankings, renderRankingColumns };
}
