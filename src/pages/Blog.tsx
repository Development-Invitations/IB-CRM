import { useEffect, useState, useContext, useMemo } from 'react';
import { Plus, Search, MessageSquare, Pin, PinOff, Trash2, Pencil, ArrowLeft, X, List as ListIcon } from 'lucide-react';
import { api, type Employee, type BlogTopic, type BlogComment, type BlogCategory } from '../lib/api';
import { FullscreenContext } from './Dashboard';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { parseSqliteUtc } from '../lib/date';
import { sanitizeBlogHtml, isBlankHtml } from '../lib/sanitizeHtml';
import { extractToc } from '../lib/toc';
import Modal from '../components/Modal';
import Select from '../components/Select';
import RichEditor from '../components/RichEditor';
import LoadingScreen from '../components/LoadingScreen';

const CATEGORIES: BlogCategory[] = ['announcement', 'discussion', 'useful', 'qna', 'custom'];
const CATEGORY_LABEL_KEYS: Record<BlogCategory, string> = {
  announcement: 'blog.categoryAnnouncement',
  discussion: 'blog.categoryDiscussion',
  useful: 'blog.categoryUseful',
  qna: 'blog.categoryQna',
  custom: 'blog.categoryCustom',
};

export default function Blog({ currentEmployee }: { currentEmployee: Employee }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const { enter: enterFullscreen, exit: exitFullscreen } = useContext(FullscreenContext);

  const [topics, setTopics] = useState<BlogTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<BlogTopic | null>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<BlogTopic | undefined>();
  const [formCategory, setFormCategory] = useState<BlogCategory>('discussion');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [formInstanceKey, setFormInstanceKey] = useState(0);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentInstanceKey, setCommentInstanceKey] = useState(0);
  const [replyTo, setReplyTo] = useState<BlogComment | null>(null);

  const load = () => {
    setLoading(true);
    api.listBlogTopics().then((list) => {
      setTopics(list);
      setLoading(false);
      setSelected((prev) => (prev ? list.find((x) => x.id === prev.id) ?? null : null));
    });
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (selected) enterFullscreen(); else exitFullscreen();
    return () => { exitFullscreen(); };
  }, [!!selected]); // eslint-disable-line

  const loadComments = () => {
    if (!selected) return;
    setDetailLoading(true);
    api.listBlogComments(selected.id).then((list) => {
      setComments(list);
      setDetailLoading(false);
    });
  };

  useEffect(() => { loadComments(); setReplyTo(null); }, [selected?.id]); // eslint-disable-line

  const { items: tocItems, html: renderedContent } = useMemo(
    () => extractToc(sanitizeBlogHtml(selected?.content ?? '')),
    [selected?.id, selected?.content]
  );

  const filtered = search.trim()
    ? topics.filter((tp) => {
        const q = search.trim().toLowerCase();
        const plainContent = (tp.content || '').replace(/<[^>]+>/g, ' ');
        return tp.title.toLowerCase().includes(q) || plainContent.toLowerCase().includes(q) || tp.createdByName.toLowerCase().includes(q);
      })
    : topics;

  const openCreate = () => {
    setEditingTopic(undefined);
    setFormCategory('discussion'); setFormTitle(''); setFormContent(''); setFormError('');
    setFormInstanceKey((k) => k + 1);
    setFormOpen(true);
  };
  const openEdit = (topic: BlogTopic) => {
    setEditingTopic(topic);
    setFormCategory(topic.category); setFormTitle(topic.title); setFormContent(topic.content ?? '');
    setFormError('');
    setFormInstanceKey((k) => k + 1);
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    setFormError('');
    if (!formTitle.trim()) { setFormError(t('blog.errorRequired')); return; }
    setFormBusy(true);
    try {
      if (editingTopic) {
        await api.updateBlogTopic({ actorId: currentEmployee.id, id: editingTopic.id, category: formCategory, title: formTitle.trim(), content: isBlankHtml(formContent) ? null : formContent });
        showToast('success', t('blog.updated'));
      } else {
        await api.createBlogTopic({ actorId: currentEmployee.id, category: formCategory, title: formTitle.trim(), content: isBlankHtml(formContent) ? null : formContent });
        showToast('success', t('blog.added'));
      }
      setFormOpen(false);
      load();
    } catch (err: any) {
      setFormError(typeof err === 'string' ? err : t('blog.errorGeneric'));
    } finally {
      setFormBusy(false);
    }
  };

  const handleTogglePin = async () => {
    if (!selected) return;
    try {
      await api.setBlogTopicPinned({ adminId: currentEmployee.id, id: selected.id, pinned: !selected.pinned });
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('blog.errorGeneric'));
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleteBusy(true);
    try {
      await api.deleteBlogTopic({ adminId: currentEmployee.id, id: selected.id });
      showToast('success', t('blog.deleted'));
      setDeleteConfirmOpen(false);
      setSelected(null);
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('blog.errorGeneric'));
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleAddComment = async () => {
    if (!selected || isBlankHtml(commentText)) return;
    setCommentBusy(true);
    try {
      await api.addBlogComment({ actorId: currentEmployee.id, topicId: selected.id, content: commentText, replyToId: replyTo?.id ?? null });
      setCommentText('');
      setCommentInstanceKey((k) => k + 1);
      setReplyTo(null);
      loadComments();
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('blog.errorGeneric'));
    } finally {
      setCommentBusy(false);
    }
  };

  // Редактировать тему может только её автор (даже не админ) — по просьбе пользователя.
  const canEditTopic = !!selected && selected.createdBy === currentEmployee.id;
  const categoryOptions = CATEGORIES.map((c) => ({ value: c, label: t(CATEGORY_LABEL_KEYS[c]) }));

  if (selected) {
    return (
      <div className="reg-fullscreen">
        <div className="reg-fullscreen-header">
          <button className="reg-back-btn" onClick={() => setSelected(null)}>
            <ArrowLeft size={16} /> {t('blog.backToList')}
          </button>
          <div className="reg-fullscreen-title">
            <h2>{selected.title}</h2>
            <span className={`absence-status blog-category-${selected.category}`}>{t(CATEGORY_LABEL_KEYS[selected.category])}</span>
            {selected.pinned && <span className="blog-pinned-badge"><Pin size={11} /> {t('blog.pinnedLabel')}</span>}
          </div>
          <div className="reg-fullscreen-actions">
            {currentEmployee.isAdmin && (
              <button className="modal-btn" onClick={handleTogglePin}>
                {selected.pinned ? <PinOff size={14} /> : <Pin size={14} />} {selected.pinned ? t('blog.unpinBtn') : t('blog.pinBtn')}
              </button>
            )}
            {canEditTopic && <button className="modal-btn" onClick={() => openEdit(selected)}><Pencil size={14} /></button>}
            {currentEmployee.isAdmin && (
              <button className="modal-btn danger" onClick={() => setDeleteConfirmOpen(true)}><Trash2 size={14} /></button>
            )}
          </div>
        </div>

        <div className="blog-topic-body">
          <div className="blog-topic-main">
            <div className="blog-topic-meta">
              <strong>{selected.createdByName}</strong>
              <span className="settings-hint">{parseSqliteUtc(selected.createdAt).toLocaleString()}</span>
            </div>

            {tocItems.length > 1 && (
              <div className="blog-toc-inline">
                <div className="blog-toc-title"><ListIcon size={13} /> {t('blog.tocTitle')}</div>
                <nav>
                  {tocItems.map((item) => (
                    <a key={item.id} href={`#${item.id}`} className={`blog-toc-link level-${item.level}`}>{item.text}</a>
                  ))}
                </nav>
              </div>
            )}

            {selected.content && (
              <div className="blog-topic-content" dangerouslySetInnerHTML={{ __html: renderedContent }} />
            )}
          </div>

          <div className="blog-topic-comments-col">
            <div className="department-members-title">
              {t('blog.commentsTitle')} {comments.length > 0 ? `(${comments.length})` : ''}
            </div>

            <div className="reg-entries-list blog-comments-list">
              {detailLoading ? <LoadingScreen compact /> : comments.length === 0 ? (
                <p className="settings-hint">{t('blog.commentsEmpty')}</p>
              ) : (
                comments.map((c) => {
                  const parent = c.replyToId ? comments.find((p) => p.id === c.replyToId) : null;
                  const isOwn = c.authorId === currentEmployee.id;
                  const initials = c.authorName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
                  return (
                    <div key={c.id} className={`reg-chat-msg${isOwn ? ' own' : ''}`}>
                      <div className="reg-chat-avatar">{initials || '?'}</div>
                      <div className="reg-chat-bubble">
                        <div className="reg-entry-header">
                          <div className="reg-entry-meta">
                            <strong>{c.authorName}</strong>
                            <span className="settings-hint">{parseSqliteUtc(c.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="reg-entry-actions">
                            <button className="reg-action-btn" onClick={() => setReplyTo(c)} title={t('blog.replyBtn')}>
                              <MessageSquare size={13} />
                            </button>
                          </div>
                        </div>
                        {parent && (
                          <div className="blog-reply-to">↪ {t('blog.replyingTo', { name: parent.authorName })}</div>
                        )}
                        <div className="reg-entry-content blog-comment-content" dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(c.content) }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="reg-add-entry">
              {replyTo && (
                <div className="blog-reply-banner">
                  {t('blog.replyingTo', { name: replyTo.authorName })}
                  <button className="reg-action-btn" onClick={() => setReplyTo(null)}><X size={12} /></button>
                </div>
              )}
              <RichEditor
                value={commentText}
                onChange={setCommentText}
                resetKey={`${selected.id}-${commentInstanceKey}`}
                placeholder={t('blog.commentPlaceholder')}
              />
              <div className="reg-add-entry-row">
                <button className="modal-btn danger" onClick={handleAddComment} disabled={isBlankHtml(commentText) || commentBusy}>
                  <Plus size={14} /> {t('blog.commentSendBtn')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <Modal open={formOpen} title={editingTopic ? t('blog.editTitle') : t('blog.addTitle')} onClose={() => setFormOpen(false)} size="lg"
          actions={<>
            <button className="modal-btn" onClick={() => setFormOpen(false)}>{t('common.cancel')}</button>
            <button className="modal-btn danger" onClick={handleFormSubmit} disabled={formBusy}>{formBusy ? t('employees.savingBusy') : editingTopic ? t('employees.saveConfirm') : t('employees.addConfirm')}</button>
          </>}
        >
          {formError && <div className="error-text">{formError}</div>}
          <div className="field"><label>{t('blog.categoryLabel')}</label><Select value={formCategory} options={categoryOptions} onChange={(v) => setFormCategory(v as BlogCategory)} /></div>
          <div className="field"><label>{t('blog.titleLabel')}</label><input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} /></div>
          <div className="field">
            <label>{t('blog.contentLabel')}</label>
            <RichEditor value={formContent} onChange={setFormContent} resetKey={`${editingTopic?.id ?? 'new'}-${formInstanceKey}`} placeholder={t('blog.editorPlaceholder')} />
          </div>
        </Modal>

        <Modal open={deleteConfirmOpen} title={t('blog.deleteConfirmTitle')} onClose={() => setDeleteConfirmOpen(false)}
          actions={<>
            <button className="modal-btn" onClick={() => setDeleteConfirmOpen(false)} disabled={deleteBusy}>{t('common.cancel')}</button>
            <button className="modal-btn danger" onClick={handleDelete} disabled={deleteBusy}>{deleteBusy ? t('common.loading') : t('blog.deleteBtn')}</button>
          </>}
        >
          {t('blog.deleteConfirmBody', { name: selected?.title ?? '' })}
        </Modal>
      </div>
    );
  }

  return (
    <div className="employees-page">
      <div className="employees-header">
        <h1>{t('sidebar.blog')}</h1>
        <button className="primary employees-add-btn" onClick={openCreate}>
          <Plus size={16} /> {t('blog.addBtn')}
        </button>
      </div>

      <div className="employees-search-row">
        <Search size={15} className="employees-search-icon" />
        <input className="employees-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('blog.searchPlaceholder')} />
      </div>

      {loading ? <LoadingScreen compact /> : filtered.length === 0 ? (
        <p className="settings-hint">{t('blog.empty')}</p>
      ) : (
        <table className="employees-table">
          <thead>
            <tr>
              <th>{t('blog.colCategory')}</th>
              <th>{t('blog.colTitle')}</th>
              <th>{t('blog.colAuthor')}</th>
              <th>{t('blog.colCreated')}</th>
              <th>{t('blog.colComments')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((tp) => (
              <tr key={tp.id} className="employees-row" onClick={() => setSelected(tp)}>
                <td><span className={`absence-status blog-category-${tp.category}`}>{t(CATEGORY_LABEL_KEYS[tp.category])}</span></td>
                <td>{tp.pinned && <Pin size={12} style={{ marginRight: 6, opacity: 0.7 }} />}{tp.title}</td>
                <td>{tp.createdByName}</td>
                <td>{parseSqliteUtc(tp.createdAt).toLocaleDateString()}</td>
                <td>{tp.commentCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={formOpen} title={t('blog.addTitle')} onClose={() => setFormOpen(false)} size="lg"
        actions={<>
          <button className="modal-btn" onClick={() => setFormOpen(false)}>{t('common.cancel')}</button>
          <button className="modal-btn danger" onClick={handleFormSubmit} disabled={formBusy}>{formBusy ? t('employees.savingBusy') : t('employees.addConfirm')}</button>
        </>}
      >
        {formError && <div className="error-text">{formError}</div>}
        <div className="field"><label>{t('blog.categoryLabel')}</label><Select value={formCategory} options={categoryOptions} onChange={(v) => setFormCategory(v as BlogCategory)} /></div>
        <div className="field"><label>{t('blog.titleLabel')}</label><input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} /></div>
        <div className="field">
          <label>{t('blog.contentLabel')}</label>
          <RichEditor value={formContent} onChange={setFormContent} resetKey={`${editingTopic?.id ?? 'new'}-${formInstanceKey}`} placeholder={t('blog.editorPlaceholder')} />
        </div>
      </Modal>
    </div>
  );
}
