import { type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

// Каждый раздел Настроек (и обычных, и партнёрских) — свёрнутый по умолчанию
// аккордеон (пользователь: "каждый пункт в настройках скрой под раскрытие
// чтоб было удобно и читабельно") — тот же CSS (.changelog-accordion/
// .changelog-item/.changelog-item-header/.changelog-chevron/.training-body),
// что раньше использовался только для "Обучение" и (по одному вложенному
// пункту) для "Согласие агента"/"Приветствие бота". Общий компонент вместо
// повторения разметки в каждом файле — открытость каждого раздела держится в
// одном объекте по id раздела на стороне вызывающей страницы, а не в
// отдельном useState на каждую секцию.
export default function SettingsSection({
  id,
  icon,
  title,
  openSections,
  toggleSection,
  children,
}: {
  id: string;
  icon?: ReactNode;
  title: string;
  openSections: Record<string, boolean>;
  toggleSection: (id: string) => void;
  children: ReactNode;
}) {
  const isOpen = !!openSections[id];
  return (
    <section className="settings-section">
      <div className="changelog-accordion">
        <div className="changelog-item">
          <button type="button" className="changelog-item-header" onClick={() => toggleSection(id)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {icon}
              {title}
            </span>
            <ChevronDown size={16} className={`changelog-chevron ${isOpen ? 'open' : ''}`} />
          </button>
          {isOpen && <div className="training-body">{children}</div>}
        </div>
      </div>
    </section>
  );
}
