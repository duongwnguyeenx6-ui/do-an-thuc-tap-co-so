export function createComponent(context) {
  const { state, genres, escapeHtml, getStory, canEditStory, mainHeader, renderAuthModal } = context;

  function renderStoryForm(story) {
    const editing = Boolean(story);
    const formId = editing ? 'storyEditForm' : 'storyForm';
    const prefix = editing ? 'editStory' : 'story';
    const genreOptions = [...new Set([...genres, ...state.stories.map((item) => item.theLoai).filter(Boolean)])];
    return `<form id="${formId}" class="admin-grid ${editing ? 'story-edit-form' : ''}">
      <div class="form-group"><label for="${prefix}Title">Tên truyện</label><input id="${prefix}Title" name="tieuDe" value="${escapeHtml(story?.tieuDe || '')}" required></div>
      <div class="form-group"><label for="${prefix}Author">Tác giả</label><input id="${prefix}Author" name="tacGia" value="${escapeHtml(story?.tacGia || '')}" required></div>
      <div class="form-group"><label for="${prefix}Genre">Thể loại</label><select id="${prefix}Genre" name="theLoai" required>${genreOptions.map((genre) => `<option value="${escapeHtml(genre)}" ${story?.theLoai === genre ? 'selected' : ''}>${escapeHtml(genre)}</option>`).join('')}</select></div>
      <div class="form-group"><label for="${prefix}Status">Trạng thái</label><select id="${prefix}Status" name="trangThai"><option value="New" ${story?.trangThai === 'New' ? 'selected' : ''}>Đang ra</option><option value="Full" ${story?.trangThai === 'Full' ? 'selected' : ''}>Hoàn thành</option></select></div>
      <div class="form-group"><label for="${prefix}Price">Giá truyện (VNĐ)</label><input id="${prefix}Price" name="price" type="number" min="0" step="1000" value="${Number(story?.gia || 0)}"></div>
      <div class="form-group form-wide"><label for="${prefix}File">Ảnh bìa</label><input id="${prefix}File" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></div>
      <div class="form-group form-wide"><label for="${prefix}Cover">Hoặc dán URL ảnh</label><input id="${prefix}Cover" name="coverImage" value="${escapeHtml(story?.coverImage || '')}" placeholder="https://..."></div>
      <div class="form-group form-wide"><label for="${prefix}Description">Giới thiệu</label><textarea id="${prefix}Description" name="moTa">${escapeHtml(story?.moTa || '')}</textarea></div>
      <div class="form-wide editor-actions"><p id="${editing ? 'storyEditMessage' : 'storyMessage'}" class="form-message" role="status"></p><button class="button button-primary" type="submit">${editing ? 'Lưu thay đổi' : 'Thêm truyện'}</button>${editing ? '<button class="button button-secondary" type="button" data-action="cancel-write" data-return="detail">Hủy</button>' : ''}</div>
    </form>`;
  }

  function renderChapterEditor(story) {
    const chapters = story?.danhSachChuong || [];
    const chapter = state.editingChapter === null ? null : chapters[state.editingChapter];
    return `<section class="chapter-editor"><h3>Chương truyện</h3><div class="chapter-items">
      ${chapters.length ? chapters.map((item, index) => `<div class="chapter-row"><div class="chapter-item"><strong>${escapeHtml(item.tieuDe)}</strong><small>Chương ${index + 1}</small></div><div class="chapter-actions"><button class="button button-secondary" data-action="edit-chapter" data-chapter="${index}">Sửa</button><button class="button button-danger" data-action="delete-chapter" data-chapter="${index}">Xóa</button></div></div>`).join('') : '<p class="empty-chapters">Chưa có chương nào.</p>'}
    </div><h4>${chapter ? `Sửa chương ${state.editingChapter + 1}` : 'Viết chương mới'}</h4>
      <form id="chapterForm" class="chapter-form"><label class="form-group">Tên chương<input name="tieuDe" value="${escapeHtml(chapter?.tieuDe || '')}" required></label><label class="form-group">Nội dung chương<textarea name="noiDung" required>${escapeHtml(chapter?.noiDung || '')}</textarea></label><p id="chapterMessage" class="form-message" role="status"></p><button class="button button-primary" type="submit">${chapter ? 'Cập nhật chương' : 'Lưu chương'}</button>${chapter ? '<button class="button button-secondary" type="button" data-action="cancel-edit-chapter">Hủy sửa</button>' : ''}</form>
    </section>`;
  }

  function renderWriter() {
    const story = state.editingStory ? getStory() : null;
    const canEdit = story && canEditStory(story);
    return `${mainHeader()}<main class="page-shell container"><section class="admin-panel writer-page"><div class="section-heading"><div><span class="eyebrow">Khu vực tác giả</span><h2>${canEdit ? 'Quản lý truyện' : 'Viết truyện mới'}</h2></div><div class="top-actions"><button class="button button-secondary" data-action="cancel-write" data-return="${canEdit ? 'detail' : 'home'}">Quay lại</button></div></div>
      ${renderStoryForm(canEdit ? story : null)}${canEdit ? renderChapterEditor(story) : ''}</section></main>${renderAuthModal()}`;
  }


  return { renderWriter };
}
