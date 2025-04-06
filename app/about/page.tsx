import Link from "next/link"
import Image from "next/image"
import { Headphones, Github, Twitter, Linkedin, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AboutPage() {
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
              About Musico 777
            </span>
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Professional audio effects platform developed by Wahab Khan
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div className="bg-purple-900/20 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
            <p className="text-white/80 mb-4">
              Musico 777 was created with a simple yet powerful mission: to provide musicians, producers, and audio
              enthusiasts with professional-grade audio effects that are accessible, intuitive, and inspiring.
            </p>
            <p className="text-white/80 mb-4">
              We believe that audio transformation should be available to everyone, regardless of technical expertise or
              budget constraints. Our platform offers 50 unique audio effects that can transform any sound into
              something magical.
            </p>
            <p className="text-white/80">
              Whether you're a professional music producer looking for that perfect sound or a hobbyist experimenting
              with audio, Musico 777 has the tools you need to bring your creative vision to life.
            </p>
          </div>

          <div className="bg-purple-900/20 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">About the Developer</h2>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative h-20 w-20 rounded-full overflow-hidden">
                <Image
                  src="/placeholder.svg?height=80&width=80"
                  alt="Wahab Khan"
                  width={80}
                  height={80}
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Wahab Khan</h3>
                <p className="text-purple-300">Audio Engineer & Developer</p>
              </div>
            </div>
            <p className="text-white/80 mb-4">
              Wahab Khan is an experienced audio engineer and web developer with a passion for creating innovative audio
              tools. With over 10 years of experience in audio processing and software development, Wahab has combined
              his expertise to create Musico 777.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="text-white hover:bg-purple-800/50 rounded-full">
                <Github className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-purple-800/50 rounded-full">
                <Twitter className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-purple-800/50 rounded-full">
                <Linkedin className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-purple-800/50 rounded-full">
                <Mail className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-purple-900/20 rounded-xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">Technology Stack</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-purple-800/30 rounded-lg p-4 text-center">
              <h3 className="text-white font-bold mb-2">Web Audio API</h3>
              <p className="text-purple-300 text-sm">Real-time audio processing</p>
            </div>
            <div className="bg-purple-800/30 rounded-lg p-4 text-center">
              <h3 className="text-white font-bold mb-2">Next.js</h3>
              <p className="text-purple-300 text-sm">React framework</p>
            </div>
            <div className="bg-purple-800/30 rounded-lg p-4 text-center">
              <h3 className="text-white font-bold mb-2">Framer Motion</h3>
              <p className="text-purple-300 text-sm">Animation library</p>
            </div>
            <div className="bg-purple-800/30 rounded-lg p-4 text-center">
              <h3 className="text-white font-bold mb-2">Tailwind CSS</h3>
              <p className="text-purple-300 text-sm">Utility-first CSS</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="container mx-auto py-8 px-4 border-t border-purple-900 text-center text-white/60">
        <p>© 2024 Musico 777. Developed by Wahab Khan. All rights reserved.</p>
      </footer>
    </main>
  )
}

