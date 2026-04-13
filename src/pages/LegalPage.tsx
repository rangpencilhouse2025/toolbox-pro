import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldCheck, Scale, Info, Mail, Globe, MapPin, Phone, ChevronRight, MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';
import { AppSettings } from '../types';
import { toast } from 'react-hot-toast';
import HtmlRenderer from '../components/HtmlRenderer';

interface LegalPageProps {
  settings: AppSettings | null;
}

export default function LegalPage({ settings }: LegalPageProps) {
  const location = useLocation();
  const [type, setType] = useState<'about' | 'privacy' | 'terms' | 'contact'>('about');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const path = location.pathname.split('/')[1];
    if (['about', 'privacy', 'terms', 'contact'].includes(path)) {
      setType(path as any);
    }
    window.scrollTo(0, 0);
  }, [location]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({ name: '', email: '', subject: '', message: '' });
      setIsSubmitting(false);
    }, 1500);
  };

  const renderContent = () => {
    const siteName = settings?.siteName || 'ToolBox Pro';
    
    switch (type) {
      case 'about':
        return settings?.aboutContent ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 md:p-12 shadow-sm">
            <HtmlRenderer html={settings.aboutContent} />
          </div>
        ) : (
          <div className="space-y-12">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-black text-gray-900">About {siteName}</h1>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
                The world's most powerful all-in-one productivity suite for your daily file needs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12">
              <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Secure & Private</h3>
                <p className="text-gray-500 font-medium leading-relaxed">
                  Your files are processed locally or in secure environments. We never store your personal data without permission.
                </p>
              </div>
              <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-[#e5322d]">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Accessible Anywhere</h3>
                <p className="text-gray-500 font-medium leading-relaxed">
                  Cloud-based tools that work on any device, anywhere in the world. No installation required.
                </p>
              </div>
              <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                  <Info className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">User Centric</h3>
                <p className="text-gray-500 font-medium leading-relaxed">
                  Designed for professionals and casual users alike. Simple, intuitive, and powerful.
                </p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-[40px] p-12 text-white overflow-hidden relative">
              <div className="relative z-10 space-y-6 max-w-2xl">
                <h2 className="text-3xl font-black">Our Mission</h2>
                <p className="text-gray-400 text-lg leading-relaxed font-medium">
                  At {siteName}, we believe that professional-grade tools should be accessible to everyone. Our mission is to simplify complex file workflows into a single, cohesive platform that saves you time and effort.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="font-bold">10+ Professional Tools</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="font-bold">Privacy First Design</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="font-bold">24/7 Global Support</span>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-white/5 to-transparent hidden lg:block" />
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-black text-gray-900">Privacy Policy</h1>
              <p className="text-gray-500 font-medium">Last Updated: {new Date().toLocaleDateString()}</p>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 p-8 md:p-12 shadow-sm space-y-8 prose prose-slate max-w-none">
              {settings?.privacyContent ? (
                <HtmlRenderer html={settings.privacyContent} />
              ) : (
                <>
                  <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <ShieldCheck className="w-6 h-6 text-blue-600" />
                      1. Information We Collect
                    </h2>
                    <p className="text-gray-600 font-medium leading-relaxed">
                      We collect information you provide directly to us when you create an account, use our tools, or communicate with us. This may include your name, email address, and any files you upload for processing.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <Scale className="w-6 h-6 text-red-600" />
                      2. How We Use Your Information
                    </h2>
                    <p className="text-gray-600 font-medium leading-relaxed">
                      We use the information we collect to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-gray-600 font-medium">
                      <li>Provide, maintain, and improve our services.</li>
                      <li>Process your transactions and send you related information.</li>
                      <li>Send you technical notices, updates, and support messages.</li>
                      <li>Respond to your comments and questions.</li>
                    </ul>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <Info className="w-6 h-6 text-amber-600" />
                      3. Data Security
                    </h2>
                    <p className="text-gray-600 font-medium leading-relaxed">
                      We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <Mail className="w-6 h-6 text-green-600" />
                      4. Contact Us
                    </h2>
                    <p className="text-gray-600 font-medium leading-relaxed">
                      If you have any questions about this Privacy Policy, please contact us at {settings?.contactEmail || 'info.toolbox@gmail.com'}.
                    </p>
                  </section>
                </>
              )}
            </div>
          </div>
        );

      case 'terms':
        return (
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-black text-gray-900">Terms of Service</h1>
              <p className="text-gray-500 font-medium">Last Updated: {new Date().toLocaleDateString()}</p>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 p-8 md:p-12 shadow-sm space-y-8 prose prose-slate max-w-none">
              {settings?.termsContent ? (
                <HtmlRenderer html={settings.termsContent} />
              ) : (
                <>
                  <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900">1. Acceptance of Terms</h2>
                    <p className="text-gray-600 font-medium leading-relaxed">
                      By accessing or using {siteName}, you agree to be bound by these Terms of Service and all applicable laws and regulations.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900">2. Use License</h2>
                    <p className="text-gray-600 font-medium leading-relaxed">
                      Permission is granted to temporarily use the tools on {siteName} for personal, non-commercial transitory viewing only.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900">3. Disclaimer</h2>
                    <p className="text-gray-600 font-medium leading-relaxed">
                      The materials on {siteName} are provided on an 'as is' basis. {siteName} makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900">4. Limitations</h2>
                    <p className="text-gray-600 font-medium leading-relaxed">
                      In no event shall {siteName} or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on {siteName}.
                    </p>
                  </section>
                </>
              )}
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-black text-gray-900">Get in Touch</h1>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
                Have a question or feedback? We'd love to hear from you.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">Contact Information</h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Email Us</p>
                        <p className="text-gray-700 font-bold">{settings?.contactEmail || 'info.toolbox@gmail.com'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-[#e5322d]">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Call Us</p>
                        <p className="text-gray-700 font-bold">{settings?.contactPhone || '+91 9123620326'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Visit Us</p>
                        <p className="text-gray-700 font-bold">{settings?.contactAddress || 'Kolkata, West Bengal, India'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900 p-8 rounded-3xl text-white space-y-4">
                  <h3 className="text-xl font-bold">Follow Our Journey</h3>
                  <p className="text-gray-400 font-medium">Stay updated with the latest tools and features we're building for you.</p>
                  <div className="flex gap-4 pt-2">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 md:p-12 rounded-[40px] border border-gray-100 shadow-xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Full Name</label>
                      <input 
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                      <input 
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Subject</label>
                    <input 
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      placeholder="How can we help?"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Message</label>
                    <textarea 
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium resize-none"
                      placeholder="Tell us more about your inquiry..."
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-[#e5322d] text-white rounded-2xl font-black hover:bg-[#c42b27] transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm font-bold text-gray-400 mb-12">
          <Link to="/" className="hover:text-gray-600 transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 capitalize">{type}</span>
        </div>

        <motion.div
          key={type}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {renderContent()}
        </motion.div>
      </div>
    </div>
  );
}
