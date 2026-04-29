# PoW Blokcheyn Mayning va Swap Loyihasi

Loyiha to'liq tayyor! Endi siz o'z lokal kompyuteringizda Proof of Work (PoW) blokcheyn tizimini, mayning jarayonini va tokenlarni almashtirishni sinab ko'rishingiz mumkin.

## Qanday ishlatish kerak?

1.  **MetaMask Sozlamalari**:
    *   MetaMask-ni oching.
    *   Yangi tarmoq qo'shing: **Localhost 8545**.
    *   RPC URL: `http://127.0.0.1:8545`
    *   Zanjir ID (Chain ID): `31337`
    *   Valyuta belgisi: `ETH`
    *   Hardhat akkauntlaridan birini (masalan, birinchisini) shaxsiy kaliti (private key) orqali import qiling: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`.

2.  **Ilovani ochish**:
    *   Brauzerda quyidagi manzilga kiring: [http://localhost:5173/](http://localhost:5173/)

3.  **Mayning (Mining)**:
    *   MetaMask hamyoningizni ilovaga ulang.
    *   **"Mayningni boshlash"** tugmasini bosing.
    *   Frontend SHA-256 algoritmi orqali qiyinchilik darajasiga mos keladigan xeshni qidiradi (4 ta nol bilan boshlanadigan).
    *   Xesh topilgach, MetaMask tranzaksiyasi orqali smart-kontraktga murojaat qilinadi va sizga 10 **MNT** tokeni beriladi.

4.  **Token Almashinuvi (Swap)**:
    *   Kamida 10 MNT to'plaganingizdan so'ng, **"10 MNTni ETHga almashtirish"** tugmasini bosing.
    *   Bu jarayon ikki bosqichdan iborat: **Tasdiqlash (Approve)** va **Almashtirish (Swap)**.
    *   Natijada hamyoningizdagi MNT tokenlari o'rniga ETH olasiz.

## Texnik Tafsilotlar:

*   **Smart-kontraktlar**:
    *   `MinerToken.sol`: ERC20 standartidagi token bo'lib, zanjirda (on-chain) PoW xeshini tekshirish funksiyasiga ega.
    *   `Swap.sol`: MNT tokenlarini ETH-ga belgilangan kurs bo'yicha almashtirib beruvchi DEX.
*   **Frontend**:
    *   **Ethers.js** orqali blokcheyn bilan bog'lanadi.
    *   SHA-256 xeshlash jarayoni foydalanuvchi interfeysini qotirib qo'ymasligi uchun asinxron tarzda ishlaydi.
*   **Infrastruktura**:
    *   Loyiha **Hardhat** (blokcheyn) va **Vite** (frontend) texnologiyalarida qurilgan.
    *   Barcha ma'lumotlar **D: diskda** saqlanmoqda.
