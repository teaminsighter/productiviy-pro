import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Mail, MessageSquare, Clock, MapPin, Phone, Send, HelpCircle, Bug, Lightbulb } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us - Productify Pro',
  description: 'Get in touch with the Productify Pro team. We\'re here to help with questions, feedback, and support.',
};

const contactMethods = [
  {
    icon: Mail,
    title: 'Email Support',
    description: 'For general inquiries and support',
    contact: 'support@productifypro.com',
    href: 'mailto:support@productifypro.com',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-400/10',
  },
  {
    icon: MessageSquare,
    title: 'Live Chat',
    description: 'Chat with our team in real-time',
    contact: 'Available in the app',
    href: '#',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
  },
  {
    icon: Bug,
    title: 'Bug Reports',
    description: 'Report issues or bugs',
    contact: 'bugs@productifypro.com',
    href: 'mailto:bugs@productifypro.com',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
  },
  {
    icon: Lightbulb,
    title: 'Feature Requests',
    description: 'Suggest new features',
    contact: 'ideas@productifypro.com',
    href: 'mailto:ideas@productifypro.com',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
  },
];

const faqs = [
  {
    question: 'How quickly do you respond to inquiries?',
    answer: 'We aim to respond to all inquiries within 24 hours during business days. Priority support is available for Pro and Team plan subscribers.',
  },
  {
    question: 'What information should I include in my support request?',
    answer: 'Please include your account email, the platform you\'re using (Windows/macOS/Chrome), and a detailed description of your issue or question.',
  },
  {
    question: 'Do you offer phone support?',
    answer: 'Phone support is available for Team plan subscribers. Contact your account manager or reach out via email to schedule a call.',
  },
];

export default function ContactPage() {
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

      {/* Hero */}
      <section className="py-16 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Get in Touch</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Have questions, feedback, or need help? We&apos;re here for you. Choose the best way to reach us below.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8 text-center">Contact Options</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {contactMethods.map((method) => (
              <a
                key={method.title}
                href={method.href}
                className="group p-6 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg ${method.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <method.icon className={`w-6 h-6 ${method.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1 group-hover:text-indigo-400 transition-colors">
                      {method.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-2">{method.description}</p>
                    <p className="text-indigo-400 text-sm font-medium">{method.contact}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16 bg-gray-900/50">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-2 text-center">Send us a Message</h2>
          <p className="text-gray-400 text-center mb-8">
            Fill out the form below and we&apos;ll get back to you as soon as possible.
          </p>

          <form className="space-y-6" action="mailto:support@productifypro.com" method="POST" encType="text/plain">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium mb-2">
                Subject
              </label>
              <select
                id="subject"
                name="subject"
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                <option value="">Select a topic</option>
                <option value="general">General Inquiry</option>
                <option value="support">Technical Support</option>
                <option value="billing">Billing Question</option>
                <option value="feature">Feature Request</option>
                <option value="bug">Bug Report</option>
                <option value="enterprise">Enterprise Inquiry</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-2">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={6}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                placeholder="How can we help you?"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Send Message
            </button>
          </form>
        </div>
      </section>

      {/* Response Time */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
              <Clock className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Response Time</h3>
              <p className="text-gray-400 text-sm">Within 24 hours on business days</p>
            </div>
            <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
              <HelpCircle className="w-10 h-10 text-green-400 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Knowledge Base</h3>
              <p className="text-gray-400 text-sm">
                <Link href="/docs" className="text-indigo-400 hover:underline">
                  Browse our documentation
                </Link>
              </p>
            </div>
            <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
              <MapPin className="w-10 h-10 text-purple-400 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Location</h3>
              <p className="text-gray-400 text-sm">San Francisco, CA, USA</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gray-900/50">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="p-6 bg-gray-900 rounded-xl border border-gray-800">
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-gray-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Productify Pro. All rights reserved.
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
