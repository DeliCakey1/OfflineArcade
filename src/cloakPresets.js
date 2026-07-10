const CLOAK_PRESETS = {
  none: {
    label: 'No Cloak',
    emoji: '🚫',
    title: 'Offline Arcade',
    favicon: null,
  },
  canvas: {
    label: 'Canvas',
    emoji: '📖',
    title: 'Dashboard | Canvas LMS',
    favicon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23e13f29'/%3E%3Cpath d='M8 12 L16 8 L24 12 L24 20 L16 24 L8 20Z' fill='none' stroke='white' stroke-width='2'/%3E%3C/svg%3E",
  },
  googleDocs: {
    label: 'Google Docs',
    emoji: '📄',
    title: 'Untitled document - Google Docs',
    favicon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect x='4' y='2' width='24' height='28' rx='2' fill='white' stroke='%234285f4' stroke-width='1'/%3E%3Cpath d='M8 8h16M8 12h16M8 16h10' stroke='%234285f4' stroke-width='1.5' fill='none'/%3E%3C/svg%3E",
  },
  classroom: {
    label: 'Google Classroom',
    emoji: '🎓',
    title: 'Google Classroom',
    favicon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%230d652d'/%3E%3Cpath d='M16 8 L6 14 L16 20 L26 14Z' fill='white'/%3E%3Cpath d='M10 15.5V22l6 3.5 6-3.5v-6.5' fill='none' stroke='white' stroke-width='1.5'/%3E%3C/svg%3E",
  },
  clever: {
    label: 'Clever',
    emoji: '🎒',
    title: 'Clever | Portal',
    favicon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%230a5c86'/%3E%3Ccircle cx='16' cy='16' r='8' fill='white'/%3E%3Cpath d='M13 14 L13 19 M19 14 L19 19 M13 14 L19 14' stroke='%230a5c86' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E",
  },
  powerschool: {
    label: 'PowerSchool',
    emoji: '🏫',
    title: 'PowerSchool SIS',
    favicon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23003366'/%3E%3Cpath d='M10 10h12v4H10zM10 16h12v4H10zM10 22h8v4H10z' fill='%2300aaff' opacity='0.8'/%3E%3C/svg%3E",
  },
  desmos: {
    label: 'Desmos',
    emoji: '📊',
    title: 'Desmos | Graphing Calculator',
    favicon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%232d5a7b'/%3E%3Cpath d='M6 20 Q16 8 26 20' fill='none' stroke='%233d9b42' stroke-width='2.5'/%3E%3C/svg%3E",
  },
  notion: {
    label: 'Notion',
    emoji: '📝',
    title: 'Notion – Workspace',
    favicon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='white' stroke='%23333' stroke-width='1'/%3E%3Cpath d='M9 8 L16 8 L23 8 L23 24 L16 24 L9 24Z' fill='none' stroke='%23333' stroke-width='1.5'/%3E%3Cpath d='M12 12h8M12 16h8M12 20h4' stroke='%23333' stroke-width='1' fill='none'/%3E%3C/svg%3E",
  },
  github: {
    label: 'GitHub',
    emoji: '🐙',
    title: 'GitHub',
    favicon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%23333'/%3E%3Cpath d='M16 7C11 7 7 11 7 16c0 4 2.5 7.4 6 8.9.4.1.6-.2.6-.4v-1.5c-2.4.5-2.9-1.2-2.9-1.2-.4-1-.9-1.2-.9-1.2-.8-.5.1-.5.1-.5.8.1 1.3.9 1.3.9.8 1.3 2 .9 2.5.7.1-.6.3-1 .5-1.2-2-.2-4-1-4-4.5 0-1 .3-1.8.9-2.4-.1-.2-.4-1.2.1-2.4 0 0 .7-.2 2.4.9.7-.2 1.4-.3 2.1-.3s1.4.1 2.1.3c1.7-1.1 2.4-.9 2.4-.9.5 1.2.2 2.2.1 2.4.5.6.9 1.4.9 2.4 0 3.5-2 4.3-4 4.5.3.3.6.8.6 1.6v2.4c0 .2.2.5.6.4 3.5-1.5 6-4.9 6-8.9 0-5-4-9-9-9z' fill='white'/%3E%3C/svg%3E",
  },
  slack: {
    label: 'Slack',
    emoji: '💬',
    title: 'Slack – Workspace',
    favicon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%234a154b'/%3E%3Ccircle cx='10' cy='16' r='3' fill='%23e01e5a'/%3E%3Ccircle cx='22' cy='16' r='3' fill='%2336c5f0'/%3E%3Ccircle cx='16' cy='10' r='3' fill='%232eb67d'/%3E%3Ccircle cx='16' cy='22' r='3' fill='%23ecb22e'/%3E%3C/svg%3E",
  },
  zoom: {
    label: 'Zoom',
    emoji: '📹',
    title: 'Zoom Meeting',
    favicon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%232d8cff'/%3E%3Cpath d='M12 10 L12 22 L24 16Z' fill='white'/%3E%3C/svg%3E",
  },
  drive: {
    label: 'Google Drive',
    emoji: '💾',
    title: 'Google Drive',
    favicon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='white'/%3E%3Cpath d='M11 8 L21 8 L28 20 L18 20Z' fill='%230066da'/%3E%3Cpath d='M4 20 L11 8 L18 20 L11 28Z' fill='%2300ac47'/%3E%3Cpath d='M11 28 L18 20 L28 20 L21 28Z' fill='%23ea4335' opacity='0.9'/%3E%3C/svg%3E",
  },
  pdf: {
    label: 'PDF Document',
    emoji: '📕',
    title: 'document.pdf',
    favicon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23d32f2f'/%3E%3Ctext x='16' y='21' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold' font-size='10'%3EPDF%3C/text%3E%3C/svg%3E",
  },
  blank: {
    label: 'Blank Page',
    emoji: '⬜',
    title: '',
    favicon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='white'/%3E%3C/svg%3E",
  },
}

export default CLOAK_PRESETS
