export function createComponent(context) {
  const { state, escapeHtml, money, canEditStory, mainHeader, renderAuthModal } = context;

  function renderReviewsPanel(storyId, data) {
    const reviewForm = state.user
      ? `<form id="storyReviewForm" class="review-form" data-story-id="${storyId}">
          <fieldset class="review-rating-field">
            <legend>Đánh giá truyện này</legend>
            <div class="review-stars" role="radiogroup" aria-label="Chọn số sao">
              ${[1, 2, 3, 4, 5].map((rating) => `<label class="review-star-option">
                <input type="radio" name="rating" value="${rating}" aria-label="${rating} sao" required>
                <span aria-hidden="true">★</span>
              </label>`).join('')}
            </div>
          </fieldset>
          <label class="review-comment-label" for="reviewComment">Bình luận<textarea id="reviewComment" name="comment" rows="4" maxlength="2000" required placeholder="Chia sẻ cảm nhận của bạn..."></textarea></label>
          <p id="reviewMessage" class="form-message" role="status"></p>
          <button class="button button-primary" type="submit">Gửi đánh giá</button>
        </form>`
      : `<p class="review-login-prompt">Đăng nhập để gửi đánh giá và bình luận.<button class="button button-secondary" type="button" data-action="open-auth" data-mode="login">Đăng nhập</button></p>`;
    const reviewList = data.reviews.length
      ? `<div class="review-list">${data.reviews.map((review) => `<article class="review-item">
          <div class="review-item-header"><strong>${escapeHtml(review.username)}</strong><span class="review-item-rating" aria-label="${review.rating} trên 5 sao">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span></div>
          <p>${escapeHtml(review.comment).replace(/\n/g, '<br>')}</p>
          <time datetime="${escapeHtml(review.updatedAt)}">${new Date(review.updatedAt).toLocaleString('vi-VN')}</time>
        </article>`).join('')}</div>`
      : '<p class="empty-chapters">Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ cảm nhận.</p>';

    return `<section id="storyReviewsPanel" data-story-id="${storyId}" class="story-reviews" aria-labelledby="storyReviewsHeading">
      <div class="review-summary"><div><span class="eyebrow">Ý kiến độc giả</span><h3 id="storyReviewsHeading">Đánh giá &amp; bình luận</h3></div><div class="review-average"><strong>${Number(data.averageRating).toFixed(1)}</strong><span class="review-stars-display" aria-label="${data.averageRating} trên 5 sao">${'★'.repeat(Math.round(data.averageRating))}${'☆'.repeat(5 - Math.round(data.averageRating))}</span><small>${data.reviewCount} đánh giá</small></div></div>
      ${reviewForm}<div class="review-list-heading"><h4>Cảm nhận của độc giả</h4></div>${reviewList}
      <div class="review-modal-backdrop" data-review-confirmation hidden>
        <section class="review-modal" role="dialog" aria-modal="true" aria-labelledby="reviewConfirmHeading" aria-describedby="reviewConfirmDescription">
          <h3 id="reviewConfirmHeading">Xác nhận đánh giá</h3>
          <p id="reviewConfirmDescription">Bạn chắc chắn với bình luận này chưa?</p>
          <div class="review-modal-actions">
            <button class="button button-secondary" type="button" data-action="cancel-review-confirmation">Hủy</button>
            <button class="button button-primary" type="button" data-action="confirm-review-submission" data-id="${storyId}">OK</button>
          </div>
        </section>
      </div>
      <div class="review-modal-backdrop" data-review-thanks hidden>
        <section class="review-modal" role="dialog" aria-modal="true" aria-labelledby="reviewThanksHeading" aria-describedby="reviewThanksDescription">
          <span class="review-thanks-icon" aria-hidden="true">✓</span>
          <h3 id="reviewThanksHeading">Cảm ơn bạn đã đánh giá!</h3>
          <p id="reviewThanksDescription">Ý kiến của bạn đã được ghi nhận.</p>
          <div class="review-modal-actions">
            <button class="button button-primary" type="button" data-action="close-review-thanks">Đóng</button>
          </div>
        </section>
      </div>
    </section>`;
  }

  function renderStoryDetail(story) {
    const chapters = story.danhSachChuong || [];
    const readable = Number(story.gia || 0) === 0 || story.canRead;
    return `${mainHeader()}<main class="page-shell container"><button class="button button-secondary story-back-button" data-action="home">← Quay lại thư viện</button><div class="book-layout"><aside class="profile-card"><div class="book-cover-large">${story.coverImage ? `<img src="${escapeHtml(story.coverImage)}" alt="Bìa ${escapeHtml(story.tieuDe)}">` : escapeHtml(story.tieuDe)}</div><h2>${escapeHtml(story.tieuDe)}</h2><div class="book-author">Tác giả: ${escapeHtml(story.tacGia)}</div><div class="detail-price">${Number(story.gia || 0) ? `${money(story.gia)}đ` : 'Miễn phí'}</div><div class="meta-strip"><span class="meta-chip">${escapeHtml(story.theLoai)}</span><span class="meta-chip">${escapeHtml(story.trangThai)}</span><span class="meta-chip">${escapeHtml(story.capNhat)}</span></div>
      ${readable && chapters.length ? `<button class="button button-primary" data-action="read-story" data-id="${story.maTruyen}" data-chapter="0">Đọc từ đầu</button>` : ''}${Number(story.gia || 0) && !readable ? `<button class="button button-primary" data-action="purchase-story" data-id="${story.maTruyen}">Mua truyện ${money(story.gia)}đ</button>` : ''}<button class="button button-secondary" data-action="toggle-favorite" data-id="${story.maTruyen}">${state.favorites.includes(Number(story.maTruyen)) ? '♥ Đã lưu' : '♡ Lưu truyện'}</button>
      ${!readable ? '<p class="empty-chapters">Bạn cần mua truyện để xem nội dung.</p>' : ''}</aside><section class="detail-panel"><div class="detail-header"><h3>Giới thiệu</h3><span class="tag">${chapters.length} chương</span></div><div class="detail-body">${escapeHtml(story.moTa || '')}</div><div class="chapter-list"><h4>Danh sách chương</h4><div class="chapter-items">${!readable ? '<p class="empty-chapters">Danh sách chương sẽ hiển thị sau khi mua truyện.</p>' : chapters.length ? chapters.map((chapter, index) => `<div class="chapter-row"><button class="chapter-item" data-action="read-story" data-id="${story.maTruyen}" data-chapter="${index}"><strong>${escapeHtml(chapter.tieuDe)}</strong><small>Chương ${index + 1}</small></button></div>`).join('') : '<p class="empty-chapters">Chưa có chương nào.</p>'}</div></div>${canEditStory(story) ? '<button class="button button-secondary" data-action="open-writer" data-id="' + story.maTruyen + '">Quản lý truyện</button>' : ''}</section></div><div id="storyReviewsPanel" data-story-id="${story.maTruyen}" class="story-reviews-loading" aria-live="polite">Đang tải đánh giá...</div></main>${renderAuthModal()}`;
  }

  function renderReader(story) {
    const chapter = story?.danhSachChuong?.[state.chapterIndex];
    if (!story || !story.canRead || !chapter) {
      return `${mainHeader()}<main class="page-shell container"><section class="reader-panel"><h2>${escapeHtml(story?.tieuDe || 'Truyện')}</h2><p class="empty-chapters">${story?.gia ? 'Bạn cần mua truyện để xem nội dung.' : 'Truyện này chưa có chương để đọc.'}</p><button class="button button-primary" data-action="story-detail" data-id="${story?.maTruyen || ''}">Quay lại truyện</button></section></main>${renderAuthModal()}`;
    }
    const paragraphs = String(chapter.noiDung || '').split(/\n\s*\n/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('');
    return `${mainHeader()}<main class="page-shell container"><section class="reader-panel"><div class="back-link" data-action="story-detail" data-id="${story.maTruyen}">← Quay lại truyện</div><h2>${escapeHtml(story.tieuDe)}</h2><div class="reader-sub">${escapeHtml(chapter.tieuDe)}</div><div class="reader-tools"><span>Chương ${state.chapterIndex + 1} / ${story.danhSachChuong.length}</span><div><button class="button button-secondary" data-action="reader-font-down" aria-label="Giảm cỡ chữ">A−</button><button class="button button-secondary" data-action="reader-font-up" aria-label="Tăng cỡ chữ">A+</button></div></div><article class="reader-body" style="--reader-scale:${state.readerScale}">${paragraphs}</article><div class="chapter-navigation"><button class="button button-secondary" data-action="read-story" data-id="${story.maTruyen}" data-chapter="${state.chapterIndex - 1}" ${state.chapterIndex <= 0 ? 'disabled' : ''}>← Chương trước</button><button class="button button-primary" data-action="read-story" data-id="${story.maTruyen}" data-chapter="${state.chapterIndex + 1}" ${state.chapterIndex >= story.danhSachChuong.length - 1 ? 'disabled' : ''}>Chương tiếp →</button></div></section></main>${renderAuthModal()}`;
  }


  return { renderStoryDetail, renderReader, renderReviewsPanel };
}
