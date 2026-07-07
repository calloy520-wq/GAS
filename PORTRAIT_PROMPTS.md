# 諸國爭霸 — 角色立繪 AI 生圖提示詞

> 用途：拿這些提示詞去 AI 生圖（Stable Diffusion / NovelAI / Midjourney / DALL·E 皆可），做好一套立繪後，填進 `Index.html` 的 `PORTRAITS` 對照表即可換上。**遊戲執行期仍然零 AI**。

## 使用說明
1. 每張建議 **1:1 正方形**（頭像用），或 3:4 半身。做好裁成正方形效果最好。
2. 想讓整套風格一致：**固定同一個 style、同一組負面詞、同一個模型/採樣器**，只改角色描述那段。
3. 生好圖後放到圖床拿網址，或轉 base64 data URI，填進 `PORTRAITS`：
   ```js
   var PORTRAITS = {
     'C1': 'https://your-cdn/arthuria.webp',
     'L4': 'data:image/png;base64,iVBOR...',
   };
   ```
4. 未填的角色自動用內建向量頭像當占位，可以慢慢補。

**共用畫風前綴**：
```
masterpiece, best quality, anime visual-novel character portrait, single cute girl, bust shot (head and shoulders), facing viewer, soft cel shading, clean lineart, large detailed expressive eyes, plain soft-gradient background, centered composition, game character icon
```
**共用負面詞**：
```
Negative: lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, text, watermark, signature, multiple girls, nsfw, photorealistic, 3d render
```

> 每個角色的髮色/瞳色/髮型已對齊遊戲內的占位頭像，這樣生成的立繪跟遊戲看到的是「同一個人」。

---

## ⭐ 傳說女將（4）

### 沙夜　`L1`
- **對齊頭像**：長紫髮・內彎鮑伯・紫瞳

```
masterpiece, best quality, anime visual-novel character portrait, single cute girl, bust shot (head and shoulders), facing viewer, soft cel shading, clean lineart, large detailed expressive eyes, plain soft-gradient background, centered composition, game character icon, a girl named 沙夜 — long purple hair styled as an inward-curled bob with side-swept bangs, violet eyes, gentle eyes with a soft smile; ancient dark blade-goddess, flowing black-and-crimson kimono-armor with glowing purple seals, moonlit mystic aura; a kunoichi with kunai or dual short blades; personality: cold, aloof, immense sealed power, legendary rare heroine, ornate golden crown/tiara, radiant golden halo aura, floating sparkles, premium gacha splash art. Negative: lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, text, watermark, signature, multiple girls, nsfw, photorealistic, 3d render
```

### 緋雫　`L2`
- **對齊頭像**：長粉髮・長直髮・紅瞳

```
masterpiece, best quality, anime visual-novel character portrait, single cute girl, bust shot (head and shoulders), facing viewer, soft cel shading, clean lineart, large detailed expressive eyes, plain soft-gradient background, centered composition, game character icon, a girl named 緋雫 — long pink hair styled as long loose hair with wispy center-parted bangs, red eyes, gentle eyes with a soft smile; proud crimson dragon princess, small draconic horns and red scale accents on ornate armor, blazing fire aura; in knightly armor, holding a lance or sword; personality: proud, fiery, passionate, legendary rare heroine, ornate golden crown/tiara, radiant golden halo aura, floating sparkles, premium gacha splash art. Negative: lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, text, watermark, signature, multiple girls, nsfw, photorealistic, 3d render
```

### 露娜　`L3`
- **對齊頭像**：短紫髮・內彎鮑伯・灰瞳

```
masterpiece, best quality, anime visual-novel character portrait, single cute girl, bust shot (head and shoulders), facing viewer, soft cel shading, clean lineart, large detailed expressive eyes, plain soft-gradient background, centered composition, game character icon, a girl named 露娜 — short purple hair styled as an inward-curled bob with side-swept bangs, grey eyes, a playful wink; ethereal star-priestess, deep-blue celestial robes covered in constellations, floating star motes; holding a staff or spell-tome, flowing robes, faint magical aura; personality: dreamy, mysterious, all-seeing, legendary rare heroine, ornate golden crown/tiara, radiant golden halo aura, floating sparkles, premium gacha splash art. Negative: lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, text, watermark, signature, multiple girls, nsfw, photorealistic, 3d render
```

