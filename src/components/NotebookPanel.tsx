import { useEffect, useRef, useState, type RefObject } from 'react';
import { Pin, PinOff, X, Plus, ArrowLeft, Trash2 } from 'lucide-react';
import { api, type Employee, type NotebookNote } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { clamp } from '../lib/clamp';
import {
  getStoredNotebookPinned,
  setStoredNotebookPinned,
  getStoredNotebookPos,
  setStoredNotebookPos,
  getStoredNotebookSize,
  setStoredNotebookSize,
  type NotebookPos,
  type NotebookSize,
} from '../lib/notebookPanelPrefs';
import RichEditor from './RichEditor';

const MIN_WIDTH = 280;
const MIN_HEIGHT = 280;
const DEFAULT_SIZE: NotebookSize = { width: 340, height: 420 };

// Плавающая панель Записной книжки (v0.6.0) — первый в проекте
// драг-н-дроп/resize-элемент (см. docs/TZ.md), поэтому механика написана
// вручную (window-level mousemove/mouseup), без новой зависимости — задача
// одноразовая (одна панель), библиотека была бы избыточна.
export default function NotebookPanel({
  employee,
  open,
  onClose,
  anchorRef,
  notebookName,
}: {
  employee: Employee;
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLButtonElement>;
  notebookName: string | null;
}) {
  const { t } = useLocale();
  const { showToast } = useToast();

  const [pinned, setPinned] = useState(getStoredNotebookPinned());
  const [pos, setPos] = useState<NotebookPos>(() => getStoredNotebookPos() ?? { x: 0, y: 0 });
  const [size, setSize] = useState<NotebookSize>(() => getStoredNotebookSize() ?? DEFAULT_SIZE);
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [notes, setNotes] = useState<NotebookNote[]>([]);
  const [activeNote, setActiveNote] = useState<NotebookNote | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  // Первое открытие (нет сохранённой позиции) — якорится под кнопкой в
  // шапке, как .notifications-panel; дальше свободно двигается. При каждом
  // открытии — defensive-клэмп в границы текущего окна (могло измениться
  // разрешение экрана между запусками).
  useEffect(() => {
    if (!open) return;
    const stored = getStoredNotebookPos();
    if (!stored && anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({
        x: clamp(r.left, 8, window.innerWidth - size.width - 8),
        y: clamp(r.bottom + 8, 8, window.innerHeight - 40),
      });
    } else if (stored) {
      setPos({
        x: clamp(stored.x, 0, Math.max(0, window.innerWidth - size.width)),
        y: clamp(stored.y, 0, Math.max(0, window.innerHeight - 40)),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    api.listNotebookNotes({ actorId: employee.id, employeeId: employee.id }).then(setNotes).catch(() => {});
    setView('list');
  }, [open, employee.id]);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (pinned) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = { ...pos };
    const onMove = (ev: MouseEvent) => {
      setPos({
        x: clamp(startPos.x + (ev.clientX - startX), 0, Math.max(0, window.innerWidth - size.width)),
        y: clamp(startPos.y + (ev.clientY - startY), 0, Math.max(0, window.innerHeight - 40)),
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setPos((p) => { setStoredNotebookPos(p); return p; });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (pinned) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startSize = { ...size };
    const onMove = (ev: MouseEvent) => {
      setSize({
        width: clamp(startSize.width + (ev.clientX - startX), MIN_WIDTH, window.innerWidth - pos.x - 8),
        height: clamp(startSize.height + (ev.clientY - startY), MIN_HEIGHT, window.innerHeight - pos.y - 8),
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setSize((s) => { setStoredNotebookSize(s); return s; });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const togglePin = () => {
    setPinned((p) => {
      const next = !p;
      setStoredNotebookPinned(next);
      return next;
    });
  };

  const openNewNote = () => {
    setActiveNote(null);
    setTitle('');
    setContent('');
    setView('editor');
  };

  const openNote = (n: NotebookNote) => {
    setActiveNote(n);
    setTitle(n.title);
    setContent(n.content || '');
    setView('editor');
  };

  const reloadNotes = () => api.listNotebookNotes({ actorId: employee.id, employeeId: employee.id }).then(setNotes).catch(() => {});

  const handleSave = async () => {
    if (!title.trim()) {
      showToast('error', t('notebook.titleRequired'));
      return;
    }
    setBusy(true);
    try {
      if (activeNote) {
        await api.updateNotebookNote({ actorId: employee.id, id: activeNote.id, title: title.trim(), content: content || null });
      } else {
        await api.createNotebookNote({ actorId: employee.id, employeeId: employee.id, title: title.trim(), content: content || null });
      }
      await reloadNotes();
      setView('list');
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('notebook.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!activeNote) return;
    setBusy(true);
    try {
      await api.deleteNotebookNote({ actorId: employee.id, id: activeNote.id });
      await reloadNotes();
      setView('list');
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('notebook.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="notebook-panel" style={{ left: pos.x, top: pos.y, width: size.width, height: size.height }}>
      <div className={`notebook-panel-header${pinned ? '' : ' draggable'}`} onMouseDown={handleHeaderMouseDown}>
        <span className="notebook-panel-title">{notebookName || t('notebook.defaultTitle')}</span>
        <div className="notebook-panel-controls">
          <button type="button" className="icon-btn-sm" onClick={togglePin} title={t(pinned ? 'notebook.unpin' : 'notebook.pin')}>
            {pinned ? <Pin size={14} /> : <PinOff size={14} />}
          </button>
          <button type="button" className="icon-btn-sm" onClick={onClose} title={t('common.close')}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="notebook-panel-body">
        {view === 'list' ? (
          <>
            <button type="button" className="modal-btn" onClick={openNewNote}>
              <Plus size={14} /> {t('notebook.createBtn')}
            </button>
            <div className="notebook-note-list">
              {notes.length === 0 ? (
                <p className="settings-hint">{t('notebook.emptyList')}</p>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="notebook-note-item" onClick={() => openNote(n)}>
                    <div className="notebook-note-item-title">{n.title}</div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <input
              className="notebook-note-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('notebook.titlePlaceholder')}
            />
            <RichEditor value={content} onChange={setContent} resetKey={activeNote?.id ?? 'new'} placeholder={t('notebook.contentPlaceholder')} />
            <div className="notebook-note-actions">
              <button type="button" className="modal-btn" onClick={() => setView('list')}>
                <ArrowLeft size={14} /> {t('notebook.backBtn')}
              </button>
              {activeNote && (
                <button type="button" className="modal-btn danger" onClick={handleDelete} disabled={busy}>
                  <Trash2 size={14} />
                </button>
              )}
              <button type="button" className="primary" onClick={handleSave} disabled={busy}>
                {busy ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </>
        )}
      </div>

      {!pinned && <div className="notebook-resize-handle" onMouseDown={handleResizeMouseDown} />}
    </div>
  );
}
