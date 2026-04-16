'use client'

import React from 'react'
import OrgScripts from '@/components/OrgScripts/OrgScripts'
import { usePathname } from 'next/navigation'
import { useOrg } from '@/components/Contexts/OrgContext'
import Link from 'next/link'
import { Code } from 'lucide-react'

const Footer: React.FC = () => {
  const pathname = usePathname()
  const isDashboard = pathname?.startsWith('/dashboard')
  const org = useOrg() as any

  // Don't run scripts in dashboard pages
  if (isDashboard) {
    return null
  }

  const currentYear = new Date().getFullYear()

  return (
    <>
      <OrgScripts />
      <footer className="bg-[#0f0f10] text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Logo/Brand */}
            <div className="md:col-span-1">
              <h3 className="text-white font-bold text-lg mb-2">LearnHouse</h3>
              <p className="text-sm text-gray-400">
                Open-source learning management system
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition">
                    Courses
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Community
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/privacy" className="hover:text-white transition">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms" className="hover:text-white transition">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Source Code */}
            <div>
              <h4 className="text-white font-semibold mb-4">Open Source</h4>
              <div className="space-y-2">
                <p className="text-sm text-gray-400">
                  Licensed under AGPL v3
                </p>
                <a
                  href="https://github.com/learnhouse-indonesia/learnhouse-indonesia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white/[0.08] hover:bg-white/[0.12] rounded transition text-sm"
                >
                  <Code className="w-4 h-4" />
                  View Source Code
                </a>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.08] pt-8">
            {/* Bottom Section */}
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="text-sm text-gray-400 mb-4 md:mb-0">
                © {currentYear} {org?.name || 'LearnHouse'} - All rights reserved
              </div>

              {/* AGPL v3 Compliance Notice */}
              <div className="text-xs text-gray-500 text-center md:text-right">
                <p>
                  This platform is powered by{' '}
                  <a
                    href="https://github.com/learnhouse/learnhouse"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-200 transition"
                  >
                    LearnHouse
                  </a>
                  , licensed under{' '}
                  <a
                    href="https://www.gnu.org/licenses/agpl-3.0.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-200 transition"
                  >
                    AGPL v3
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}

export default Footer 