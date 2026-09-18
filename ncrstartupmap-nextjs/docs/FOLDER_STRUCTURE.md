# Project Folder Structure

> ⚠️ **Doc truthing note (2026-09-13):** the tree below predates the Phase C1 dead-code cleanup
> (`docs/PRODUCTION_READINESS_TODO.md`). Deleted since: all `src/components/ui/*`, `lib/variants/*`,
> `hooks/use-mobile`, `toolbar/{LogoButton,Divider}`, `UnmappedView/UnmappedItem`,
> `StartupCard/{CardHeader,CardFooter}`, `lib/auth/next-auth.ts`, plus 37 unused dependencies.
> For the authoritative current structure run `tree src` / `Get-ChildItem -Recurse src`.
> Package manager is **pnpm** (not npm as some sections below assume).

```
ncrstartupmap/
├── .claude/                    # Claude-specific configuration
│   ├── skills/
│   ├── agents/
│   └── config/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Main dashboard page
│   ├── loading.tsx             # Loading skeleton
│   ├── error.tsx               # Error boundary
│   ├── submit/
│   │   └── page.tsx            # Submit form page
│   ├── admin/
│   │   ├── layout.tsx          # Admin layout
│   │   ├── page.tsx            # Admin dashboard
│   │   ├── login/page.tsx      # Admin login
│   │   ├── submissions/page.tsx # Admin submissions
│   │   ├── users/page.tsx      # User management
│   │   ├── analytics/page.tsx   # Analytics
│   │   └── settings/page.tsx   # Settings
│   ├── verify/[token]/page.tsx # Email verification
│   ├── jobs/
│   │   ├── page.tsx            # Jobs listing
│   │   ├── [id]/page.tsx       # Job details
│   │   └── post/page.tsx       # Post a job
│   ├── account/
│   │   ├── page.tsx            # Account page
│   │   ├── settings/page.tsx   # Account settings
│   │   └── submissions/page.tsx # User submissions
│   └── api/
│       ├── startups/
│       │   ├── route.ts        # Startups CRUD
│       │   ├── search.ts       # Search endpoint
│       │   └── utils.ts        # API utilities
│       ├── submit/
│       │   ├── route.ts        # Submit endpoint
│       │   ├── validate.ts     # Validation
│       │   ├── rate-limit.ts   # Rate limiting
│       │   └── email.ts        # Email sending
│       └── ws/route.ts         # WebSocket endpoint
├── components/
│   ├── views/
│   │   ├── MapView/
│   │   │   ├── Map.tsx         # Map component
│   │   │   ├── MapControls.tsx # Map controls
│   │   │   └── MapLegend.tsx   # Legend
│   │   ├── GridView/
│   │   │   ├── StartupCard/
│   │   │   │   ├── StartupCard.tsx
│   │   │   │   ├── CardHeader.tsx
│   │   │   │   ├── CardBody.tsx
│   │   │   │   └── CardFooter.tsx
│   │   │   └── GridContainer.tsx
│   │   └── UnmappedView/
│   │       ├── UnmappedList.tsx
│   │       └── UnmappedItem.tsx
│   ├── carousel/
│   │   ├── AdCarousel.tsx
│   │   ├── CarouselItem.tsx
│   │   └── CarouselControls.tsx
│   ├── toolbar/
│   │   ├── ToolbarContainer.tsx
│   │   ├── ViewToggle.tsx
│   │   ├── CountLegend.tsx
│   │   ├── FilterDropdown.tsx
│   │   ├── SearchBox.tsx
│   │   ├── LogoButton.tsx
│   │   └── Divider.tsx
│   ├── submit/
│   │   ├── SubmitForm.tsx
│   │   ├── SubmitValidation.tsx
│   │   ├── SubmitRateLimit.tsx
│   │   ├── SubmitEmail.tsx
│   │   ├── Validation.ts
│   │   ├── ServerValidation.tsx
│   │   ├── ClientValidation.tsx
│   │   └── SubmitSuccess.tsx
│   ├── shared/
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Icon.tsx
│   │   ├── Loading.tsx
│   │   ├── EmptyState.tsx
│   │   ├── notifications/
│   │   │   ├── Toast.tsx
│   │   │   └── useToast.ts
│   │   └── loading/
│   │       ├── StartupCardSkeleton.tsx
│   │       └── MapSkeleton.tsx
│   ├── search/
│   │   ├── AdvancedFilters.tsx
│   │   ├── SearchSuggestions.tsx
│   │   └── RecentSearches.tsx
│   ├── analytics/
│   │   ├── GoogleAnalytics.tsx
│   │   ├── PlausibleAnalytics.tsx
│   │   └── SentryErrorBoundary.tsx
│   ├── utils/
│   │   ├── format.ts
│   │   ├── debounce.ts
│   │   ├── constants.ts
│   │   └── helpers.ts
├── lib/                        # Core logic
│   ├── api/
│   │   ├── startups.ts
│   │   ├── submit.ts
│   │   ├── search.ts
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── useStartups.ts
│   │   ├── useSubmit.ts
│   │   ├── useView.ts
│   │   └── useSearch.ts
│   ├── state/
│   │   ├── store.ts
│   │   ├── actions.ts
│   │   ├── selectors.ts
│   │   ├── persistence.ts
│   │   └── cache.ts
│   ├── types/
│   │   ├── api.ts
│   │   ├── state.ts
│   │   ├── components.ts
│   │   └── startup.ts
│   ├── db/
│   │   ├── schema/
│   │   ├── migrations/
│   │   ├── seed/
│   │   ├── constraints.ts
│   │   └── utils.ts
│   ├── email/
│   │   ├── transport.ts
│   │   ├── send.ts
│   │   └── templates/
│   ├── middleware/
│   │   ├── rate-limit.ts
│   │   └── ip-utils.ts
│   ├── cache/
│   │   ├── redis.ts
│   │   ├── strategies.ts
│   │   ├── invalidation.ts
│   │   └── metrics.ts
│   ├── security/
│   │   ├── csrf.ts
│   │   ├── sanitize.ts
│   │   ├── hpp.ts
│   │   └── headers.ts
│   ├── logging/
│   │   ├── logger.ts
│   │   ├── transports/
│   │   └── format.ts
│   ├── analytics/
│   │   ├── track-event.ts
│   │   ├── monitor-error.ts
│   │   ├── track-page-view.ts
│   │   └── report-metric.ts
│   ├── env/
│   │   ├── validate.ts
│   │   └── schema.ts
│   ├── i18n/
│   │   ├── config.ts
│   │   ├── use-translate.ts
│   │   └── format.ts
│   ├── admin/
│   │   ├── auth.ts
│   │   ├── permissions.ts
│   │   └── audit-log.ts
│   ├── verification/
│   │   ├── token.ts
│   │   ├── validate.ts
│   │   └── expire.ts
│   ├── jobs/
│   │   ├── api.ts
│   │   ├── validation.ts
│   │   └── apply.ts
│   ├── auth/
│   │   ├── next-auth.ts
│   │   ├── session.ts
│   │   └── oauth.ts
│   ├── error/
│   │   ├── handle-api-error.ts
│   │   └── create-toast.ts
│   └── supabase.ts
├── locales/                    # Internationalization
│   ├── en/
│   │   ├── common.json
│   │   ├── errors.json
│   │   └── ui.json
│   └── hi/
├── styles/
│   ├── variables.css
│   ├── responsive.css
│   ├── utilities.css
│   └── global.css
├── scripts/
│   ├── build.mjs
│   ├── deploy.mjs
│   ├── migrate.mjs
│   ├── seed.mjs
│   ├── lint.mjs
│   ├── optimize-images.mjs
│   ├── bundle-analyze.mjs
│   ├── predeploy.mjs
│   ├── backup-db.mjs
│   ├── restore-db.mjs
│   ├── verify-backup.mjs
│   └── cleanup-old.mjs
├── tests/
│   ├── unit/
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   └── utils/
│   │   └── components/
│   ├── integration/
│   │   ├── api/
│   │   ├── submit/
│   │   └── navigation/
│   ├── e2e/
│   │   ├── map-view/
│   │   ├── grid-view/
│   │   ├── submit-flow/
│   │   └── carousel/
│   ├── fixtures/
│   ├── factories/
│   ├── helpers/
│   ├── mocks/
│   ├── setup/
│   └── coverage/
├── docs/
│   ├── FOLDER_STRUCTURE.md
│   ├── COMPONENT_GUIDELINES.md
│   ├── API_REFERENCE.md
│   ├── STATE_GUIDE.md
│   ├── TESTING.md
│   ├── DEPLOYMENT.md
│   ├── CONTRIBUTING.md
│   ├── ROADMAP.md
│   ├── architecture/
│   ├── api/
│   ├── runbooks/
│   └── onboarding/
├── .github/
│   ├── workflows/
│   ├── CODEOWNERS
│   ├── dependabot.yml
│   └── PULL_REQUEST_TEMPLATE.md
├── .vscode/
│   └── settings.json
├── .gitignore
├── middleware.ts
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── README.md
└── migration/
    ├── old-components/
    ├── migration-logs/
    └── feature-flags.ts
```
