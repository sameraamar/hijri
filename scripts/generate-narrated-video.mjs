import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const FFMPEG_PATH = ffmpegInstaller.path;

// Granular voice clips matched precisely to each user action & screen transition
const narrationClips = {
  en: {
    welcome: "Welcome to Hilal Day, an open-source Hijri calendar that connects every date to the Moon. Unlike a standard date converter, Hilal Day explains the astronomical reasoning behind each result, so you can understand it and compare methods.",
    critSwitch: "Compare established crescent-visibility criteria, including MABIMS and Yallop, from the calculation selector.",
    langSwitch: "The complete interface is available in multiple languages, including right-to-left layouts such as Arabic.",
    themeToggle: "Toggle between Dark and Light mode for comfortable day and night reading.",
    locationPick: "Choose a preset city or select a point on the map, because local Moon visibility depends on location.",
    footerDocs: "Explore comprehensive documentation and frequently asked questions in the footer.",
    todayIntro: "The Today view combines the Hijri date with the Moon at sunset.",
    todayStep: "Go to the Today tab to watch the Moon's altitude and position change across the sunset horizon, day by day, and understand the conditions behind today's result.",
    calendarView: "The calendar's month-start index compares the evenings around a Hijri boundary. Day by day, colors show the calculated status and month-start index, while the gold star marks the most likely first day. Select any day to explore the astronomical details behind the result.",
    holidaysView: "The Holidays view provides astronomical estimates for Islamic events, such as the beginning of Ramadan and Eid al-Fitr. Select any event to examine its candidate dates and calculation details, understand why each date is estimated, and add the event to your calendar.",
    mapView: "The global map explains how location affects the result by showing the Moon's altitude at sunset and, near a Hijri month boundary, where the crescent may be visible.",
    monthView: "The Monthly Moon View lets you compare daily illumination, Moon phases, elongation, and moonset lag across the lunar cycle, revealing why conditions change from day to day.",
    methodsView: "The Methods page explains the astronomical calculations and fiqh principles behind each moon-sighting standard.",
    aboutView: "Hilal Day goes beyond converting dates. It shows the evidence behind each result, helping you understand, compare, and explore the Hijri calendar with transparency."
  },
  ar: {
    welcome: "مرحبًا بكم في هلال داي، تقويم هجري مفتوح المصدر يربط كل تاريخ بالقمر. وعلى خلاف محوّل التاريخ التقليدي، يشرح هلال داي الأساس الفلكي لكل نتيجة، لتتمكنوا من فهمها ومقارنة الطرق.",
    critSwitch: "قارنوا معايير راسخة لرؤية الهلال، ومنها مابيمس ويالوب، من محدد طريقة الحساب.",
    langSwitch: "تتوفر الواجهة الكاملة بلغات متعددة، بما فيها اللغات ذات الاتجاه من اليمين إلى اليسار مثل العربية.",
    themeToggle: "التبديل بين الوضع الداكن والفاتح لقراءة مريحة ليلًا ونهارًا.",
    locationPick: "اختاروا مدينة جاهزة أو نقطة على الخريطة، لأن رؤية القمر المحلية تعتمد على الموقع.",
    footerDocs: "استكشفوا التوثيق الشامل والأسئلة الشائعة في تذييل الصفحة.",
    todayIntro: "يجمع عرض اليوم بين التاريخ الهجري وحالة القمر عند الغروب.",
    todayStep: "انتقلوا إلى تبويب اليوم لمتابعة تغيّر ارتفاع القمر وموقعه على أفق الغروب يومًا بعد يوم، وفهم الظروف التي تقف وراء نتيجة اليوم.",
    calendarView: "يقارن مؤشر بداية الشهر في التقويم بين الأمسيات المحيطة بحدود الشهر الهجري. تعرض الألوان يومًا بعد يوم الحالة المحسوبة ومؤشر بداية الشهر، وتحدد النجمة الذهبية اليوم الأول الأرجح. اختاروا أي يوم لاستكشاف التفاصيل الفلكية وراء النتيجة.",
    holidaysView: "يقدم عرض المناسبات تقديرات فلكية للأحداث الإسلامية، مثل بداية رمضان وعيد الفطر. اختاروا أي مناسبة لفحص تواريخها المحتملة وتفاصيل الحساب، وفهم سبب كل تقدير، وإضافتها إلى تقويمكم.",
    mapView: "تشرح الخريطة العالمية أثر الموقع في النتيجة، بعرض ارتفاع القمر عند الغروب، وقرب حدود الشهر الهجري، المناطق التي قد يُرى فيها الهلال.",
    monthView: "يتيح العرض الشهري للقمر مقارنة الإضاءة اليومية والأطوار والاستطالة وتأخر غروب القمر خلال الدورة القمرية، موضحًا سبب تغير الظروف من يوم لآخر.",
    methodsView: "تشرح صفحة الطرق الحسابات الفلكية والمبادئ الفقهية وراء كل معيار لرؤية الهلال.",
    aboutView: "هلال داي يتجاوز تحويل التواريخ. فهو يعرض الأدلة وراء كل نتيجة، ويساعدكم على فهم التقويم الهجري ومقارنته واستكشافه بشفافية."
  },
  tr: {
    welcome: "Her tarihi Ay ile ilişkilendiren açık kaynaklı Hicri takvim Hilal Day'e hoş geldiniz. Hilal Day, sıradan bir tarih dönüştürücünün aksine her sonucun astronomik gerekçesini açıklar; böylece sonucu anlayabilir ve yöntemleri karşılaştırabilirsiniz.",
    critSwitch: "Hesaplama seçicisinden MABIMS ve Yallop dahil yerleşik hilal görünürlük ölçütlerini karşılaştırın.",
    langSwitch: "Arayüzün tamamı, Arapça gibi sağdan sola yazılan diller dahil birçok dilde kullanılabilir.",
    themeToggle: "Gece ve gündüz rahat okuma için Karanlık ve Aydınlık modlar arasında geçiş yapın.",
    locationPick: "Hazır bir şehir seçin veya haritada bir nokta belirleyin; çünkü yerel Ay görünürlüğü konuma bağlıdır.",
    footerDocs: "Sayfa altındaki kapsamlı belgeleri ve sıkça sorulan soruları inceleyin.",
    todayIntro: "Bugün görünümü, Hicri tarihi gün batımındaki Ay verileriyle birleştirir.",
    todayStep: "Bugün sekmesinde Ay'ın yüksekliğinin ve konumunun gün batımı ufkunda her gün nasıl değiştiğini izleyin ve bugünkü sonucun arkasındaki koşulları anlayın.",
    calendarView: "Takvimin ay başlangıcı endeksi, Hicri ay sınırı çevresindeki akşamları karşılaştırır. Renkler her gün hesaplanan durumu ve endeksi gösterirken altın yıldız en olası ilk günü işaretler. Sonucun arkasındaki astronomik ayrıntıları görmek için bir gün seçin.",
    holidaysView: "Önemli Günler görünümü, Ramazan'ın başlangıcı ve Ramazan Bayramı gibi İslami olaylar için astronomik tahminler sunar. Olası tarihleri ve hesap ayrıntılarını inceleyin, tahminin nedenini anlayın ve etkinliği takviminize ekleyin.",
    mapView: "Küresel harita, gün batımında Ay yüksekliğini ve Hicri ay sınırı yakınında hilalin görülebileceği bölgeleri göstererek konumun sonucu nasıl etkilediğini açıklar.",
    monthView: "Aylık Ay Görünümü, Ay döngüsü boyunca günlük aydınlanmayı, evreleri, uzanımı ve Ay'ın batış gecikmesini karşılaştırarak koşulların neden değiştiğini gösterir.",
    methodsView: "Yöntemler sayfası, her hilal gözlem standardının arkasındaki astronomik hesaplamaları ve fıkhi ilkeleri açıklar.",
    aboutView: "Hilal Day yalnızca tarih dönüştürmez. Her sonucun kanıtını göstererek Hicri takvimi şeffaf biçimde anlamanıza, karşılaştırmanıza ve keşfetmenize yardımcı olur."
  },
  fr: {
    welcome: "Bienvenue sur Hilal Day, un calendrier hégirien open source qui relie chaque date à la Lune. Contrairement à un simple convertisseur de dates, Hilal Day explique le raisonnement astronomique derrière chaque résultat, afin de le comprendre et de comparer les méthodes.",
    critSwitch: "Comparez des critères reconnus de visibilité du croissant, notamment MABIMS et Yallop, depuis le sélecteur de calcul.",
    langSwitch: "L'interface complète est disponible en plusieurs langues, y compris celles qui s'écrivent de droite à gauche, comme l'arabe.",
    themeToggle: "Alternez entre le mode sombre et clair pour une lecture confortable de jour comme de nuit.",
    locationPick: "Choisissez une ville prédéfinie ou un point sur la carte, car la visibilité locale de la Lune dépend du lieu.",
    footerDocs: "Consultez la documentation complète et la foire aux questions dans le pied de page.",
    todayIntro: "La vue Aujourd'hui associe la date hégirienne à la Lune au coucher du Soleil.",
    todayStep: "Dans l'onglet Aujourd'hui, observez jour après jour l'altitude et la position de la Lune sur l'horizon au coucher du Soleil, et comprenez les conditions qui expliquent le résultat du jour.",
    calendarView: "L'indice de début de mois du calendrier compare les soirées autour d'une limite hégirienne. Jour après jour, les couleurs indiquent le statut calculé et l'indice, tandis que l'étoile dorée marque le premier jour le plus probable. Sélectionnez un jour pour explorer les détails astronomiques du résultat.",
    holidaysView: "La vue Fêtes fournit des estimations astronomiques pour les événements islamiques, comme le début du Ramadan et l'Aïd el-Fitr. Examinez les dates possibles et les calculs, comprenez pourquoi chaque date est estimée, puis ajoutez l'événement à votre calendrier.",
    mapView: "La carte mondiale explique l'effet du lieu sur le résultat en affichant l'altitude de la Lune au coucher du Soleil et, près d'une limite de mois hégirien, les régions où le croissant peut être visible.",
    monthView: "La vue mensuelle compare l'illumination quotidienne, les phases, l'élongation et le retard du coucher de la Lune au fil du cycle lunaire, révélant pourquoi les conditions changent chaque jour.",
    methodsView: "La page Méthodes explique les calculs astronomiques et les principes du fiqh derrière chaque norme d'observation du croissant.",
    aboutView: "Hilal Day va au-delà de la conversion des dates. Il présente les preuves derrière chaque résultat pour vous aider à comprendre, comparer et explorer le calendrier hégirien en toute transparence."
  },
  id: {
    welcome: "Selamat datang di Hilal Day, kalender Hijriah sumber terbuka yang menghubungkan setiap tanggal dengan Bulan. Tidak seperti konverter tanggal biasa, Hilal Day menjelaskan alasan astronomis di balik setiap hasil agar Anda dapat memahaminya dan membandingkan metode.",
    critSwitch: "Bandingkan kriteria visibilitas hilal yang mapan, termasuk MABIMS dan Yallop, melalui pemilih perhitungan.",
    langSwitch: "Seluruh antarmuka tersedia dalam berbagai bahasa, termasuk tata letak kanan ke kiri seperti bahasa Arab.",
    themeToggle: "Pilih mode Gelap atau Terang untuk kenyamanan membaca siang dan malam.",
    locationPick: "Pilih kota yang tersedia atau tentukan titik pada peta, karena visibilitas Bulan setempat bergantung pada lokasi.",
    footerDocs: "Jelajahi dokumentasi lengkap dan tanya jawab di bagian footer.",
    todayIntro: "Tampilan Hari Ini menggabungkan tanggal Hijriah dengan keadaan Bulan saat matahari terbenam.",
    todayStep: "Buka tab Hari Ini untuk melihat perubahan ketinggian dan posisi Bulan di cakrawala senja dari hari ke hari, serta memahami kondisi di balik hasil hari ini.",
    calendarView: "Indeks awal bulan pada kalender membandingkan malam-malam di sekitar batas bulan Hijriah. Warna menunjukkan status dan indeks hasil perhitungan setiap hari, sedangkan bintang emas menandai hari pertama yang paling mungkin. Pilih hari mana pun untuk melihat rincian astronomis di balik hasilnya.",
    holidaysView: "Tampilan Hari Raya memberikan perkiraan astronomis untuk peristiwa Islam, seperti awal Ramadan dan Idul Fitri. Periksa tanggal kandidat dan rincian perhitungannya, pahami alasan setiap perkiraan, lalu tambahkan peristiwa ke kalender Anda.",
    mapView: "Peta global menjelaskan pengaruh lokasi dengan menampilkan ketinggian Bulan saat matahari terbenam dan, di dekat batas bulan Hijriah, wilayah tempat hilal mungkin terlihat.",
    monthView: "Tampilan Bulan Bulanan membandingkan iluminasi harian, fase Bulan, elongasi, dan jeda terbenam sepanjang siklus lunar, sehingga terlihat mengapa kondisi berubah dari hari ke hari.",
    methodsView: "Halaman Metode menjelaskan perhitungan astronomis dan prinsip fikih di balik setiap standar rukyat hilal.",
    aboutView: "Hilal Day lebih dari sekadar mengonversi tanggal. Situs ini menunjukkan bukti di balik setiap hasil agar Anda dapat memahami, membandingkan, dan menjelajahi kalender Hijriah secara transparan."
  },
  ur: {
    welcome: "ہلال ڈے میں خوش آمدید، ایک اوپن سورس ہجری کیلنڈر جو ہر تاریخ کو چاند سے جوڑتا ہے۔ عام تاریخ کنورٹر کے برعکس، ہلال ڈے ہر نتیجے کے پیچھے فلکیاتی وجہ بیان کرتا ہے، تاکہ آپ اسے سمجھ سکیں اور طریقوں کا موازنہ کر سکیں۔",
    critSwitch: "حساب کے انتخاب سے مابیمز اور یالوب سمیت مستند ہلالی رؤیت کے معیارات کا موازنہ کریں۔",
    langSwitch: "مکمل انٹرفیس کئی زبانوں میں دستیاب ہے، جن میں عربی جیسی دائیں سے بائیں لکھی جانے والی زبانیں بھی شامل ہیں۔",
    themeToggle: "دن اور رات کے بہترین مطالعے کے لیے ڈارک اور لائٹ موڈ کا انتخاب کریں۔",
    locationPick: "تیار شہر منتخب کریں یا نقشے پر کوئی مقام چنیں، کیونکہ مقامی چاند کی رؤیت جگہ پر منحصر ہوتی ہے۔",
    footerDocs: "صفحے کے نیچے دی گئی جامع دستاویزات اور عمومی سوالات دیکھیں۔",
    todayIntro: "آج کا منظر ہجری تاریخ کو غروبِ آفتاب کے وقت چاند کی حالت کے ساتھ پیش کرتا ہے۔",
    todayStep: "آج کے ٹیب میں دن بہ دن غروب کے افق پر چاند کی بلندی اور مقام کی تبدیلی دیکھیں، اور آج کے نتیجے کے پیچھے حالات کو سمجھیں۔",
    calendarView: "کیلنڈر کا ماہ آغاز اشاریہ ہجری مہینے کی حد کے آس پاس کی شاموں کا موازنہ کرتا ہے۔ ہر دن رنگ حساب شدہ حالت اور اشاریہ دکھاتے ہیں، جبکہ سنہری ستارہ سب سے ممکنہ پہلے دن کو نشان زد کرتا ہے۔ نتیجے کے فلکیاتی حقائق جاننے کے لیے کوئی دن منتخب کریں۔",
    holidaysView: "تہواروں کا منظر رمضان کے آغاز اور عید الفطر جیسے اسلامی مواقع کے فلکیاتی تخمینے دیتا ہے۔ ممکنہ تاریخیں اور حسابی تفصیل دیکھیں، ہر تخمینے کی وجہ سمجھیں، اور موقع کو اپنے کیلنڈر میں شامل کریں۔",
    mapView: "عالمی نقشہ غروب کے وقت چاند کی بلندی اور ہجری مہینے کی حد کے قریب ہلال نظر آنے کے ممکنہ علاقوں کو دکھا کر سمجھاتا ہے کہ مقام نتیجے پر کیسے اثر انداز ہوتا ہے۔",
    monthView: "ماہانہ چاند کا منظر قمری دور میں روزانہ روشنی، مراحل، استطالہ اور چاند کے غروب میں تاخیر کا موازنہ کرتا ہے، اور بتاتا ہے کہ حالات روز کیوں بدلتے ہیں۔",
    methodsView: "طریقہ کار کا صفحہ ہر ہلالی رؤیت کے معیار کے پیچھے فلکیاتی حسابات اور فقہی اصول بیان کرتا ہے۔",
    aboutView: "ہلال ڈے صرف تاریخیں تبدیل نہیں کرتا۔ یہ ہر نتیجے کے پیچھے ثبوت دکھاتا ہے، تاکہ آپ ہجری کیلنڈر کو شفافیت کے ساتھ سمجھیں، موازنہ کریں اور دریافت کریں۔"
  }
};

