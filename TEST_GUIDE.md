# SentinelSwap Otonom Agent Test Kılavuzu 🧪

## ✅ Evet, Proje Tamamen Otonom Olarak Çalışıyor!

SentinelSwap, backend başladığında otomatik olarak çalışan bir DeFi ajanıdır. İşte nasıl test edeceğiniz:

---

## 🚀 Adım 1: Projeyi Başlatın

### Terminal 1 - Backend
```bash
cd sentinelswap/backend
npm install
npm run dev
```

**Beklenen çıktı:**
```
🚀 SentinelSwap Backend running on port 3001
📊 API: http://localhost:3001/api
🤖 Starting SentinelSwap Agent...
🤖 Agent started! Checking every 30 seconds
```

### Terminal 2 - Frontend
```bash
cd sentinelswap/frontend
npm install
npm run dev
```

**Beklenen çıktı:**
```
▲ Next.js 14.x
- Local: http://localhost:3000
```

---

## 🧪 Adım 2: Agent Durumunu Kontrol Edin

### API ile Kontrol
```bash
curl http://localhost:3001/api/agent/state
```

**Beklenen yanıt:**
```json
{
  "running": true,
  "lastCheck": "2026-05-03T12:33:00.000Z",
  "checksPerformed": 5,
  "strategiesExecuted": 0,
  "activeStrategies": 0
}
```

### WebSocket ile Gerçek Zamanlı İzleme
```javascript
// Browser console'da çalıştırın
const ws = new WebSocket('ws://localhost:3001');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('🤖 Agent Activity:', data);
};
```

---

## 📝 Adım 3: Strateji Oluşturun

### Frontend Üzerinden
1. http://localhost:3000 adresine gidin
2. Şu stratejiyi yazın:
   ```
   Buy ETH with 500 USDC when ETH drops below $2,400
   ```
3. "Parse Strategy" butonuna tıklayın
4. Strateji detaylarını inceleyin
5. "Deploy Strategy" butonuna tıklayın

### API ile
```bash
# Stratejiyi parse et
curl -X POST http://localhost:3001/api/strategies/parse \
  -H "Content-Type: application/json" \
  -d '{"text": "Buy ETH with 500 USDC when ETH drops below $2400"}'

# Stratejiyi deploy et (parse sonucundaki ID'yi kullanın)
curl -X POST http://localhost:3001/api/strategies/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ETH Dip Buy",
    "trigger_params": {"type": "price", "token": "ETH", "direction": "below", "value": 2400},
    "action_type": "swap",
    "action_params": {"tokenIn": "USDC", "tokenOut": "ETH", "amount": "500"}
  }'
```

---

## 👁️ Adım 4: Agent'ın Çalıştığını İzleyin

### Activity Log Kontrolü
```bash
# Son 20 aktiviteyi getir
curl http://localhost:3001/api/agent/activities?limit=20
```

**Beklenen aktiviteler:**
```json
[
  {
    "type": "thinking",
    "message": "Fetching current ETH price from CoinGecko...",
    "timestamp": "2026-05-03T12:33:30.000Z"
  },
  {
    "type": "analysis",
    "message": "ETH price: $2,450",
    "data": {"price": 2450}
  },
  {
    "type": "monitoring",
    "message": "Evaluating 1 active strategies...",
    "data": {"count": 1}
  },
  {
    "type": "analysis",
    "message": "Checking \"ETH Dip Buy\": ETH below $2,400",
    "data": {"currentPrice": 2450, "targetPrice": 2400}
  },
  {
    "type": "monitoring",
    "message": "Condition not met: ETH at $2,450, waiting for below $2,400"
  }
]
```

### Frontend Dashboard
- Agent Dashboard panelinde gerçek zamanlı aktiviteleri görün
- Her 30 saniyede yeni loglar gelecek

---

## ⚡ Adım 5: Strateji Tetiklenmesini Test Edin

### Senaryo 1: Fiyat Düşüşünü Simüle Edin
Agent'ın test modunda çalışması için `getETHPrice` fonksiyonunu geçici olarak değiştirebilirsiniz:

