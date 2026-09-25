import { Suspense } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import Root from '@/layouts/Root';
import Home from '@/pages/Home';
import About from '@/pages/About';
import NotFound from '@/pages/NotFound';
import { tools } from '@/tools/registry';

function ToolBoundary() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1040px] px-4 sm:px-6 py-24 text-[var(--color-fg-subtle)] text-[14px]">
          Loading tool…
        </div>
      }
    >
      <Outlet />
    </Suspense>
  );
}

export const router = createBrowserRouter(
  [
    {
      element: <Root />,
      children: [
        { path: '/', element: <Home /> },
        { path: '/about', element: <About /> },
        {
          element: <ToolBoundary />,
          children: tools.map((t) => ({
            path: t.path.replace(/^\//, ''),
            element: <t.component />,
          })),
        },
        { path: '*', element: <NotFound /> },
      ],
    },
  ],
  { basename: '/tools' },
);
