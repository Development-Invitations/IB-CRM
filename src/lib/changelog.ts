import type { Locale } from './i18n';

// Версию тут держим в ручной синхронизации с package.json,
// src-tauri/Cargo.toml и src-tauri/tauri.conf.json — при следующем бампе
// версии поправить все четыре места.
export const APP_VERSION = '0.1.9';

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
      version: '0.1.9',
      items: [
        'Уведомление о заявке теперь исчезает у всех получателей сразу, как только кто-то её обработал',
      ],
    },
    {
      version: '0.1.8',
      items: [
        'Приложение теперь надёжно закрывается по крестику, без зависаний',
        'Уведомления о новых заявках приходят намного быстрее — обновляются сами каждые 10 секунд',
        'Из подразделения теперь можно убрать сотрудника, а не только добавить',
        'После загрузки обновления — красивое сообщение "Готово!" перед перезапуском',
      ],
    },
    {
      version: '0.1.7',
      items: [
        'Статусы "Отошёл на 15 мин / Обед / Отпуск / Отгул" — виден всем в списке, карточке и кабинете',
        'Заявки на отсутствие (5 типов, включая работу из дома) — доступно всем сотрудникам, согласование у руководителя, его заместителя или админа',
        'Отчёт по заявкам для админа с экспортом в Excel за месяц',
        'Подразделения: можно назначить заместителя, он автоматически становится сотрудником подразделения',
        'Роль "Руководитель/Заместитель подразделения" теперь видна прямо в карточке и кабинете сотрудника',
        'Рабочий график сотрудника (дни и часы работы)',
        'Отгул с отработкой — теперь можно указать сразу несколько дат/периодов отработки',
        'Прокрутка в формах и модальных окнах исправлена',
      ],
    },
    {
      version: '0.1.6',
      items: [
        'Кабинет сотрудника стал просторнее, поля разложены по сетке в 3 колонки',
        'Дата регистрации теперь видна в кабинете сотрудника',
        'Учёт входов и выходов: кто сейчас в сети, когда был в последний раз, история за последние дни',
        'Статус "в сети" теперь виден и в карточке сотрудника, и прямо в списке сотрудников',
      ],
    },
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
      version: '0.1.9',
      items: [
        "Ariza haqidagi bildirishnoma endi kimdir uni ko'rib chiqishi bilan barcha qabul qiluvchilarda darhol yo'qoladi",
      ],
    },
    {
      version: '0.1.8',
      items: [
        "Ilova endi krestik orqali ishonchli yopiladi, osilib qolmaydi",
        "Yangi arizalar haqida bildirishnomalar tezroq keladi — har 10 soniyada o'zi yangilanadi",
        "Endi xodimni bo'limdan olib tashlash ham mumkin, nafaqat qo'shish",
        "Yangilanish yuklab olingandan keyin — qayta ishga tushirishdan oldin chiroyli \"Tayyor!\" xabari",
      ],
    },
    {
      version: '0.1.7',
      items: [
        "\"15 daqiqaga chiqdi / Tushlik / Ta'til / Dam olish kuni\" holatlari — ro'yxatda, kartochkada va kabinetda hammaga ko'rinadi",
        "Yo'qlik arizalari (5 turi, jumladan uydan ishlash) — barcha xodimlarga ochiq, rahbar, uning o'rinbosari yoki administrator tomonidan tasdiqlanadi",
        "Administrator uchun arizalar bo'yicha oyiga Excelga eksport qilinadigan hisobot",
        "Bo'limlar: o'rinbosar tayinlash mumkin, u avtomatik ravishda shu bo'lim xodimiga aylanadi",
        "\"Bo'lim rahbari/o'rinbosari\" roli endi xodim kartochkasi va kabinetida ko'rinadi",
        'Xodimning ish jadvali (ish kunlari va soatlari)',
        "Ishlab beriladigan dam olish kuni — endi bir nechta sana/davr qo'shish mumkin",
        'Formalar va modal oynalardagi aylantirish tuzatildi',
      ],
    },
    {
      version: '0.1.6',
      items: [
        "Xodim kabineti kengroq bo'ldi, maydonlar 3 ustunli jadvalga joylashtirildi",
        "Ro'yxatdan o'tgan sana endi xodim kabinetida ko'rinadi",
        "Kirish va chiqishlar hisobi: hozir kim tizimda, oxirgi marta qachon bo'lgan, so'nggi kunlar tarixi",
        '"Tizimda" holati endi xodim kartochkasida va xodimlar ro\'yxatida ham ko\'rinadi',
      ],
    },
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
      version: '0.1.9',
      items: [
        'Ариза ҳақидаги билдиришнома энди кимдир уни кўриб чиқиши билан барча қабул қилувчиларда дарҳол йўқолади',
      ],
    },
    {
      version: '0.1.8',
      items: [
        'Илова энди крестик орқали ишончли ёпилади, осилиб қолмайди',
        "Янги аризалар ҳақида билдиришномалар тезроқ келади — ҳар 10 сонияда ўзи янгиланади",
        "Энди ходимни бўлимдан олиб ташлаш ҳам мумкин, нафақат қўшиш",
        'Янгиланиш юклаб олингандан кейин — қайта ишга туширишдан олдин чиройли "Тайёр!" хабари',
      ],
    },
    {
      version: '0.1.7',
      items: [
        '"15 дақиқага чиқди / Тушлик / Таътил / Дам олиш куни" ҳолатлари — рўйхатда, карточкада ва кабинетда ҳаммага кўринади',
        'Йўқлик аризалари (5 тури, жумладан уйдан ишлаш) — барча ходимларга очиқ, раҳбар, унинг ўринбосари ёки администратор томонидан тасдиқланади',
        'Администратор учун аризалар бўйича ойига Excelга экспорт қилинадиган ҳисобот',
        'Бўлимлар: ўринбосар тайинлаш мумкин, у автоматик равишда шу бўлим ходимига айланади',
        '"Бўлим раҳбари/ўринбосари" роли энди ходим карточкаси ва кабинетида кўринади',
        'Ходимнинг иш жадвали (иш кунлари ва соатлари)',
        'Ишлаб бериладиган дам олиш куни — энди бир нечта сана/давр қўшиш мумкин',
        'Формалар ва модал ойналардаги айлантириш тузатилди',
      ],
    },
    {
      version: '0.1.6',
      items: [
        'Ходим кабинети кенгроқ бўлди, майдонлар 3 устунли жадвалга жойлаштирилди',
        'Рўйхатдан ўтган сана энди ходим кабинетида кўринади',
        'Кириш ва чиқишлар ҳисоби: ҳозир ким тизимда, охирги марта қачон бўлган, сўнгги кунлар тарихи',
        '"Тизимда" ҳолати энди ходим карточкасида ва ходимлар рўйхатида ҳам кўринади',
      ],
    },
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
