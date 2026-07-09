# CipherLab

CipherLab is a React + Vite web app for learning and trying classical cryptography algorithms. It supports encryption, decryption, operation history, animated character output, and step-by-step solution explanations.

## Features

- Caesar Cipher
- Vigenere Cipher
- Rail Fence Cipher
- Atbash Cipher
- ROT13
- Morse Code
- Hill Cipher with a 2x2 key matrix
- Monoalphabetic Substitution Cipher
- Step-by-step explanation section for solved output
- Learn tab with algorithm details, formulas, examples, advantages, and disadvantages
- Dark/light theme support
- Copy and download output controls

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React icons

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Cipher Key Examples

Hill Cipher uses a 2x2 matrix entered as four numbers:

```text
3 3 2 5
```

Monoalphabetic Cipher uses a 26-letter substitution alphabet with every letter used once:

```text
QWERTYUIOPASDFGHJKLZXCVBNM
```

## License

This project is licensed under the Apache License 2.0.