import { ImageResponse } from "next/og";

export const alt = "Billigaste timmen – elpriset timme för timme i SE1–SE4";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Staplarna från ikonen: tre grå och en grön, billigaste
const bars = [
  { height: 230, green: false },
  { height: 290, green: false },
  { height: 130, green: true },
  { height: 200, green: false },
];

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 72,
        padding: "0 88px",
        color: "#f2f4f7",
        background:
          "radial-gradient(60% 70% at 20% 85%, rgba(61,220,151,0.22), transparent), linear-gradient(180deg, #151b23, #05070a)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 18,
          height: 290,
          flexShrink: 0,
        }}
      >
        {bars.map((bar, i) => (
          <div
            key={i}
            style={{
              width: 54,
              height: bar.height,
              borderRadius: 27,
              background: bar.green
                ? "linear-gradient(180deg, #8ef0c4, #22b97b)"
                : "rgba(255,255,255,0.22)",
              boxShadow: bar.green ? "0 0 60px rgba(61,220,151,0.6)" : "none",
            }}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 22,
          width: 680,
        }}
      >
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1 }}>
          Billigaste timmen
        </div>
        <div style={{ fontSize: 38, color: "#9aa1ab", lineHeight: 1.3 }}>
          Elpriset timme för timme. Se när strömmen är billigast i SE1–SE4.
        </div>
      </div>
    </div>,
    size,
  );
}
