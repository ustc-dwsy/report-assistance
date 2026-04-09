import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [preact({ compat: true }), mdx()],
  output: 'static',
  vite: {
    ssr: {
      noExternal: ['katex']
    }
  }
});