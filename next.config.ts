/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Удаляем appDir, если он не нужен
  },
  devIndicators: {
    position: 'bottom-right', // Обновляем на правильное имя
  },
};

module.exports = nextConfig;