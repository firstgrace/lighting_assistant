/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // 仕様書指定の「理論に基づく、知的な探索空間」を表現するカラー 
        appDark: '#0f172a',    // 深いブルーグレー (slate-900)
        appPanel: '#1e293b',   // パネル用のブルーグレー (slate-800)
        appAccent: '#f59e0b',  // 学習促進用のアクセントオレンジ (amber-500)
      }
    },
  },
  plugins: [],
}