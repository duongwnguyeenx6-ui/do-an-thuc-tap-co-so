export function createComponent(context) {
  const { state, escapeHtml, mainHeader, renderAuthModal } = context;

  function renderRankingColumn(title, description, stories, metric, suffix) {
    const list = stories.length ? `<ol class="ranking-list">${stories.map((story, index) => `
      <li class="ranking-item">
        <span class="ranking-position ranking-position-${index + 1}">${String(index + 1).padStart(2, '0')}</span>
        ${story.coverImage ? `<img class="ranking-cover" src="${escapeHtml(story.coverImage)}" alt="Bìa ${escapeHtml(story.tieuDe)}" loading="lazy">` : '<span class="ranking-cover ranking-cover-empty">S</span>'}
        <span class="ranking-info"><strong>${escapeHtml(story.tieuDe)}</strong><small>${escapeHtml(story.tacGia)}</small></span>
        <span class="ranking-metric"><strong>${Number(story[metric] || 0).toLocaleString('vi-VN')}</strong><small>${suffix}</small></span>
      </li>`).join('')}</ol>` : `<p class="ranking-empty">${metric === 'reads' ? 'Chưa có lượt đọc. Lượt đọc sẽ được ghi nhận khi mở chương.' : 'Chưa có giao dịch mua truyện.'}</p>`;
    return `<section class="ranking-column"><header class="ranking-column-header"><span class="eyebrow">Top 3</span><h2>${title}</h2><p>${description}</p></header>${list}</section>`;
  }

  function renderRankingColumns() {
    if (!state.rankings) return '<p class="ranking-loading">Đang tải bảng xếp hạng...</p>';
    if (state.rankings.error) return `<p class="ranking-empty">${escapeHtml(state.rankings.error)}</p>`;
    return `<div class="ranking-columns">
      ${renderRankingColumn('Được đọc nhiều nhất', 'Xếp theo lượt mở chương', state.rankings.mostRead || [], 'reads', 'lượt đọc')}
      ${renderRankingColumn('Bán chạy nhất', 'Xếp theo số giao dịch', state.rankings.bestSelling || [], 'sales', 'lượt bán')}
    </div>`;
  }

  function renderRankings() {
    return `${mainHeader('ranking')}<main class="page-shell container ranking-page">
      <header class="ranking-intro"><span class="eyebrow">Cộng đồng độc giả</span><h1>Bảng xếp hạng truyện</h1><p>So sánh những câu chuyện được đọc nhiều và được mua nhiều nhất.</p><button class="button button-secondary" data-action="refresh-rankings">Cập nhật bảng</button></header>
      <div id="rankingBoard">${renderRankingColumns()}</div>
    </main>${renderAuthModal()}`;
  }


  return { renderRankings, renderRankingColumns };
}