### 森亞露露卡　`L4`
- **對齊頭像**：短藍髮・內彎鮑伯・紫瞳

```
masterpiece, best quality, anime visual-novel character portrait, single cute girl, bust shot (head and shoulders), facing viewer, soft cel shading, clean lineart, large detailed expressive eyes, plain soft-gradient background, centered composition, game character icon, a girl named 森亞露露卡 — short blue hair styled as an inward-curled bob with side-swept bangs, violet eyes, a playful wink; gentle forest bow-maiden, elven ears, green leaf-and-vine ornaments, luminous world-tree longbow, glowing forest spirits; holding an ornate bow with a quiver, light armor; personality: gentle, serene, childlike wonder, communes with spirits, legendary rare heroine, ornate golden crown/tiara, radiant golden halo aura, floating sparkles, premium gacha splash art. Negative: lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, text, watermark, signature, multiple girls, nsfw, photorealistic, 3d render
```

## 具名女將（13）

### 亞瑟莉亞　`C1`（陣營 F1／cavalry）
- **對齊頭像**：長棕髮・長直髮・紅瞳・呆毛

```
masterpiece, best quality, anime visual-novel character portrait, single cute girl, bust shot (head and shoulders), facing viewer, soft cel shading, clean lineart, large detailed expressive eyes, plain soft-gradient background, centered composition, game character icon, a girl named 亞瑟莉亞 — long brown hair styled as long loose hair with side-swept bangs, plus a single cute ahoge strand, red eyes, happy closed eyes and a warm smile; holy paladin knight-princess, ornate white-and-gold plate armor with blue accents, radiant western-fantasy; in knightly armor, holding a lance or sword; personality: noble, earnest, hot-blooded knight-princess. Negative: lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, text, watermark, signature, multiple girls, nsfw, photorealistic, 3d render
```

### 莉緹希雅　`C2`（陣營 F1／mage）
- **對齊頭像**：長銀白髮・雙馬尾・琥珀瞳・側緞帶

```
masterpiece, best quality, anime visual-novel character portrait, single cute girl, bust shot (head and shoulders), facing viewer, soft cel shading, clean lineart, large detailed expressive eyes, plain soft-gradient background, centered composition, game character icon, a girl named 莉緹希雅 — long silver-white hair styled as twin-tails with wispy center-parted bangs, amber eyes, happy closed eyes and a warm smile; wearing a cute side ribbon, holy paladin knight-princess, ornate white-and-gold plate armor with blue accents, radiant western-fantasy; holding a staff or spell-tome, flowing robes, faint magical aura; personality: tsundere genius mage, sharp-tongued but caring. Negative: lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, text, watermark, signature, multiple girls, nsfw, photorealistic, 3d render
```

### 卡蜜拉　`C3`（陣營 F2／mage）
- **對齊頭像**：中長棕髮・內彎鮑伯・紫瞳

```
masterpiece, best quality, anime visual-novel character portrait, single cute girl, bust shot (head and shoulders), facing viewer, soft cel shading, clean lineart, large detailed expressive eyes, plain soft-gradient background, centered composition, game character icon, a girl named 卡蜜拉 — medium-length brown hair styled as an inward-curled bob with wispy center-parted bangs, violet eyes, gentle eyes with a soft smile; imperial court sorceress, elegant crimson-and-black mage robes with gold trim, arcane and regal; holding a staff or spell-tome, flowing robes, faint magical aura; personality: cold, elegant, dangerous witch-empress. Negative: lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, text, watermark, signature, multiple girls, nsfw, photorealistic, 3d render
```

### 薇歐拉　`C4`（陣營 F2／archer）
- **對齊頭像**：長銀白髮・長直髮・紅瞳

```
masterpiece, best quality, anime visual-novel character portrait, single cute girl, bust shot (head and shoulders), facing viewer, soft cel shading, clean lineart, large detailed expressive eyes, plain soft-gradient background, centered composition, game character icon, a girl named 薇歐拉 — long silver-white hair styled as long loose hair with wispy center-parted bangs, red eyes, big sparkling eyes; imperial court sorceress, elegant crimson-and-black mage robes with gold trim, arcane and regal; holding an ornate bow with a quiver, light armor; personality: quiet, stoic, precise sniper. Negative: lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, text, watermark, signature, multiple girls, nsfw, photorealistic, 3d render
```

