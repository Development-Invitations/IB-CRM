import { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, Heading2, Heading3, List, ListOrdered, Link as LinkIcon, ChevronsUpDown, Image as ImageIcon, Video, Undo2, Redo2, Baseline } from 'lucide-react';
import { prepareAttachment, classifyAttachment } from '../lib/attachment';
import { sanitizeBlogHtml } from '../lib/sanitizeHtml';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';

const TEXT_COLORS = [
  '#E8EAF2', '#14213D', '#F5C518', '#1E3A8A', '#DC2626',
  '#16A34A', '#0EA5E9', '#7C3AED', '#DB2777', '#F97316',
];

// Простой contentEditable-редактор через document.execCommand — устаревший,
// но по-прежнему рабочий API, который поддерживает WebView2/Chromium; тянуть
// полноценную WYSIWYG-библиотеку ради Bold/Italic/списков/картинок избыточно.
//
// Undo/redo — свой стек снапшотов innerHTML, а не встроенный execCommand('undo').
// Встроенный удобен, пока правишь только текст, но после наших же insertHTML
// (картинка/видео/раскрывающийся блок) он часто просто не создаёт точку отмены —
// такие вставки нельзя было откатить. Свой стек фиксирует шаг после каждого
// действия тулбара и после паузы в наборе текста, поэтому Ctrl+Z всегда работает
// предсказуемо.
export default function RichEditor({
  value,
  onChange,
  resetKey,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  resetKey: string;
  placeholder?: string;
}) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const colorWrapRef = useRef<HTMLDivElement>(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  useEffect(() => {
    if (!colorOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (colorWrapRef.current && !colorWrapRef.current.contains(e.target as Node)) setColorOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [colorOpen]);

  const historyRef = useRef<string[]>(['']);
  const historyIndexRef = useRef(0);
  const restoringRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateUndoRedoState = () => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  };

  useEffect(() => {
    if (typingTimerRef.current) { clearTimeout(typingTimerRef.current); typingTimerRef.current = null; }
    const initial = value || '';
    if (ref.current) ref.current.innerHTML = initial;
    historyRef.current = [initial];
    historyIndexRef.current = 0;
    updateUndoRedoState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const emitChange = () => {
    if (ref.current) onChange(sanitizeBlogHtml(ref.current.innerHTML));
  };

  // Фиксирует текущее содержимое как отдельный шаг истории (обрезает "будущее",
  // если до этого что-то отменяли и потом продолжили редактировать заново).
  const pushHistory = () => {
    if (restoringRef.current || !ref.current) return;
    const html = ref.current.innerHTML;
    if (html === historyRef.current[historyIndexRef.current]) return;
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(html);
    historyIndexRef.current = historyRef.current.length - 1;
    updateUndoRedoState();
  };

  const scheduleHistoryPush = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(pushHistory, 500);
  };

  const restoreFromHistory = (index: number) => {
    if (!ref.current) return;
    restoringRef.current = true;
    ref.current.innerHTML = historyRef.current[index];
    historyIndexRef.current = index;
    restoringRef.current = false;
    updateUndoRedoState();
    emitChange();
    ref.current.focus();
  };

  const undo = () => {
    if (typingTimerRef.current) { clearTimeout(typingTimerRef.current); typingTimerRef.current = null; pushHistory(); }
    if (historyIndexRef.current > 0) restoreFromHistory(historyIndexRef.current - 1);
  };

  const redo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) restoreFromHistory(historyIndexRef.current + 1);
  };

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emitChange();
    pushHistory();
  };

  const insertHtmlAtCursor = (html: string) => {
    ref.current?.focus();
    document.execCommand('insertHTML', false, html);
    emitChange();
    pushHistory();
  };

  const handleInput = () => {
    emitChange();
    scheduleHistoryPush();
  };

  const handleBlur = () => {
    emitChange();
    if (typingTimerRef.current) { clearTimeout(typingTimerRef.current); typingTimerRef.current = null; }
    pushHistory();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const key = e.key.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    if (!mod || key !== 'z' && key !== 'y') return;
    e.preventDefault();
    if (key === 'y' || (key === 'z' && e.shiftKey)) redo();
    else undo();
  };

  const handleLink = () => {
    const url = window.prompt(t('blog.editorLinkPrompt'));
    if (!url || !url.trim()) return;
    exec('createLink', url.trim());
  };

  const applyColor = (color: string) => {
    exec('foreColor', color);
    setColorOpen(false);
  };

  const handleDetails = () => {
    insertHtmlAtCursor(
      `<details class="blog-details"><summary>${t('blog.editorDetailsDefaultTitle')}</summary><p>${t('blog.editorDetailsDefaultBody')}</p></details><p><br></p>`
    );
  };

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMediaBusy(true);
    try {
      const { data } = await prepareAttachment(file);
      const kind = classifyAttachment(data);
      const html = kind === 'video'
        ? `<video src="${data}" controls></video><p><br></p>`
        : `<img src="${data}" alt="" /><p><br></p>`;
      insertHtmlAtCursor(html);
    } catch {
      showToast('error', t('blog.editorMediaTooLarge'));
    } finally {
      setMediaBusy(false);
    }
  };

  return (
    <div className="rich-editor">
      <div className="rich-editor-toolbar">
        <button type="button" onClick={undo} disabled={!canUndo} title={t('blog.editorUndo')}><Undo2 size={14} /></button>
        <button type="button" onClick={redo} disabled={!canRedo} title={t('blog.editorRedo')}><Redo2 size={14} /></button>
        <span className="rich-editor-sep" />
        <button type="button" onClick={() => exec('bold')} title={t('blog.editorBold')}><Bold size={14} /></button>
        <button type="button" onClick={() => exec('italic')} title={t('blog.editorItalic')}><Italic size={14} /></button>
        <button type="button" onClick={() => exec('underline')} title={t('blog.editorUnderline')}><Underline size={14} /></button>
        <div className="rich-editor-color-wrap" ref={colorWrapRef}>
          <button type="button" onClick={() => setColorOpen((v) => !v)} title={t('blog.editorTextColor')}><Baseline size={14} /></button>
          {colorOpen && (
            <div className="rich-editor-color-popover">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="rich-editor-color-swatch"
                  style={{ background: color }}
                  onClick={() => applyColor(color)}
                  title={color}
                />
              ))}
              <button type="button" className="rich-editor-color-swatch rich-editor-color-custom" onClick={() => colorInputRef.current?.click()} title={t('blog.editorTextColorCustom')}>
                <Baseline size={12} />
              </button>
              <input
                ref={colorInputRef}
                type="color"
                className="rich-editor-color-native-input"
                onChange={(e) => applyColor(e.target.value)}
              />
            </div>
          )}
        </div>
        <span className="rich-editor-sep" />
        <button type="button" onClick={() => exec('formatBlock', '<h2>')} title={t('blog.editorHeading2')}><Heading2 size={14} /></button>
        <button type="button" onClick={() => exec('formatBlock', '<h3>')} title={t('blog.editorHeading3')}><Heading3 size={14} /></button>
        <span className="rich-editor-sep" />
        <button type="button" onClick={() => exec('insertUnorderedList')} title={t('blog.editorBulletList')}><List size={14} /></button>
        <button type="button" onClick={() => exec('insertOrderedList')} title={t('blog.editorNumberedList')}><ListOrdered size={14} /></button>
        <button type="button" onClick={handleLink} title={t('blog.editorLink')}><LinkIcon size={14} /></button>
        <button type="button" onClick={handleDetails} title={t('blog.editorCollapsible')}><ChevronsUpDown size={14} /></button>
        <span className="rich-editor-sep" />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={mediaBusy} title={t('blog.editorInsertImage')}><ImageIcon size={14} /></button>
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={mediaBusy} title={t('blog.editorInsertVideo')}><Video size={14} /></button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleMediaChange} />
      </div>
      <div
        ref={ref}
        className="rich-editor-content"
        contentEditable
        data-placeholder={placeholder}
        onInput={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning
      />
    </div>
  );
}
