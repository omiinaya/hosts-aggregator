import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import AppRoutes from './routes/index.tsx'
import MainLayout from './components/layout/main-layout'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MainLayout>
          <AppRoutes />
          <Toaster position="top-right" />
        </MainLayout>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App