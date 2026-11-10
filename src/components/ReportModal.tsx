import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Flag } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => void;
  reportedName: string;
  reporterRole: string;
}

const ReportModal = ({
  isOpen,
  onClose,
  onSubmit,
  reportedName,
  reporterRole
}: ReportModalProps) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('reason_unprofessional');
  const [details, setDetails] = useState('');

  const workerReasons = [
    { id: 'reason_unprofessional', label: t('reason_unprofessional') },
    { id: 'reason_no_show_customer', label: t('reason_no_show_customer') },
    { id: 'reason_payment_issue', label: t('reason_payment_issue') },
    { id: 'reason_incorrect_location', label: t('reason_incorrect_location') },
    { id: 'reason_rude_behavior', label: t('reason_rude_behavior') },
    { id: 'reason_unsafe_environment', label: t('reason_unsafe_environment') },
    { id: 'reason_scope_change', label: t('reason_scope_change') },
    { id: 'reason_harassment', label: t('reason_harassment') },
    { id: 'reason_other', label: t('reason_other') }
  ];

  const customerReasons = [
    { id: 'reason_unprofessional', label: t('reason_unprofessional') },
    { id: 'reason_no_show_worker', label: t('reason_no_show_worker') },
    { id: 'reason_poor_quality', label: t('reason_poor_quality') },
    { id: 'reason_overcharging', label: t('reason_overcharging') },
    { id: 'reason_rude_behavior', label: t('reason_rude_behavior') },
    { id: 'reason_harassment', label: t('reason_harassment') },
    { id: 'reason_other', label: t('reason_other') }
  ];

  const reportReasons = reporterRole === 'worker' ? workerReasons : customerReasons;

  useEffect(() => {
    if (isOpen) {
      setReason(reportReasons[0].id);
      setDetails('');
    }
  }, [isOpen, reporterRole]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-4 text-red-500">
          <Flag size={24} />
          <h3 className="text-xl font-bold">{t('reportIssue')}</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {t('reporting')}: <span className="font-bold text-gray-900 dark:text-white">{reportedName}</span>
        </p>

        <div className="space-y-3 mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">{t('reason')}</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-primary text-sm"
          >
            {reportReasons.map(r => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3 mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">{t('details')}</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t('provideMoreDetails')}
            className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-primary h-32 resize-none text-sm"
            required
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-sm"
          >
            {t('cancel')}
          </button>
          <button
            onClick={() => onSubmit(reason, details)}
            disabled={!details.trim()}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/20 disabled:opacity-50"
          >
            {t('submitReport')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ReportModal;
