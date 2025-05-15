/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Отключаем Strict Mode
  experimental: {
    optimizeCss: false, // Отключаем preload для CSS
  },
  logging: {
    fetches: {
      fullUrl: true, // Логируем полные URL запросов
    },
  },
};

export default nextConfig;