const bannerCaptions = {
  en: {
    introTitle: "WELCOME TO hilal.day",
    introDesc: "More than dates: understand and compare the astronomical reasoning behind every result.",
    useCase0Title: "FAST OVERVIEW: CONTROLS, LOCATION & FOOTER",
    useCase0Desc: "Select calculation criteria, languages, Dark/Light mode, pick custom or preset global locations on the map, and explore footer docs & FAQ.",
    useCase1Title: "USE CASE 1: TODAY'S DATE & MOON MOVEMENT AT SUNSET",
    useCase1Desc: "Watch the Moon change day by day—and understand the conditions behind today's result.",
    useCase2Title: "USE CASE 2: UNDERSTAND HOW HIJRI MONTHS START",
    useCase2Desc: "Compare each day's month-start index and calculated status; ★ marks the most likely first day.",
    useCase3Title: "USE CASE 3: EXPLORE ISLAMIC EVENT ESTIMATES",
    useCase3Desc: "Explore each estimate and its reasoning, then add the event to your calendar.",
    useCase4Title: "USE CASE 4: GLOBAL MOON STATE AT SUNSET",
    useCase4Desc: "See how location changes Moon altitude, crescent visibility, and the resulting interpretation.",
    useCase5Title: "USE CASE 5: DETAILED MOON PHASES & METRICS (MONTHLY VIEW)",
    useCase5Desc: "Compare daily Moon metrics and understand why observing conditions change across the lunar cycle.",
    useCase6Title: "USE CASE 6: SCHOLARLY CRITERIA & METHODOLOGY",
    useCase6Desc: "Learn the astronomical and fiqh foundations behind moon sighting methods.",
    aboutTitle: "ABOUT hilal.day — FREE & OPEN-SOURCE",
    aboutDesc: "See the evidence. Understand the result. Compare with transparency."
  },
  ar: {
    introTitle: "مرحبًا بكم في hilal.day",
    introDesc: "أكثر من تواريخ: افهم وقارن الأساس الفلكي وراء كل نتيجة.",
    useCase0Title: "نظرة سريعة: التحكم والموقع والتوثيق",
    useCase0Desc: "اختر معايير الحساب واللغات والوضع الليلي، وحدد الموقع من الخريطة واستكشف الأسئلة الشائعة.",
    useCase1Title: "حالة الاستخدام 1: تاريخ اليوم وحركة القمر عند الغروب",
    useCase1Desc: "راقب تغيّر القمر يومًا بعد يوم، وافهم الظروف وراء نتيجة اليوم.",
    useCase2Title: "حالة الاستخدام 2: فهم كيف تبدأ الأشهر الهجرية",
    useCase2Desc: "افحص إشارات بداية الشهر والشارات الملونة والنجمة (★) التي تشير إلى اليوم الأرجح.",
    useCase3Title: "حالة الاستخدام 3: مواعيد رمضان والعيد وتصدير التقويم",
    useCase3Desc: "استكشف 1 شوال (عيد الفطر) و1 رمضان وتصدير المواعيد لتقويمك.",
    useCase4Title: "حالة الاستخدام 4: حالة القمر العالمية عند الغروب",
    useCase4Desc: "شاهد كيف يغيّر الموقع ارتفاع القمر ورؤية الهلال وتفسير النتيجة.",
    useCase5Title: "حالة الاستخدام 5: أطوار القمر والتفاصيل الشهرية",
    useCase5Desc: "عرض نسب إضاءة القمر وأطواره والاستطالة وفارق الغروب طوال الشهر.",
    useCase6Title: "حالة الاستخدام 6: المعايير العلمية والمنهجية",
    useCase6Desc: "تعرف على الأسس الفلكية والفقهية لمعايير رؤية الهلال.",
    aboutTitle: "عن hilal.day — مجاني ومفتوح المصدر",
    aboutDesc: "شاهد الدليل. افهم النتيجة. قارن بشفافية."
  },
  tr: {
    introTitle: "hilal.day'e HOŞ GELDİNİZ",
    introDesc: "Tarihlerden fazlası: her sonucun astronomik gerekçesini anlayın ve karşılaştırın.",
    useCase0Title: "GENEL BAKIŞ: KONTROLLER, KONUM VE BELGELER",
    useCase0Desc: "Hesaplama kriterlerini, dilleri, Gece/Gündüz modunu ve haritadan konumu seçin.",
    useCase1Title: "KULLANIM 1: BUGÜNÜN TARİHİ VE GÜN BATIMINDA AY",
    useCase1Desc: "Ay'ın her gün nasıl değiştiğini izleyin ve bugünkü sonucun koşullarını anlayın.",
    useCase2Title: "KULLANIM 2: HİCRİ AYLARIN BAŞLANGICINI ANLAMA",
    useCase2Desc: "Ay başlangıç sinyallerini, renkli rozetleri ve yıldızı (★) inceleyin.",
    useCase3Title: "KULLANIM 3: RAMAZAN VE BAYRAM TARİHLERİ",
    useCase3Desc: "1 Şevval (Ramazan Bayramı) ve 1 Ramazan tahminlerini görüp takvime ekleyin.",
    useCase4Title: "KULLANIM 4: GÜN BATIMINDA KÜRESEL AY DURUMU",
    useCase4Desc: "Konumun Ay yüksekliğini, hilal görünürlüğünü ve yorumu nasıl değiştirdiğini görün.",
    useCase5Title: "KULLANIM 5: AY EVRELERİ VE AYLIK DETAYLAR",
    useCase5Desc: "Aylık Ay aydınlanması, evre simgeleri, uzanım ve batış gecikmesi.",
    useCase6Title: "KULLANIM 6: KRİTERLER VE BİLİMSEL METODOLOJİ",
    useCase6Desc: "Hilal gözlem yöntemlerinin arkasındaki astronomik ve fıkhi temeller.",
    aboutTitle: "HAKKINDA: hilal.day — ÜCRETSİZ VE AÇIK KAYNAK",
    aboutDesc: "Kanıtı görün. Sonucu anlayın. Şeffaflıkla karşılaştırın."
  },
  fr: {
    introTitle: "BIENVENUE SUR hilal.day",
    introDesc: "Plus que des dates : comprenez et comparez le raisonnement astronomique de chaque résultat.",
    useCase0Title: "APERÇU : CONTRÔLES, LOCALISATION ET FAQ",
    useCase0Desc: "Sélectionnez les critères, les langues, le mode sombre et votre position sur la carte.",
    useCase1Title: "CAS 1 : DATE DU JOUR ET DÉPLACEMENT DE LA LUNE",
    useCase1Desc: "Observez la Lune évoluer chaque jour et comprenez les conditions du résultat actuel.",
    useCase2Title: "CAS 2 : COMPRENDRE LE DÉBUT DES MOIS HÉGIRIENS",
    useCase2Desc: "Analysez les signaux de début de mois, les badges de couleur et l'étoile (★).",
    useCase3Title: "CAS 3 : DATES DE RAMADAN ET DE L'AÏD AVEC EXPORT",
    useCase3Desc: "Examinez le 1er Chawwal (Aïd al-Fitr) et le 1er Ramadan et exportez les dates.",
    useCase4Title: "CAS 4 : ÉTAT MONDIAL DE LA LUNE AU COUCHER DU SOLEIL",
    useCase4Desc: "Voyez comment le lieu modifie l'altitude, la visibilité du croissant et l'interprétation.",
    useCase5Title: "CAS 5 : PHASES DE LA LUNE ET VUE MENSUELLE",
    useCase5Desc: "Consultez l'illumination quotidienne, les phases, l'élongation et le coucher lunaire.",
    useCase6Title: "CAS 6 : CRITÈRES ET MÉTHODOLOGIE SCIENTIFIQUE",
    useCase6Desc: "Découvrez les bases astronomiques et juridiques de l'observation lunaire.",
    aboutTitle: "À PROPOS DE hilal.day — LIBRE ET OPEN-SOURCE",
    aboutDesc: "Voyez les preuves. Comprenez le résultat. Comparez en toute transparence."
  },
  id: {
    introTitle: "SELAMAT DATANG DI hilal.day",
    introDesc: "Lebih dari tanggal: pahami dan bandingkan alasan astronomis di balik setiap hasil.",
    useCase0Title: "RINGKASAN: KONTROL, LOKASI & DOKUMENTASI",
    useCase0Desc: "Pilih kriteria hisab, bahasa, mode Gelap/Terang, dan pilih lokasi pada peta dunia.",
    useCase1Title: "KASUS 1: TANGGAL HARI INI & PERGERAKAN BULAN SAAT SUNSET",
    useCase1Desc: "Amati perubahan Bulan setiap hari dan pahami kondisi di balik hasil hari ini.",
    useCase2Title: "KASUS 2: MEMAHAMI AWAL BULAN HIJRIAH",
    useCase2Desc: "Periksa sinyal awal bulan, lencana probabilitas, dan bintang (★) penanda hari ke-1.",
    useCase3Title: "KASUS 3: TANGGAL RAMADAN & IDUL FITRI SERTA EKSPOR",
    useCase3Desc: "Pelajari estimasi 1 Syawal (Idul Fitri) dan 1 Ramadan serta ekspor ke kalender.",
    useCase4Title: "KASUS 4: KONDISI BULAN GLOBAL SAAT MATAHARI TERBENAM",
    useCase4Desc: "Lihat pengaruh lokasi terhadap ketinggian Bulan, visibilitas hilal, dan interpretasi.",
    useCase5Title: "KASUS 5: DETAIL FASE BULAN & METRIK BULANAN",
    useCase5Desc: "Akses persentase iluminasi harian, ikon fase, elongasi, dan jeda terbenam.",
    useCase6Title: "KASUS 6: KRITERIA HISAB & METODOLOGI ILMIAH",
    useCase6Desc: "Pelajari dasar-dasar astronomis dan fikih di balik standar rukyat hilal.",
    aboutTitle: "TENTANG hilal.day — GRATIS & SUMBER TERBUKA",
    aboutDesc: "Lihat buktinya. Pahami hasilnya. Bandingkan secara transparan."
  },
  ur: {
    introTitle: "hilal.day میں خوش آمدید",
    introDesc: "تاریخوں سے بڑھ کر: ہر نتیجے کی فلکیاتی وجہ سمجھیں اور موازنہ کریں۔",
    useCase0Title: "فوری جائزہ: کنٹرولز، مقام اور دستاویزات",
    useCase0Desc: "حسابی معیار، زبانیں، ڈارک موڈ منتخب کریں اور نقشے پر مقام کا تعین کریں۔",
    useCase1Title: "کیس 1: آج کی تاریخ اور غروب کے وقت چاند کی حرکت",
    useCase1Desc: "چاند کی روزانہ تبدیلی دیکھیں اور آج کے نتیجے کے حالات سمجھیں۔",
    useCase2Title: "کیس 2: نئے ہجری مہینے کے آغاز کو سمجھیں",
    useCase2Desc: "مہینے کے آغاز کے اشارے، رنگین بیجز اور ستارہ (★) دیکھیں۔",
    useCase3Title: "کیس 3: رمضان اور عید الفطر کی تاریخیں",
    useCase3Desc: "یکم شوال (عید الفطر) اور یکم رمضان کے فلکیاتی تخمینے اور کیلنڈر برآمد۔",
    useCase4Title: "کیس 4: غروب کے وقت عالمی چاند کی حالت",
    useCase4Desc: "دیکھیں کہ مقام چاند کی بلندی، ہلال کی رؤیت اور نتیجے کی تشریح کو کیسے بدلتا ہے۔",
    useCase5Title: "کیس 5: ماہانہ چاند کے مراحل اور تفصیلات",
    useCase5Desc: "روزانہ چاند کی روشنی، مراحل، زاویہ اور غروب کا وقفہ دیکھیں۔",
    useCase6Title: "کیس 6: علمی معیارات اور طریقہ کار",
    useCase6Desc: "رؤیت ہلال کے سائنسی اور فقہی اصولوں کو جانیں۔",
    aboutTitle: "تعارف: hilal.day — مفت اور اوپن سورس",
    aboutDesc: "ثبوت دیکھیں۔ نتیجہ سمجھیں۔ شفافیت کے ساتھ موازنہ کریں۔"
  }
};

