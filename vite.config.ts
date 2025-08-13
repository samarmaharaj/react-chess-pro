import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Change this if your repo name differs
const repoName = 'react-chess-pro';

export default defineConfig({
  base: `/${repoName}/`,
  plugins: [react()],
});
