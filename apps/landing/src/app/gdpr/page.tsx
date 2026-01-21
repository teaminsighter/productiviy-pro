import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Download, Trash2, Eye, Edit, Ban, FileText, Shield, CheckCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'GDPR Compliance - Productify Pro',
  description: 'Learn about your data rights under GDPR and how Productify Pro protects your privacy.',
};

export default function GDPRCompliance() {
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
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">GDPR Compliance</h1>
            <p className="text-gray-400">Your Rights Under the General Data Protection Regulation</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-6 mb-10">
          <p className="text-gray-300 leading-relaxed">
            Productify Pro is committed to GDPR compliance. We respect your privacy rights and have built our
            platform with privacy by design. This page explains your rights and how to exercise them.
          </p>
        </div>

        <div className="prose prose-invert prose-gray max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">Your Data Rights</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              Under GDPR, you have the following rights regarding your personal data:
            </p>

            <div className="grid gap-4">
              <div className="p-5 bg-gray-900 rounded-lg border border-gray-800">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Eye className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Right of Access (Article 15)</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      You can request a copy of all personal data we hold about you.
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">Available in Settings → Privacy → Export Data</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-gray-900 rounded-lg border border-gray-800">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Edit className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Right to Rectification (Article 16)</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      You can request correction of inaccurate personal data.
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">Edit your profile anytime in Settings</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-gray-900 rounded-lg border border-gray-800">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Right to Erasure (Article 17)</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      You can request deletion of all your personal data ("right to be forgotten").
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">Delete account in Settings → Privacy → Delete Account</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-gray-900 rounded-lg border border-gray-800">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <Download className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Right to Data Portability (Article 20)</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      You can receive your data in a structured, machine-readable format.
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">Export as JSON from Settings → Privacy</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-gray-900 rounded-lg border border-gray-800">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <Ban className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Right to Object (Article 21)</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      You can object to processing of your data for certain purposes.
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">Control all data collection in Privacy Settings</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-gray-900 rounded-lg border border-gray-800">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Right to Restriction (Article 18)</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      You can request limited processing while we verify accuracy or address objections.
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">Contact dpo@productifypro.com</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">Our Legal Basis for Processing</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We process your personal data under the following legal bases:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Consent:</strong> You have given explicit consent for tracking (can be withdrawn anytime)</li>
              <li><strong>Contract:</strong> Processing is necessary to provide the Service you requested</li>
              <li><strong>Legitimate Interest:</strong> For security, fraud prevention, and Service improvement</li>
              <li><strong>Legal Obligation:</strong> When required by law (e.g., tax records)</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">Data Retention</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We retain your data only as long as necessary:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Data Type</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Retention Period</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Configurable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  <tr>
                    <td className="py-3 px-4 text-gray-400">Activity Data</td>
                    <td className="py-3 px-4 text-gray-400">7-365 days (default: 90)</td>
                    <td className="py-3 px-4 text-green-400">Yes</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-400">Screenshots</td>
                    <td className="py-3 px-4 text-gray-400">7-365 days (default: 30)</td>
                    <td className="py-3 px-4 text-green-400">Yes</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-400">Account Information</td>
                    <td className="py-3 px-4 text-gray-400">Until account deletion</td>
                    <td className="py-3 px-4 text-gray-400">N/A</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-400">Billing Records</td>
                    <td className="py-3 px-4 text-gray-400">7 years (legal requirement)</td>
                    <td className="py-3 px-4 text-gray-400">No</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">Data Protection Officer</h2>
            <p className="text-gray-300 leading-relaxed">
              For any GDPR-related inquiries or to exercise your rights, contact our Data Protection Officer:
            </p>
            <div className="mt-4 p-4 bg-gray-900 rounded-lg">
              <p className="text-gray-300">Email: dpo@productifypro.com</p>
              <p className="text-gray-300 mt-2">
                We will respond to all legitimate requests within 30 days.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">Supervisory Authority</h2>
            <p className="text-gray-300 leading-relaxed">
              If you believe we have not adequately addressed your concerns, you have the right to lodge a
              complaint with your local data protection supervisory authority.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/privacy"
                className="p-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <h3 className="font-semibold text-white mb-1">Privacy Policy</h3>
                <p className="text-sm text-gray-400">Full details on data collection and use</p>
              </Link>
              <Link
                href="/cookies"
                className="p-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <h3 className="font-semibold text-white mb-1">Cookie Policy</h3>
                <p className="text-sm text-gray-400">How we use cookies and tracking</p>
              </Link>
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