### 綾音　`C5`（陣營 F3／ninja）
- **對齊頭像**：中長青綠髮・雙馬尾・琥珀瞳・呆毛・貓耳髮箍

```
masterpiece, best quality, anime visual-novel character portrait, single cute girl, bust shot (head and shoulders), facing viewer, soft cel shading, clean lineart, large detailed expressive eyes, plain soft-gradient background, centered composition, game character icon, a girl named 綾音 — medium-length teal hair styled as twin-tails with blunt straight bangs, plus a single cute ahoge strand, amber eyes, happy closed eyes and a warm smile; wearing a cat-ear hairband, feudal-Japanese kunoichi, sleek dark ninja outfit with subtle armor, agile and mysterious; a kunoichi with kunai or dual short blades; personality: silent, cool, deadly ninja leader. Negative: lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, text, watermark, signature, multiple girls, nsfw, photorealistic, 3d render
```

### 雪代　`C6`（陣營 F3／infantry）
- **對齊頭像**：中長紫髮・單側馬尾・紫瞳・呆毛・巫女帽

```
masterpiece, best quality, anime visual-novel character portrait, single cute girl, bust shot (head and shoulders), facing viewer, soft cel shading, clean lineart, large detailed expressive eyes, plain soft-gradient background, centered composition, game character icon, a girl named 雪代 — medium-length purple hair styled as a side ponytail with side-swept bangs, plus a single cute ahoge strand, violet eyes, big sparkling eyes; wearing a witch hat, feudal-Japanese kunoichi, sleek dark ninja outfit with subtle armor, agile and mysterious; a disciplined swordswoman holding a katana or longsword; personality: earnest, upright samurai girl, a touch stiff. Negative: lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, text, watermark, signature, multiple girls, nsfw, photorealistic, 3d render
```

### 星奈　`C7`（陣營 F4／mage）
- **對齊頭像**：長青綠髮・長直髮・紅瞳・髮夾

```
masterpiece, best quality, anime visual-novel character portrait, single cute girl, bust shot (head and shoulders), facing viewer, soft cel shading, clean lineart, large detailed expressive eyes, plain soft-gradient background, centered composition, game character icon, a girl named 星奈 — long teal hair styled as long loose hair with blunt straight bangs, red eyes, gentle eyes with a soft smile; wearing a hairpin, steampunk sci-fi engineer, teal-and-brass mechanical outfit with gears and goggles; holding a staff or spell-tome, flowing robes, faint magical aura; personality: logical AI girl learning emotions, subtly clumsy-cute. Negative: lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, text, watermark, signature, multiple girls, nsfw, photorealistic, 3d render
```

### 澪　`C8`（陣營 F4／archer）
- **對齊頭像**：長紅髮・單側馬尾・灰瞳・貓耳髮箍

```
masterpiece, best quality, anime visual-novel character portrait, single cute girl, bust shot (head and shoulders), facing viewer, soft cel shading, clean lineart, large detailed expressive eyes, plain soft-gradient background, centered composition, game character icon, a girl named 澪 — long red hair styled as a side ponytail with side-swept bangs, grey eyes, happy closed eyes and a warm smile; wearing a cat-ear hairband, steampunk sci-fi engineer, teal-and-brass mechanical outfit with gears and goggles; holding an ornate bow with a quiver, light armor; personality: sharp, capable merchant-guard gunner. Negative: lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, text, watermark, signature, multiple girls, nsfw, photorealistic, 3d render
```

### 蕾娜　`C9`（陣營 F5／cavalry）
- **對齊頭像**：短藍髮・內彎鮑伯・紫瞳・細髮圈

```
masterpiece, best quality, anime visual-novel character portrait, single cute girl, bust shot (head and shoulders), facing viewer, soft cel shading, clean lineart, large detailed expressive eyes, plain soft-gradient background, centered composition, game character icon, a girl named 蕾娜 — short blue hair styled as an inward-curled bob with blunt straight bangs, violet eyes, happy closed eyes and a warm smile; wearing a delicate circlet, beastkin mercenary with animal ears and a tail, rugged leather-and-fur outfit, wild and fierce; in knightly armor, holding a lance or sword; personality: bold, hearty mercenary captain. Negative: lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, text, watermark, signature, multiple girls, nsfw, photorealistic, 3d render
```

