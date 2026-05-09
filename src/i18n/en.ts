export const en = {
  nav: {
    home: 'Home',
    resume: 'Resume',
    portfolio: 'Portfolio',
    tech: 'Tech',
    contact: 'Contact',
    switchLang: 'Italiano',
    switchLangAriaLabel: 'Switch to Italian',
  },
  home: {
    greeting: "Hello, I'm",
    viewResume: 'View Resume',
    downloadsHint: 'Downloads PDF file',
  },
  resume: {
    heading: 'Resume',
    description: 'Experience, education, and skills. Download the full PDF for the long version.',
    downloadPdf: 'Download PDF',
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    languages: 'Languages',
    certificates: 'Certificates',
    present: 'Present',
  },
  projects: {
    heading: 'Portfolio',
    description: 'A selection of my GitHub projects, fetched fresh on every build.',
    empty: 'No projects yet — check back soon.',
  },
  tech: {
    heading: 'Tech Stack',
    description: 'Breakdown of my technical skills, categorized by domain and proficiency',
    expert: 'Expert',
    proficient: 'Proficient',
    beginner: 'Beginner',
  },
  contact: {
    heading: 'Contact Me',
    description: "Feel free to reach out. I'm always open to discussing new projects and opportunities.",
  },
  meta: {
    description: 'Full-Stack Developer with 7+ years of experience across finance and e-commerce.',
  },
} as const;

export type Translations = typeof en;
