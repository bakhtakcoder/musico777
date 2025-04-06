import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AudioProvider } from "@/context/audio-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Musico 777 | Professional Audio Effects",
  description: "Transform your audio with 50+ professional audio effects. Developed by Wahab Khan.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AudioProvider>{children}</AudioProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'