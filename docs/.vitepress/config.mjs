import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "SkillAide Docs",
  description: "Documentation for SkillAide AI Mod Manager",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'CLI Commands', link: '/guide/cli-commands' },
          { text: 'How It Works', link: '/guide/how-it-works' },
          { text: 'Configuration', link: '/guide/configuration' },
          { text: 'Development', link: '/guide/development' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-username/aide' }
    ]
  }
})