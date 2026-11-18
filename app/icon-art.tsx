// Beer mug drawn with plain boxes, used by the app icons (no image files needed).
export function IconArt({ size }: { size: number }) {
  const u = size / 32; // design grid: 32 x 32
  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#211c18",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginLeft: 3 * u }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* foam */}
          <div
            style={{
              width: 16 * u,
              height: 5 * u,
              background: "#fff7e8",
              borderTopLeftRadius: 2.5 * u,
              borderTopRightRadius: 2.5 * u,
            }}
          />
          {/* beer */}
          <div
            style={{
              width: 16 * u,
              height: 15 * u,
              background: "#f2a516",
              borderBottomLeftRadius: 2 * u,
              borderBottomRightRadius: 2 * u,
            }}
          />
        </div>
        {/* handle */}
        <div
          style={{
            width: 6 * u,
            height: 10 * u,
            marginTop: 4 * u,
            border: `${2.2 * u}px solid #f2a516`,
            borderLeft: "none",
            borderTopRightRadius: 3 * u,
            borderBottomRightRadius: 3 * u,
          }}
        />
      </div>
    </div>
  );
}
