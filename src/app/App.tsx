import { useState, useEffect, useRef } from "react";
import {
  Lock, Unlock, Copy, Download, Trash2, ChevronDown,
  Moon, Sun, Shield, BookOpen, History, Check,
  AlertCircle, Zap, Search, RotateCcw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CipherKey = "caesar" | "vigenere" | "railfence" | "atbash" | "rot13" | "morse" | "hill" | "monoalphabetic";
type Mode = "encrypt" | "decrypt";
type Tab = "cipher" | "educational" | "history";
type Theme = "dark" | "light";

interface AnimChar { char: string; final: string; done: boolean }
interface CipherResult { output: string; steps: string[] }
interface HistoryEntry {
  id: string; cipher: string; mode: Mode;
  input: string; output: string; key: string; timestamp: Date;
}

// ─── Cipher Implementations ───────────────────────────────────────────────────

function caesarCipher(text: string, shift: number, decrypt: boolean): string {
  const s = ((((decrypt ? -shift : shift) % 26) + 26) % 26);
  return text.split("").map(c => {
    if (/[a-z]/.test(c)) return String.fromCharCode(((c.charCodeAt(0) - 97 + s) % 26) + 97);
    if (/[A-Z]/.test(c)) return String.fromCharCode(((c.charCodeAt(0) - 65 + s) % 26) + 65);
    return c;
  }).join("");
}

function vigenereCipher(text: string, key: string, decrypt: boolean): string {
  const k = key.toLowerCase().replace(/[^a-z]/g, "");
  if (!k) return text;
  let ki = 0;
  return text.split("").map(c => {
    if (/[a-zA-Z]/.test(c)) {
      const upper = /[A-Z]/.test(c);
      const base = upper ? 65 : 97;
      const shift = k.charCodeAt(ki % k.length) - 97;
      ki++;
      const s = decrypt ? (26 - shift) % 26 : shift;
      return String.fromCharCode(((c.charCodeAt(0) - base + s) % 26) + base);
    }
    return c;
  }).join("");
}

function getRailPattern(len: number, rails: number): number[] {
  const pattern: number[] = [];
  let rail = 0, dir = 1;
  for (let i = 0; i < len; i++) {
    pattern.push(rail);
    if (rail === rails - 1) dir = -1;
    if (rail === 0) dir = 1;
    rail += dir;
  }
  return pattern;
}

function railFenceCipher(text: string, rails: number, decrypt: boolean): string {
  if (rails < 2 || !text) return text;
  const len = text.length;
  const pattern = getRailPattern(len, rails);
  if (!decrypt) {
    const ra: string[][] = Array.from({ length: rails }, () => []);
    text.split("").forEach((c, i) => ra[pattern[i]].push(c));
    return ra.flat().join("");
  } else {
    const rl = new Array(rails).fill(0);
    pattern.forEach(r => rl[r]++);
    const ra: string[][] = [];
    let idx = 0;
    for (let r = 0; r < rails; r++) {
      ra.push(text.slice(idx, idx + rl[r]).split(""));
      idx += rl[r];
    }
    const ri = new Array(rails).fill(0);
    return pattern.map(r => { const c = ra[r][ri[r]]; ri[r]++; return c; }).join("");
  }
}

function atbashCipher(text: string): string {
  return text.split("").map(c => {
    if (/[a-z]/.test(c)) return String.fromCharCode(122 - (c.charCodeAt(0) - 97));
    if (/[A-Z]/.test(c)) return String.fromCharCode(90 - (c.charCodeAt(0) - 65));
    return c;
  }).join("");
}

const MORSE_MAP: Record<string, string> = {
  A:".-",B:"-...",C:"-.-.",D:"-..",E:".",F:"..-.",G:"--.",H:"....",
  I:"..",J:".---",K:"-.-",L:".-..",M:"--",N:"-.",O:"---",P:".--.",
  Q:"--.-",R:".-.",S:"...",T:"-",U:"..-",V:"...-",W:".--",X:"-..-",
  Y:"-.--",Z:"--..",
  "0":"-----","1":".----","2":"..---","3":"...--","4":"....-",
  "5":".....","6":"-....","7":"--...","8":"---.","9":"----.",
};
const REV_MORSE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE_MAP).map(([k, v]) => [v, k])
);
function morseCipher(text: string, decrypt: boolean): string {
  if (!decrypt) {
    return text.toUpperCase().split("").map(c => c === " " ? "/" : (MORSE_MAP[c] ?? "?")).join(" ");
  }
  return text.split(" / ").map(w => w.split(" ").map(code => REV_MORSE[code] ?? "?").join("")).join(" ");
}

function normalizeMod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function parseHillMatrix(key: string): number[][] {
  const values = key.split(/[\s,;]+/).map(v => Number(v.trim())).filter(v => Number.isFinite(v));
  const size = Math.sqrt(values.length);
  if (!Number.isInteger(size) || size < 2) return [];
  return Array.from({ length: size }, (_, row) =>
    values.slice(row * size, row * size + size).map(value => normalizeMod(value, 26))
  );
}

function determinant(matrix: number[][]): number {
  if (matrix.length === 2) {
    return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  }
  return matrix[0].reduce((sum, value, col) => {
    const minor = matrix.slice(1).map(row => row.filter((_, idx) => idx !== col));
    return sum + (col % 2 === 0 ? 1 : -1) * value * determinant(minor);
  }, 0);
}

function modInverse(value: number, modulus: number): number | null {
  const normalized = normalizeMod(value, modulus);
  for (let i = 1; i < modulus; i++) {
    if ((normalized * i) % modulus === 1) return i;
  }
  return null;
}

function inverseHillMatrix(matrix: number[][]): number[][] | null {
  if (matrix.length !== 2) return null;
  const det = determinant(matrix);
  const detInv = modInverse(det, 26);
  if (detInv === null) return null;
  const [[a, b], [c, d]] = matrix;
  return [
    [normalizeMod(d * detInv, 26), normalizeMod(-b * detInv, 26)],
    [normalizeMod(-c * detInv, 26), normalizeMod(a * detInv, 26)],
  ];
}

function multiplyMatrixVector(matrix: number[][], vector: number[]): number[] {
  return matrix.map(row => normalizeMod(row.reduce((sum, value, i) => sum + value * vector[i], 0), 26));
}

function hillCipher(text: string, key: string, decrypt: boolean): string {
  const matrix = parseHillMatrix(key || "3 3 2 5");
  const workingMatrix = decrypt ? inverseHillMatrix(matrix) : matrix;
  if (!workingMatrix || workingMatrix.length === 0) return text;

  const size = workingMatrix.length;
  const letters = text.toUpperCase().replace(/[^A-Z]/g, "");
  const padded = letters.padEnd(Math.ceil(letters.length / size) * size, "X");
  let output = "";

  for (let i = 0; i < padded.length; i += size) {
    const block = padded.slice(i, i + size);
    const vector = block.split("").map(char => char.charCodeAt(0) - 65);
    const result = multiplyMatrixVector(workingMatrix, vector);
    output += result.map(value => String.fromCharCode(value + 65)).join("");
  }

  return output;
}

