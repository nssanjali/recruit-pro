# RecruitPro - AI-Powered Recruitment Platform

A modern recruitment management system built with **React (JSX)**, Vite, and Tailwind CSS.

## 🚀 Tech Stack

- **React 18.3** - UI library with JSX
- **Vite 5.4** - Build tool and dev server
- **JavaScript (ES2020+)** - Modern JavaScript with JSX
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Avatar and Progress primitives only
- **Framer Motion** - Smooth animations
- **Lucide React** - Beautiful icons
- **Recharts** - Data visualization

## 🎨 UI Components

This project uses **custom UI components** built with:
- Pure JavaScript (JSX) - No TypeScript
- Radix UI primitives for accessibility
- Tailwind CSS for styling
- Lightweight and fully customizable
- Button, Card, Badge
- Avatar (Radix UI)
- Progress (Radix UI)
- Input, Textarea
- Tabs, ScrollArea, Select

## 📦 Project Structure

```
recruit-pro/
├── src/
│   ├── components/
│   │   ├── ui.jsx           # Custom UI components (JSX)
│   │   ├── AdminDashboard.jsx
│   │   ├── CandidateDashboard.jsx
│   │   ├── RecruiterDashboard.jsx
│   │   ├── InterviewScheduling.jsx
│   │   ├── BrowserExtension.jsx
│   │   └── Layout.jsx
│   ├── lib/
│   │   └── utils.js         # Utility functions (cn helper)
│   ├── styles/
│   │   └── globals.css      # Global styles with Tailwind
│   ├── App.jsx              # Main application component
│   └── main.jsx             # Application entry point
├── public/                  # Static assets
├── index.html               # HTML entry point
├── vite.config.js           # Vite configuration
├── jsconfig.json            # JavaScript configuration (path aliases)
├── tailwind.config.js       # Tailwind CSS configuration
└── package.json             # Dependencies and scripts

```

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

## 📝 Available Scripts

- **`npm run dev`** - Start development server (default: http://localhost:3000)
- **`npm run build`** - Build for production
- **`npm run preview`** - Preview production build locally
- **`npm run lint`** - Run ESLint

## 🎨 Features

- **Admin Dashboard** - Manage recruitment operations
- **Candidate Dashboard** - Track application status and interviews
- **Recruiter Dashboard** - Review candidates and schedule interviews
- **Browser Extension** - Get AI-powered feedback
- **Dark Mode Support** - Theme switching with next-themes
- **Responsive Design** - Mobile-first approach
- **Type-Safe** - Full TypeScript support

## 🔧 Configuration

### Path Aliases

The project uses `@/*` as a path alias pointing to `./src/*`:

```typescript
import { Button, Card, Badge } from "@/components/ui"
import { cn } from "@/lib/utils"
```

### Custom UI Components

All UI components are built with JavaScript (JSX) and Tailwind CSS:
- **Pure JavaScript** - No TypeScript complexity
- **Lightweight** - Only necessary Radix UI components (Avatar, Progress)
- **Customizable** - Full control over styling
- **Accessible** - Built on Radix UI's accessible primitives

### Development Experience

- 🔥 **Fast HMR** - Instant feedback with Vite
- 📦 **Smaller bundle** - No TypeScript compilation overhead
- 🎯 **Simple** - Straightforward JavaScript/JSX
- ⚡ **Quick builds** - Faster than TypeScript projects

## 🚀 Development

The development server features:
- ⚡️ Hot Module Replacement (HMR)
- 🔥 Fast Refresh for React components
- 📦 Optimized dependency pre-bundling
- 🎯 TypeScript type checking

## 📦 Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📄 License

This project is part of the RecruitPro platform.

## 🙋‍♂️ Support

For issues or questions, please refer to the project documentation or contact the development team.
