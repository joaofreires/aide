import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "SkillAide",
  description: "AI Mod Manager",
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }]
  ],
  themeConfig: {
    nav: [
      { text: 'Docs', link: 'https://docs.skillaide.app' }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-username/aide' }
    ]
  }
})