function normalizeMonoKey(key: string): string {
  const cleaned = key.toUpperCase().replace(/[^A-Z]/g, "");
  return new Set(cleaned).size === 26 && cleaned.length === 26 ? cleaned : "QWERTYUIOPASDFGHJKLZXCVBNM";
}

function monoalphabeticCipher(text: string, key: string, decrypt: boolean): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const cipherAlphabet = normalizeMonoKey(key);
  return text.split("").map(char => {
    if (!/[a-zA-Z]/.test(char)) return char;
    const upper = char.toUpperCase();
    const index = decrypt ? cipherAlphabet.indexOf(upper) : alphabet.indexOf(upper);
    const mapped = decrypt ? alphabet[index] : cipherAlphabet[index];
    return /[A-Z]/.test(char) ? mapped : mapped.toLowerCase();
  }).join("");
}

function buildSolutionSteps(cipher: CipherKey, text: string, key: string, decrypt: boolean, output: string): string[] {
  const action = decrypt ? "Decrypt" : "Encrypt";
  const steps = [`Selected ${EDU[cipher].name} in ${decrypt ? "decryption" : "encryption"} mode.`, `Input text: ${text || "(empty)"}`];

  if (cipher === "hill") {
    const matrix = parseHillMatrix(key || "3 3 2 5");
    const workingMatrix = decrypt ? inverseHillMatrix(matrix) : matrix;
    const size = matrix.length || 2;
    const letters = text.toUpperCase().replace(/[^A-Z]/g, "");
    const padded = letters.padEnd(Math.ceil(letters.length / size) * size, "X");
    steps.push(`Converted letters to numbers with A=0 through Z=25.`);
    steps.push(`Used key matrix: ${matrix.map(row => `[${row.join(", ")}]`).join(" ")}.`);
    if (decrypt) steps.push(`Built the inverse matrix modulo 26: ${workingMatrix ? workingMatrix.map(row => `[${row.join(", ")}]`).join(" ") : "not available"}.`);
    steps.push(`Split cleaned text into blocks of ${size}: ${padded.match(new RegExp(`.{1,${size}}`, "g"))?.join(" | ") || "none"}.`);
    steps.push(`${action}ed each block using C = (K x P) mod 26.`);
    steps.push(`Converted the resulting numbers back to letters: ${output}.`);
    return steps;
  }

  if (cipher === "monoalphabetic") {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const monoKey = normalizeMonoKey(key);
    steps.push(`Plain alphabet: ${alphabet}`);
    steps.push(`Cipher alphabet: ${monoKey}`);
    steps.push(decrypt ? `For each ciphertext letter, found it in the cipher alphabet and replaced it with the matching plain alphabet letter.` : `For each plaintext letter, used its alphabet index to pick the matching key letter with C = K[P].`);
    steps.push(`Non-letter characters were kept unchanged.`);
    steps.push(`Final ${decrypt ? "plaintext" : "ciphertext"}: ${output}.`);
    return steps;
  }

  steps.push(`Applied the configured ${EDU[cipher].name} formula to every supported character.`);
  steps.push(`Final output: ${output}.`);
  return steps;
}

