import React, { useState } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Percent, Calculator, RotateCcw, Download } from 'lucide-react';
import { db } from '../../firebase';
import { UserProfile, AppSettings } from '../../types';
import ToolAdWrapper from '../../components/ToolAdWrapper';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';

export default function MarksPercentageCalculator({ profile }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [obtained, setObtained] = useState<string>('');
  const [total, setTotal] = useState<string>('');
  const [percentage, setPercentage] = useState<number | null>(null);

  const calculate = async () => {
    const ob = parseFloat(obtained);
    const tot = parseFloat(total);

    if (isNaN(ob) || isNaN(tot) || tot === 0) {
      toast.error("Please enter valid marks");
      return;
    }

    const result = (ob / tot) * 100;
    setPercentage(result);

    // Update usage count (skip for admins)
    if (profile && profile.role !== 'admin') {
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          usageCount: increment(1),
          lastUsedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error("Error updating usage:", error);
      }
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Marks Percentage Report', 15, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 30);
    
    doc.setFontSize(14);
    doc.text(`Marks Obtained: ${obtained}`, 15, 45);
    doc.text(`Total Marks: ${total}`, 15, 55);
    
    doc.setFontSize(18);
    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.text(`Percentage: ${percentage?.toFixed(2)}%`, 15, 75);
    
    doc.save('marks-report.pdf');
    toast.success("Report Downloaded!");
  };

  const reset = () => {
    setObtained('');
    setTotal('');
    setPercentage(null);
  };

  return (
    <div className="flex flex-col items-center space-y-8 max-w-2xl mx-auto w-full px-4">
      <ToolAdWrapper position="tool_top" />
      
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Marks Percentage</h1>
              <p className="text-gray-500 text-sm">Quickly calculate your exam percentage.</p>
            </div>
          </div>
          <button 
            onClick={reset}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Marks Obtained</label>
            <input
              type="number"
              placeholder="e.g. 450"
              value={obtained}
              onChange={(e) => setObtained(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Total Marks</label>
            <input
              type="number"
              placeholder="e.g. 500"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
            />
          </div>
        </div>

        <button
          onClick={calculate}
          className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
        >
          <Calculator className="w-5 h-5" />
          Calculate Percentage
        </button>

        {percentage !== null && (
          <div className="space-y-4">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="p-8 bg-emerald-50 rounded-2xl border border-emerald-100 text-center space-y-2"
            >
              <p className="text-emerald-600 font-medium">Your Result</p>
              <div className="text-5xl font-black text-emerald-700">
                {percentage.toFixed(2)}%
              </div>
              <p className="text-emerald-600/70 text-sm">
                {percentage >= 90 ? 'Excellent! 🌟' : 
                 percentage >= 75 ? 'Great Job! 👍' : 
                 percentage >= 60 ? 'Good Effort! 😊' : 
                 percentage >= 40 ? 'Passed! Keep working hard. 💪' : 
                 'Needs Improvement. You can do it! 📚'}
              </p>
            </motion.div>
            <button
              onClick={downloadPDF}
              className="w-full py-3 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download PDF Report
            </button>
          </div>
        )}
      </div>

      <ToolAdWrapper position="tool_bottom" />
    </div>
  );
}
