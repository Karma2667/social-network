/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Удаляем appDir, если он не нужен
  },
  devIndicators: {
    position: 'bottom-right', // Обновляем на правильное имя
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**', // Разрешаем все пути в /uploads
      },
    ],
  },
};

module.exports = nextConfig;