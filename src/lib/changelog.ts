import type { Locale } from './i18n';

// Версию тут держим в ручной синхронизации с package.json,
// src-tauri/Cargo.toml и src-tauri/tauri.conf.json — при следующем бампе
// версии поправить все четыре места.
export const APP_VERSION = '0.1.5';

export type ChangelogEntry = {
  version: string;
  items: string[];
};

// Пользовательская история изменений (не путать с docs/TZ.md — там подробный
// техжурнал для разработки, тут — короткое и понятное описание для сотрудников).
// Локализовано на все 3 языка интерфейса — берётся по текущему locale.
export const changelog: Record<Locale, ChangelogEntry[]> = {
  ru: [
    {
      version: '0.1.5',
      items: [
        'Подразделение можно удалить (сотрудники останутся, просто отвяжутся от него)',
        'Сотрудников теперь можно добавлять в подразделение прямо из его карточки',
        'Загрузка настоящего фото на аватар сотрудника вместо инициалов',
      ],
    },
    {
      version: '0.1.4',
      items: [
        'Модальные окна теперь нормально прокручиваются, если форма не помещается на экране',
        'Поиск в выборе руководителя и заместителя — удобно, если сотрудников много',
        'В "Руководителе" теперь показываются только главы подразделений, а не все подряд',
      ],
    },
    {
      version: '0.1.3',
      items: [
        'Подразделения: список, создание, редактирование, назначение руководителя',
        'При выборе подразделения руководитель сотрудника подставляется автоматически',
        'Заявки на изменение личных данных: сотрудник запрашивает — админ применяет, даёт временный доступ на 24 часа или отклоняет',
        'Уведомления в шапке приложения теперь настоящие, а не пустая заглушка',
        'Кабинет сотрудника стал красивее — добавлен декоративный баннер',
      ],
    },
    {
      version: '0.1.2',
      items: [
        'Карточка сотрудника: клик по строке в таблице — фото, должность, руководитель, заместитель, телефон',
        'Кнопка "Редактировать" и отдельная страница "Кабинет сотрудника"',
        'Должности — можно добавлять прямо при создании или редактировании сотрудника',
        'Телефон с автоматической маской под формат Узбекистана',
        'Возможность назначить руководителя и заместителя вручную',
        'Кнопка перехода в свой кабинет в шапке приложения',
      ],
    },
    {
      version: '0.1.1',
      items: [
        'Логотип на фоне теперь зафиксирован и не уезжает при прокрутке страницы',
        'Выбор темы оформления сохраняется на устройстве (раньше сбрасывался при выходе)',
        'Добавлено ещё 3 темы оформления (всего 5), выбор — выпадающим списком',
        'Светлая тема теперь стандартная по умолчанию',
        'Модальные окна стали крупнее и удобнее для чтения',
        'История обновлений теперь на языке интерфейса, а не только на русском',
      ],
    },
    {
      version: '0.1.0',
      items: [
        'Первый запуск приложения и создание администратора (офлайн, без сервера)',
        'Вход по логину и паролю с запоминанием логина на устройстве',
        'Личный кабинет: смена пароля',
        'Тёмная и светлая тема оформления',
        'Интерфейс на 3 языках: русский, узбекский (латиница и кириллица)',
        'Список сотрудников и добавление новых — первый рабочий модуль',
        'Единый стиль модальных окон и уведомлений вместо системных алертов',
      ],
    },
  ],
  uz: [
    {
      version: '0.1.5',
      items: [
        "Bo'limni o'chirish mumkin (xodimlar qoladi, faqat undan bog'lanishi yo'qoladi)",
        "Endi xodimlarni to'g'ridan-to'g'ri bo'lim kartochkasidan qo'shish mumkin",
        "Xodim avatariga bosh harflar o'rniga haqiqiy surat yuklash",
      ],
    },
    {
      version: '0.1.4',
      items: [
        "Modal oynalar endi forma ekranga sig'masa ham to'g'ri aylantiriladi",
        "Rahbar va o'rinbosarni tanlashda qidiruv — xodimlar ko'p bo'lsa qulay",
        "\"Rahbar\" ro'yxatida endi faqat bo'lim boshliqlari ko'rinadi, hammasi emas",
      ],
    },
    {
      version: '0.1.3',
      items: [
        "Bo'limlar: ro'yxat, yaratish, tahrirlash, rahbar tayinlash",
        "Bo'lim tanlanganda xodimning rahbari avtomatik qo'yiladi",
        "Shaxsiy ma'lumotlarni o'zgartirish so'rovlari: xodim so'raydi — administrator qo'llaydi, 24 soatga vaqtincha ruxsat beradi yoki rad etadi",
        "Ilova sarlavhasidagi bildirishnomalar endi haqiqiy, bo'sh o'rniga emas",
        "Xodim kabineti chiroyliroq bo'ldi — dekorativ banner qo'shildi",
      ],
    },
    {
      version: '0.1.2',
      items: [
        "Xodim kartochkasi: jadvaldagi qatorni bosish — surat, lavozim, rahbar, o'rinbosar, telefon",
        "\"Tahrirlash\" tugmasi va alohida \"Xodim kabineti\" sahifasi",
        "Lavozimlar — xodimni yaratish yoki tahrirlashda darhol qo'shish mumkin",
        "O'zbekiston formatiga mos avtomatik telefon niqobi",
        "Rahbar va o'rinbosarni qo'lda tayinlash imkoniyati",
        "Ilova sarlavhasida o'z kabinetiga o'tish tugmasi",
      ],
    },
    {
      version: '0.1.1',
      items: [
        "Fondagi logotip endi qotirilgan — sahifa aylantirilganda joyidan siljimaydi",
        "Tanlangan mavzu qurilmada saqlanadi (avval chiqishda standartga qaytardi)",
        "Yana 3 ta mavzu qo'shildi (jami 5 ta), tanlash — ochiladigan ro'yxat orqali",
        "Yorug' mavzu endi standart bo'lib belgilandi",
        "Modal oynalar kattalashtirildi, o'qish qulayroq bo'ldi",
        "Yangilanishlar tarixi endi interfeys tilida, faqat ruschada emas",
      ],
    },
    {
      version: '0.1.0',
      items: [
        'Ilovaning birinchi ishga tushishi va administrator yaratish (oflayn, serversiz)',
        'Login va parol bilan kirish, loginni qurilmada eslab qolish',
        'Shaxsiy kabinet: parolni almashtirish',
        "Qorong'i va yorug' mavzular",
        "Interfeys 3 tilda: rus, o'zbek (lotin va kirill)",
        "Xodimlar ro'yxati va yangi xodim qo'shish — birinchi ishlaydigan modul",
        "Tizim alertlari o'rniga yagona uslubdagi modal oynalar va bildirishnomalar",
      ],
    },
  ],
  'uz-cyrl': [
    {
      version: '0.1.5',
      items: [
        'Бўлимни ўчириш мумкин (ходимлар қолади, фақат ундан боғланиши йўқолади)',
        "Энди ходимларни тўғридан-тўғри бўлим карточкасидан қўшиш мумкин",
        "Ходим аватарига бош ҳарфлар ўрнига ҳақиқий сурат юклаш",
      ],
    },
    {
      version: '0.1.4',
      items: [
        'Модал ойналар энди форма экранга сиғмаса ҳам тўғри айлантирилади',
        'Раҳбар ва ўринбосарни танлашда қидирув — ходимлар кўп бўлса қулай',
        '"Раҳбар" рўйхатида энди фақат бўлим бошлиқлари кўринади, ҳаммаси эмас',
      ],
    },
    {
      version: '0.1.3',
      items: [
        'Бўлимлар: рўйхат, яратиш, таҳрирлаш, раҳбар тайинлаш',
        'Бўлим танланганда ходимнинг раҳбари автоматик қўйилади',
        'Шахсий маълумотларни ўзгартириш сўровлари: ходим сўрайди — администратор қўллайди, 24 соатга вақтинча рухсат беради ёки рад этади',
        'Илова сарлавҳасидаги билдиришномалар энди ҳақиқий, бўш ўрнига эмас',
        'Ходим кабинети чиройлироқ бўлди — декоратив баннер қўшилди',
      ],
    },
    {
      version: '0.1.2',
      items: [
        'Ходим карточкаси: жадвалдаги қаторни босиш — сурат, лавозим, раҳбар, ўринбосар, телефон',
        '"Таҳрирлаш" тугмаси ва алоҳида "Ходим кабинети" саҳифаси',
        'Лавозимлар — ходимни яратиш ёки таҳрирлашда дарҳол қўшиш мумкин',
        'Ўзбекистон форматига мос автоматик телефон ниқоби',
        'Раҳбар ва ўринбосарни қўлда тайинлаш имконияти',
        'Илова сарлавҳасида ўз кабинетига ўтиш тугмаси',
      ],
    },
    {
      version: '0.1.1',
      items: [
        'Фондаги логотип энди қотирилган — саҳифа айлантирилганда жойидан силжимайди',
        'Танланган мавзу қурилмада сақланади (аввал чиқишда стандартга қайтарарди)',
        'Яна 3 та мавзу қўшилди (жами 5 та), танлаш — очиладиган рўйхат орқали',
        'Ёруғ мавзу энди стандарт бўлиб белгиланди',
        'Модал ойналар катталаштирилди, ўқиш қулайроқ бўлди',
        'Янгиланишлар тарихи энди интерфейс тилида, фақат русчада эмас',
      ],
    },
    {
      version: '0.1.0',
      items: [
        'Илованинг биринчи ишга тушиши ва администратор яратиш (офлайн, серверсиз)',
        'Login ва парол билан кириш, логинни қурилмада эслаб қолиш',
        'Шахсий кабинет: паролни алмаштириш',
        'Қоронғи ва ёруғ мавзулар',
        'Интерфейс 3 тилда: рус, ўзбек (лотин ва кирилл)',
        'Ходимлар рўйхати ва янги ходим қўшиш — биринчи ишлайдиган модул',
        'Тизим алертлари ўрнига ягона услубдаги модал ойналар ва билдиришномалар',
      ],
    },
  ],
};
