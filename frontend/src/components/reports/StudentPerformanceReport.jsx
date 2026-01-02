import { useEffect, useState, useRef } from 'react';
import { X, Download, Printer, Loader2, User, Mail, Phone, Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { apiService } from '../../services/api';
import { API_ENDPOINTS, normalizeStorageUrl } from '../../config/api';
import { useToast } from '../ui/toast';

const StudentPerformanceReport = ({ student, isOpen, onClose, hideActions = false }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const { error: showError } = useToast();
  const reportRef = useRef(null);

  useEffect(() => {
    if ((isOpen || hideActions) && student) {
      loadReport();
    }
  }, [isOpen, hideActions, student]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(
        API_ENDPOINTS.users.performanceReport.replace(':id', student.id)
      );
      const reportData = response.data.data;
      // Normalize picture URL to ensure it uses /load-storage/ instead of /storage/
      if (reportData?.student?.picture_url) {
        reportData.student.picture_url = normalizeStorageUrl(reportData.student.picture_url);
      }
      setReport(reportData);
    } catch (err) {
      showError('Failed to load performance report');
      if (onClose) {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;

    try {
      // Dynamically import html2pdf.js
      let html2pdf;
      try {
        const html2pdfModule = await import('html2pdf.js');
        html2pdf = html2pdfModule.default;
      } catch (importError) {
        showError('PDF library not installed. Please run: npm install html2pdf.js');
        console.error('html2pdf.js not found:', importError);
        return;
      }

      const element = reportRef.current;
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `${student.name}_Performance_Report.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('Error generating PDF:', err);
      showError('Failed to generate PDF. Please try printing instead.');
    }
  };

  const handlePrint = () => {
    if (!reportRef.current) return;
    window.print();
  };

  // Extract report content JSX - defined as a function
  const renderReportContent = (reportData) => {
    if (!reportData) return null;
    
    return (
      <>
        {/* Tasks Performance */}
        <Card className="print:border-0 print:shadow-none" style={{ pageBreakInside: 'avoid' }}>
          <CardHeader className="print:pb-2">
            <CardTitle className="text-xl print:text-lg">Tasks Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
              <div className="text-center p-4 bg-muted rounded-lg print:p-2">
                <p className="text-2xl font-bold text-foreground print:text-xl">
                  {reportData.tasks.total}
                </p>
                <p className="text-sm text-muted-foreground print:text-xs">Total Tasks</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg print:p-2">
                <p className="text-2xl font-bold text-green-600 print:text-xl">
                  {reportData.tasks.submitted}
                </p>
                <p className="text-sm text-muted-foreground print:text-xs">Submitted</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg print:p-2">
                <p className="text-2xl font-bold text-yellow-600 print:text-xl">
                  {reportData.tasks.pending}
                </p>
                <p className="text-sm text-muted-foreground print:text-xs">Pending</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg print:p-2">
                <p className="text-2xl font-bold text-foreground print:text-xl">
                  {reportData.tasks.completion_rate}%
                </p>
                <p className="text-sm text-muted-foreground print:text-xs">Completion Rate</p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg print:p-2 print:mt-2">
              <div className="flex items-center justify-between mb-2 print:mb-1">
                <p className="text-sm text-muted-foreground print:text-xs">Total Marks</p>
                <p className="text-sm font-semibold text-foreground print:text-xs">
                  {reportData.tasks.total_marks_obtained} / {reportData.tasks.total_marks_possible}
                </p>
              </div>
              {reportData.tasks.average_marks > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground print:text-xs">Percentage</p>
                  <p className="text-2xl font-bold text-blue-600 print:text-xl">
                    {reportData.tasks.average_marks}%
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tasks Detail Table */}
        {reportData.tasks.task_details && reportData.tasks.task_details.length > 0 && (
          <Card 
            className="print:border-0 print:shadow-none" 
            style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
          >
            <CardHeader className="print:pb-2">
              <CardTitle className="text-xl print:text-lg">Tasks Detail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse print:text-sm">
                  <thead>
                    <tr className="border-b-2 border-border print:border-b">
                      <th className="text-left p-3 font-semibold text-foreground print:p-2">#</th>
                      <th className="text-left p-3 font-semibold text-foreground print:p-2">Task Title</th>
                      <th className="text-center p-3 font-semibold text-foreground print:p-2">Total Marks</th>
                      <th className="text-center p-3 font-semibold text-foreground print:p-2">Obtained Marks</th>
                      <th className="text-center p-3 font-semibold text-foreground print:p-2">Submit Status</th>
                      <th className="text-center p-3 font-semibold text-foreground print:p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.tasks.task_details.map((task, index) => (
                      <tr 
                        key={task.id} 
                        className="border-b border-border print:border-b"
                        style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                      >
                        <td className="p-3 text-foreground print:p-2">{index + 1}</td>
                        <td className="p-3 text-foreground print:p-2">{task.title}</td>
                        <td className="p-3 text-center text-foreground print:p-2">{task.total_marks}</td>
                        <td className="p-3 text-center text-foreground print:p-2">
                          {task.obtained_marks !== null ? (
                            <span className={task.obtained_marks >= task.total_marks * 0.7 ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>
                              {task.obtained_marks}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center print:p-2">
                          {task.is_submitted ? (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs print:bg-green-100 print:text-green-700">
                              Submitted
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs print:bg-red-100 print:text-red-700">
                              Not Submitted
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center print:p-2">
                          {task.is_submitted ? (
                            task.is_graded ? (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs print:bg-green-100 print:text-green-700">
                                Graded
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs print:bg-blue-100 print:text-blue-700">
                                Pending Grade
                              </span>
                            )
                          ) : (
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs print:bg-yellow-100 print:text-yellow-700">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted print:bg-gray-100">
                    <tr className="font-semibold">
                      <td colSpan="2" className="p-3 text-right print:p-2">Total:</td>
                      <td className="p-3 text-center print:p-2">{reportData.tasks.total_marks_possible}</td>
                      <td className="p-3 text-center print:p-2">
                        <span className="text-blue-600">{reportData.tasks.total_marks_obtained}</span>
                      </td>
                      <td colSpan="2" className="p-3 text-center print:p-2">
                        <span className="text-blue-600">{reportData.tasks.average_marks}%</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quizzes Performance */}
        <Card className="print:border-0 print:shadow-none" style={{ pageBreakInside: 'avoid' }}>
          <CardHeader className="print:pb-2">
            <CardTitle className="text-xl print:text-lg">Quizzes Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
              <div className="text-center p-4 bg-muted rounded-lg print:p-2">
                <p className="text-2xl font-bold text-foreground print:text-xl">
                  {reportData.quizzes.total}
                </p>
                <p className="text-sm text-muted-foreground print:text-xs">Total Quizzes</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg print:p-2">
                <p className="text-2xl font-bold text-green-600 print:text-xl">
                  {reportData.quizzes.completed}
                </p>
                <p className="text-sm text-muted-foreground print:text-xs">Completed</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg print:p-2">
                <p className="text-2xl font-bold text-yellow-600 print:text-xl">
                  {reportData.quizzes.pending}
                </p>
                <p className="text-sm text-muted-foreground print:text-xs">Pending</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg print:p-2">
                <p className="text-2xl font-bold text-foreground print:text-xl">
                  {reportData.quizzes.completion_rate}%
                </p>
                <p className="text-sm text-muted-foreground print:text-xs">Completion Rate</p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg print:p-2 print:mt-2">
              <div className="flex items-center justify-between mb-2 print:mb-1">
                <p className="text-sm text-muted-foreground print:text-xs">Total Marks</p>
                <p className="text-sm font-semibold text-foreground print:text-xs">
                  {reportData.quizzes.total_marks_obtained} / {reportData.quizzes.total_marks_possible}
                </p>
              </div>
              {reportData.quizzes.average_marks > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground print:text-xs">Percentage</p>
                  <p className="text-2xl font-bold text-blue-600 print:text-xl">
                    {reportData.quizzes.average_marks}%
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Class Participations Performance */}
        {reportData.class_participations && (
          <Card className="print:border-0 print:shadow-none" style={{ pageBreakInside: 'avoid' }}>
            <CardHeader className="print:pb-2">
              <CardTitle className="text-xl print:text-lg">Class Participations Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
                <div className="text-center p-4 bg-muted rounded-lg print:p-2">
                  <p className="text-2xl font-bold text-foreground print:text-xl">
                    {reportData.class_participations.total}
                  </p>
                  <p className="text-sm text-muted-foreground print:text-xs">Total Participations</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg print:p-2">
                  <p className="text-2xl font-bold text-green-600 print:text-xl">
                    {reportData.class_participations.completed}
                  </p>
                  <p className="text-sm text-muted-foreground print:text-xs">Completed</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg print:p-2">
                  <p className="text-2xl font-bold text-yellow-600 print:text-xl">
                    {reportData.class_participations.pending}
                  </p>
                  <p className="text-sm text-muted-foreground print:text-xs">Pending</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg print:p-2">
                  <p className="text-2xl font-bold text-foreground print:text-xl">
                    {reportData.class_participations.completion_rate}%
                  </p>
                  <p className="text-sm text-muted-foreground print:text-xs">Completion Rate</p>
                </div>
              </div>
              <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg print:p-2 print:mt-2">
                <div className="flex items-center justify-between mb-2 print:mb-1">
                  <p className="text-sm text-muted-foreground print:text-xs">Total Marks</p>
                  <p className="text-sm font-semibold text-foreground print:text-xs">
                    {reportData.class_participations.total_marks_obtained} / {reportData.class_participations.total_marks_possible}
                  </p>
                </div>
                {reportData.class_participations.average_marks > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground print:text-xs">Percentage</p>
                    <p className="text-2xl font-bold text-purple-600 print:text-xl">
                      {reportData.class_participations.average_marks}%
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Class Participations Detail Table */}
        {reportData.class_participations && reportData.class_participations.participation_details && reportData.class_participations.participation_details.length > 0 && (
          <Card 
            className="print:border-0 print:shadow-none" 
            style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
          >
            <CardHeader className="print:pb-2">
              <CardTitle className="text-xl print:text-lg">Class Participations Detail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse print:text-sm">
                  <thead>
                    <tr className="border-b-2 border-border print:border-b">
                      <th className="text-left p-3 font-semibold text-foreground print:p-2">#</th>
                      <th className="text-left p-3 font-semibold text-foreground print:p-2">Participation Title</th>
                      <th className="text-center p-3 font-semibold text-foreground print:p-2">Date</th>
                      <th className="text-center p-3 font-semibold text-foreground print:p-2">Total Marks</th>
                      <th className="text-center p-3 font-semibold text-foreground print:p-2">Obtained Marks</th>
                      <th className="text-center p-3 font-semibold text-foreground print:p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.class_participations.participation_details.map((participation, index) => (
                      <tr 
                        key={participation.id} 
                        className="border-b border-border print:border-b"
                        style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                      >
                        <td className="p-3 text-foreground print:p-2">{index + 1}</td>
                        <td className="p-3 text-foreground print:p-2">{participation.title}</td>
                        <td className="p-3 text-center text-foreground print:p-2">
                          {participation.participation_date ? new Date(participation.participation_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-3 text-center text-foreground print:p-2">{participation.total_marks}</td>
                        <td className="p-3 text-center text-foreground print:p-2">
                          {participation.obtained_marks !== null ? (
                            <span className={participation.obtained_marks >= participation.total_marks * 0.7 ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>
                              {participation.obtained_marks}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center print:p-2">
                          {participation.obtained_marks !== null ? (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium print:bg-transparent print:text-green-700 print:border print:border-green-700">
                              Completed
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs font-medium print:bg-transparent print:text-yellow-700 print:border print:border-yellow-700">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quizzes Detail Table */}
        {reportData.quizzes.quiz_details && reportData.quizzes.quiz_details.length > 0 && (
          <Card 
            className="print:border-0 print:shadow-none" 
            style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
          >
            <CardHeader className="print:pb-2">
              <CardTitle className="text-xl print:text-lg">Quizzes Detail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse print:text-sm">
                  <thead>
                    <tr className="border-b-2 border-border print:border-b">
                      <th className="text-left p-3 font-semibold text-foreground print:p-2">#</th>
                      <th className="text-left p-3 font-semibold text-foreground print:p-2">Quiz Title</th>
                      <th className="text-center p-3 font-semibold text-foreground print:p-2">Date</th>
                      <th className="text-center p-3 font-semibold text-foreground print:p-2">Total Marks</th>
                      <th className="text-center p-3 font-semibold text-foreground print:p-2">Obtained Marks</th>
                      <th className="text-center p-3 font-semibold text-foreground print:p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.quizzes.quiz_details.map((quiz, index) => (
                      <tr 
                        key={quiz.id} 
                        className="border-b border-border print:border-b"
                        style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                      >
                        <td className="p-3 text-foreground print:p-2">{index + 1}</td>
                        <td className="p-3 text-foreground print:p-2">{quiz.title}</td>
                        <td className="p-3 text-center text-foreground print:p-2">
                          {quiz.quiz_date ? new Date(quiz.quiz_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-3 text-center text-foreground print:p-2">{quiz.total_marks}</td>
                        <td className="p-3 text-center text-foreground print:p-2">
                          {quiz.obtained_marks !== null ? (
                            <span className={quiz.obtained_marks >= quiz.total_marks * 0.7 ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>
                              {quiz.obtained_marks}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center print:p-2">
                          {quiz.is_completed ? (
                            quiz.is_graded ? (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs print:bg-green-100 print:text-green-700">
                                Graded
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs print:bg-blue-100 print:text-blue-700">
                                Completed
                              </span>
                            )
                          ) : (
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs print:bg-yellow-100 print:text-yellow-700">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted print:bg-gray-100">
                    <tr className="font-semibold">
                      <td colSpan="3" className="p-3 text-right print:p-2">Total:</td>
                      <td className="p-3 text-center print:p-2">{reportData.quizzes.total_marks_possible}</td>
                      <td className="p-3 text-center print:p-2">
                        <span className="text-blue-600">{reportData.quizzes.total_marks_obtained}</span>
                      </td>
                      <td className="p-3 text-center print:p-2">
                        <span className="text-blue-600">{reportData.quizzes.average_marks}%</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attendance Performance */}
        <Card className="print:border-0 print:shadow-none" style={{ pageBreakInside: 'avoid' }}>
          <CardHeader className="print:pb-2">
            <CardTitle className="text-xl print:text-lg">Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
              <div className="text-center p-4 bg-muted rounded-lg print:p-2">
                <p className="text-2xl font-bold text-foreground print:text-xl">
                  {reportData.attendance.total_days}
                </p>
                <p className="text-sm text-muted-foreground print:text-xs">Total Days</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg print:p-2">
                <p className="text-2xl font-bold text-green-600 print:text-xl">
                  {reportData.attendance.present_days}
                </p>
                <p className="text-sm text-muted-foreground print:text-xs">Present</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg print:p-2">
                <p className="text-2xl font-bold text-red-600 print:text-xl">
                  {reportData.attendance.absent_days}
                </p>
                <p className="text-sm text-muted-foreground print:text-xs">Absent</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg print:p-2">
                <p className="text-2xl font-bold text-foreground print:text-xl">
                  {reportData.attendance.attendance_rate}%
                </p>
                <p className="text-sm text-muted-foreground print:text-xs">Attendance Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Performance */}
        <Card className="print:border-0 print:shadow-none border-2 border-primary" style={{ pageBreakInside: 'avoid' }}>
          <CardHeader className="print:pb-2">
            <CardTitle className="text-xl print:text-lg">Overall Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4 print:space-y-2">
              <div>
                <p className="text-sm text-muted-foreground print:text-xs mb-2">
                  Overall Percentage
                </p>
                <p className="text-5xl font-bold text-primary print:text-4xl">
                  {reportData.overall_performance.percentage}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground print:text-xs mb-2">Grade</p>
                <p className="text-4xl font-bold text-foreground print:text-3xl">
                  {reportData.overall_performance.grade}
                </p>
              </div>
              <div className="mt-6 p-4 bg-muted rounded-lg print:mt-4 print:p-2">
                <p className="text-sm font-semibold text-foreground mb-2 print:text-xs">
                  Remarks
                </p>
                <p className="text-foreground print:text-sm">
                  {reportData.overall_performance.remarks}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border print:pt-2 print:text-xs">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Calendar className="h-4 w-4" />
            <span>Report Generated: {new Date(reportData.generated_at).toLocaleString()}</span>
          </div>
          <p>This is a computer-generated report.</p>
        </div>
      </>
    );
  };

  if (!isOpen && !hideActions) return null;

  // If hideActions is true, render as a regular page component instead of modal
  if (hideActions) {
    return (
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : report ? (
          <div ref={reportRef} className="space-y-6 print:space-y-4">
            {/* Report Header */}
            <div className="text-center border-b-2 border-border pb-4 print:pb-2" style={{ pageBreakAfter: 'avoid' }}>
              <h1 className="text-3xl font-bold text-foreground mb-2 print:text-2xl">
                {report.institute.name}
              </h1>
              <p className="text-lg text-muted-foreground print:text-base">
                Student Performance Report
              </p>
            </div>

            {/* Student Information */}
            <Card className="print:border-0 print:shadow-none" style={{ pageBreakInside: 'avoid' }}>
              <CardHeader className="print:pb-2">
                <CardTitle className="text-xl print:text-lg">Student Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-6 print:gap-4">
                  {report.student.picture_url && (
                    <img
                      src={report.student.picture_url}
                      alt={report.student.name}
                      className="w-24 h-24 rounded-full object-cover border-2 border-border print:w-20 print:h-20"
                    />
                  )}
                  <div className="flex-1 space-y-2 print:space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">Name:</span>
                      <span className="text-foreground">{report.student.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">Email:</span>
                      <span className="text-foreground">{report.student.email}</span>
                    </div>
                    {report.student.contact_no && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-foreground">Contact:</span>
                        <span className="text-foreground">{report.student.contact_no}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Institute Information */}
            <div className="text-center text-sm text-muted-foreground print:text-xs">
              <p>Email: {report.institute.email}</p>
              <p>Contact: {report.institute.mobile}</p>
            </div>

            {/* Render rest of report content */}
            {renderReportContent(report)}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No report data available</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border no-print">
          <h2 className="text-2xl font-bold text-foreground">
            Student Performance Report
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleDownloadPDF}
              disabled={loading || !report}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrint}
              disabled={loading || !report}
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : report ? (
            <div ref={reportRef} className="space-y-6 print:space-y-4" style={{ pageBreakInside: 'auto' }}>
              {/* Report Header */}
              <div className="text-center border-b-2 border-border pb-4 print:pb-2" style={{ pageBreakAfter: 'avoid' }}>
                <h1 className="text-3xl font-bold text-foreground mb-2 print:text-2xl">
                  {report.institute.name}
                </h1>
                <p className="text-lg text-muted-foreground print:text-base">
                  Student Performance Report
                </p>
              </div>

              {/* Student Information */}
              <Card className="print:border-0 print:shadow-none" style={{ pageBreakInside: 'avoid' }}>
                <CardHeader className="print:pb-2">
                  <CardTitle className="text-xl print:text-lg">Student Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-6 print:gap-4">
                    {report.student.picture_url && (
                      <img
                        src={report.student.picture_url}
                        alt={report.student.name}
                        className="w-24 h-24 rounded-full object-cover border-2 border-border print:w-20 print:h-20"
                      />
                    )}
                    <div className="flex-1 space-y-2 print:space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-foreground">Name:</span>
                        <span className="text-foreground">{report.student.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-foreground">Email:</span>
                        <span className="text-foreground">{report.student.email}</span>
                      </div>
                      {report.student.contact_no && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-foreground">Contact:</span>
                          <span className="text-foreground">{report.student.contact_no}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Institute Information */}
              <div className="text-center text-sm text-muted-foreground print:text-xs">
                <p>Email: {report.institute.email}</p>
                <p>Contact: {report.institute.mobile}</p>
              </div>

              {/* Render rest of report content */}
              {renderReportContent(report)}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No report data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentPerformanceReport;

