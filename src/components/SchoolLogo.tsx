"use client";

import { useId, useState } from "react";

const LEAVES: Array<[number, number, number]> = [
  [52, 207, -30],
  [44, 195, -48],
  [39, 181, -66],
  [37, 166, -84],
  [40, 151, -100],
  [47, 139, -116],
  [55, 130, -130],
];

export default function SchoolLogo({ size = 36, className = "" }: { size?: number; className?: string }) {
  const [spinning, setSpinning] = useState(false);
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const arcTopId = `arcTop${rawId}`;
  const ringTopId = `ringTop${rawId}`;
  const ringBottomId = `ringBottom${rawId}`;
  const stop = () => setSpinning(false);

  return (
    <span
      className={`school-logo ${spinning ? "spinning" : ""} ${className}`.trim()}
      style={{ width: size, height: size * 1.5 }}
      role="img"
      aria-label="Rosmini Secondary School Tanga crest. Touch to spin."
      tabIndex={0}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") setSpinning(true);
      }}
      onPointerDown={(event) => {
        event.preventDefault();
        setSpinning(true);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setSpinning(true);
        }
      }}
      onKeyUp={stop}
    >
      <svg viewBox="0 0 200 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path id={arcTopId} d="M26 76 Q100 20 174 76" />
        <text fontSize="15" fontStyle="italic" fontFamily="Georgia, serif" fill="#212a3a" letterSpacing="1.2">
          <textPath href={`#${arcTopId}`} startOffset="50%" textAnchor="middle">
            Secondary School
          </textPath>
        </text>
        <g transform="translate(100 86)">
          <path d="M-17 -7 Q-8.5 -11.5 0 -7 Q8.5 -11.5 17 -7 L17 6 Q8.5 1.5 0 6 Q-8.5 1.5 -17 6 Z" fill="#f2c14e" stroke="#212a3a" strokeWidth="1" />
          <path d="M0 -7 V6" stroke="#212a3a" strokeWidth="1" />
          <path d="M-11.5 -6 L-11.5 4.5 M-6.5 -7.5 L-6.5 3 M6.5 -7.5 L6.5 3 M11.5 -6 L11.5 4.5" stroke="#b9862f" strokeWidth="0.8" />
          <path d="M8 -6 L8 2 L4.6 0 Z" fill="#1b3f94" />
        </g>
        <text x="100" y="124" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="34" fill="#c8102e">
          Rosmini
        </text>
        <g fill="#2f7d4f">
          {LEAVES.map(([x, y, angle]) => (
            <g key={`leaf-${x}-${y}`}>
              <ellipse cx={x} cy={y} rx="7.5" ry="2.6" transform={`rotate(${angle} ${x} ${y})`} />
              <ellipse cx={200 - x} cy={y} rx="7.5" ry="2.6" transform={`rotate(${-angle} ${200 - x} ${y})`} />
            </g>
          ))}
        </g>
        <path d="M57 218 C 33 194 33 158 58 132" stroke="#2f7d4f" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M143 218 C 167 194 167 158 142 132" stroke="#2f7d4f" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M100 130 L140 142 V176 Q140 206 100 218 Q60 206 60 176 V142 Z" fill="#ffffff" stroke="#1b3f94" strokeWidth="3" />
        <path d="M100 138 L133 148 V175 Q133 199 100 210 Q67 199 67 175 V148 Z" fill="none" stroke="#1b3f94" strokeWidth="1" />
        <circle cx="100" cy="172" r="31" fill="#c8102e" />
        <circle cx="100" cy="172" r="21" fill="#ffffff" stroke="#8e0e22" strokeWidth="0.8" />
        <path id={ringTopId} d="M79 160.4 A24 24 0 0 1 121 160.4" />
        <text fontSize="6.4" fontWeight="700" fontFamily="Georgia, serif" fill="#ffffff" letterSpacing="0.6">
          <textPath href={`#${ringTopId}`} startOffset="50%" textAnchor="middle">
            LEIS PLENITUDO
          </textPath>
        </text>
        <path id={ringBottomId} d="M79 183.6 A24 24 0 0 0 121 183.6" />
        <text fontSize="6.4" fontWeight="700" fontFamily="Georgia, serif" fill="#ffffff" letterSpacing="0.6">
          <textPath href={`#${ringBottomId}`} startOffset="50%" textAnchor="middle">
            CARMATIS
          </textPath>
        </text>
        <g transform="translate(100 172) scale(0.8) fill=#212a3a">
          <path
            fill="#212a3a"
            d="M0 -12 C-1.4 -12 -2.5 -11 -3 -9.7 C-6.8 -11.6 -11.2 -11.4 -14.9 -8.9 C-17.8 -7 -19.6 -4.3 -20.1 -1.2 L-14.5 -1.8 C-14.8 0.4 -14.2 2.7 -12.8 4.5 L-17.8 6.9 C-14.6 9.4 -10.1 10.5 -5.6 9.8 L-2.5 5.6 L0 9.8 L2.5 5.6 L5.6 9.8 C10.1 10.5 14.6 9.4 17.8 6.9 L12.8 4.5 C14.2 2.7 14.8 0.4 14.5 -1.8 L20.1 -1.2 C19.6 -4.3 17.8 -7 14.9 -8.9 C11.2 -11.4 6.8 -11.6 3 -9.7 C2.5 -11 1.4 -12 0 -12 Z"
          />
          <circle cx="0" cy="-7.6" r="1.6" fill="#c8102e" />
        </g>
        <path d="M28 214 L44 207 L44 231 L28 224 Z" fill="#d9a441" />
        <path d="M172 214 L156 207 L156 231 L172 224 Z" fill="#d9a441" />
        <path d="M44 207 H156 L150 219 L156 231 H44 L50 219 Z" fill="#f2c14e" stroke="#c08a2e" strokeWidth="0.8" />
        <text x="100" y="223" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="700" fontSize="10.5" fill="#c8102e">
          Love to be the Law
        </text>
        <text x="100" y="264" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="30" fill="#c8102e">
          Tanga
        </text>
        <text x="100" y="284" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="12.5" fill="#212a3a">
          Education For Development
        </text>
      </svg>
    </span>
  );
}