function processCipher(cipher: CipherKey, text: string, key: string, decrypt: boolean): string {
  switch (cipher) {
    case "caesar":    return caesarCipher(text, parseInt(key) || 3, decrypt);
    case "vigenere":  return vigenereCipher(text, key || "KEY", decrypt);
    case "railfence": return railFenceCipher(text, parseInt(key) || 3, decrypt);
    case "atbash":    return atbashCipher(text);
    case "rot13":     return caesarCipher(text, 13, false);
    case "morse":     return morseCipher(text, decrypt);
    case "hill":      return hillCipher(text, key, decrypt);
    case "monoalphabetic": return monoalphabeticCipher(text, key, decrypt);
    default:          return text;
  }
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CIPHER_CONFIG = [
  { id: "caesar" as CipherKey,    name: "Caesar",     icon: "🏛️", hasKey: true,  keyType: "number", keyLabel: "Shift (1–25)",          keyDefault: "3"      },
  { id: "vigenere" as CipherKey,  name: "Vigenère",   icon: "🔑", hasKey: true,  keyType: "text",   keyLabel: "Keyword",                keyDefault: "SECRET" },
  { id: "railfence" as CipherKey, name: "Rail Fence", icon: "🚂", hasKey: true,  keyType: "number", keyLabel: "Rails (2–10)",           keyDefault: "3"      },
  { id: "atbash" as CipherKey,    name: "Atbash",     icon: "🔄", hasKey: false, keyType: "text",   keyLabel: "",                       keyDefault: ""       },
  { id: "rot13" as CipherKey,     name: "ROT13",      icon: "↩️", hasKey: false, keyType: "text",   keyLabel: "",                       keyDefault: ""       },
  { id: "morse" as CipherKey,     name: "Morse",      icon: "📡", hasKey: false, keyType: "text",   keyLabel: "",                       keyDefault: ""       },
  { id: "hill" as CipherKey,      name: "Hill",       icon: "#", hasKey: true,  keyType: "text",   keyLabel: "Key Matrix",             keyDefault: "3 3 2 5" },
  { id: "monoalphabetic" as CipherKey, name: "Monoalphabetic", icon: "A=Q", hasKey: true, keyType: "text", keyLabel: "Substitution Alphabet", keyDefault: "QWERTYUIOPASDFGHJKLZXCVBNM" },
];

const EDU: Record<CipherKey, {
  name: string; icon: string; definition: string; algorithm: string;
  formula: string; example: string; advantages: string[]; disadvantages: string[];
  applications: string[]; timeComplexity: string; spaceComplexity: string;
}> = {
  caesar: {
    name: "Caesar Cipher", icon: "🏛️",
    definition: "One of the oldest encryption techniques, named after Julius Caesar. Each letter is shifted a fixed number of positions in the alphabet.",
    algorithm: "For encryption, shift each letter forward by n positions (mod 26). For decryption, shift backward by n.",
    formula: "E(x) = (x + n) mod 26   |   D(x) = (x − n + 26) mod 26",
    example: 'Shift=3: A→D, B→E, C→F … "HELLO" → "KHOOR"',
    advantages: ["Extremely simple to implement", "O(n) time — instant on any device", "Perfect foundation for learning substitution ciphers"],
    disadvantages: ["Only 25 possible keys — trivially brute-forced", "Fully broken by frequency analysis in seconds", "Zero real-world security value"],
    applications: ["Roman military communications (56 BCE)", "Children's secret message kits", "Introductory cryptography courses"],
    timeComplexity: "O(n)", spaceComplexity: "O(n)",
  },
  vigenere: {
    name: "Vigenère Cipher", icon: "🔑",
    definition: "A polyalphabetic substitution cipher using a repeating keyword. Each character is shifted by the corresponding key character, defeating simple frequency analysis.",
    algorithm: "Repeat the key to match plaintext length. Shift each character by the key character's alphabet position (A=0, B=1 …).",
    formula: "E(xᵢ) = (xᵢ + kᵢ) mod 26   |   D(xᵢ) = (xᵢ − kᵢ + 26) mod 26",
    example: 'Key="KEY": H+K=R, E+E=I, L+Y=J, L+K=V, O+E=S → "RIJVS"',
    advantages: ["Far stronger than Caesar — resists simple frequency analysis", "Flexible keyword length increases key space", "Used effectively for centuries before Kasiski"],
    disadvantages: ["Vulnerable to Kasiski examination with short keys", "Known-plaintext attacks are highly effective", "Completely broken by modern cryptanalysis"],
    applications: ["Diplomatic communications (16th–19th century)", "World War I field ciphers", "Teaching polyalphabetic concepts"],
    timeComplexity: "O(n)", spaceComplexity: "O(n + k)",
  },
  railfence: {
    name: "Rail Fence Cipher", icon: "🚂",
    definition: "A transposition cipher that writes plaintext in a zigzag pattern across multiple 'rails', then reads off each rail sequentially to produce ciphertext.",
    algorithm: "Write characters diagonally down and up across N rails in a zigzag, then concatenate each rail top-to-bottom.",
    formula: "Rail index follows zigzag: 0→1→…→N−1→N−2→…→1→0→1→…",
    example: 'Rails=3, "WEAREDISCOVERED": W..E..I..O..R..D | .A.E.S.O.E.E. | ..R..C..V.. → "WEIORDAESOEERCV"',
    advantages: ["Simple transposition requires no substitution table", "Rail count as a key variable", "Easy to explain visually"],
    disadvantages: ["Very small key space (number of rails)", "Ciphertext length reveals structure", "Broken quickly by pattern analysis"],
    applications: ["Recreational cryptography puzzles", "CTF competition challenges", "Teaching transposition vs. substitution"],
    timeComplexity: "O(n)", spaceComplexity: "O(n)",
  },
  atbash: {
    name: "Atbash Cipher", icon: "🔄",
    definition: "An ancient Hebrew monoalphabetic cipher mapping each letter to its mirror in the alphabet: A↔Z, B↔Y, C↔X … The same operation both encrypts and decrypts.",
    algorithm: "Replace each letter at position p with the letter at position (25 − p). Non-alphabetic characters pass through unchanged.",
    formula: "E(x) = 25 − x   |   D(x) = 25 − x   (self-inverse)",
    example: '"HELLO" → "SVOOL"   |   "WORLD" → "DLIOW"',
    advantages: ["Self-inverse — one function for both directions", "No key required — zero setup cost", "Appears in ancient religious texts (Book of Jeremiah)"],
    disadvantages: ["No key means no secret — any informed party can reverse it instantly", "Destroyed by frequency analysis", "No meaningful security whatsoever"],
    applications: ["Biblical Hebrew texts (שֵׁשַׁך = בָּבֶל)", "Historical code-word puzzles", "Introductory examples of substitution"],
    timeComplexity: "O(n)", spaceComplexity: "O(n)",
  },
  rot13: {
    name: "ROT13", icon: "↩️",
    definition: "A special-case Caesar cipher with a fixed shift of 13. Since 26 ÷ 2 = 13, applying ROT13 twice returns the original — encoding and decoding are the same operation.",
    algorithm: "Rotate each letter 13 positions forward. The alphabet wraps: N→A, O→B … Z→M. Non-letters are unchanged.",
    formula: "ROT13(x) = (x + 13) mod 26   |   ROT13(ROT13(x)) = x",
    example: '"Hello, World!" → "Uryyb, Jbeyq!"',
    advantages: ["Self-inverse — same command encrypts and decrypts", "Instantly recognisable convention on the internet", "Zero-configuration, universally understood"],
    disadvantages: ["Absolutely no cryptographic security", "Reversible by anyone who has heard of it", "Only useful for casual, non-sensitive obfuscation"],
    applications: ["Hiding forum spoilers and puzzle answers", "Unix/Linux tradition for obfuscated text", "Filtering offensive content in email clients"],
    timeComplexity: "O(n)", spaceComplexity: "O(n)",
  },
  hill: {
    name: "Hill Cipher", icon: "#",
    definition: "A polygraphic substitution cipher that encrypts fixed-size blocks of letters with matrix multiplication modulo 26.",
    algorithm: "Convert letters to numbers, split them into equal blocks, multiply each block vector by the key matrix, then reduce every result modulo 26.",
    formula: "C = (K x P) mod 26   |   P = (K^-1 x C) mod 26",
    example: "Key [3 3; 2 5], block HI = [7,8] gives [19,2] -> TC",
    advantages: ["Encrypts groups of letters instead of one at a time", "Introduces useful matrix mathematics", "More resistant than simple single-letter substitution"],
    disadvantages: ["Key matrix must be invertible modulo 26 for decryption", "Known-plaintext attacks can recover the matrix", "Padding may add extra characters"],
    applications: ["Classical cryptography lessons", "Linear algebra demonstrations", "Manual cipher exercises"],
    timeComplexity: "O(n x m^2)", spaceComplexity: "O(n)",
  },
  monoalphabetic: {
    name: "Monoalphabetic Cipher", icon: "A=Q",
    definition: "A substitution cipher where each plaintext letter maps to one fixed ciphertext letter from a shuffled alphabet.",
    algorithm: "Create a 26-letter substitution alphabet. For encryption, replace each plaintext letter by the key letter at the same alphabet index. For decryption, reverse the lookup.",
    formula: "C = K[P]   |   P = index of C in K",
    example: "Key QWERTY... maps A->Q, B->W, C->E, so CAB -> EQW",
    advantages: ["Easy to implement and demonstrate", "Large theoretical key space", "Preserves spaces and punctuation cleanly"],
    disadvantages: ["Letter frequencies remain visible", "Broken by frequency analysis", "Requires a full valid alphabet key"],
    applications: ["Puzzle ciphers", "Introductory substitution lessons", "Historical cipher demonstrations"],
    timeComplexity: "O(n)", spaceComplexity: "O(n)",
  },
  morse: {
    name: "Morse Code", icon: "📡",
    definition: "A character-encoding scheme representing letters and digits as sequences of dots (·) and dashes (−). Technically an encoding, not a cipher — it provides no confidentiality.",
    algorithm: "Each letter maps to a unique dot-dash sequence. Characters are separated by spaces; words by \" / \".",
    formula: 'Character → dot/dash sequence   |   Word boundary → " / "',
    example: '"SOS" → "... --- ..."   |   "HELLO" → ".... . .-.. .-.. ---"',
    advantages: ["Historically critical for long-distance telegraphy and radio", "Operable via sound, light, or touch", "Robust in high-noise transmission environments"],
    disadvantages: ["Not a cipher — provides zero confidentiality", "Completely public encoding table", "Significantly slower than modern digital encoding"],
    applications: ["Maritime distress signalling (pre-GPS era)", "Aviation and amateur radio communications", "Assistive technology for people with motor impairments"],
    timeComplexity: "O(n)", spaceComplexity: "O(n)",
  },
};

// ─── Animated Background ──────────────────────────────────────────────────────

function AnimatedBackground({ isDark }: { isDark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    type Particle = { x: number; y: number; vx: number; vy: number; opacity: number };
    type HexFloat = { x: number; y: number; val: string; opacity: number; vy: number };

    const particles: Particle[] = [];
    const hexFloats: HexFloat[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 70; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        opacity: Math.random() * 0.45 + 0.08,
      });
    }

    const hexSet = "0123456789ABCDEF";
    for (let i = 0; i < 18; i++) {
      hexFloats.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        val: Array.from({ length: 4 }, () => hexSet[Math.floor(Math.random() * 16)]).join(""),
        opacity: Math.random() * 0.12 + 0.02,
        vy: (Math.random() * 0.25 + 0.08) * (Math.random() > 0.5 ? 1 : -1),
      });
    }

    const cyan = isDark ? "0,229,255" : "59,130,246";
    const green = isDark ? "0,255,149" : "0,160,80";
    const gridCol = isDark ? `rgba(${cyan},0.03)` : `rgba(${cyan},0.06)`;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = gridCol;
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cyan},${p.opacity})`;
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(${cyan},${0.07 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      hexFloats.forEach(h => {
        h.y += h.vy * 0.3;
        if (h.y > canvas.height + 20) h.y = -20;
        if (h.y < -20) h.y = canvas.height + 20;
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.fillStyle = `rgba(${green},${h.opacity})`;
        ctx.fillText(h.val, h.x, h.y);
      });

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return (localStorage.getItem("cipherlab-theme") as Theme) || "dark"; } catch { return "dark"; }
  });
  const [activeTab, setActiveTab] = useState<Tab>("cipher");
  const [plaintext, setPlaintext] = useState("");
  const [ciphertext, setCiphertext] = useState("");
  const [selectedCipher, setSelectedCipher] = useState<CipherKey>("caesar");
  const [cipherKey, setCipherKey] = useState("3");
  const [mode, setMode] = useState<Mode>("encrypt");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [animChars, setAnimChars] = useState<AnimChar[]>([]);
  const [animOutput, setAnimOutput] = useState("");
  const [showAnim, setShowAnim] = useState(false);
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [solutionSteps, setSolutionSteps] = useState<string[]>([]);

  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    try { localStorage.setItem("cipherlab-theme", theme); } catch { /* noop */ }
  }, [theme]);

  const currentCipher = CIPHER_CONFIG.find(c => c.id === selectedCipher)!;

  const validate = (): string => {
    if (!plaintext.trim()) return "Please enter some text to process.";
    if (selectedCipher === "caesar") {
      const n = parseInt(cipherKey);
      if (isNaN(n) || n < 1 || n > 25) return "Caesar shift must be between 1 and 25.";
    }
    if (selectedCipher === "vigenere" && !cipherKey.replace(/[^a-zA-Z]/g, "")) {
      return "Vigenère key must contain at least one letter.";
    }
    if (selectedCipher === "railfence") {
      const n = parseInt(cipherKey);
      if (isNaN(n) || n < 2 || n > 10) return "Rail count must be between 2 and 10.";
    }
    if (selectedCipher === "hill") {
      const matrix = parseHillMatrix(cipherKey);
      if (matrix.length !== 2) return "Hill Cipher currently supports a 2x2 key matrix like: 3 3 2 5.";
      if (!inverseHillMatrix(matrix)) return "Hill key matrix must be invertible modulo 26. Try: 3 3 2 5.";
    }
    if (selectedCipher === "monoalphabetic") {
      const cleaned = cipherKey.toUpperCase().replace(/[^A-Z]/g, "");
      if (cleaned.length !== 26 || new Set(cleaned).size !== 26) return "Monoalphabetic key must contain all 26 letters exactly once.";
    }
    return "";
  };

  const handleProcess = async () => {
    const err = validate();
    if (err) { setError(err); setTimeout(() => setError(""), 3500); return; }

    setError("");
    setIsProcessing(true);
    setShowAnim(true);
    setAnimOutput("");
    setCiphertext("");

    const result = processCipher(selectedCipher, plaintext, cipherKey, mode === "decrypt");
    setSolutionSteps(buildSolutionSteps(selectedCipher, plaintext, cipherKey, mode === "decrypt", result));
    const chars = result.split("").map(c => ({ char: "?", final: c, done: false }));
    setAnimChars(chars);

    const scramble = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%*";
    const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
    const perChar = Math.max(15, Math.min(40, 1200 / Math.max(chars.length, 1)));

    for (let i = 0; i < chars.length; i++) {
      await delay(perChar);
      for (let s = 0; s < 3; s++) {
        await delay(35);
        setAnimChars(prev => prev.map((c, idx) =>
          idx === i ? { ...c, char: scramble[Math.floor(Math.random() * scramble.length)] } : c
        ));
      }
      setAnimChars(prev => prev.map((c, idx) =>
        idx === i ? { ...c, char: c.final, done: true } : c
      ));
    }

    let displayed = "";
    const typeDelay = Math.max(8, Math.min(20, 800 / Math.max(result.length, 1)));
    for (let i = 0; i < result.length; i++) {
      displayed += result[i];
      setAnimOutput(displayed);
      await delay(typeDelay);
    }

    setCiphertext(result);
    setIsProcessing(false);

    setHistory(prev => [{
      id: Date.now().toString(),
      cipher: EDU[selectedCipher].name,
      mode, input: plaintext, output: result,
      key: cipherKey, timestamp: new Date(),
    }, ...prev].slice(0, 50));
  };

  const handleCopy = async () => {
    if (!ciphertext) return;
    try { await navigator.clipboard.writeText(ciphertext); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!ciphertext) return;
    const blob = new Blob([ciphertext], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedCipher}-${mode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setPlaintext(""); setCiphertext(""); setAnimOutput("");
    setShowAnim(false); setAnimChars([]); setError(""); setSolutionSteps([]);
  };

  const filteredHistory = history.filter(h =>
    h.cipher.toLowerCase().includes(historySearch.toLowerCase()) ||
    h.input.toLowerCase().includes(historySearch.toLowerCase()) ||
    h.output.toLowerCase().includes(historySearch.toLowerCase())
  );

  // ── Style helpers ──
  const cardBg = isDark
    ? "bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/20"
    : "bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xl shadow-slate-200/60";
  const tp = isDark ? "text-white" : "text-slate-900";
  const ts = isDark ? "text-[#94A3B8]" : "text-slate-500";
  const accentColor = isDark ? "text-[#00E5FF]" : "text-blue-600";
  const inputCls = isDark
    ? "bg-white/[0.06] border-white/[0.10] text-white placeholder-[#4B5563] focus:border-[#00E5FF]/50 focus:ring-[#00E5FF]/20"
    : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:ring-blue-500/20";
  const greenText = isDark ? "text-[#00FF95]" : "text-green-600";

  const NavItem = ({ id, Icon, label }: { id: Tab; Icon: typeof Lock; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex flex-col items-center gap-1 px-5 py-2.5 rounded-xl transition-all duration-200 min-w-[64px]
        ${activeTab === id ? (isDark ? "text-[#00E5FF]" : "text-blue-600") : ts}`}
      aria-label={label}
      aria-current={activeTab === id ? "page" : undefined}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );

  return (
    <div
      className={`min-h-screen ${isDark ? "bg-[#070B14]" : "bg-slate-50"} ${tp} relative overflow-x-hidden`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <AnimatedBackground isDark={isDark} />

      {/* ambient glow orbs */}
      <div
        className="fixed top-1/4 left-1/3 w-[600px] h-[600px] rounded-full pointer-events-none z-0 opacity-30"
        style={{ background: isDark ? "radial-gradient(circle, rgba(0,229,255,0.07) 0%, transparent 65%)" : "radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 65%)" }}
        aria-hidden="true"
      />
      <div
        className="fixed bottom-1/4 right-1/4 w-96 h-96 rounded-full pointer-events-none z-0 opacity-30"
        style={{ background: isDark ? "radial-gradient(circle, rgba(0,255,149,0.06) 0%, transparent 65%)" : "radial-gradient(circle, rgba(0,180,100,0.07) 0%, transparent 65%)" }}
        aria-hidden="true"
      />

      <div className="flex min-h-screen relative z-10">
        {/* ═══ Desktop Sidebar ═══════════════════════════════════════════════ */}
        <aside
          className={`hidden lg:flex flex-col w-64 fixed top-0 left-0 h-full z-20 ${cardBg} border-r`}
          style={{ borderRight: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)" }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 p-6 pb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #00E5FF 0%, #3B82F6 100%)" }}
            >
              <Shield className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <div className={`font-bold text-lg leading-none ${tp}`}>CipherLab</div>
              <div className={`text-xs mt-0.5 ${ts}`}>v2.0 · Secure</div>
            </div>
          </div>

          <div className={`mx-4 h-px ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`} />

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
            {([
              { id: "cipher" as Tab,      Icon: Lock,     label: "Cipher",      badge: 0          },
              { id: "educational" as Tab, Icon: BookOpen, label: "Learn",       badge: 0          },
              { id: "history" as Tab,     Icon: History,  label: "History",     badge: history.length },
            ]).map(({ id, Icon, label, badge }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                aria-current={activeTab === id ? "page" : undefined}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left
                  ${activeTab === id
                    ? isDark ? "bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 shadow-lg shadow-[#00E5FF]/5" : "bg-blue-50 text-blue-700 border border-blue-200"
                    : `${ts} hover:bg-white/[0.05] border border-transparent`
                  }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="font-medium">{label}</span>
                {badge > 0 && (
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-semibold
                    ${isDark ? "bg-[#00E5FF]/20 text-[#00E5FF]" : "bg-blue-100 text-blue-600"}`}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className={`mx-4 h-px ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`} />

          {/* Bottom of sidebar */}
          <div className="p-4 space-y-3">
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all duration-200 ${ts} hover:bg-white/[0.05] border border-transparent`}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
              <span className="font-medium">{isDark ? "Light Mode" : "Dark Mode"}</span>
            </button>

            <div className={`p-4 rounded-xl ${isDark ? "bg-white/[0.04]" : "bg-slate-50"} border ${isDark ? "border-white/[0.06]" : "border-slate-100"}`}>
              <div className={`text-xs ${ts} mb-1`}>Session Stats</div>
              <div className={`text-3xl font-bold tracking-tight ${accentColor}`}>{history.length}</div>
              <div className={`text-xs ${ts}`}>Operations Run</div>
            </div>
          </div>
        </aside>

        {/* ═══ Main Content ═══════════════════════════════════════════════════ */}
        <main className="flex-1 lg:ml-64 pb-28 lg:pb-10">

          {/* Mobile header */}
          <header className={`lg:hidden sticky top-0 z-20 ${cardBg} border-b px-4 py-3 flex items-center justify-between`}
                  style={{ borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ background: "linear-gradient(135deg, #00E5FF, #3B82F6)" }}>
                <Shield className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <span className={`font-bold text-lg ${tp}`}>CipherLab</span>
            </div>
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={`p-2 rounded-lg ${ts} hover:bg-white/10 transition-all`}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </header>

          <div className="max-w-xl lg:max-w-3xl mx-auto px-4 pt-6 space-y-4">

            {/* ══════════ CIPHER TAB ══════════════════════════════════════════ */}
            {activeTab === "cipher" && (
              <>
                {/* Hero */}
                <div className={`${cardBg} rounded-3xl p-6 lg:p-8 relative overflow-hidden`}
                     style={{ animation: "slideUp 0.5s ease-out both" }}>
                  <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                       style={{ background: "linear-gradient(135deg, #00E5FF 0%, #3B82F6 50%, #00FF95 100%)" }}
                       aria-hidden="true" />
                  <div className="relative">
                    <div className={`text-xs font-mono ${accentColor} mb-3 flex items-center gap-2`}>
                      <span className="w-2 h-2 rounded-full bg-[#00FF95] animate-pulse inline-block" aria-hidden="true" />
                      SECURE CIPHER ENGINE · ACTIVE
                    </div>
                    <h1 className={`text-2xl lg:text-4xl font-extrabold ${tp} leading-tight`}>
                      Classical{" "}
                      <span style={{ background: "linear-gradient(90deg, #00E5FF, #3B82F6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                        Cryptography
                      </span>
                    </h1>
                    <p className={`${ts} mt-2 text-sm lg:text-base`}>
                      Encrypt and decrypt messages using time-tested classical cipher algorithms.
                    </p>
                  </div>
                </div>

                {/* Input card */}
                <div className={`${cardBg} rounded-3xl p-5 lg:p-6`}
                     style={{ animation: "slideUp 0.5s ease-out 0.06s both" }}>
                  <label className={`text-xs font-bold ${accentColor} uppercase tracking-widest mb-3 block`} htmlFor="plaintext-input">
                    {mode === "encrypt" ? "Plaintext Input" : "Ciphertext Input"}
                  </label>
                  <textarea
                    id="plaintext-input"
                    value={plaintext}
                    onChange={e => setPlaintext(e.target.value)}
                    placeholder={mode === "encrypt" ? "Enter your secret message here…" : "Paste ciphertext to decrypt…"}
                    rows={4}
                    aria-required="true"
                    className={`w-full rounded-2xl p-4 text-base resize-none outline-none transition-all duration-200 border focus:ring-2 font-mono ${inputCls}`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  />
                  <div className={`mt-1.5 text-xs ${ts} text-right`} aria-live="polite">
                    {plaintext.length} characters
                  </div>
                </div>

                {/* Cipher selection */}
                <div className={`${cardBg} rounded-3xl p-5 lg:p-6`}
                     style={{ animation: "slideUp 0.5s ease-out 0.10s both" }}>
                  <div className={`text-xs font-bold ${accentColor} uppercase tracking-widest mb-3`}>Select Cipher</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" role="group" aria-label="Cipher selection">
                    {CIPHER_CONFIG.map(cipher => (
                      <button
                        key={cipher.id}
                        onClick={() => { setSelectedCipher(cipher.id); setCipherKey(cipher.keyDefault); }}
                        aria-pressed={selectedCipher === cipher.id}
                        className={`flex flex-col items-center gap-1.5 p-3 lg:p-4 rounded-2xl border transition-all duration-200 text-sm font-semibold
                          ${selectedCipher === cipher.id
                            ? isDark
                              ? "bg-[#00E5FF]/10 border-[#00E5FF]/40 text-[#00E5FF] shadow-lg shadow-[#00E5FF]/10 scale-[1.02]"
                              : "bg-blue-50 border-blue-400 text-blue-700 shadow-lg shadow-blue-200/50 scale-[1.02]"
                            : isDark
                              ? `border-white/[0.08] ${ts} hover:bg-white/[0.05] hover:border-white/20 hover:scale-[1.01]`
                              : `border-slate-200 ${ts} hover:bg-slate-50 hover:scale-[1.01]`
                          }`}
                        style={{ transitionProperty: "all" }}
                      >
                        <span className="text-xl" aria-hidden="true">{cipher.icon}</span>
                        <span>{cipher.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Key input */}
                {currentCipher.hasKey && (
                  <div className={`${cardBg} rounded-3xl p-5 lg:p-6`}
                       style={{ animation: "slideUp 0.5s ease-out 0.14s both" }}>
                    <label className={`text-xs font-bold ${accentColor} uppercase tracking-widest mb-3 block`} htmlFor="cipher-key">
                      {currentCipher.keyLabel}
                    </label>
                    <input
                      id="cipher-key"
                      type={currentCipher.keyType === "number" ? "number" : "text"}
                      value={cipherKey}
                      onChange={e => setCipherKey(e.target.value)}
                      placeholder={currentCipher.keyDefault}
                      min={currentCipher.id === "caesar" ? 1 : 2}
                      max={currentCipher.id === "caesar" ? 25 : 10}
                      className={`w-full rounded-2xl p-4 text-base outline-none border transition-all duration-200 focus:ring-2 ${inputCls}`}
                      aria-describedby="key-hint"
                    />
                    <div id="key-hint" className={`mt-1.5 text-xs ${ts}`}>
                      {currentCipher.id === "caesar" && "Integer between 1 and 25."}
                      {currentCipher.id === "vigenere" && "Alphabetic keyword only (A–Z). Case insensitive."}
                      {currentCipher.id === "railfence" && "Integer between 2 and 10."}
                    </div>
                  </div>
                )}

                {/* Mode + Action */}
                <div className={`${cardBg} rounded-3xl p-5 lg:p-6`}
                     style={{ animation: "slideUp 0.5s ease-out 0.18s both" }}>

                  {/* Mode toggle */}
                  <div className="flex gap-2 mb-5" role="group" aria-label="Operation mode">
                    {(["encrypt", "decrypt"] as Mode[]).map(m => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        aria-pressed={mode === m}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 capitalize
                          ${mode === m
                            ? isDark ? "bg-[#00E5FF]/12 text-[#00E5FF] border border-[#00E5FF]/30 shadow-inner" : "bg-blue-600 text-white border border-blue-700"
                            : isDark ? `${ts} border border-white/[0.08] hover:bg-white/[0.05]` : `${ts} border border-slate-200 hover:bg-slate-50`
                          }`}
                      >
                        {m === "encrypt" ? <Lock className="w-4 h-4" aria-hidden="true" /> : <Unlock className="w-4 h-4" aria-hidden="true" />}
                        {m}
                      </button>
                    ))}
                  </div>

                  {/* Error */}
                  {error && (
                    <div
                      role="alert"
                      className={`flex items-center gap-2 p-3 rounded-xl mb-4 text-sm ${isDark ? "bg-red-500/10 border border-red-500/25 text-red-400" : "bg-red-50 border border-red-200 text-red-600"}`}
                      style={{ animation: "shake 0.4s ease-out" }}
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      {error}
                    </div>
                  )}

                  {/* Main button */}
                  <button
                    onClick={handleProcess}
                    disabled={isProcessing}
                    className="w-full h-14 rounded-2xl font-bold text-base text-[#070B14] flex items-center justify-center gap-3 transition-all duration-200 relative overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
                    style={{
                      background: isProcessing ? (isDark ? "#1a2744" : "#dbeafe") : "linear-gradient(135deg, #00E5FF 0%, #3B82F6 100%)",
                      color: isProcessing ? (isDark ? "#94A3B8" : "#64748b") : "#fff",
                      boxShadow: isProcessing ? "none" : "0 0 32px rgba(0,229,255,0.28), 0 4px 16px rgba(59,130,246,0.3)",
                    }}
                    aria-busy={isProcessing}
                  >
                    {isProcessing ? (
                      <><span className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" aria-hidden="true" /> Processing…</>
                    ) : (
                      <>
                        {mode === "encrypt" ? <Lock className="w-5 h-5" aria-hidden="true" /> : <Unlock className="w-5 h-5" aria-hidden="true" />}
                        {mode === "encrypt" ? "Encrypt Message 🔒" : "Decrypt Message 🔓"}
                      </>
                    )}
                  </button>

                  {/* Secondary buttons */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleClear}
                      className={`flex-1 h-12 rounded-xl border font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200
                        ${isDark ? `border-white/[0.08] ${ts} hover:bg-white/[0.05]` : `border-slate-200 ${ts} hover:bg-slate-50`}`}
                    >
                      <RotateCcw className="w-4 h-4" aria-hidden="true" /> Clear 🗑️
                    </button>
                  </div>
                </div>

                {/* Cipher character animation */}
                {showAnim && animChars.length > 0 && (
                  <div className={`${cardBg} rounded-3xl p-5 lg:p-6`}
                       style={{ animation: "slideUp 0.35s ease-out both" }}
                       aria-live="polite" aria-label="Cipher animation">
                    <div className={`text-xs font-bold ${accentColor} uppercase tracking-widest mb-3 flex items-center gap-2`}>
                      <Zap className="w-4 h-4" aria-hidden="true" />
                      Character-by-Character Cipher Animation
                    </div>
                    <div className="flex flex-wrap gap-1.5" role="img" aria-label="Cipher transformation animation">
                      {animChars.map((c, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold font-mono transition-all duration-150
                            ${c.done
                              ? isDark ? "bg-[#00FF95]/10 text-[#00FF95] border border-[#00FF95]/20" : "bg-green-50 text-green-700 border border-green-200"
                              : isDark ? "bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 animate-pulse" : "bg-blue-50 text-blue-600 border border-blue-200 animate-pulse"
                            }`}
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {c.char === " " ? "·" : c.char}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Output card */}
                {(animOutput || ciphertext) && (
                  <div className={`${cardBg} rounded-3xl p-5 lg:p-6`}
                       style={{ animation: "slideUp 0.35s ease-out both" }}>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <label className={`text-xs font-bold uppercase tracking-widest ${greenText}`}>
                        {mode === "encrypt" ? "Encrypted Output ✓" : "Decrypted Output ✓"}
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCopy}
                          className={`h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200
                            ${isDark ? "bg-white/[0.06] border border-white/[0.08] text-[#94A3B8] hover:bg-white/10" : "bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200"}`}
                          aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-green-400" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                          {copied ? "Copied! ✓" : "Copy 📋"}
                        </button>
                        <button
                          onClick={handleDownload}
                          disabled={!ciphertext}
                          className={`h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200
                            ${isDark ? "bg-white/[0.06] border border-white/[0.08] text-[#94A3B8] hover:bg-white/10" : "bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200"}`}
                          aria-label="Download as text file"
                        >
                          <Download className="w-3.5 h-3.5" aria-hidden="true" /> Download ⬇️
                        </button>
                      </div>
                    </div>
                    <div
                      className={`p-4 rounded-2xl border text-sm break-all leading-relaxed min-h-[80px]
                        ${isDark ? "bg-[#00FF95]/[0.04] border-[#00FF95]/15 text-[#00FF95]" : "bg-green-50 border-green-200 text-green-700"}`}
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      aria-live="polite"
                    >
                      {animOutput}
                      {isProcessing && <span className="animate-[blink_0.8s_step-end_infinite]" aria-hidden="true">▌</span>}
                    </div>
                    {ciphertext && !isProcessing && (
                      <div className={`mt-2 text-xs ${ts}`}>
                        {ciphertext.length} characters · {EDU[selectedCipher].name} · {mode}ed
                      </div>
                    )}
                  </div>
                )}

                {solutionSteps.length > 0 && (
                  <div className={`${cardBg} rounded-3xl p-5 lg:p-6`}
                       style={{ animation: "slideUp 0.35s ease-out both" }}>
                    <div className={`text-xs font-bold ${accentColor} uppercase tracking-widest mb-3`}>Steps Used To Solve</div>
                    <ol className="space-y-2">
                      {solutionSteps.map((step, index) => (
                        <li key={index} className={`flex gap-3 text-sm ${ts}`}>
                          <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? "bg-[#00E5FF]/10 text-[#00E5FF]" : "bg-blue-50 text-blue-700"}`}>{index + 1}</span>
                          <span className="leading-relaxed break-words">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            )}

            {/* ══════════ EDUCATIONAL TAB ═════════════════════════════════════ */}
            {activeTab === "educational" && (
              <>
                <div className={`${cardBg} rounded-3xl p-6 lg:p-8`}
                     style={{ animation: "slideUp 0.45s ease-out both" }}>
                  <div className={`text-xs font-mono ${accentColor} mb-3`}>CRYPTOGRAPHY ENCYCLOPEDIA</div>
                  <h2 className={`text-2xl lg:text-3xl font-extrabold ${tp}`}>Learn the Ciphers</h2>
                  <p className={`${ts} mt-1 text-sm`}>
                    Dive deep into the mathematics, history, and security properties of each algorithm.
                  </p>
                </div>

                <div className="space-y-3">
                  {(Object.entries(EDU) as [CipherKey, typeof EDU[CipherKey]][]).map(([key, data], index) => (
                    <div
                      key={key}
                      className={`${cardBg} rounded-3xl overflow-hidden`}
                      style={{ animation: `slideUp 0.45s ease-out ${index * 0.06}s both` }}
                    >
                      <button
                        onClick={() => setExpandedAccordion(expandedAccordion === key ? null : key)}
                        className={`w-full flex items-center justify-between p-5 lg:p-6 text-left transition-colors duration-200 hover:bg-white/[0.03]`}
                        aria-expanded={expandedAccordion === key}
                        aria-controls={`accordion-${key}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl" aria-hidden="true">{data.icon}</span>
                          <div>
                            <div className={`font-bold ${tp}`}>{data.name}</div>
                            <div className={`text-xs ${ts} mt-0.5`}>
                              Time: {data.timeComplexity} · Space: {data.spaceComplexity}
                            </div>
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 ${ts} transition-transform duration-300 shrink-0 ${expandedAccordion === key ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        />
                      </button>

                      {expandedAccordion === key && (
                        <div
                          id={`accordion-${key}`}
                          className={`px-5 pb-5 lg:px-6 lg:pb-6 border-t ${isDark ? "border-white/[0.06]" : "border-slate-100"}`}
                          style={{ animation: "slideDown 0.3s ease-out" }}
                        >
                          <div className="pt-4 space-y-4">
                            {/* Definition */}
                            <div>
                              <div className={`text-xs font-bold ${accentColor} uppercase tracking-wider mb-1.5`}>Definition</div>
                              <p className={`text-sm ${ts} leading-relaxed`}>{data.definition}</p>
                            </div>

                            {/* Formula */}
                            <div>
                              <div className={`text-xs font-bold ${accentColor} uppercase tracking-wider mb-1.5`}>Formula</div>
                              <div
                                className={`p-3 rounded-xl text-sm ${isDark ? "bg-[#00E5FF]/[0.07] text-[#00E5FF] border border-[#00E5FF]/15" : "bg-blue-50 text-blue-700 border border-blue-100"}`}
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                              >
                                {data.formula}
                              </div>
                            </div>

                            {/* Example */}
                            <div>
                              <div className={`text-xs font-bold ${accentColor} uppercase tracking-wider mb-1.5`}>Worked Example</div>
                              <div
                                className={`p-3 rounded-xl text-sm ${isDark ? "bg-[#00FF95]/[0.05] text-[#00FF95] border border-[#00FF95]/15" : "bg-green-50 text-green-700 border border-green-100"}`}
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                              >
                                {data.example}
                              </div>
                            </div>

                            {/* Pros/Cons */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Advantages</div>
                                <ul className="space-y-1.5">
                                  {data.advantages.map((a, i) => (
                                    <li key={i} className={`flex items-start gap-2 text-xs ${ts}`}>
                                      <span className="text-emerald-400 mt-0.5 shrink-0" aria-hidden="true">✓</span> {a}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Disadvantages</div>
                                <ul className="space-y-1.5">
                                  {data.disadvantages.map((d, i) => (
                                    <li key={i} className={`flex items-start gap-2 text-xs ${ts}`}>
                                      <span className="text-red-400 mt-0.5 shrink-0" aria-hidden="true">✗</span> {d}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Applications */}
                            <div>
                              <div className={`text-xs font-bold ${accentColor} uppercase tracking-wider mb-2`}>Real-World Applications</div>
                              <div className="flex flex-wrap gap-2">
                                {data.applications.map((app, i) => (
                                  <span
                                    key={i}
                                    className={`text-xs px-2.5 py-1 rounded-full ${isDark ? "bg-white/[0.06] text-[#94A3B8] border border-white/[0.08]" : "bg-slate-100 text-slate-600"}`}
                                  >
                                    {app}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Complexity */}
                            <div className="grid grid-cols-2 gap-3">
                              {([
                                { label: "Time Complexity", value: data.timeComplexity },
                                { label: "Space Complexity", value: data.spaceComplexity },
                              ]).map(c => (
                                <div key={c.label} className={`p-3 rounded-xl ${isDark ? "bg-white/[0.04] border border-white/[0.06]" : "bg-slate-50 border border-slate-100"}`}>
                                  <div className={`text-xs ${ts} mb-1`}>{c.label}</div>
                                  <div
                                    className={`text-sm font-bold ${accentColor}`}
                                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                  >
                                    {c.value}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Try it button */}
                            <button
                              onClick={() => { setSelectedCipher(key as CipherKey); setActiveTab("cipher"); setExpandedAccordion(null); }}
                              className={`w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200
                                ${isDark ? "bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/25 hover:bg-[#00E5FF]/15" : "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"}`}
                            >
                              <Lock className="w-4 h-4" aria-hidden="true" /> Try {data.name} →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ══════════ HISTORY TAB ═════════════════════════════════════════ */}
            {activeTab === "history" && (
              <>
                <div className={`${cardBg} rounded-3xl p-6 lg:p-8`}
                     style={{ animation: "slideUp 0.45s ease-out both" }}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className={`text-xs font-mono ${accentColor} mb-2`}>OPERATION LOG</div>
                      <h2 className={`text-2xl lg:text-3xl font-extrabold ${tp}`}>History</h2>
                    </div>
                    {history.length > 0 && (
                      <button
                        onClick={() => setHistory([])}
                        className={`h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all
                          ${isDark ? "text-red-400 border border-red-500/20 hover:bg-red-500/10" : "text-red-500 border border-red-200 hover:bg-red-50"}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Clear All
                      </button>
                    )}
                  </div>
                </div>

                {history.length > 0 && (
                  <div className={`${cardBg} rounded-3xl p-4`}
                       style={{ animation: "slideUp 0.45s ease-out 0.06s both" }}>
                    <div className="relative">
                      <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${ts}`} aria-hidden="true" />
                      <input
                        type="search"
                        value={historySearch}
                        onChange={e => setHistorySearch(e.target.value)}
                        placeholder="Search history…"
                        aria-label="Search history"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm border outline-none transition-all focus:ring-2 ${inputCls}`}
                      />
                    </div>
                  </div>
                )}

                {history.length === 0 ? (
                  <div className={`${cardBg} rounded-3xl p-14 text-center`}>
                    <History className={`w-12 h-12 ${ts} mx-auto mb-4 opacity-40`} aria-hidden="true" />
                    <p className={`${ts} text-sm`}>No operations yet. Switch to Cipher and start encrypting!</p>
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className={`${cardBg} rounded-3xl p-10 text-center`}>
                    <Search className={`w-10 h-10 ${ts} mx-auto mb-3 opacity-40`} aria-hidden="true" />
                    <p className={`${ts} text-sm`}>No results for "{historySearch}"</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile: Cards */}
                    <div className="lg:hidden space-y-3" aria-label="History list">
                      {filteredHistory.map((entry, i) => (
                        <div
                          key={entry.id}
                          className={`${cardBg} rounded-2xl p-4`}
                          style={{ animation: `slideUp 0.35s ease-out ${i * 0.04}s both` }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold
                                ${entry.mode === "encrypt"
                                  ? isDark ? "bg-[#00E5FF]/10 text-[#00E5FF]" : "bg-blue-100 text-blue-600"
                                  : isDark ? "bg-[#00FF95]/10 text-[#00FF95]" : "bg-green-100 text-green-700"
                                }`}>
                                {entry.mode}
                              </span>
                              <span className={`text-xs font-bold ${tp}`}>{entry.cipher}</span>
                              {entry.key && <span className={`text-xs ${ts}`}>key: {entry.key}</span>}
                            </div>
                            <span className={`text-xs ${ts} shrink-0`}>{entry.timestamp.toLocaleTimeString()}</span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <div className={`text-xs ${ts} mb-0.5`}>Input</div>
                              <div className={`text-xs font-mono truncate ${tp}`}
                                   style={{ fontFamily: "'JetBrains Mono', monospace" }}>{entry.input}</div>
                            </div>
                            <div>
                              <div className={`text-xs ${ts} mb-0.5`}>Output</div>
                              <div className={`text-xs font-mono truncate ${greenText}`}
                                   style={{ fontFamily: "'JetBrains Mono', monospace" }}>{entry.output}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop: Table */}
                    <div className={`hidden lg:block ${cardBg} rounded-3xl overflow-hidden`}
                         style={{ animation: "slideUp 0.45s ease-out 0.08s both" }}>
                      <table className="w-full text-sm" aria-label="Cipher operation history">
                        <thead>
                          <tr className={`border-b ${isDark ? "border-white/[0.06]" : "border-slate-100"}`}>
                            {["Time", "Cipher", "Mode", "Key", "Input", "Output"].map(h => (
                              <th
                                key={h}
                                scope="col"
                                className={`text-left px-5 py-4 text-xs font-bold ${ts} uppercase tracking-widest`}
                              >{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredHistory.map((entry, i) => (
                            <tr
                              key={entry.id}
                              className={`border-b transition-colors duration-150 ${isDark ? "border-white/[0.04] hover:bg-white/[0.02]" : "border-slate-50 hover:bg-slate-50/70"}`}
                              style={{ animation: `slideUp 0.3s ease-out ${i * 0.025}s both` }}
                            >
                              <td className={`px-5 py-3.5 text-xs ${ts} whitespace-nowrap`}>{entry.timestamp.toLocaleTimeString()}</td>
                              <td className={`px-5 py-3.5 font-semibold ${tp} whitespace-nowrap`}>{entry.cipher}</td>
                              <td className="px-5 py-3.5">
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap
                                  ${entry.mode === "encrypt"
                                    ? isDark ? "bg-[#00E5FF]/10 text-[#00E5FF]" : "bg-blue-100 text-blue-600"
                                    : isDark ? "bg-[#00FF95]/10 text-[#00FF95]" : "bg-green-100 text-green-700"
                                  }`}>
                                  {entry.mode}
                                </span>
                              </td>
                              <td className={`px-5 py-3.5 text-xs font-mono ${ts}`}
                                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>{entry.key || "—"}</td>
                              <td className={`px-5 py-3.5 text-xs font-mono max-w-[160px] truncate ${tp}`}
                                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>{entry.input}</td>
                              <td className={`px-5 py-3.5 text-xs font-mono max-w-[160px] truncate ${greenText}`}
                                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>{entry.output}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className={`px-5 py-3 text-xs ${ts} border-t ${isDark ? "border-white/[0.06]" : "border-slate-100"}`}>
                        Showing {filteredHistory.length} of {history.length} operations
                      </div>
                    </div>
                  </>
                )}

              </>
            )}
          </div>
        </main>
      </div>

      {/* ═══ Mobile Bottom Navigation ═══════════════════════════════════════ */}
      <nav
        className={`lg:hidden fixed bottom-0 inset-x-0 z-30 ${isDark ? "bg-[#0E1628]/95" : "bg-white/95"} backdrop-blur-xl border-t ${isDark ? "border-white/[0.08]" : "border-slate-200"} px-2 py-1`}
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          <NavItem id="cipher" Icon={Lock} label="Cipher" />
          <NavItem id="educational" Icon={BookOpen} label="Learn" />
          <NavItem id="history" Icon={History} label="History" />
        </div>
      </nav>

      {/* ═══ Global keyframe styles ══════════════════════════════════════════ */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0);     }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0);  }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px);  }
          60%       { transform: translateX(-5px); }
          80%       { transform: translateX(5px);  }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,229,255,0.2); border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,229,255,0.35); }
      `}</style>
    </div>
  );
}
