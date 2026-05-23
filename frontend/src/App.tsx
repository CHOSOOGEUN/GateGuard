import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from './router'
import { AppProvider } from './contexts/AppContext'

function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" richColors />
    </AppProvider>
  )
}

export default App
