import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  locationKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught rendering exception detected:", error, errorInfo);
  }

  public componentDidUpdate(prevProps: Props) {
    // If the locationKey (current URL path) changes, reset error state to let the app render other pages
    if (this.state.hasError && prevProps.locationKey !== this.props.locationKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Detection/Fallback of local storage lang preferences
      const lang = localStorage.getItem('i18nextLng') || 'en';
      const isArabic = lang.startsWith('ar');
      const isKurdish = lang.startsWith('ku');

      let title = "Error: You can't do this right now";
      let desc = "An unexpected error occurred on this page. You can still use other pages of the app by selecting another option from the menu.";
      let tryAgainBtn = "Try reloading page";
      let goHomeBtn = "Go Back Home";

      if (isArabic) {
        title = "خطأ: لا يمكنك القيام بذلك الآن";
        desc = "حدث خطأ غير متوقع في هذه الصفحة. لا يزال بإمكانك استخدام بقية صفحات التطبيق عن طريق اختيار أي خيار آخر من القائمة.";
        tryAgainBtn = "إعادة تحميل الصفحة";
        goHomeBtn = "الرجوع للرئيسية";
      } else if (isKurdish) {
        title = "خەتا: ناتوانی ئەمە بکەیت لەم کاتەدا";
        desc = "خەتایەکی چاوەڕواننەکراو لەم لاپەڕەیەدا ڕوویدا. هێشتا دەتوانیت لاپەڕەکانی تری بەرنامەکە بەکاربهێنیت بە دیاریکردنی هەڵبژاردەیەکی تر لە مینیوەکە.";
        tryAgainBtn = "دووبارە بارکردنەوەی لاپەڕە";
        goHomeBtn = "گەڕانەوە بۆ سەرەکی";
      }

      const isInline = !!this.props.locationKey;

      return (
        <div className={isInline ? "flex-1 min-h-[60vh] flex flex-col items-center justify-center p-6 text-center" : "min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center"}>
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
            
            {/* Animated Warning Icon container */}
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center mb-6 animate-pulse">
              <AlertTriangle size={32} className="stroke-[2.5]" />
            </div>

            <h2 className="text-lg font-black text-gray-900 dark:text-zinc-100 mb-3 tracking-tight">
              {title}
            </h2>
            <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-6 leading-relaxed">
              {desc}
            </p>

            {this.state.error?.message && (
              <div className="w-full bg-gray-50 dark:bg-zinc-950/50 rounded-2xl p-4 border border-gray-100 dark:border-zinc-800/80 mb-6 max-h-32 overflow-y-auto text-left">
                <span className="text-[10px] font-black text-gray-400 dark:text-zinc-600 block uppercase mb-1 tracking-wider">
                  Technical Details
                </span>
                <span className="font-mono text-xs text-red-500 dark:text-red-400 font-semibold break-all leading-relaxed">
                  {this.state.error.message}
                </span>
              </div>
            )}

            <div className="w-full flex flex-col gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-3.5 px-6 bg-green-500 hover:bg-green-600 active:scale-98 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 hover:shadow-xl transition-all duration-200"
              >
                <RefreshCw size={16} />
                <span>{tryAgainBtn}</span>
              </button>
              
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full py-3.5 px-6 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 active:scale-98 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border border-gray-200/55 dark:border-zinc-700/50 transition-all duration-200"
              >
                <Home size={16} />
                <span>{goHomeBtn}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
