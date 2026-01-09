'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MessageCircle } from 'lucide-react';

const faqs = [
  {
    question: 'How does Productify Pro track my time?',
    answer: 'Productify Pro runs quietly in the background and automatically detects which applications and websites you use. It categorizes your activities and provides detailed analytics without requiring any manual input from you.',
  },
  {
    question: 'Is my data private and secure?',
    answer: 'Absolutely. Your data is encrypted both in transit and at rest. We never share or sell your data to third parties. You can also choose to store data locally only, with optional cloud sync for cross-device access.',
  },
  {
    question: 'Can I use Productify Pro on multiple devices?',
    answer: 'Yes! With Personal and Pro plans, you can install Productify Pro on unlimited devices. Your data syncs automatically across all your computers, giving you a complete picture of your productivity.',
  },
  {
    question: 'What happens when my free trial ends?',
    answer: 'After your 7-day free trial, you can continue using the Free plan with basic features, or upgrade to a paid plan to keep all premium features. No credit card is required to start the trial.',
  },
  {
    question: 'Does it work offline?',
    answer: 'Yes, Productify Pro works completely offline. It stores your activity data locally and syncs when you reconnect to the internet. You never lose your tracking data.',
  },
  {
    question: 'Can I exclude certain apps or websites from tracking?',
    answer: 'Definitely. You can easily add any application or website to your exclusion list. This is perfect for sensitive applications or personal browsing you prefer not to track.',
  },
  {
    question: 'How do team features work?',
    answer: 'Team admins can view aggregated productivity metrics for their team members. Privacy controls let team members choose what to share. Individual activity details are never visible to managers unless explicitly shared.',
  },
  {
    question: 'Can I export my data?',
    answer: 'Yes, you can export all your data in various formats including CSV, PDF reports, and JSON. Pro users also have API access for custom integrations with other productivity tools.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Frequently asked{' '}
            <span className="gradient-text">questions</span>
          </h2>
          <p className="text-xl text-gray-400">
            Everything you need to know about Productify Pro.
          </p>
        </motion.div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="glass rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left"
              >
                <span className="font-medium pr-4">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-4 text-gray-400">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-gray-400 mb-4">Still have questions?</p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Contact Support
          </a>
        </motion.div>
      </div>
    </section>
  );
}
