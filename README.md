
# kapu

## 🛡️ A Browser Wallet for Bitcoin & Layer 2s

**kapu** is a lightweight in-browser wallet designed to onboard users to the Bitcoin ecosystem and its main Layer 2 protocols like Lightning Network, Stacks, and Rootstock. Built for Web2 simplicity with Web3 power.

---

## ⚙️ Features

* 🔐 **In-browser wallet generation** (seed phrase + private key)
* 🌉 **Connect to external wallet extensions** (e.g. Hiro Wallet, MetaMask Snap for BTC)
* ⚡ **Supports Bitcoin L1 + LN, Stacks, and Rootstock**
* 🪄 **Smooth onboarding for non-crypto users**
* 🔄 **Session-based login with local storage**
* 💅 Built with **Next.js**, **TypeScript**, and **TailwindCSS**

---

## 🧩 Stack

* **Framework**: Next.js + TailwindCSS
* **Wallet Logic**: BitcoinJS, Stacks.js, RIF libraries
* **Extensions Support**: Hiro Wallet, MetaMask Snap (via adapters), LNURL clients (soon)

---

## 🚀 Getting Started

```bash
git clone https://github.com/fabohax/kapu
cd kapu
npm install
```

---

## 🧪 Run Locally

```bash
npm run dev
```

---

## 🧠 How It Works

* **Create Wallet**: Generate a secure wallet for BTC, Stacks, and Rootstock in-browser. Seed phrase and keys are shown once, then stored in session (not on-chain).
* **Connect Wallet**: Use existing browser extensions like Hiro Wallet or MetaMask Snap (BTC L1).
* **Login with Seed Phrase**: Restore wallets by importing a saved seed phrase.
* **Session Management**: Keeps users logged in using localStorage, no backend required.

---

## 🗺️ Roadmap

* [ ] Lightning Network key management (LNURL, Lightning address)
* [ ] Multi-account support
* [ ] dApp signing for Bitcoin L2s
* [ ] Fiat onramp integration
* [ ] Mobile-ready version

---

Made with <3 by [@fabohax](https://hax.pe)