### 蓋兒　`C10`（陣營 F5／infantry）
- **對齊頭像**：中長粉髮・長直髮・紅瞳・細髮圈

```
masterpiece, best quality, anime visual-novel character portrait, single cute girl, bust shot (head and shoulders), facing viewer, soft cel shading, clean lineart, large detailed expressive eyes, plain soft-gradient background, centered composition, game character icon, a girl named 蓋兒 — medium-length pink hair styled as long loose hair with wispy center-parted bangs, red eyes, a playful wink; wearing a delicate circlet, beastkin mercenary with animal ears and a tail, rugged leather-and-fur outfit, wild and fierce; a disciplined swordswoman holding a katana or longsword; personality: wild, boisterous beastkin warrior. Negative: lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, text, watermark, signature, multiple girls, nsfw, photorealistic, 3d render
```

### 蒂雅娜　`C11`（陣營 F0／archer）
- **對齊頭像**：長紫髮・單側馬尾・琥珀瞳・呆毛・巫女帽

```
masterpiece, best quality, anime visual-novel character portrait, single cute girl, bust shot (head and shoulders), facing viewer, soft cel shading, clean lineart, large detailed expressive eyes, plain soft-gradient background, centered composition, game character icon, a girl named 蒂雅娜 — long purple hair styled as a side ponytail with blunt straight bangs, plus a single cute ahoge strand, amber eyes, a playful wink; wearing a witch hat, wandering adventurer in a practical traveler outfit; holding an ornate bow with a quiver, light armor; personality: proud, graceful, slightly haughty elven queen. Negative: lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, text, watermark, signature, multiple girls, nsfw, photorealistic, 3d render
```

### 芙蘭　`C12`（陣營 F0／infantry）
- **對齊頭像**：長藍髮・單側馬尾・紫瞳

```
masterpiece, best quality, anime visual-novel character portrait, single cute girl, bust shot (head and shoulders), facing viewer, soft cel shading, clean lineart, large detailed expressive eyes, plain soft-gradient background, centered composition, game character icon, a girl named 芙蘭 — long blue hair styled as a side ponytail with side-swept bangs, violet eyes, gentle eyes with a soft smile; wandering adventurer in a practical traveler outfit; a disciplined swordswoman holding a katana or longsword; personality: energetic, cheerful, naive swordgirl. Negative: lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, text, watermark, signature, multiple girls, nsfw, photorealistic, 3d render
```

### 巫月　`C13`（陣營 F0／mage）
- **對齊頭像**：中長金髮・長直髮・紅瞳・貓耳髮箍

```
masterpiece, best quality, anime visual-novel character portrait, single cute girl, bust shot (head and shoulders), facing viewer, soft cel shading, clean lineart, large detailed expressive eyes, plain soft-gradient background, centered composition, game character icon, a girl named 巫月 — medium-length blonde hair styled as long loose hair with blunt straight bangs, red eyes, happy closed eyes and a warm smile; wearing a cat-ear hairband, wandering adventurer in a practical traveler outfit; holding a staff or spell-tome, flowing robes, faint magical aura; personality: serene, mysterious shrine maiden who sees fate. Negative: lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, text, watermark, signature, multiple girls, nsfw, photorealistic, 3d render
```

## 隨機路人女將（R1~R12）

路人是**開局程序化隨機生成**，每局長相/兵種都不同，因此沒有固定提示詞。若要幫某位路人生立繪，先在遊戲/存檔查她的兵種與名字，套用下方通用模板：

```
masterpiece, best quality, anime visual-novel character portrait, single cute girl, bust shot (head and shoulders), facing viewer, soft cel shading, clean lineart, large detailed expressive eyes, plain soft-gradient background, centered composition, game character icon, a girl named [名字] — [髮色] hair, [瞳色] eyes, [兵種對應裝束], wandering adventurer / soldier, cute anime heroine. Negative: lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, text, watermark, signature, multiple girls, nsfw, photorealistic, 3d render
```
