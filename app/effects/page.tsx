import Link from "next/link"
import { Headphones } from "lucide-react"
import EffectsGrid from "@/components/effects-grid"

export default function EffectsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-purple-950">
      <header className="container mx-auto py-6 px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Headphones className="h-8 w-8 text-purple-400" />
          <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
            Musico 777
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-white hover:text-purple-400 transition-colors">
            Home
          </Link>
          <Link href="/effects" className="text-white hover:text-purple-400 transition-colors">
            Effects
          </Link>
          <Link href="/about" className="text-white hover:text-purple-400 transition-colors">
            About
          </Link>
        </nav>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
              Audio Effects Library
            </span>
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Explore our collection of 50 professional audio effects to transform your sound.
          </p>
        </div>

        <EffectsGrid />
      </div>

      <footer className="container mx-auto py-8 px-4 border-t border-purple-900 text-center text-white/60">
        <p>© 2024 Musico 777. Developed by Wahab Khan. All rights reserved.</p>
      </footer>
    </main>
  )
}

