
# kapo

## 🛡️ A Browser Wallet for Bitcoin & Layer 2s

**kapo** is a lightweight in-browser wallet designed to onboard users to the Bitcoin ecosystem and its main Layer 2 protocols like Lightning Network, Stacks, and Rootstock. Built for Web2 simplicity with Web3 power.

---

## ⚙️ Features

* 🔐 **In-browser wallet generation** (seed phrase + private key)
* 📧 **Secure email backup** with password-based encryption
* 🌉 **Connect to external wallet extensions** (e.g. Hiro Wallet, MetaMask Snap for BTC)
* ⚡ **Supports Bitcoin L1 + LN, Stacks, and Rootstock**
* 🪄 **Smooth onboarding for non-crypto users**
* 🔄 **Session-based login with local storage**
* 🔒 **Password-protected wallet recovery via email**
* 💅 Built with **Next.js**, **TypeScript**, and **TailwindCSS**

---

## 🧩 Stack

* **Framework**: Next.js + TailwindCSS
* **Wallet Logic**: BitcoinJS, Stacks.js, RIF libraries
* **Extensions Support**: Hiro Wallet, MetaMask Snap (via adapters), LNURL clients (soon)

---

## 🚀 Getting Started

```bash
git clone https://github.com/fabohax/kapo
cd kapo
npm install
```

---

## 📧 Email Backup Configuration

For the secure email backup feature, you'll need to set up Resend (email service):

1. **Get Resend API Key**:
   - Sign up at [resend.com](https://resend.com)
   - Create a new API key in your dashboard

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your values:
   ```bash
   RESEND_API_KEY=your_resend_api_key_here
   RESEND_FROM_EMAIL=kapo Wallet <noreply@yourdomain.com>
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

3. **Domain Setup** (for production):
   - Add your domain to Resend
   - Verify DNS records
   - Update `NEXT_PUBLIC_BASE_URL` to your production URL

---

## 🧪 Run Locally

```bash
npm run dev
```

---

## 🧠 How It Works

* **Create Wallet**: Generate a secure wallet for BTC, Stacks, and Rootstock in-browser. Seed phrase and keys are shown once, then stored in session (not on-chain).
* **Email Backup**: Optionally encrypt your wallet with a password and receive a recovery link via email.
* **Connect Wallet**: Use existing browser extensions like Hiro Wallet or MetaMask Snap (BTC L1).
* **Login with Seed Phrase**: Restore wallets by importing a saved seed phrase.
* **Wallet Recovery**: Use the email recovery link and your password to restore your wallet anywhere.
* **Session Management**: Keeps users logged in using localStorage, no backend required.

## 🔒 Security Features

* **Client-side Encryption**: Your wallet is encrypted with AES-256 using your password
* **Secure Key Derivation**: PBKDF2 with 10,000 iterations and random salt
* **No Password Storage**: Passwords are never stored - only you can decrypt your wallet
* **Permanent Recovery**: Recovery links never expire for your convenience
* **One-time Use**: Recovery links are deleted after successful use for security

---

## 🗺️ Roadmap

* [ ] Lightning Network key management (LNURL, Lightning address)
* [ ] Multi-account support
* [ ] dApp signing for Bitcoin L2s
* [ ] Fiat onramp integration
* [ ] Mobile-ready version

---

Made with <3 by [@fabohax](https://hax.pe)