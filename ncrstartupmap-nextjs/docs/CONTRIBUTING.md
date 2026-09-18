# Contributing to StartupsMap.in

## Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/ncrstartupmap.git

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

## Coding Standards

- Follow TypeScript strict mode
- Use ESLint for code linting
- Write tests for new features
- Document public APIs

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new filter component
fix: resolve map rendering issue
docs: update API reference
test: add unit tests for utils
```

## Pull Request Process

1. Update documentation as needed
2. Add tests for new features
3. Ensure all tests pass
4. Request review from maintainers
