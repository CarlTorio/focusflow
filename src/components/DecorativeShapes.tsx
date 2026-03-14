const shapes = [
  { type: "circle", size: 40, top: "10%", left: "5%", delay: "0s" },
  { type: "diamond", size: 24, top: "20%", right: "10%", delay: "1s" },
  { type: "square", size: 20, top: "60%", left: "8%", delay: "2s" },
  { type: "circle", size: 30, top: "75%", right: "15%", delay: "0.5s" },
  { type: "diamond", size: 18, top: "40%", left: "85%", delay: "1.5s" },
  { type: "square", size: 28, top: "15%", left: "70%", delay: "3s" },
  { type: "circle", size: 22, top: "85%", left: "45%", delay: "2.5s" },
];

export function DecorativeShapes({ opacity = 0.1 }: { opacity?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {shapes.map((shape, i) => (
        <div
          key={i}
          className="absolute animate-float"
          style={{
            top: shape.top,
            left: shape.left,
            right: (shape as any).right,
            animationDelay: shape.delay,
            opacity,
          }}
        >
          {shape.type === "circle" && (
            <div
              className="rounded-full bg-primary"
              style={{ width: shape.size, height: shape.size }}
            />
          )}
          {shape.type === "diamond" && (
            <div
              className="bg-primary-medium rotate-45"
              style={{ width: shape.size, height: shape.size }}
            />
          )}
          {shape.type === "square" && (
            <div
              className="rounded-sm bg-primary-light"
              style={{ width: shape.size, height: shape.size }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
