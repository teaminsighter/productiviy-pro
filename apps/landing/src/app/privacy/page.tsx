import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Shield, Eye, Lock, Trash2, Download, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy - Productify Pro',
  description: 'Privacy Policy for Productify Pro. Learn how we collect, use, and protect your data.',
};

export default function PrivacyPolicy() {
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
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-gray-400 mb-8">Last updated: January 17, 2026</p>

        {/* Privacy Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
            <Shield className="w-8 h-8 text-indigo-400 mb-3" />
            <h3 className="font-semibold mb-1">Your Data, Your Control</h3>
            <p className="text-sm text-gray-400">You control what we track and can delete anytime</p>
          </div>
          <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
            <Lock className="w-8 h-8 text-green-400 mb-3" />
            <h3 className="font-semibold mb-1">Encrypted & Secure</h3>
            <p className="text-sm text-gray-400">All data is encrypted in transit and at rest</p>
          </div>
          <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
            <Eye className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="font-semibold mb-1">Transparent Practices</h3>
            <p className="text-sm text-gray-400">We clearly explain what we collect and why</p>
          </div>
        </div>

        <div className="prose prose-invert prose-gray max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">1. Introduction</h2>
            <p className="text-gray-300 leading-relaxed">
              Productify Pro ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use our productivity
              tracking application ("Service").
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">2. Information We Collect</h2>

            <h3 className="text-xl font-medium mb-3 text-gray-200">2.1 Account Information</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-6">
              <li>Email address</li>
              <li>Name (optional)</li>
              <li>Profile picture (optional)</li>
              <li>Password (hashed and salted)</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-gray-200">2.2 Activity Data</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              With your consent, we collect:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-6">
              <li>Application names and window titles</li>
              <li>Website URLs and page titles</li>
              <li>Time spent on applications and websites</li>
              <li>Active/idle status</li>
              <li>Screenshots (optional, can be blurred)</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-gray-200">2.3 Device Information</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Operating system type and version</li>
              <li>Device type</li>
              <li>Time zone</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">3. How We Use Your Information</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Provide productivity tracking and analytics</li>
              <li>Generate AI-powered insights and recommendations</li>
              <li>Send productivity reports and notifications</li>
              <li>Enable team collaboration features (with your consent)</li>
              <li>Improve and develop our Service</li>
              <li>Communicate with you about your account</li>
              <li>Ensure security and prevent fraud</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">4. Data Storage and Security</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We implement industry-standard security measures:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>All data is encrypted in transit using TLS 1.3</li>
              <li>Data at rest is encrypted using AES-256</li>
              <li>Passwords are hashed using bcrypt with salt</li>
              <li>Regular security audits and penetration testing</li>
              <li>Access controls and authentication for all systems</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              Data is stored on secure servers in the United States. Screenshots and activity data are automatically
              deleted according to your retention settings (default: 90 days).
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">5. Data Sharing</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We do not sell your personal data. We may share information with:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Team members:</strong> If you join a team, designated data may be visible to team admins (you control what is shared)</li>
              <li><strong>Service providers:</strong> Third parties that help us operate our Service (cloud hosting, analytics)</li>
              <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">6. Your Rights (GDPR/CCPA)</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              You have the right to:
            </p>

            <div className="grid gap-4 my-6">
              <div className="flex items-start gap-3 p-4 bg-gray-900 rounded-lg">
                <Download className="w-5 h-5 text-indigo-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-white">Access & Export</h4>
                  <p className="text-sm text-gray-400">Download all your data in JSON format</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gray-900 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-white">Delete</h4>
                  <p className="text-sm text-gray-400">Permanently delete your account and all data</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gray-900 rounded-lg">
                <Eye className="w-5 h-5 text-purple-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-white">Control</h4>
                  <p className="text-sm text-gray-400">Modify what data is collected and shared</p>
                </div>
              </div>
            </div>

            <p className="text-gray-300 leading-relaxed">
              To exercise these rights, visit Settings → Privacy in the app or contact us at privacy@productifypro.com
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">7. Cookies and Tracking</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We use cookies and similar technologies to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Keep you signed in</li>
              <li>Remember your preferences</li>
              <li>Analyze usage patterns to improve the Service</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              For more details, see our <Link href="/cookies" className="text-indigo-400 hover:text-indigo-300">Cookie Policy</Link>.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">8. Children's Privacy</h2>
            <p className="text-gray-300 leading-relaxed">
              Our Service is not intended for children under 16. We do not knowingly collect personal information
              from children under 16. If you believe we have collected such information, please contact us immediately.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">9. International Data Transfers</h2>
            <p className="text-gray-300 leading-relaxed">
              Your information may be transferred to and processed in countries other than your own. We ensure
              appropriate safeguards are in place for such transfers, including Standard Contractual Clauses approved
              by the European Commission.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">10. Changes to This Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by
              email and/or a prominent notice in our Service. Your continued use of the Service after changes
              constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">11. Contact Us</h2>
            <p className="text-gray-300 leading-relaxed">
              For privacy-related questions or to exercise your rights:
            </p>
            <div className="mt-4 p-4 bg-gray-900 rounded-lg">
              <p className="text-gray-300">Email: privacy@productifypro.com</p>
              <p className="text-gray-300">Data Protection Officer: dpo@productifypro.com</p>
              <p className="text-gray-300 mt-2">Productify Pro, Inc.</p>
            </div>
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
