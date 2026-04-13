import React, { useState, useEffect } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Calendar, Plus, Trash2, Clock, CheckCircle2, Circle } from 'lucide-react';
import { db } from '../../firebase';
import { UserProfile, AppSettings } from '../../types';
import ToolAdWrapper from '../../components/ToolAdWrapper';
import { motion, AnimatePresence } from 'motion/react';

interface Task {
  id: string;
  text: string;
  day: string;
  completed: boolean;
  time?: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function StudyPlanner({ profile }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('student_study_planner');
    return saved ? JSON.parse(saved) : [];
  });
  const [newTask, setNewTask] = useState('');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [taskTime, setTaskTime] = useState('');

  useEffect(() => {
    localStorage.setItem('student_study_planner', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = async () => {
    if (!newTask.trim()) {
      toast.error("Please enter a task description");
      return;
    }

    const task: Task = {
      id: Math.random().toString(36).substr(2, 9),
      text: newTask,
      day: selectedDay,
      completed: false,
      time: taskTime
    };

    setTasks([...tasks, task]);
    setNewTask('');
    setTaskTime('');
    toast.success("Task added to " + selectedDay);

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

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    toast.success("Task removed");
  };

  const clearDay = (day: string) => {
    setTasks(tasks.filter(t => t.day !== day));
    toast.success("Cleared " + day);
  };

  return (
    <div className="flex flex-col items-center space-y-8 max-w-6xl mx-auto w-full px-4">
      <ToolAdWrapper position="tool_top" />
      
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Study Planner</h1>
              <p className="text-gray-500 text-sm">Organize your weekly study schedule and stay on track.</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-semibold text-gray-700">Task Description</label>
            <input
              type="text"
              placeholder="e.g. Read Chapter 5 of Biology"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Day</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
            </select>
          </div>
          <button
            onClick={addTask}
            className="w-full py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Task
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DAYS.map(day => {
            const dayTasks = tasks.filter(t => t.day === day);
            return (
              <div key={day} className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">{day}</h3>
                  <button 
                    onClick={() => clearDay(day)}
                    className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-wider"
                  >
                    Clear
                  </button>
                </div>
                <div className="p-4 space-y-3 flex-1 min-h-[150px]">
                  <AnimatePresence mode="popLayout">
                    {dayTasks.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-300 py-8">
                        <Circle className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-xs">No tasks</p>
                      </div>
                    ) : (
                      dayTasks.map(task => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${task.completed ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100'}`}
                        >
                          <button 
                            onClick={() => toggleTask(task.id)}
                            className={`mt-0.5 shrink-0 ${task.completed ? 'text-green-600' : 'text-gray-300 hover:text-blue-500'}`}
                          >
                            {task.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium leading-tight ${task.completed ? 'text-green-700 line-through' : 'text-gray-700'}`}>
                              {task.text}
                            </p>
                            {task.time && (
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400 font-bold">
                                <Clock className="w-3 h-3" />
                                {task.time}
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={() => removeTask(task.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ToolAdWrapper position="tool_bottom" />
    </div>
  );
}
