import { useLocale } from '../lib/i18n';

export default function Home() {
  const { t } = useLocale();
  return (
    <div>
      <p>{t('home.body')}</p>
    </div>
  );
}