```typescript
// sentinelswap/backend/src/services/uniswap.ts dosyasında
export async function getETHPrice(): Promise<number> {
  // Test için düşük fiyat döndür
  return 2350; // $2,400'ın altında
}
```

**Beklenen sonuç:**
```
🎯 TRIGGER ACTIVATED! ETH ($2,350) dropped below target ($2,400)
⚡ Executing "ETH Dip Buy"...
✅ Strategy executed successfully! TX: 0x1234...
```

### Senaryo 2: Manuel Tetikleme
```bash
curl -X POST http://localhost:3001/api/strategies/{strategyId}/execute
```

---

## 📊 Adım 6: Sonuçları Doğrulayın

### İşlem Geçmişi
```bash
curl http://localhost:3001/api/history
```

### Strateji Durumu
```bash
curl http://localhost:3001/api/strategies
```

**Beklenen durum:**
```json
{
  "id": "...",
  "name": "ETH Dip Buy",
  "status": "executed",  // "active" → "executed"
  "executed_at": "2026-05-03T12:34:00.000Z"
}
```

---

## 🔍 Adım 7: Gerçek Zamanlı İzleme

### Agent Loglarını İzleyin
Backend terminalinde şu logları görmelisiniz:

```
🤖 [Agent] Checking 1 active strategies...
🤖 [Agent] ETH price: $2,450
🤖 [Agent] Checking "ETH Dip Buy": ETH below $2,400
🤖 [Agent] Condition not met: ETH at $2,450, waiting for below $2,400

# 30 saniye sonra...
🤖 [Agent] Checking 1 active strategies...
🤖 [Agent] ETH price: $2,380
🤖 [Agent] 🎯 TRIGGER ACTIVATED! ETH ($2,380) dropped below target ($2,400)
🤖 [Agent] ⚡ Executing "ETH Dip Buy"...
🤖 [Agent] ✅ Strategy executed successfully! TX: 0x1234...
```

---

## 🛠️ Troubleshooting

### Agent Çalışmıyor mu?
```bash
# Agent durumunu kontrol et
curl http://localhost:3001/api/agent/state

# Agent'ı manuel başlat
curl -X POST http://localhost:3001/api/agent/start

# Agent'ı durdur
curl -X POST http://localhost:3001/api/agent/stop
```

### Fiyat Verisi Gelmiyor mu?
- CoinGecko API rate limit'e takılmış olabilir
- Fallback fiyat: $2,400

### WebSocket Bağlantısı Kopuyor mu?
- Backend'in çalıştığından emin olun
- Firewall ayarlarını kontrol edin

---

## 📈 Performans Metrikleri

Agent'ın performansını izleyin:

```bash
curl http://localhost:3001/api/agent/state | jq
```

**Önemli metrikler:**
- `running`: Agent çalışıyor mu?
- `checksPerformed`: Toplam kontrol sayısı
- `strategiesExecuted`: Çalıştırılan strateji sayısı
- `activeStrategies`: Aktif strateji sayısı
- `lastCheck`: Son kontrol zamanı

---

## ✅ Test Checklist

- [ ] Backend başarıyla başladı
- [ ] Frontend başarıyla başladı
- [ ] Agent otomatik olarak çalıştı
- [ ] Strateji başarıyla parse edildi
- [ ] Strateji başarıyla deploy edildi
- [ ] Agent her 30 saniyede kontrol yaptı
- [ ] Fiyat verisi başarıyla çekildi
- [ ] Strateji koşulu değerlendirildi
- [ ] Tetiklenme gerçekleşti (simülasyon)
- [ ] Swap işlemi gerçekleştirildi
- [ ] İşlem geçmişine kaydedildi
- [ ] WebSocket ile gerçek zamanlı güncelleme alındı

---

## 🎯 Sonuç

Evet, SentinelSwap **tamamen otonom** olarak çalışıyor! 

Agent, backend başladığında otomatik olarak başlar ve:
1. Her 30 saniyede aktif stratejileri kontrol eder
2. ETH fiyatını canlı olarak çeker
3. Strateji koşullarını değerlendirir
4. Koşullar sağlandığında otomatik olarak swap yapar
5. Tüm aktiviteleri loglar ve WebSocket ile yayınlar

**İnsan müdahalesi gerekmez!** 🤖