# ESP32 Akıllı Kargo Dolabı İzleme Paneli

Bu proje, ESP32 tabanlı akıllı kargo dolabı sistemi için hazırlanmış tek sayfalık bir web izleme ve admin-demo panelidir. Şu an gerçek ESP32 bağlantısı yoktur; arayüz mock data ile çalışır. Ama yapı, ileride `/status` ve `/logs` endpointlerinden veri alınabilecek şekilde hazırlanmıştır.

## Projede Neler Var?

- Sistem durumu kartları: sistem durumu, bağlantı, emergency, reset, alarm ve son güncelleme bilgisi.
- İki dolap kartı: Dolap 1 ve Dolap 2 için durum, kapak bilgisi, teslim kodu, kalan süre ve alarm bilgisi.
- Aktif teslim kodları alanı: admin/demo kullanımı için kodları gösterme ve gizleme.
- Sistem logları: demo sırasında sistem akışını anlatan modern event timeline görünümü.
- Admin/demo butonları: durumu yenileme, kodları göster/gizle, emergency demo aç/kapat ve reset demo aç/kapat.
- Alarm, emergency ve reset durumları için belirgin uyarı görünümleri.
- Mobil uyumlu, modern ve koyu renkli dashboard tasarımı.

## Tasarım

Arayüz koyu gece mavisi ve mor arka plan üzerine pembe, mavi ve turkuaz vurgu renkleriyle tasarlandı. Kartlarda yumuşak gölge, hafif cam efekti ve gradient geçişler kullanıldı. Tasarım Celeste oyununun renk atmosferinden ilham alır, ancak pixel-art, oyun asseti, retro font veya 8-bit görünüm içermez.

## Teknolojiler

- React
- Vite
- JavaScript
- Plain CSS

Ekstra UI framework, backend veya ESP32/Arduino kodu kullanılmamıştır.

## Çalıştırma

Bağımlılıkları yüklemek için:

```bash
npm install
```

Geliştirme sunucusunu başlatmak için:

```bash
npm run dev
```

Production build almak için:

```bash
npm run build
```

Kod kontrolü için:

```bash
npm run lint
```

## Veri Yapısı

Mock veri `src/App.jsx` içinde tutulur. Ana yapı şu alanlardan oluşur:

- `system`: sistem durumu, bağlantı, emergency, reset, alarm ve son güncelleme bilgileri.
- `lockers`: dolapların durum, kapak, teslim kodu, kalan süre ve alarm bilgileri.
- `logs`: sistem olaylarını gösteren string listesi.

Gerçek cihaz bağlantısı eklenmek istendiğinde `/status` ve `/logs` endpointleri için gerekli alanlar yorum satırı olarak bırakılmıştır.

## Projenin Amacı

Bu panelin amacı, ESP32 tabanlı akıllı kargo dolabı sisteminin durumunu web üzerinden anlaşılır biçimde izlemek ve demo/sunum sırasında sistem akışını profesyonel bir arayüzle göstermektir.
