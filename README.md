# CipherLab

CipherLab is a responsive web application for learning, visualizing, encrypting, and decrypting messages with classical cryptography techniques. It is built as an interactive cipher tool with a clean UI, dark/light mode, animated output, operation history, and step-by-step explanations for how each result is produced.

Live website: https://cipher-pink.vercel.app

GitHub repository: https://github.com/JoelAugustine-92/Cipher

## Main Functionalities

### Cipher Engine

The Cipher tab lets users enter text, choose an algorithm, provide the required key, and run encryption or decryption. The output is shown with an animated character-by-character effect.

Supported algorithms:

- Caesar Cipher
- Vigenere Cipher
- Rail Fence Cipher
- Atbash Cipher
- ROT13
- Morse Code
- Hill Cipher
- Monoalphabetic Substitution Cipher
- Playfair Cipher

### Encryption and Decryption Modes

Most ciphers support both encryption and decryption. Users can switch modes using the Encrypt and Decrypt controls before processing text.

### Step-by-Step Solution Section

After processing a message, the website shows the steps used to solve it. This helps users understand how the selected algorithm transforms the input into the final output.

Examples of displayed steps include:

- Selected cipher and mode
- Input preparation
- Key or matrix used
- Letter-to-number conversion where applicable
- Pair/block creation for Playfair and Hill ciphers
- Formula or rule applied
- Final generated output

### Learn Section

The Learn tab works like a small cryptography reference. Each algorithm includes:

- Definition
- Algorithm explanation
- Formula or transformation rule
- Worked example
- Advantages
- Disadvantages
- Real-world or educational applications
- Time complexity
- Space complexity

### History Section

The History tab stores recent cipher operations during the current browser session. It displays:

- Time of operation
- Cipher name
- Mode used
- Key used
- Input text
- Output text

Users can search history entries or clear all history.

### Output Tools

The app includes practical output controls:

- Copy output to clipboard
- Download output as a `.txt` file
- Clear input/output fields
- Animated processing feedback

### Theme Support

CipherLab supports both dark and light themes. The selected theme is saved in browser local storage.

## Cipher Details

### Caesar Cipher

A substitution cipher that shifts every alphabetic character by a fixed number of positions.

Key type: Number from 1 to 25

Example key:

```text
3
```

### Vigenere Cipher

A polyalphabetic substitution cipher that uses a repeating keyword to shift each letter.

Key type: Alphabetic keyword

Example key:

```text
SECRET
```

### Rail Fence Cipher

A transposition cipher that writes text in a zigzag pattern across multiple rails and reads row by row.

Key type: Number of rails

Example key:

```text
3
```

### Atbash Cipher

A substitution cipher that maps each letter to its reverse alphabet counterpart.

Example:

```text
A -> Z, B -> Y, C -> X
```

No key is required.

### ROT13

A Caesar Cipher variant with a fixed shift of 13. Applying ROT13 twice returns the original text.

No key is required.

### Morse Code

An encoding system that converts letters and numbers into dot-dash sequences.

No key is required.

### Hill Cipher

A matrix-based cipher that converts letters into numbers and encrypts blocks using matrix multiplication modulo 26.

Supported key formats include compact digits and separated numbers.

Example 2x2 matrix keys:

```text
2336
```

```text
3 3 2 5
```

Example 3x3 matrix key:

```text
6 24 1 13 16 10 20 17 15
```

### Monoalphabetic Substitution Cipher

A substitution cipher where each plaintext letter maps to a fixed letter in a shuffled alphabet.

Key type: A 26-letter alphabet with every letter used exactly once

Example key:

```text
QWERTYUIOPASDFGHJKLZXCVBNM
```

### Playfair Cipher

A digraph substitution cipher that encrypts pairs of letters using a 5x5 key matrix. The letters I and J share one cell.

Key type: Keyword

Example key:

```text
MONARCHY
```

## Technologies Used

### Languages

- TypeScript: Main application logic and React components
- JavaScript: Runtime ecosystem through Vite and Node.js tooling
- HTML: Root document structure
- CSS: Styling, layout, animation, and theme support
- Markdown: Project documentation and algorithm notes

### Frontend Framework and Libraries

- React: Component-based user interface
- Vite: Development server and production build tool
- Tailwind CSS: Utility-first styling
- Lucide React: Icon set used in buttons and navigation
- Radix UI components: Accessible UI primitives included in the project

### Tooling and Deployment

- npm: Dependency management and scripts
- Git: Version control
- GitHub: Source code hosting
- Vercel: Production deployment and hosting

## Project Structure

```text
Cipher/
|-- Algorithm/                 # Text notes for cipher algorithms
|   |-- cipher.txt
|   |-- hill cipher.txt
|   |-- Mono-Alphabetic.txt
|   `-- playfair-cipher.txt
|-- src/
|   |-- app/
|   |   |-- App.tsx            # Main application logic and UI
|   |   `-- components/        # UI component library
|   |-- main.tsx               # React entry point
|   `-- styles/                # Global CSS and theme styles
|-- index.html
|-- package.json
|-- vite.config.ts
`-- README.md
```

## Getting Started

### Prerequisites

Install Node.js and npm before running the project locally.

Check versions:

```bash
node --version
npm --version
```

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

The app will usually run at:

```text
http://localhost:5173
```

### Build for Production

```bash
npm run build
```

The production output is generated in the `dist/` folder.

## Deployment

The project is deployed on Vercel.

Production URL:

```text
https://cipher-pink.vercel.app
```

A production deployment can be triggered with:

```bash
npx vercel --prod
```

## Educational Purpose

CipherLab is designed for learning classical cryptography. These algorithms are useful for understanding substitution, transposition, matrix-based encryption, and digraph encryption, but they are not secure for modern real-world data protection.

## License

This project is licensed under the Apache License 2.0.