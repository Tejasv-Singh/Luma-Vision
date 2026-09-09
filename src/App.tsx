import { Suspense, lazy } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SettingsProvider } from '@/context/SettingsContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ErrorBoundary, ErrorState } from '@/components/ui/States';
import { SkeletonTab } from '@/components/ui/Skeleton';
import { DashboardPage } from '@/pages/DashboardPage';

// Secondary routes are split out: the dashboard is the only page most sessions
// touch, so history/compare/profile should not cost anything until visited.
const HistoryPage = lazy(() =>
  import('@/pages/HistoryPage').then((m) => ({ default: m.HistoryPage })),
);
const ComparePage = lazy(() =>
  import('@/pages/ComparePage').then((m) => ({ default: m.ComparePage })),
);
const PlayerProfilePage = lazy(() =>
  import('@/pages/PlayerProfilePage').then((m) => ({ default: m.PlayerProfilePage })),
);

export default function App() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <Router>
          <AppShell>
            <ErrorBoundary
              fallback={(error, reset) => (
                <ErrorState
                  title="Luma Vision hit an unexpected error"
                  message={error.message}
                  onRetry={reset}
                />
              )}
            >
              <Suspense fallback={<SkeletonTab label="Loading page" />}>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/analysis/:videoId" element={<DashboardPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/compare" element={<ComparePage />} />
                  <Route path="/player" element={<PlayerProfilePage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </AppShell>
        </Router>
      </ToastProvider>
    </SettingsProvider>
  );
}