function generateAudioClip(text, lang, outPath) {
  const pythonCmd = `python scripts/tts_gen.py "${text.replace(/"/g, '\\"')}" ${lang} "${outPath}"`;
  execSync(pythonCmd, { stdio: 'inherit' });
}

function audioDurationMs(filePath) {
  const probe = spawnSync(FFMPEG_PATH, ['-hide_banner', '-i', filePath, '-f', 'null', '-'], {
    encoding: 'utf8'
  });
  const output = `${probe.stdout || ''}\n${probe.stderr || ''}`;
  const match = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (match) {
    return Math.ceil((Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])) * 1000);
  }
  throw new Error(`Unable to determine narration duration: ${filePath}`);
}

function runFfmpeg(args) {
  const result = spawnSync(FFMPEG_PATH, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`FFmpeg exited with status ${result.status}`);
  }
}

async function recordLanguageDemo(lang = 'en') {
  const banner = bannerCaptions[lang] || bannerCaptions.en;
  const clipsMap = narrationClips[lang] || narrationClips.en;
  const prefix = lang === 'en' ? '' : `/${lang}`;

  const tempAudioDir = path.resolve('temp_audio', lang);
  if (!fs.existsSync(tempAudioDir)) {
    fs.mkdirSync(tempAudioDir, { recursive: true });
  }

  const outputDir = path.resolve('recordings');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const langDir = path.join(outputDir, lang);
  if (!fs.existsSync(langDir)) {
    fs.mkdirSync(langDir, { recursive: true });
  }

  // Also ensure web public videos directory exists for direct site serving
  const publicVideoDir = path.resolve('apps/web/public/videos', lang);
  if (!fs.existsSync(publicVideoDir)) {
    fs.mkdirSync(publicVideoDir, { recursive: true });
  }

  console.log(`\nGenerating synchronized natural voice clips for [${lang.toUpperCase()}]...`);
  const clips = {};
  const clipDurations = {};
  for (const [key, text] of Object.entries(clipsMap)) {
    clips[key] = path.join(tempAudioDir, `${key}.mp3`);
    generateAudioClip(text, lang, clips[key]);
    clipDurations[key] = audioDurationMs(clips[key]);
  }

  const timeline = [];

  console.log(`\n========================================`);
  console.log(`Starting video recording with action-matched narration: [${lang.toUpperCase()}]`);
  console.log(`========================================`);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--window-size=1920,1080', '--no-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: outputDir,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();
  const currentVideo = page.video();
  const startTime = Date.now();
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function markAudio(clipKey) {
    const elapsedSec = (Date.now() - startTime) / 1000;
    timeline.push({ key: clipKey, file: clips[clipKey], at: elapsedSec });
    console.log(`[Audio Cue] "${clipKey}" at ${elapsedSec.toFixed(2)}s`);
  }

  async function injectVisualHelpers() {
    await page.evaluate(() => {
      // Enlarge the application inside the 1080p recording so controls and clicked details
      // stay readable. Helpers are appended outside #root and remain unscaled, keeping the
      // presentation banner and synthetic pointer aligned with Playwright coordinates.
      let layoutStyle = document.getElementById('pw-presentation-layout');
      if (!layoutStyle) {
        layoutStyle = document.createElement('style');
        layoutStyle.id = 'pw-presentation-layout';
        layoutStyle.textContent = '#root { zoom: 1.25; } #root .max-w-6xl { max-width: 80rem !important; }';
        document.head.appendChild(layoutStyle);
      }

      // 1. Sleek Framed Border Outline
      let border = document.getElementById('pw-viewport-border');
      if (!border) {
        border = document.createElement('div');
        border.id = 'pw-viewport-border';
        border.style.position = 'fixed';
        border.style.top = '0';
        border.style.left = '0';
        border.style.width = '100vw';
        border.style.height = '100vh';
        border.style.border = '2px solid rgba(251, 191, 36, 0.4)';
        border.style.boxShadow = 'inset 0 0 25px rgba(251, 191, 36, 0.1)';
        border.style.pointerEvents = 'none';
        border.style.zIndex = '99999999';
        document.body.appendChild(border);
      }

      // 2. High-Visibility Smooth Gliding Mouse Cursor
      let pointer = document.getElementById('pw-mouse-pointer');
      if (!pointer) {
        pointer = document.createElement('div');
        pointer.id = 'pw-mouse-pointer';
        pointer.style.position = 'fixed';
        pointer.style.top = '0';
        pointer.style.left = '0';
        pointer.style.width = '24px';
        pointer.style.height = '24px';
        pointer.style.pointerEvents = 'none';
        pointer.style.zIndex = '999999999';
        pointer.style.transform = 'translate(-2px, -2px)';
        pointer.style.transition = 'left 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
        pointer.innerHTML = `
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 6px rgba(0,0,0,0.8));">
            <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L6.35 2.85a.5.5 0 0 0-.85.36z" fill="#f59e0b" stroke="#ffffff" stroke-width="1.8"/>
          </svg>
        `;
        document.body.appendChild(pointer);
      }

      // 3. Click Ripple Effect
      window.__showClickRipple = (x, y) => {
        const ripple = document.createElement('div');
        ripple.style.position = 'fixed';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        ripple.style.width = '10px';
        ripple.style.height = '10px';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'rgba(245, 158, 11, 0.6)';
        ripple.style.transform = 'translate(-50%, -50%) scale(1)';
        ripple.style.boxShadow = '0 0 16px rgba(245, 158, 11, 0.8)';
        ripple.style.pointerEvents = 'none';
        ripple.style.zIndex = '99999998';
        ripple.style.transition = 'all 0.5s ease-out';
        document.body.appendChild(ripple);

        requestAnimationFrame(() => {
          ripple.style.transform = 'translate(-50%, -50%) scale(5)';
          ripple.style.opacity = '0';
        });

        setTimeout(() => ripple.remove(), 600);
      };

      // 4. Floating Presentation Banner
      let banner = document.getElementById('pw-usecase-banner');
      if (banner) banner.remove();

      banner = document.createElement('div');
      banner.id = 'pw-usecase-banner';
      banner.style.position = 'fixed';
      banner.style.bottom = '36px';
      banner.style.left = '50%';
      banner.style.transform = 'translateX(-50%) translateY(20px)';
      banner.style.zIndex = '9999999';
      banner.style.background = 'rgba(15, 23, 42, 0.94)';
      banner.style.backdropFilter = 'blur(16px)';
      banner.style.border = '1.5px solid rgba(251, 191, 36, 0.6)';
      banner.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 25px rgba(251, 191, 36, 0.25)';
      banner.style.borderRadius = '16px';
      banner.style.padding = '16px 28px';
      banner.style.color = '#ffffff';
      banner.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      banner.style.display = 'flex';
      banner.style.alignItems = 'center';
      banner.style.gap = '20px';
      banner.style.maxWidth = '1100px';
      banner.style.width = 'max-content';
      banner.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      banner.style.opacity = '0';

      banner.innerHTML = `
        <span id="pw-banner-icon" style="font-size: 38px; line-height: 1; display: flex; align-items: center;">🌙</span>
        <div style="display: flex; flex-direction: column; gap: 4px; text-align: left;">
          <div id="pw-banner-title" style="font-size: 21px; font-weight: 800; color: #fbbf24; letter-spacing: 0.03em;">USE CASE</div>
          <div id="pw-banner-desc" style="font-size: 16px; font-weight: 500; color: #f1f5f9; line-height: 1.4;">Description text</div>
        </div>
      `;
      document.body.appendChild(banner);

      window.__setCaption = (icon, title, desc, position = 'bottom') => {
        const b = document.getElementById('pw-usecase-banner');
        const bIcon = document.getElementById('pw-banner-icon');
        const bTitle = document.getElementById('pw-banner-title');
        const bDesc = document.getElementById('pw-banner-desc');
        if (!b) return;
        bIcon.textContent = icon;
        bTitle.textContent = title;
        bDesc.textContent = desc;

        if (position === 'top') {
          b.style.bottom = 'auto';
          b.style.top = '36px';
        } else {
          b.style.top = 'auto';
          b.style.bottom = '36px';
        }

        b.style.opacity = '1';
        b.style.transform = 'translateX(-50%) translateY(0)';
      };

      window.__movePointer = (x, y) => {
        const p = document.getElementById('pw-mouse-pointer');
        if (p) {
          p.style.left = `${x}px`;
          p.style.top = `${y}px`;
        }
      };
    });
  }

  async function visualClick(selector, options = {}) {
    const loc = typeof selector === 'string' ? page.locator(selector).first() : selector;
    await loc.scrollIntoViewIfNeeded();
    await wait(150);

    const box = await loc.boundingBox();
    if (box) {
      const targetX = box.x + box.width / 2;
      const targetY = box.y + box.height / 2;
      await page.evaluate(({ x, y }) => window.__movePointer(x, y), { x: targetX, y: targetY });
      await wait(options.preClickDelay ?? 350);
      await page.evaluate(({ x, y }) => window.__showClickRipple(x, y), { x: targetX, y: targetY });
    }

    await loc.click({ force: true });
    await wait(options.postClickDelay ?? 500);
  }

  async function showCaption(icon, title, desc, holdMs = 2500, position = 'bottom') {
    await page.evaluate(({ icon, title, desc, position }) => window.__setCaption(icon, title, desc, position), { icon, title, desc, position });
    await wait(holdMs);
  }

  async function runNarrated(clipKey, caption, action, { pauseAfter = 650, minMs = 0 } = {}) {
    if (caption) {
      await page.evaluate(
        ({ icon, title, desc, position }) => window.__setCaption(icon, title, desc, position),
        caption
      );
    }
    const cueStarted = Date.now();
    markAudio(clipKey);
    await action();
    const elapsed = Date.now() - cueStarted;
    const required = Math.max(clipDurations[clipKey] + pauseAfter, minMs);
    if (elapsed < required) await wait(required - elapsed);
  }

  async function waitForVisibilityMap() {
    await page.waitForFunction(
      () => document.querySelectorAll('.leaflet-overlay-pane path.leaflet-interactive').length > 0,
      undefined,
      { timeout: 15000 }
    );
    await wait(500);
  }

  async function navigateReady(url, readySelector, { first = false } = {}) {
    if (first) {
      await page.goto(url, { waitUntil: 'networkidle' });
    } else {
      const snapshot = (await page.screenshot({ type: 'jpeg', quality: 82 })).toString('base64');
      const target = new URL(url);
      await page.evaluate(async ({ dataUrl, href }) => {
        const transition = document.createElement('div');
        transition.id = 'pw-page-transition';
        const image = document.createElement('img');
        image.src = dataUrl;
        image.alt = '';
        Object.assign(image.style, { width: '100%', height: '100%', objectFit: 'cover' });
        transition.appendChild(image);
        Object.assign(transition.style, {
          position: 'fixed', inset: '0', zIndex: '2147483647', background: '#fff',
          opacity: '1', transition: 'opacity 180ms ease'
        });
        document.body.appendChild(transition);
        await image.decode();
        history.pushState({}, '', href);
        dispatchEvent(new PopStateEvent('popstate'));
      }, { dataUrl: `data:image/jpeg;base64,${snapshot}`, href: `${target.pathname}${target.search}` });
      await page.waitForFunction((pathname) => location.pathname === pathname, target.pathname);
      await wait(350);
    }

    await page.waitForSelector(readySelector, { state: 'visible', timeout: 15000 });
    await page.waitForFunction(
      () => !Array.from(document.querySelectorAll('.animate-pulse')).some((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      }),
      undefined,
      { timeout: 15000 }
    );
    await wait(250);
    await page.evaluate(() => {
      const transition = document.getElementById('pw-page-transition');
      if (transition) {
        transition.style.opacity = '0';
        setTimeout(() => transition.remove(), 250);
      }
    });
    await wait(280);
  }

  try {
    // Welcome
    console.log(`[${lang}] Welcome...`);
    await navigateReady(`http://localhost:5173${prefix}/today`, 'input[type="date"]', { first: true });
    const todayDateInput = page.locator('input[type="date"]').first();
    await injectVisualHelpers();

    await runNarrated('welcome', {
      icon: '🌙', title: banner.introTitle, desc: banner.introDesc, position: 'bottom'
    }, async () => {}, { minMs: 3800, pauseAfter: 800 });

    // Fast overview — one meaningful action per global control.
    console.log(`[${lang}] Fast overview: settings and location...`);
    const methodSelect = page.locator('header select').filter({ has: page.locator('option[value="mabims"]') }).first();
    await runNarrated('critSwitch', {
      icon: '⚙️', title: banner.useCase0Title, desc: 'Compare MABIMS and Yallop crescent-visibility criteria.', position: 'bottom'
    }, async () => {
      await visualClick(methodSelect, { postClickDelay: 250 });
      await methodSelect.selectOption('mabims');
      await wait(1000);
      await methodSelect.selectOption('yallop');
      await wait(1000);
    }, { minMs: 5500 });

    const languageSelect = page.locator('header select').filter({ has: page.locator('option[value="en"]') }).first();
    await runNarrated('langSwitch', {
      icon: '🌐', title: banner.useCase0Title, desc: 'Use the complete interface in multiple languages and RTL layouts.', position: 'bottom'
    }, async () => {
      await visualClick(languageSelect, { postClickDelay: 250 });
      const demoLang = lang === 'ar' ? 'en' : 'ar';
      const demoPrefix = demoLang === 'en' ? '' : `/${demoLang}`;
      await navigateReady(`http://localhost:5173${demoPrefix}/today`, 'input[type="date"]');
      await injectVisualHelpers();
      await wait(1400);
      await navigateReady(`http://localhost:5173${prefix}/today`, 'input[type="date"]');
      await injectVisualHelpers();
    }, { minMs: 6500 });

    const themeToggle = page.locator('header button[aria-label]').first();
    await runNarrated('themeToggle', {
      icon: '🌓', title: banner.useCase0Title, desc: 'Choose a comfortable light or dark theme.', position: 'bottom'
    }, async () => {
      await visualClick(themeToggle);
      await wait(1200);
      await visualClick(themeToggle);
    }, { minMs: 4500 });

    const locSelect = page.locator('select').filter({ has: page.locator('option[value="Makkah"]') }).first();
    await runNarrated('locationPick', {
      icon: '📍', title: banner.useCase0Title, desc: 'Set a preset or custom observing location.', position: 'top'
    }, async () => {
      await visualClick(locSelect, { postClickDelay: 250 });
      await locSelect.selectOption('Makkah');
      await wait(1200);
      const mapEl = page.locator('.leaflet-container').first();
      const mapBox = await mapEl.boundingBox();
      if (!mapBox) throw new Error('Location map is not visible');
      const x = mapBox.x + mapBox.width * 0.42;
      const y = mapBox.y + mapBox.height * 0.38;
      await page.evaluate(({ x, y }) => window.__movePointer(x, y), { x, y });
      await wait(400);
      await page.evaluate(({ x, y }) => window.__showClickRipple(x, y), { x, y });
      await page.mouse.click(x, y);
      await wait(1200);
      await locSelect.selectOption('Makkah');
    }, { minMs: 6500, pauseAfter: 900 });

    // Use case 1: preset the date silently, then move only through 30 August.
    console.log(`[${lang}] Use case 1: Today, 26–30 August...`);
    await methodSelect.selectOption('estimate');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'auto' }));
    await todayDateInput.fill('2026-08-26');
    await todayDateInput.dispatchEvent('change');
    await wait(700);
    const nextDayBtn = todayDateInput.locator('xpath=../..').locator('button').nth(1);
    await runNarrated('todayStep', {
      icon: '☀️', title: banner.useCase1Title, desc: banner.useCase1Desc, position: 'bottom'
    }, async () => {
      for (let day = 27; day <= 30; day += 1) {
        await visualClick(nextDayBtn, { postClickDelay: 900 });
        await wait(650);
      }
    }, { minMs: 8500, pauseAfter: 900 });

    // ----------------------------------------------------
    // Scene 2: Calendar & Investigating Month Start Signals
    // ----------------------------------------------------
    console.log(`[${lang}] Scene 2: Calendar Page...`);
    await navigateReady(`http://localhost:5173${prefix}/calendar?year=2026&month=8`, '[data-day="12"]');
    await injectVisualHelpers();
    await runNarrated('calendarView', {
      icon: '📅', title: banner.useCase2Title, desc: banner.useCase2Desc, position: 'bottom'
    }, async () => {
      for (const day of [12, 13, 14]) {
        await visualClick(page.locator(`[data-day="${day}"]`), { postClickDelay: 900 });
        await page.evaluate(() => window.scrollBy({ top: 220, behavior: 'smooth' }));
        await wait(2200);
      }
    }, { minMs: 16500, pauseAfter: 900 });

    // ----------------------------------------------------
    // Scene 3: Holidays & Comparing Ramadan / Shawwal Start Candidates
    // ----------------------------------------------------
    console.log(`[${lang}] Scene 3: Holidays Page...`);
    await navigateReady(`http://localhost:5173${prefix}/holidays/2027`, 'tbody tr');
    await injectVisualHelpers();
    await runNarrated('holidaysView', {
      icon: '✨', title: banner.useCase3Title, desc: banner.useCase3Desc, position: 'bottom'
    }, async () => {
      const featuredRows = page.locator('tbody tr.align-top.bg-amber-50\\/40');
      const ramadanRow = featuredRows.nth(0);
      const shawwalRow = featuredRows.nth(1);
      await visualClick(shawwalRow, { postClickDelay: 900 });
      await page.evaluate(() => window.scrollBy({ top: 180, behavior: 'smooth' }));
      await wait(2200);
      await visualClick(ramadanRow, { postClickDelay: 900 });
      await page.evaluate(() => window.scrollBy({ top: 180, behavior: 'smooth' }));
      await wait(2200);
    }, { minMs: 12000, pauseAfter: 900 });

    // ----------------------------------------------------
    // Scene 4: Global Moon Altitude & Crescent Visibility
    // ----------------------------------------------------
    console.log(`[${lang}] Scene 4: Global Visibility Map...`);
    await navigateReady(`http://localhost:5173${prefix}/visibility-map`, 'input[type="date"]');
    const mapDateInput = page.locator('input[type="date"]').first();
    await mapDateInput.fill('2026-08-13');
    await mapDateInput.dispatchEvent('change');
    await injectVisualHelpers();
    await waitForVisibilityMap();
    await runNarrated('mapView', {
      icon: '🗺️', title: banner.useCase4Title, desc: banner.useCase4Desc, position: 'top'
    }, async () => {
      await wait(1200);
      const mapSections = page.locator('main section');
      await mapSections.first().scrollIntoViewIfNeeded();
      await wait(2200);
      if (await mapSections.count() > 1) {
        await mapSections.nth(1).scrollIntoViewIfNeeded();
        await wait(2600);
      }
    }, { minMs: 9000, pauseAfter: 900 });

    // ----------------------------------------------------
    // Scene 5: Month View (Detailed Moon Phases & Metrics)
    // ----------------------------------------------------
    console.log(`[${lang}] Scene 5: Month View (Detailed Moon Phases & Metrics)...`);
    await navigateReady(`http://localhost:5173${prefix}/moon-month-view`, 'tbody');
    await injectVisualHelpers();
    await runNarrated('monthView', {
      icon: '📊', title: banner.useCase5Title, desc: banner.useCase5Desc, position: 'bottom'
    }, async () => {
      const candidateRows = page.locator('tbody tr:has(span.rounded-full)');
      const count = await candidateRows.count();
      if (count > 0) {
        await visualClick(candidateRows.first(), { postClickDelay: 900 });
        await wait(1800);
      }
    }, { minMs: 6500, pauseAfter: 800 });

    // ----------------------------------------------------
    // Use case 6: Methodology & Scholarly Criteria
    // ----------------------------------------------------
    console.log(`[${lang}] Scene 7: Methods Knowledge & Accuracy...`);
    await navigateReady(`http://localhost:5173${prefix}/methods`, 'main h1');
    await injectVisualHelpers();
    await runNarrated('methodsView', {
      icon: '📚', title: banner.useCase6Title, desc: banner.useCase6Desc, position: 'bottom'
    }, async () => {
      await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }));
      await wait(2800);
    }, { minMs: 6000, pauseAfter: 800 });

    // ----------------------------------------------------
    // Scene 8: About Screen & Thank You Closing
    // ----------------------------------------------------
    console.log(`[${lang}] Scene 8: About Screen & Closing...`);
    await navigateReady(`http://localhost:5173${prefix}/about`, 'main h1');
    await injectVisualHelpers();
    await runNarrated('aboutView', {
      icon: '✨', title: banner.aboutTitle, desc: banner.aboutDesc, position: 'bottom'
    }, async () => {
      await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'smooth' }));
      await wait(2500);
    }, { minMs: 6000, pauseAfter: 1200 });

    console.log(`[${lang}] Recording completed!`);
  } finally {
    await page.close();
    await context.close();
    const rawVideoPath = await currentVideo.path();
    await browser.close();

    if (fs.existsSync(rawVideoPath) && timeline.length > 0) {
      console.log(`\nRaw video recorded at: ${rawVideoPath}`);

      const fullAudioPath = path.join(tempAudioDir, 'full_narration.wav');

      const inputArgs = [];
      const filterSegments = [];
      const trimStartSec = Math.max(0, (timeline[0]?.at ?? 0) - 0.8);

      timeline.forEach((item, idx) => {
        inputArgs.push('-i', item.file);
        const delayMs = Math.round((item.at - trimStartSec) * 1000);
        filterSegments.push(`[${idx}:a]loudnorm=I=-16:TP=-3:LRA=11,adelay=${delayMs}|${delayMs}[a${idx}]`);
      });

      const mixInputs = timeline.map((_, idx) => `[a${idx}]`).join('');
      const filterComplex = `${filterSegments.join(';')};${mixInputs}amix=inputs=${timeline.length}:duration=longest:dropout_transition=0,loudnorm=I=-16:TP=-1.5:LRA=11,volume=-1.2dB[aout]`;

      console.log(`\nMuxing audio timeline into normalized, broadcast-standard narration soundtrack...`);
      runFfmpeg(['-y', ...inputArgs, '-filter_complex', filterComplex, '-map', '[aout]', fullAudioPath]);

      const finalVideoLangPath = path.join(langDir, 'hilal-day-demo.webm');
      const finalVideoLangMp4 = path.join(langDir, 'hilal-day-demo.mp4');
      const publicLangWebm = path.join(publicVideoDir, 'hilal-day-demo.webm');
      const publicLangMp4 = path.join(publicVideoDir, 'hilal-day-demo.mp4');

      console.log(`\nMuxing video + narrated audio track into final output...`);
      runFfmpeg(['-y', '-ss', trimStartSec.toFixed(3), '-i', rawVideoPath, '-i', fullAudioPath, '-c:v', 'copy', '-c:a', 'libvorbis', '-shortest', finalVideoLangPath]);
      fs.copyFileSync(finalVideoLangPath, publicLangWebm);

      runFfmpeg(['-y', '-ss', trimStartSec.toFixed(3), '-i', rawVideoPath, '-i', fullAudioPath, '-c:v', 'libx264', '-preset', 'fast', '-c:a', 'aac', '-b:a', '192k', '-shortest', finalVideoLangMp4]);
      fs.copyFileSync(finalVideoLangMp4, publicLangMp4);

      if (lang === 'en') {
        const rootWebm = path.join(outputDir, 'hilal-day-demo.webm');
        const rootMp4 = path.join(outputDir, 'hilal-day-demo.mp4');
        fs.copyFileSync(finalVideoLangPath, rootWebm);
        fs.copyFileSync(finalVideoLangMp4, rootMp4);

        // Also place root webm and mp4 in apps/web/public/videos for default fallback
        const publicRootWebm = path.resolve('apps/web/public/videos/hilal-day-demo.webm');
        const publicRootMp4 = path.resolve('apps/web/public/videos/hilal-day-demo.mp4');
        fs.copyFileSync(finalVideoLangPath, publicRootWebm);
        fs.copyFileSync(finalVideoLangMp4, publicRootMp4);
      }

      console.log(`\nFinal narrated videos generated for [${lang.toUpperCase()}]:`);
      console.log(`  - WebM: ${finalVideoLangPath}`);
      console.log(`  - MP4:  ${finalVideoLangMp4}`);
    }
  }
}

async function main() {
  const targetLangs = process.argv.slice(2);
  const langsToRun = targetLangs.length > 0 ? targetLangs : ['en'];

  for (const lang of langsToRun) {
    try {
      console.log(`\n==============================================`);
      console.log(`🎬 Generating Walkthrough Demo for Language: [${lang.toUpperCase()}]`);
      console.log(`==============================================`);
      await recordLanguageDemo(lang);
    } catch (err) {
      console.error(`Error generating demo for [${lang}]:`, err);
    }
  }
}

main().catch(console.error);
