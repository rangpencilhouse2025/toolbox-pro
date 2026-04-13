import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, FileText, RefreshCcw, Copy, Download, 
  Trash2, Loader2, Globe, Mail, MapPin, Phone, 
  Info, Scale, CreditCard, MessageSquare, Check,
  ChevronRight, ExternalLink, Edit3, Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UserProfile, AppSettings } from '../../types';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { getDailyLimit } from '../../lib/utils';

type GeneratorType = 'terms' | 'privacy' | 'refund' | 'about' | 'contact' | 'cookie' | 'disclaimer';

interface FormData {
  companyName: string;
  websiteUrl: string;
  email: string;
  address: string;
  phone: string;
  country: string;
  effectiveDate: string;
}

export default function LegalGenerators({ profile, settings }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [activeType, setActiveType] = useState<GeneratorType>('terms');
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    websiteUrl: '',
    email: '',
    address: '',
    phone: '',
    country: '',
    effectiveDate: new Date().toISOString().split('T')[0]
  });
  const [generatedContent, setGeneratedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [processing, setProcessing] = useState(false);

  const generators = [
    { id: 'terms', name: 'Terms & Conditions', icon: Scale, desc: 'Rules and guidelines for using your service.' },
    { id: 'privacy', name: 'Privacy Policy', icon: ShieldCheck, desc: 'How you collect and manage user data.' },
    { id: 'refund', name: 'Refund & Return', icon: CreditCard, desc: 'Policy for returns, refunds, and exchanges.' },
    { id: 'about', name: 'About Us', icon: Info, desc: 'Your company story, mission, and values.' },
    { id: 'contact', name: 'Contact Us', icon: MessageSquare, desc: 'Professional contact page information.' },
    { id: 'cookie', name: 'Cookie Policy', icon: ShieldCheck, desc: 'Information about cookies used on your site.' },
    { id: 'disclaimer', name: 'Disclaimer', icon: Scale, desc: 'Limit your liability for site content.' },
  ];

  const generateContent = () => {
    if (!formData.companyName || !formData.websiteUrl) {
      toast.error("Please fill in Company Name and Website URL.");
      return;
    }

    // Check usage limit
    if (!profile?.premiumStatus) {
      const limit = getDailyLimit(profile, settings);
      if ((profile?.usageCount || 0) >= limit) {
        toast.error("Daily free limit reached. Please upgrade to premium!");
        return;
      }
    }

    setProcessing(true);
    setTimeout(async () => {
      let content = '';
      const { companyName, websiteUrl, email, address, phone, country, effectiveDate } = formData;

      switch (activeType) {
        case 'terms':
          content = `
# Terms and Conditions

**Effective Date:** ${effectiveDate}

Welcome to ${companyName}!

These terms and conditions outline the rules and regulations for the use of ${companyName}'s Website, located at ${websiteUrl}.

By accessing this website we assume you accept these terms and conditions. Do not continue to use ${companyName} if you do not agree to take all of the terms and conditions stated on this page.

## 1. Intellectual Property Rights
Other than the content you own, under these Terms, ${companyName} and/or its licensors own all the intellectual property rights and materials contained in this Website. You are granted a limited license only for purposes of viewing the material contained on this Website.

## 2. Restrictions
You are specifically restricted from all of the following:
* Publishing any Website material in any other media;
* Selling, sublicensing and/or otherwise commercializing any Website material;
* Publicly performing and/or showing any Website material;
* Using this Website in any way that is or may be damaging to this Website;
* Using this Website in any way that impacts user access to this Website;

## 3. Your Privacy
Please read our Privacy Policy.

## 4. No warranties
This Website is provided "as is," with all faults, and ${companyName} expresses no representations or warranties, of any kind related to this Website or the materials contained on this Website.

## 5. Limitation of liability
In no event shall ${companyName}, nor any of its officers, directors and employees, be held liable for anything arising out of or in any way connected with your use of this Website.

## 6. Governing Law & Jurisdiction
These Terms will be governed by and interpreted in accordance with the laws of ${country || 'the State'}, and you submit to the non-exclusive jurisdiction of the state and federal courts located in ${country || 'the State'} for the resolution of any disputes.

---
**Contact Us:**
Email: ${email}
Address: ${address}
          `.trim();
          break;

        case 'privacy':
          content = `
# Privacy Policy

**Effective Date:** ${effectiveDate}

At ${companyName}, accessible from ${websiteUrl}, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by ${companyName} and how we use it.

## 1. Information We Collect
The personal information that you are asked to provide, and the reasons why you are asked to provide it, will be made clear to you at the point we ask you to provide your personal information.

## 2. How We Use Your Information
We use the information we collect in various ways, including to:
* Provide, operate, and maintain our website
* Improve, personalize, and expand our website
* Understand and analyze how you use our website
* Develop new products, services, features, and functionality
* Communicate with you, either directly or through one of our partners

## 3. Log Files
${companyName} follows a standard procedure of using log files. These files log visitors when they visit websites.

## 4. Cookies and Web Beacons
Like any other website, ${companyName} uses 'cookies'. These cookies are used to store information including visitors' preferences, and the pages on the website that the visitor accessed or visited.

## 5. GDPR Data Protection Rights
We would like to make sure you are fully aware of all of your data protection rights. Every user is entitled to the following:
* The right to access
* The right to rectification
* The right to erasure
* The right to restrict processing

---
**Contact Us:**
Email: ${email}
Phone: ${phone}
          `.trim();
          break;

        case 'refund':
          content = `
# Refund and Return Policy

**Effective Date:** ${effectiveDate}

Thank you for shopping at ${companyName}.

If, for any reason, You are not completely satisfied with a purchase We invite You to review our policy on refunds and returns.

## 1. Interpretation and Definitions
The following terms have the same meaning regardless of whether they appear in singular or in plural.

## 2. Your Order Cancellation Rights
You are entitled to cancel Your Order within 14 days without giving any reason for doing so.
The deadline for cancelling an Order is 14 days from the date on which You received the Goods or on which a third party you have appointed, who is not the carrier, takes possession of the product delivered.

## 3. Conditions for Returns
In order for the Goods to be eligible for a return, please make sure that:
* The Goods were purchased in the last 14 days
* The Goods are in the original packaging

## 4. Returning Goods
You are responsible for the cost and risk of returning the Goods to Us. You should send the Goods at the following address:
${address || 'Please contact support for return address.'}

## 5. Contact Us
If you have any questions about our Returns and Refunds Policy, please contact us:
By email: ${email}
By phone: ${phone}
          `.trim();
          break;

        case 'about':
          content = `
# About Us

Welcome to ${companyName}!

Founded in ${new Date().getFullYear()}, ${companyName} has come a long way from its beginnings. When we first started out, our passion for providing the best service drove us to start our own business.

## Our Mission
We hope you enjoy our products/services as much as we enjoy offering them to you. If you have any questions or comments, please don't hesitate to contact us.

## Why Choose Us?
* **Quality Service:** We prioritize our customers' satisfaction above all else.
* **Innovation:** We are constantly looking for ways to improve and bring new value.
* **Integrity:** We believe in honest and transparent business practices.

Sincerely,
The ${companyName} Team
          `.trim();
          break;

        case 'contact':
          content = `
# Contact Us

We would love to hear from you! Whether you have a question about features, pricing, need a demo, or anything else, our team is ready to answer all your questions.

## Get In Touch
* **Website:** ${websiteUrl}
* **Email:** ${email}
* **Phone:** ${phone}
* **Address:** ${address}

## Operating Hours
Monday - Friday: 9:00 AM - 6:00 PM
Saturday: 10:00 AM - 2:00 PM
Sunday: Closed

---
Thank you for choosing ${companyName}!
          `.trim();
          break;

        case 'cookie':
          content = `
# Cookie Policy

**Effective Date:** ${effectiveDate}

This Cookie Policy explains how ${companyName} uses cookies and similar technologies to recognize you when you visit our website at ${websiteUrl}.

## 1. What are cookies?
Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information.

## 2. Why do we use cookies?
We use first-party and third-party cookies for several reasons. Some cookies are required for technical reasons in order for our Website to operate, and we refer to these as "essential" or "strictly necessary" cookies.

## 3. Types of cookies we use
* **Essential Website Cookies:** These cookies are strictly necessary to provide you with services available through our Website.
* **Performance and Functionality Cookies:** These cookies are used to enhance the performance and functionality of our Website but are non-essential to their use.
* **Analytics and Customization Cookies:** These cookies collect information that is used either in aggregate form to help us understand how our Website is being used.

## 4. How can I control cookies?
You have the right to decide whether to accept or reject cookies. You can set or amend your web browser controls to accept or refuse cookies.

---
**Contact Us:**
Email: ${email}
          `.trim();
          break;

        case 'disclaimer':
          content = `
# Disclaimer

**Effective Date:** ${effectiveDate}

The information provided by ${companyName} on ${websiteUrl} is for general informational purposes only. All information on the Site is provided in good faith, however we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the Site.

## 1. External Links Disclaimer
The Site may contain links to other websites or content belonging to or originating from third parties. Such external links are not investigated, monitored, or checked for accuracy, adequacy, validity, reliability, availability, or completeness by us.

## 2. Professional Disclaimer
The Site cannot and does not contain legal/medical/financial advice. The information is provided for general informational and educational purposes only and is not a substitute for professional advice.

## 3. Errors and Omissions Disclaimer
While we have made every attempt to ensure that the information contained in this site has been obtained from reliable sources, ${companyName} is not responsible for any errors or omissions, or for the results obtained from the use of this information.

## 4. Logotypes and Trademarks Disclaimer
All logos and trademarks of third parties referenced on ${websiteUrl} are the trademarks and logos of their respective owners. Any inclusion of such trademarks or logos does not imply or constitute any approval, endorsement or sponsorship of ${companyName} by such owners.

---
**Contact Us:**
Email: ${email}
          `.trim();
          break;
      }

      setGeneratedContent(content);
      setIsEditing(false);
      setProcessing(false);
      toast.success(`${generators.find(g => g.id === activeType)?.name} generated!`);

      // Update usage (skip for admins to save writes)
      if (profile && profile.role !== 'admin') {
        await updateDoc(doc(db, 'users', profile.uid), {
          usageCount: increment(1),
          lastUsedAt: new Date().toISOString()
        });
      }
    }, 800);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success("Copied to clipboard!");
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${activeType}-policy.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary text-sm font-bold rounded-full border border-primary/20">
          <Scale className="w-4 h-4" />
          LEGAL & INFO TOOLS
        </div>
        <h1 className="text-5xl font-black text-gray-900 tracking-tight">
          Policy <span className="text-primary">Generator</span>
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto text-lg">
          Generate professional legal documents and informational pages for your website, app, or social media in seconds.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-4 rounded-[2rem] shadow-xl border border-gray-100 space-y-2">
            {generators.map((gen) => (
              <button
                key={gen.id}
                onClick={() => {
                  setActiveType(gen.id as GeneratorType);
                  setGeneratedContent('');
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group ${
                  activeType === gen.id 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className={`p-2 rounded-xl ${activeType === gen.id ? 'bg-white/20' : 'bg-white shadow-sm group-hover:scale-110 transition-transform'}`}>
                  <gen.icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black">{gen.name}</p>
                </div>
                <ChevronRight className={`ml-auto w-4 h-4 opacity-50 ${activeType === gen.id ? 'block' : 'hidden'}`} />
              </button>
            ))}
          </div>

          <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 space-y-3">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              Legal Disclaimer
            </div>
            <p className="text-[10px] text-blue-600 leading-relaxed font-medium">
              These templates are for informational purposes only and do not constitute legal advice. We recommend consulting with a legal professional to ensure compliance with local laws.
            </p>
          </div>
        </div>

        {/* Main Workspace */}
        <div className="lg:col-span-9 space-y-8">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Form Section */}
              <div className="p-8 border-r border-gray-50 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-gray-900">Company Details</h3>
                  <RefreshCcw 
                    onClick={() => setFormData({
                      companyName: '', websiteUrl: '', email: '', address: '', phone: '', country: '', effectiveDate: new Date().toISOString().split('T')[0]
                    })}
                    className="w-4 h-4 text-gray-400 cursor-pointer hover:text-primary transition-colors" 
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Globe className="w-3 h-3" /> Company Name *
                    </label>
                    <input 
                      type="text" 
                      value={formData.companyName}
                      onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-sm"
                      placeholder="e.g. Acme Corp"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <ExternalLink className="w-3 h-3" /> Website URL *
                    </label>
                    <input 
                      type="text" 
                      value={formData.websiteUrl}
                      onChange={(e) => setFormData({...formData, websiteUrl: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-sm"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Mail className="w-3 h-3" /> Support Email
                      </label>
                      <input 
                        type="email" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-sm"
                        placeholder="support@acme.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Phone className="w-3 h-3" /> Phone Number
                      </label>
                      <input 
                        type="text" 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-sm"
                        placeholder="+1 234 567 890"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> Physical Address
                    </label>
                    <input 
                      type="text" 
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-sm"
                      placeholder="123 Business St, City, Country"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Country/State</label>
                      <input 
                        type="text" 
                        value={formData.country}
                        onChange={(e) => setFormData({...formData, country: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-sm"
                        placeholder="USA"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Effective Date</label>
                      <input 
                        type="date" 
                        value={formData.effectiveDate}
                        onChange={(e) => setFormData({...formData, effectiveDate: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-sm"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={generateContent}
                  disabled={processing}
                  className="w-full py-5 bg-primary text-white rounded-2xl font-black hover:bg-secondary transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
                >
                  {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : <RefreshCcw className="w-6 h-6" />}
                  Generate {generators.find(g => g.id === activeType)?.name}
                </button>
              </div>

              {/* Preview/Edit Section */}
              <div className="bg-gray-50/50 flex flex-col min-h-[600px]">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsEditing(false)}
                      className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${!isEditing ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <Eye className="w-3 h-3" /> Preview
                    </button>
                    <button 
                      onClick={() => setIsEditing(true)}
                      className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${isEditing ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleCopy}
                      disabled={!generatedContent}
                      className="p-2 text-gray-400 hover:text-primary transition-colors disabled:opacity-30"
                      title="Copy to Clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={handleDownload}
                      disabled={!generatedContent}
                      className="p-2 text-gray-400 hover:text-primary transition-colors disabled:opacity-30"
                      title="Download as TXT"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                  {generatedContent ? (
                    isEditing ? (
                      <textarea 
                        value={generatedContent}
                        onChange={(e) => setGeneratedContent(e.target.value)}
                        className="w-full h-full bg-transparent border-none outline-none font-mono text-sm text-gray-700 resize-none"
                      />
                    ) : (
                      <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap font-sans">
                        {generatedContent}
                      </div>
                    )
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <FileText className="w-10 h-10 opacity-20" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold">No Content Generated</p>
                        <p className="text-[10px] uppercase font-black tracking-widest opacity-60">Fill the form and click generate</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
