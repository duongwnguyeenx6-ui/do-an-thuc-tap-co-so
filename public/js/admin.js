export function createComponent(context) {
  const { state, escapeHtml, money, canEditStory, mainHeader, renderAuthModal, renderAdminSummary } = context;

  function renderPendingPayments() {
    const orders = state.pendingPayments || [];
    return `
      <section class="admin-card admin-card--payments">
        <div class="admin-card__header">
          <div class="admin-card__title-group">
            <span class="admin-badge admin-badge--warning">⏳ Chờ xử lý</span>
            <h3 class="admin-card__title">Đơn QR chờ xác nhận</h3>
          </div>
          <span class="admin-card__count">${orders.length} đơn</span>
        </div>
        <div class="admin-card__body">
          ${orders.length
            ? `<div class="table-wrap"><table class="data-table">
                <thead><tr>
                  <th>Mã đơn</th>
                  <th>Người dùng</th>
                  <th>Truyện</th>
                  <th>Số tiền</th>
                  <th style="text-align: right;">Thao tác</th>
                </tr></thead>
                <tbody>
                  ${orders.map((order) => `
                    <tr>
                      <td><code class="payment-code">${escapeHtml(order.paymentCode)}</code></td>
                      <td>
                        <span class="admin-user-cell">
                          <strong>${escapeHtml(order.username)}</strong>
                          <small>${escapeHtml(order.email)}</small>
                        </span>
                      </td>
                      <td><strong>${escapeHtml(order.storyTitle)}</strong></td>
                      <td><strong class="admin-amount">${money(order.amount)}đ</strong></td>
                      <td style="text-align: right;">
                        <button class="button button-primary admin-action-btn" data-action="confirm-payment" data-id="${order.id}">
                          ✓ Xác nhận tiền vào
                        </button>
                      </td>
                    </tr>`).join('')}
                </tbody>
              </table></div>`
            : `<div class="admin-empty">
                <span class="admin-empty__icon">✓</span>
                <p>Không có đơn thanh toán nào đang chờ xác nhận.</p>
              </div>`}
        </div>
      </section>`;
  }

  function renderAdmin() {
    const stories = state.stories || [];
    return `${mainHeader()}
      <main class="page-shell container admin-page">

        <!-- Tiêu đề trang -->
        <div class="admin-hero">
          <div class="admin-hero__text">
            <span class="eyebrow">Hệ thống quản trị</span>
            <h1 class="admin-hero__title">Bảng điều khiển quản lý</h1>
            <p class="admin-hero__desc">Theo dõi doanh thu toàn sàn, phê duyệt giao dịch nạp và quản lý toàn bộ kho tác phẩm.</p>
          </div>
          <div class="admin-hero__actions">
            <button class="button button-primary admin-hero__cta" data-action="open-writer">
              ＋ Viết truyện mới
            </button>
          </div>
        </div>

        <!-- Thống kê doanh thu -->
        <div id="adminStatsContainer">${renderAdminSummary()}</div>

        <!-- Đơn chờ thanh toán -->
        <div id="pendingPaymentsContainer">${renderPendingPayments()}</div>

        <!-- Kho truyện -->
        <section class="admin-card admin-card--library">
          <div class="admin-card__header">
            <div class="admin-card__title-group">
              <span class="admin-badge admin-badge--info">📚 Kho lưu trữ</span>
              <h3 class="admin-card__title">Quản lý kho truyện</h3>
            </div>
            <span class="admin-card__count">${stories.length} truyện</span>
          </div>
          <div class="admin-card__body">
            ${stories.length
              ? `<div class="admin-story-list">
                  ${stories.map((story) => `
                    <div class="admin-story-row">
                      <div class="admin-story-media">
                        ${story.coverImage
                          ? `<img class="admin-story-thumb" src="${escapeHtml(story.coverImage)}" alt="${escapeHtml(story.tieuDe)}" loading="lazy">`
                          : `<span class="admin-story-thumb admin-story-thumb--empty">📖</span>`}
                      </div>
                      <div class="admin-story-info">
                        <strong class="admin-story-title">${escapeHtml(story.tieuDe)}</strong>
                        <div class="admin-story-meta">
                          <span class="tag">${escapeHtml(story.theLoai)}</span>
                          <span class="admin-story-author">✍ ${escapeHtml(story.tacGia)}</span>
                          <span class="story-status-pill ${story.trangThai === 'Full' ? 'is-full' : 'is-ongoing'}">
                            ${escapeHtml(story.trangThai || 'Đang ra')}
                          </span>
                          <span class="admin-story-price ${Number(story.gia || 0) ? '' : 'is-free'}">
                            ${Number(story.gia || 0) ? `${money(story.gia)}đ` : 'Miễn phí'}
                          </span>
                        </div>
                      </div>
                      <div class="admin-story-actions">
                        <button class="button button-secondary" data-action="story-detail" data-id="${story.maTruyen}" title="Xem trang truyện">
                          Xem
                        </button>
                        ${canEditStory(story) ? `
                          <button class="button button-secondary" data-action="open-writer" data-id="${story.maTruyen}" title="Chỉnh sửa truyện & chương">
                            Sửa
                          </button>` : ''}
                        <button class="button button-danger" data-action="delete-story" data-id="${story.maTruyen}" title="Xóa truyện">
                          Xóa
                        </button>
                      </div>
                    </div>`).join('')}
                </div>`
              : `<div class="admin-empty">
                  <span class="admin-empty__icon">📭</span>
                  <p>Kho truyện hiện đang trống. Hãy bấm "Viết truyện mới" để bắt đầu.</p>
                </div>`}
          </div>
        </section>

      </main>${renderAuthModal()}`;
  }


  return { renderAdmin, renderPendingPayments };
}
