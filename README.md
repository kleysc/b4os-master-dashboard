# B4OS Challenges

> Interactive Bitcoin & Lightning Network development platform

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC)](https://tailwindcss.com/)
[![NextAuth.js](https://img.shields.io/badge/NextAuth.js-5-000000)](https://next-auth.js.org/)

## Overview

B4OS Challenges is a modern web platform for learning Bitcoin and Lightning Network development through hands-on coding challenges. Built with Next.js 15 and TypeScript, it provides an interactive learning experience with real-time code validation.

## Features

- **🔐 GitHub OAuth Authentication** - Secure user management
- **🛡️ Protected Routes** - Challenge access control
- **💻 Monaco Editor** - Professional code editing experience
- **✅ Real-time Validation** - Instant feedback on code execution
- **📱 Responsive Design** - Mobile-first approach
- **🎯 Modular Architecture** - Scalable challenge system

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Authentication:** NextAuth.js
- **Editor:** Monaco Editor
- **Deployment:** Vercel-ready

## Quick Start

```bash
# Clone repository
git clone https://github.com/kleysc/landing-challenges.git
cd landing-challenges

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Configure GitHub OAuth credentials

# Run development server
npm run dev
```

## Environment Variables

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── challenges/         # Challenge pages
│   └── auth/              # Authentication pages
├── challenges/            # Challenge definitions
│   ├── bitcoin-basics/    # Bitcoin challenges
│   └── lightning-network/ # Lightning challenges
├── components/            # Reusable components
├── lib/                   # Utilities & configuration
└── types/                 # TypeScript definitions
```

## Challenges

### Bitcoin Basics
- **SHA-256 Hashing** - Learn cryptographic hashing fundamentals

### Lightning Network
- **Invoice Parser** - Parse and validate Lightning invoices

## Development

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- **Issues:** [GitHub Issues](https://github.com/kleysc/landing-challenges/issues)
- **Discussions:** [GitHub Discussions](https://github.com/kleysc/landing-challenges/discussions)

---

Built with ❤️ for the Bitcoin community# Force deploy
