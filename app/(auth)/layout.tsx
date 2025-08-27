export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen w-screen flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: `
          url("/brand/orbio-head.svg") repeat,
          linear-gradient(to bottom right, #3bc9db, #6c63ff)
        `,
        backgroundSize: "80px 80px, 100% 100%", // mascot size + gradient size
        backgroundPosition: "center center",
        backgroundBlendMode: "overlay", // makes mascot faint
        opacity: 0.95, // adjust faintness overall
      }}
    >
      {children}
    </div>
  );
}
