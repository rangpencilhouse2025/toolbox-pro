import React, { useState } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Calculator, Plus, Trash2, RotateCcw, Save, Download } from 'lucide-react';
import { db } from '../../firebase';
import { UserProfile, AppSettings } from '../../types';
import ToolAdWrapper from '../../components/ToolAdWrapper';
import { motion, AnimatePresence } from 'motion/react';

interface Course {
  id: string;
  name: string;
  grade: string;
  credits: number;
}

const GRADE_POINTS: Record<string, number> = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'F': 0.0
};

import { jsPDF } from 'jspdf';

export default function GPACalculator({ profile }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [courses, setCourses] = useState<Course[]>([
    { id: '1', name: '', grade: 'A', credits: 3 }
  ]);
  const [gpa, setGpa] = useState<number | null>(null);

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('GPA Report', 15, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 30);
    
    let y = 45;
    doc.setFontSize(14);
    doc.text('Courses:', 15, y);
    y += 10;
    
    doc.setFontSize(10);
    courses.forEach((course, index) => {
      doc.text(`${index + 1}. ${course.name || 'Unnamed Course'} - Grade: ${course.grade}, Credits: ${course.credits}`, 15, y);
      y += 7;
    });
    
    y += 10;
    doc.setFontSize(16);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text(`Final GPA: ${gpa?.toFixed(2)}`, 15, y);
    
    doc.save('gpa-report.pdf');
    toast.success("Report Downloaded!");
  };

  const addCourse = () => {
    setCourses([...courses, { id: Math.random().toString(36).substr(2, 9), name: '', grade: 'A', credits: 3 }]);
  };

  const removeCourse = (id: string) => {
    if (courses.length > 1) {
      setCourses(courses.filter(c => c.id !== id));
    }
  };

  const updateCourse = (id: string, field: keyof Course, value: string | number) => {
    setCourses(courses.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const calculateGPA = async () => {
    let totalPoints = 0;
    let totalCredits = 0;

    courses.forEach(course => {
      const points = GRADE_POINTS[course.grade] || 0;
      totalPoints += points * course.credits;
      totalCredits += course.credits;
    });

    const result = totalCredits > 0 ? totalPoints / totalCredits : 0;
    setGpa(result);

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
    toast.success("GPA Calculated!");
  };

  const reset = () => {
    setCourses([{ id: '1', name: '', grade: 'A', credits: 3 }]);
    setGpa(null);
  };

  return (
    <div className="flex flex-col items-center space-y-8 max-w-4xl mx-auto w-full px-4">
      <ToolAdWrapper position="tool_top" />
      
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">GPA Calculator</h1>
              <p className="text-gray-500 text-sm">Calculate your semester or cumulative GPA easily.</p>
            </div>
          </div>
          <button 
            onClick={reset}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <div className="col-span-6">Course Name (Optional)</div>
            <div className="col-span-3 text-center">Grade</div>
            <div className="col-span-2 text-center">Credits</div>
            <div className="col-span-1"></div>
          </div>

          <AnimatePresence mode="popLayout">
            {courses.map((course) => (
              <motion.div 
                key={course.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-12 gap-4 items-center"
              >
                <div className="col-span-6">
                  <input
                    type="text"
                    placeholder="e.g. Mathematics"
                    value={course.name}
                    onChange={(e) => updateCourse(course.id, 'name', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                  />
                </div>
                <div className="col-span-3">
                  <select
                    value={course.grade}
                    onChange={(e) => updateCourse(course.id, 'grade', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                  >
                    {Object.keys(GRADE_POINTS).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={course.credits}
                    onChange={(e) => updateCourse(course.id, 'credits', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-center"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button 
                    onClick={() => removeCourse(course.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <button 
            onClick={addCourse}
            className="flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-700 transition-colors py-2"
          >
            <Plus className="w-4 h-4" />
            Add Course
          </button>
        </div>

        <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button
              onClick={calculateGPA}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
            >
              Calculate GPA
            </button>
          </div>

          {gpa !== null && (
            <div className="flex items-center gap-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-4 bg-indigo-50 px-6 py-3 rounded-2xl border border-indigo-100"
              >
                <span className="text-indigo-600 font-medium">Your GPA:</span>
                <span className="text-3xl font-bold text-indigo-700">{gpa.toFixed(2)}</span>
              </motion.div>
              <button
                onClick={downloadPDF}
                className="p-3 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                title="Download PDF Report"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <ToolAdWrapper position="tool_bottom" />
    </div>
  );
}
