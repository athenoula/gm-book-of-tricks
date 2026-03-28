// src/features/landing/components/LandingFooter.tsx
import { Link } from '@tanstack/react-router'
import { showcaseFeatures } from '../feature-data'

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-bg-deep/80 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-8">
          {/* Logo */}
          <div>
            <span className="font-[family-name:--font-display] text-lg gold-foil">
              GM Book of Tricks
            </span>
            <p className="text-xs text-text-muted mt-1">Made with ♥ by a GM</p>
          </div>

          {/* Feature links */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {showcaseFeatures.map((f) => (
              <Link
                key={f.slug}
                to="/features/$slug"
                params={{ slug: f.slug }}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                {f.title}
              </Link>
            ))}
          </div>

          {/* Right */}
          <div className="text-xs text-text-muted/60 text-center sm:text-right">
            <p>© {new Date().getFullYear()} GM Book of Tricks</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
