import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Cookie, Settings, BarChart2, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cookie Policy - Productify Pro',
  description: 'Cookie Policy for Productify Pro. Learn about how we use cookies and similar technologies.',
};

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-2">Cookie Policy</h1>
        <p className="text-gray-400 mb-8">Last updated: January 17, 2026</p>

        <div className="prose prose-invert prose-gray max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">What Are Cookies?</h2>
            <p className="text-gray-300 leading-relaxed">
              Cookies are small text files that are placed on your device when you visit a website. They are
              widely used to make websites work more efficiently and provide information to the owners of the site.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">How We Use Cookies</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              Productify Pro uses cookies and similar technologies for the following purposes:
            </p>

            <div className="grid gap-4">
              <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Essential Cookies</h3>
                    <span className="text-xs text-green-400">Always Active</span>
                  </div>
                </div>
                <p className="text-sm text-gray-400">
                  Required for the website to function. These cookies enable core functionality such as security,
                  authentication, and session management. You cannot disable these cookies.
                </p>
              </div>

              <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Functional Cookies</h3>
                    <span className="text-xs text-gray-400">Optional</span>
                  </div>
                </div>
                <p className="text-sm text-gray-400">
                  Remember your preferences and settings (theme, language, timezone) to provide a personalized
                  experience. Disabling these may affect your experience.
                </p>
              </div>

              <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <BarChart2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Analytics Cookies</h3>
                    <span className="text-xs text-gray-400">Optional</span>
                  </div>
                </div>
                <p className="text-sm text-gray-400">
                  Help us understand how visitors interact with our website by collecting anonymous information.
                  This helps us improve our Service. We use privacy-focused analytics.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">Cookies We Use</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Cookie Name</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Purpose</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  <tr>
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">session_token</td>
                    <td className="py-3 px-4 text-gray-400">Authentication session</td>
                    <td className="py-3 px-4 text-gray-400">7 days</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">preferences</td>
                    <td className="py-3 px-4 text-gray-400">User preferences (theme, language)</td>
                    <td className="py-3 px-4 text-gray-400">1 year</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">consent</td>
                    <td className="py-3 px-4 text-gray-400">Cookie consent preferences</td>
                    <td className="py-3 px-4 text-gray-400">1 year</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">_analytics</td>
                    <td className="py-3 px-4 text-gray-400">Anonymous usage analytics</td>
                    <td className="py-3 px-4 text-gray-400">30 days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">Third-Party Cookies</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We use limited third-party services that may set cookies:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Stripe:</strong> For secure payment processing</li>
              <li><strong>Google OAuth:</strong> For optional social login</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              We do not use advertising cookies or sell data to advertisers.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">Managing Cookies</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              You can control cookies through:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Our Settings:</strong> Toggle optional cookies in your account privacy settings</li>
              <li><strong>Browser Settings:</strong> Most browsers allow you to block or delete cookies</li>
              <li><strong>Cookie Banner:</strong> Manage preferences when you first visit our site</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              Note: Disabling essential cookies may prevent you from using our Service.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">Local Storage</h2>
            <p className="text-gray-300 leading-relaxed">
              In addition to cookies, we use browser local storage to store app preferences and cached data
              for better performance. This data never leaves your device unless you sync it with our servers.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">Updates to This Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this Cookie Policy periodically. We will notify you of significant changes through
              a notice on our website or via email.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">Contact Us</h2>
            <p className="text-gray-300 leading-relaxed">
              If you have questions about our use of cookies, please contact us at privacy@productifypro.com
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Productify Pro. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms</Link>
            <Link href="/cookies" className="hover:text-gray-300 transition-colors">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
